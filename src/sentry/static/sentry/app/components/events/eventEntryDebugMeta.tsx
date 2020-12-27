import React from 'react';

import DebugMetaInterface from 'app/components/events/interfaces/debugMeta';
import DebugMetaInterfaceV2 from 'app/components/events/interfaces/debugMeta-v2';
import {Organization} from 'app/types';

type Props = {
  organization: Organization;
} & React.ComponentProps<typeof DebugMetaInterface>;

function EventEntryDebugMeta({organization, data, ...props}: Props) {
  const hasImagesLoadedV2Feature = !!organization.features?.includes('images-loaded-v2');

  if (hasImagesLoadedV2Feature) {
    return (
      <DebugMetaInterfaceV2
        organization={organization}
        {...props}
        data={data as React.ComponentProps<typeof DebugMetaInterfaceV2>['data']}
      />
    );
  }

  return <DebugMetaInterface organization={organization} {...props} />;
}

export default EventEntryDebugMeta;
