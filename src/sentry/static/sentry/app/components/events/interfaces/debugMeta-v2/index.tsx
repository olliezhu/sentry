import React from 'react';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
  ListRowProps,
  ScrollbarPresenceParams,
} from 'react-virtualized';
import styled from '@emotion/styled';
import isNil from 'lodash/isNil';

import {openModal} from 'app/actionCreators/modal';
import GuideAnchor from 'app/components/assistant/guideAnchor';
import EmptyStateWarning from 'app/components/emptyStateWarning';
import EventDataSection from 'app/components/events/eventDataSection';
import {getImageRange, parseAddress} from 'app/components/events/interfaces/utils';
import {Panel, PanelHeader} from 'app/components/panels';
import QuestionTooltip from 'app/components/questionTooltip';
import SearchBar from 'app/components/searchBar';
import {t} from 'app/locale';
import DebugMetaStore, {DebugMetaActions} from 'app/stores/debugMetaStore';
import overflowEllipsis from 'app/styles/overflowEllipsis';
import space from 'app/styles/space';
import {Event, Organization, Project} from 'app/types';
import {Image, ImageStackTraceInfo} from 'app/types/debugImage';

import StatusTag from './debugImage/statusTag';
import DebugImage from './debugImage';
import DebugImageDetails, {modalCss} from './debugImageDetails';
import Filter from './filter';
import layout from './layout';
import {combineStatus, getFileName, normalizeId} from './utils';

const MIN_FILTER_LEN = 3;
const PANEL_MAX_HEIGHT = 400;

type FilterOptions = React.ComponentProps<typeof Filter>['options'];

type DefaultProps = {
  data: {
    images: Array<Image>;
  };
};

type Props = DefaultProps & {
  event: Event;
  organization: Organization;
  projectId: Project['id'];
};

type State = {
  searchTerm: string;
  filteredImages: Array<Image>;
  filteredImagesBySearch: Array<Image>;
  filteredImagesByFilter: Array<Image>;
  filterOptions: FilterOptions;
  panelTableHeight?: number;
  scrollbarSize?: number;
};

const cache = new CellMeasurerCache({
  fixedWidth: true,
  defaultHeight: 81,
});

class DebugMeta extends React.PureComponent<Props, State> {
  static defaultProps: DefaultProps = {
    data: {images: []},
  };

  state: State = {
    searchTerm: '',
    filterOptions: [],
    filteredImages: [],
    filteredImagesByFilter: [],
    filteredImagesBySearch: [],
  };

  componentDidMount() {
    this.unsubscribeFromStore = DebugMetaStore.listen(this.onStoreChange, undefined);
    cache.clearAll();
    this.filterImages();
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (prevState.searchTerm !== this.state.searchTerm) {
      this.filterImages();
    }

    if (prevState.filteredImages.length === 0 && this.state.filteredImages.length > 0) {
      this.getFilterOptions();
      this.getPanelBodyHeight();
    }
  }

  componentWillUnmount() {
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
    }
  }

  unsubscribeFromStore: any;

  panelTableRef = React.createRef<HTMLDivElement>();
  listRef: List | null = null;

  updateGrid() {
    cache.clearAll();
    this.listRef?.forceUpdateGrid();
  }

  getFilterOptions() {
    const {filteredImages: images} = this.state;

    const filterOptions: FilterOptions = [
      ...new Set(
        images.map(image => {
          const {debug_status, unwind_status} = image;
          return combineStatus(debug_status, unwind_status);
        })
      ),
    ].map(status => ({
      id: status,
      symbol: <StatusTag status={status} />,
      isChecked: false,
    }));

    this.setState({filterOptions});
  }

  getPanelBodyHeight() {
    const panelTableHeight = this.panelTableRef?.current?.offsetHeight;

    if (!panelTableHeight) {
      return;
    }

    this.setState({panelTableHeight});
  }

  setScrollbarSize = ({size}: ScrollbarPresenceParams) => {
    this.setState({scrollbarSize: size});
  };

  onStoreChange = (store: {filter: string}) => {
    this.setState({searchTerm: store.filter});
  };

  isValidImage(image: Image) {
    // in particular proguard images do not have a code file, skip them
    if (image === null || image.code_file === null || image.type === 'proguard') {
      return false;
    }

    if (getFileName(image.code_file) === 'dyld_sim') {
      // this is only for simulator builds
      return false;
    }

    return true;
  }

  getDebugImages() {
    const {data} = this.props;
    const {images} = data;

    // There are a bunch of images in debug_meta that are not relevant to this
    // component. Filter those out to reduce the noise. Most importantly, this
    // includes proguard images, which are rendered separately.
    const relevantImages = images.filter(image => this.isValidImage(image));

    // Sort images by their start address. We assume that images have
    // non-overlapping ranges. Each address is given as hex string (e.g.
    // "0xbeef").
    relevantImages.sort(
      (a, b) => parseAddress(a.image_addr) - parseAddress(b.image_addr)
    );

    return relevantImages;
  }

  filterImage(image: Image) {
    const searchTerm = this.state.searchTerm.trim().toLowerCase();

    if (searchTerm.length < MIN_FILTER_LEN) {
      // A debug status of `null` indicates that this information is not yet
      // available in an old event. Default to showing the image.
      if (image.debug_status !== ImageStackTraceInfo.UNUSED) {
        return true;
      }

      // An unwind status of `null` indicates that symbolicator did not unwind.
      // Ignore the status in this case.
      if (
        !isNil(image.unwind_status) &&
        image.unwind_status !== ImageStackTraceInfo.UNUSED
      ) {
        return true;
      }

      return false;
    }

    // When searching for an address, check for the address range of the image
    // instead of an exact match.  Note that images cannot be found by index
    // if they are at 0x0.  For those relative addressing has to be used.
    if (searchTerm.indexOf('0x') === 0) {
      const needle = parseAddress(searchTerm);
      if (needle > 0 && image.image_addr !== '0x0') {
        const [startAddress, endAddress] = getImageRange(image as any); // TODO(PRISCILA): remove any
        return needle >= startAddress && needle < endAddress;
      }
    }

    // the searchTerm ending at "!" is the end of the ID search.
    const relMatch = searchTerm.match(/^\s*(.*?)!/); // debug_id!address
    const idSearchTerm = normalizeId(relMatch?.[1] || searchTerm);

    return (
      // Prefix match for identifiers
      normalizeId(image.code_id).indexOf(idSearchTerm) === 0 ||
      normalizeId(image.debug_id).indexOf(idSearchTerm) === 0 ||
      // Any match for file paths
      (image.code_file?.toLowerCase() || '').indexOf(searchTerm) >= 0 ||
      (image.debug_file?.toLowerCase() || '').indexOf(searchTerm) >= 0
    );
  }

  getFilteredImagesByFilter(filteredImages: Array<Image>, filterOptions: FilterOptions) {
    const checkedOptions = new Set(
      filterOptions
        .filter(filterOption => filterOption.isChecked)
        .map(option => option.id)
    );

    if (![...checkedOptions].length) {
      return filteredImages;
    }

    return filteredImages.filter(image => checkedOptions.has(image.debug_status));
  }

  filterImages() {
    const {filterOptions} = this.state;
    // skip null values indicating invalid debug images
    const debugImages = this.getDebugImages();

    const filteredImages = debugImages.filter(image => this.filterImage(image));

    const filteredImagesByFilter = this.getFilteredImagesByFilter(
      filteredImages,
      filterOptions
    );

    this.setState({filteredImages, filteredImagesByFilter}, this.updateGrid);
  }

  getListHeight() {
    const {panelTableHeight} = this.state;

    if (!panelTableHeight || panelTableHeight > PANEL_MAX_HEIGHT) {
      return PANEL_MAX_HEIGHT;
    }

    return panelTableHeight;
  }

  handleChangeFilter = (filterOptions: FilterOptions) => {
    const {filteredImages} = this.state;
    const filteredImagesByFilter = this.getFilteredImagesByFilter(
      filteredImages,
      filterOptions
    );

    this.setState({filterOptions, filteredImagesByFilter}, this.updateGrid);
  };

  handleChangeSearchTerm = (value = '') => {
    DebugMetaActions.updateFilter(value);
  };

  handleOpenImageDetailsModal = (
    image: Image,
    imageAddress: React.ReactElement | null,
    fileName?: string
  ) => {
    const {organization, projectId} = this.props;
    return openModal(
      modalProps => (
        <DebugImageDetails
          {...modalProps}
          image={image}
          title={fileName}
          organization={organization}
          projectId={projectId}
          imageAddress={imageAddress}
        />
      ),
      {
        modalCss,
      }
    );
  };

  renderRow = ({index, key, parent, style}: ListRowProps) => {
    const {filteredImagesByFilter} = this.state;

    return (
      <CellMeasurer
        cache={cache}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        <DebugImage
          style={style}
          image={filteredImagesByFilter[index]}
          onOpenImageDetailsModal={this.handleOpenImageDetailsModal}
        />
      </CellMeasurer>
    );
  };

  renderList() {
    const {filteredImagesByFilter: images, panelTableHeight} = this.state;

    if (!panelTableHeight) {
      return images.map(image => (
        <DebugImage
          key={image.debug_id}
          image={image}
          onOpenImageDetailsModal={this.handleOpenImageDetailsModal}
        />
      ));
    }

    return (
      <AutoSizer disableHeight>
        {({width}) => (
          <StyledList
            ref={(el: List | null) => {
              this.listRef = el;
            }}
            deferredMeasurementCache={cache}
            height={this.getListHeight()}
            overscanRowCount={5}
            rowCount={images.length}
            rowHeight={cache.rowHeight}
            rowRenderer={this.renderRow}
            onScrollbarPresenceChange={this.setScrollbarSize}
            width={width}
            isScrolling={false}
          />
        )}
      </AutoSizer>
    );
  }

  render() {
    const {
      searchTerm,
      filteredImagesByFilter: images,
      scrollbarSize,
      filterOptions,
    } = this.state;

    return (
      <StyledEventDataSection
        type="images-loaded"
        title={
          <TitleWrapper>
            <GuideAnchor target="images-loaded" position="bottom">
              <Title>{t('Images Loaded')}</Title>
            </GuideAnchor>
            <QuestionTooltip size="xs" position="top" title="This is a description" />
          </TitleWrapper>
        }
        actions={
          <Search>
            <Filter options={filterOptions} onFilter={this.handleChangeFilter} />
            <StyledSearchBar
              query={searchTerm}
              onChange={this.handleChangeSearchTerm}
              placeholder={t('Search images')}
            />
          </Search>
        }
        wrapTitle={false}
        isCentered
      >
        <Panel>
          <StyledPanelHeader scrollbarSize={scrollbarSize}>
            <div>{t('Status')}</div>
            <div>{t('Image')}</div>
            <div>{t('Stacktrace')}</div>
            <div>{t('Debug Image')}</div>
          </StyledPanelHeader>
          {!images.length ? (
            <EmptyStateWarning>
              <p>{t('There are no images to be displayed')}</p>
            </EmptyStateWarning>
          ) : (
            <div ref={this.panelTableRef}>{this.renderList()}</div>
          )}
        </Panel>
      </StyledEventDataSection>
    );
  }
}

export default DebugMeta;

const StyledPanelHeader = styled(PanelHeader)<{scrollbarSize?: number}>`
  padding: 0;
  > * {
    padding: ${space(2)};
    ${overflowEllipsis};
  }
  ${p => layout(p.theme)};

  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    ${p => p.scrollbarSize && `padding-right: ${p.scrollbarSize}px;`}
  }
`;

const StyledEventDataSection = styled(EventDataSection)`
  padding-bottom: ${space(4)};

  /* to increase specificity */
  @media (min-width: ${p => p.theme.breakpoints[0]}) {
    padding-bottom: ${space(2)};
  }
`;

// Section Title
const TitleWrapper = styled('div')`
  display: grid;
  grid-template-columns: max-content 1fr;
  grid-gap: ${space(0.5)};
  align-items: center;
  padding: ${space(0.75)} 0;
`;

const Title = styled('h3')`
  margin-bottom: 0;
  padding: 0 !important;
  height: 14px;
`;

// Virtual List
const StyledList = styled(List)<{height: number}>`
  height: auto !important;
  max-height: ${p => p.height}px;
  outline: none;
`;

const Search = styled('div')`
  display: flex;
  width: 100%;
  margin-top: ${space(1)};

  @media (min-width: ${props => props.theme.breakpoints[1]}) {
    width: 400px;
    margin-top: 0;
  }

  @media (min-width: ${props => props.theme.breakpoints[3]}) {
    width: 600px;
  }
`;

// TODO(matej): remove this once we refactor SearchBar to not use css classes
// - it could accept size as a prop
const StyledSearchBar = styled(SearchBar)`
  width: 100%;
  position: relative;
  z-index: ${p => p.theme.zIndex.dropdownAutocomplete.actor};
  .search-input {
    height: 32px;
  }
  .search-input,
  .search-input:focus {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
  .search-clear-form,
  .search-input-icon {
    height: 32px;
    display: flex;
    align-items: center;
  }
`;
