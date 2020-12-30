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

import {openModal} from 'app/actionCreators/modal';
import GuideAnchor from 'app/components/assistant/guideAnchor';
import Button from 'app/components/button';
import EmptyStateWarning from 'app/components/emptyStateWarning';
import EventDataSection from 'app/components/events/eventDataSection';
import {getImageRange, parseAddress} from 'app/components/events/interfaces/utils';
import {Panel, PanelHeader} from 'app/components/panels';
import QuestionTooltip from 'app/components/questionTooltip';
import SearchBar from 'app/components/searchBar';
import {IconWarning} from 'app/icons/iconWarning';
import {t} from 'app/locale';
import overflowEllipsis from 'app/styles/overflowEllipsis';
import space from 'app/styles/space';
import {Event, Organization, Project} from 'app/types';
import {Image, ImageStackTraceInfo} from 'app/types/debugImage';
import EmptyMessage from 'app/views/settings/components/emptyMessage';

import StatusTag from './debugImage/statusTag';
import DebugImage from './debugImage';
import DebugImageDetails, {modalCss} from './debugImageDetails';
import Filter from './filter';
import layout from './layout';
import {combineStatus, getFileName, normalizeId} from './utils';

const PANEL_MAX_HEIGHT = 400;

const cache = new CellMeasurerCache({fixedWidth: true, defaultHeight: 81});

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
    cache.clearAll();
    this.getRelevantImages();
  }

  componentDidUpdate(_prevProps: Props, prevState: State) {
    if (prevState.filteredImages.length === 0 && this.state.filteredImages.length > 0) {
      this.getPanelBodyHeight();
    }
  }

  unsubscribeFromStore: any;
  panelTableRef = React.createRef<HTMLDivElement>();
  listRef: List | null = null;

  updateGrid() {
    cache.clearAll();
    this.listRef?.forceUpdateGrid();
  }

  setScrollbarSize = ({size}: ScrollbarPresenceParams) => {
    this.setState({scrollbarSize: size});
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

  filterImage(image: Image, searchTerm: string) {
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

  getRelevantImages() {
    const {data} = this.props;
    const {images} = data;

    // There are a bunch of images in debug_meta that are not relevant to this
    // component. Filter those out to reduce the noise. Most importantly, this
    // includes proguard images, which are rendered separately.
    const relevantImages = images.filter(this.isValidImage);

    // Sort images by their start address. We assume that images have
    // non-overlapping ranges. Each address is given as hex string (e.g.
    // "0xbeef").
    relevantImages.sort(
      (a, b) => parseAddress(a.image_addr) - parseAddress(b.image_addr)
    );

    const unusedImages: Array<Image> = [];

    const usedImages = relevantImages.filter(image => {
      if (image.debug_status === ImageStackTraceInfo.UNUSED) {
        unusedImages.push(image);
        return false;
      }
      return true;
    });

    const filteredImages = [...usedImages, ...unusedImages];

    const filterOptions = this.getFilterOptions(filteredImages);

    this.setState({
      filteredImages,
      filterOptions,
      filteredImagesByFilter: filteredImages,
      filteredImagesBySearch: filteredImages,
    });
  }

  getFilterOptions(images: Array<Image>): FilterOptions {
    return [
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
  }

  getPanelBodyHeight() {
    const panelTableHeight = this.panelTableRef?.current?.offsetHeight;

    if (!panelTableHeight) {
      return;
    }

    this.setState({panelTableHeight});
  }

  getListHeight() {
    const {panelTableHeight} = this.state;

    if (!panelTableHeight || panelTableHeight > PANEL_MAX_HEIGHT) {
      return PANEL_MAX_HEIGHT;
    }

    return panelTableHeight;
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

  handleChangeFilter = (filterOptions: FilterOptions) => {
    const {filteredImagesBySearch} = this.state;
    const filteredImagesByFilter = this.getFilteredImagesByFilter(
      filteredImagesBySearch,
      filterOptions
    );

    this.setState({filterOptions, filteredImagesByFilter}, this.updateGrid);
  };

  handleChangeSearchTerm = (searchTerm = '') => {
    const {filteredImages, filterOptions} = this.state;
    const filteredImagesBySearch = filteredImages.filter(image =>
      this.filterImage(image, searchTerm)
    );
    const filteredImagesByFilter = this.getFilteredImagesByFilter(
      filteredImagesBySearch,
      filterOptions
    );

    this.setState({
      searchTerm,
      filteredImagesBySearch,
      filteredImagesByFilter,
    });
  };

  handleResetFilter = () => {
    const {searchTerm, filterOptions} = this.state;
    this.setState(
      {
        filterOptions: filterOptions.map(filterOption => ({
          ...filterOption,
          isChecked: false,
        })),
      },
      () => this.handleChangeSearchTerm(searchTerm)
    );
  };

  handleResetSearchBar = () => {
    this.setState(prevState => ({
      searchTerm: '',
      filteredImagesByFilter: prevState.filteredImages,
      filteredImagesBySearch: prevState.filteredImages,
    }));
  };

  renderListItem = ({index, key, parent, style}: ListRowProps) => {
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
            rowRenderer={this.renderListItem}
            onScrollbarPresenceChange={this.setScrollbarSize}
            width={width}
            isScrolling={false}
          />
        )}
      </AutoSizer>
    );
  }

  renderContent() {
    const {searchTerm, filteredImagesByFilter: images, filterOptions} = this.state;

    if (searchTerm && !images.length) {
      const hasActiveFilter = filterOptions.find(filterOption => filterOption.isChecked);
      return (
        <EmptyMessage
          icon={<IconWarning size="xl" />}
          action={
            hasActiveFilter ? (
              <Button onClick={this.handleResetFilter} priority="primary">
                {t('Reset Filter')}
              </Button>
            ) : (
              <Button onClick={this.handleResetSearchBar} priority="primary">
                {t('Clear Search Bar')}
              </Button>
            )
          }
        >
          {t('Sorry, no images match your search query.')}
        </EmptyMessage>
      );
    }

    if (!images.length) {
      return (
        <EmptyStateWarning>
          <p>{t('There are no images to be displayed')}</p>
        </EmptyStateWarning>
      );
    }

    return <div ref={this.panelTableRef}>{this.renderList()}</div>;
  }

  render() {
    const {searchTerm, scrollbarSize, filterOptions} = this.state;

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
              onChange={value => this.handleChangeSearchTerm(value.trim().toLowerCase())}
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
          {this.renderContent()}
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
  margin-bottom: 0 !important;
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
