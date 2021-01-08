import React from 'react';
import omit from 'lodash/omit';

import {Client} from 'app/api';
import GenericDiscoverQuery, {
  DiscoverQueryProps,
  GenericChildrenProps,
} from 'app/utils/discover/genericDiscoverQuery';
import withApi from 'app/utils/withApi';

import {HistogramData} from './types';

type Histograms = Record<string, HistogramData[]>;

type MeasurementsData = {
  measurements: string[];
  numBuckets: number;
  min?: number;
  max?: number;
  precision?: number;
  dataFilter?: string;
};

type RequestProps = DiscoverQueryProps & MeasurementsData;

type ChildrenProps = Omit<GenericChildrenProps<MeasurementsData>, 'tableData'> & {
  histograms: Histograms | null;
};

type Props = RequestProps & {
  children: (props: ChildrenProps) => React.ReactNode;
};

function getMeasurementsHistogramRequestPayload(props: any) {
  const {
    measurements,
    numBuckets,
    min,
    max,
    precision,
    dataFilter,
    eventView,
    location,
  } = props;
  const baseApiPayload = {
    field: measurements,
    numBuckets,
    min,
    max,
    precision,
    dataFilter,
  };
  const additionalApiPayload = omit(eventView.getEventsAPIPayload(location), [
    'field',
    'sort',
    'per_page',
  ]);
  const apiPayload = Object.assign(baseApiPayload, additionalApiPayload);
  return apiPayload;
}

function beforeFetch(api: Client) {
  api.clear();
}

function MeasurementsHistogramQuery(props: Props) {
  const {children, measurements} = props;
  if (measurements.length === 0) {
    return (
      <React.Fragment>
        {children({
          isLoading: false,
          error: null,
          pageLinks: null,
          histograms: {},
        })}
      </React.Fragment>
    );
  }

  return (
    <GenericDiscoverQuery<Histograms, MeasurementsData>
      route="events-histogram"
      getRequestPayload={getMeasurementsHistogramRequestPayload}
      beforeFetch={beforeFetch}
      {...omit(props, 'children')}
    >
      {({tableData, ...rest}) => {
        return props.children({histograms: tableData, ...rest});
      }}
    </GenericDiscoverQuery>
  );
}

export default withApi(MeasurementsHistogramQuery);
