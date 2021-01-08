import React from 'react';
import {withRouter, WithRouterProps} from 'react-router';
import createReactClass from 'create-react-class';
import Reflux from 'reflux';

import {loadSearchMap} from 'app/actionCreators/formSearch';
import FormSearchStore, {FormSearchField} from 'app/stores/formSearchStore';
import {createFuzzySearch, isResultWithMatches} from 'app/utils/createFuzzySearch';
import replaceRouterParams from 'app/utils/replaceRouterParams';

import {ChildProps, Result} from './types';

type Props = WithRouterProps<{orgId: string}> & {
  /**
   * search term
   */
  query: string;
  children: (props: ChildProps) => React.ReactElement;
  /**
   * fusejs options.
   */
  searchOptions?: Fuse.FuseOptions<FormSearchField>;
  /**
   * List of form fields to search
   */
  searchMap?: FormSearchField[];
};

type State = {
  fuzzy: null | Fuse<FormSearchField, Fuse.FuseOptions<FormSearchField>>;
};

class FormSource extends React.Component<Props, State> {
  static defaultProps = {
    searchOptions: {},
  };
  state: State = {
    fuzzy: null,
  };

  componentDidMount() {
    this.createSearch(this.props.searchMap);
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.searchMap !== prevProps.searchMap) {
      this.createSearch(this.props.searchMap);
    }
  }

  async createSearch(searchMap: Props['searchMap']) {
    this.setState({
      fuzzy: await createFuzzySearch<FormSearchField>(searchMap || [], {
        ...this.props.searchOptions,
        keys: ['title', 'description'],
      }),
    });
  }

  render() {
    const {searchMap, query, params, children} = this.props;

    const results: Result[] = [];
    if (this.state.fuzzy) {
      const rawResults = this.state.fuzzy.search(query);
      rawResults.forEach(value => {
        if (!isResultWithMatches<FormSearchField>(value)) {
          return;
        }
        const {item, ...rest} = value;
        results.push({
          item: {
            ...item,
            sourceType: 'field',
            resultType: 'field',
            to: `${replaceRouterParams(item.route, params)}#${encodeURIComponent(
              item.field.name
            )}`,
          },
          ...rest,
        });
      });
    }

    return children({
      isLoading: searchMap === null,
      allResults: [],
      results,
    });
  }
}

type ContainerProps = Omit<Props, 'searchMap'>;
type ContainerState = Pick<Props, 'searchMap'>;

const FormSourceContainer = withRouter(
  createReactClass<ContainerProps, ContainerState>({
    displayName: 'FormSourceContainer',
    mixins: [Reflux.connect(FormSearchStore, 'searchMap') as any],

    componentDidMount() {
      // Loads form fields
      loadSearchMap();
    },

    render() {
      return <FormSource searchMap={this.state.searchMap} {...this.props} />;
    },
  })
);

export default FormSourceContainer;
