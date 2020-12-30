import React from 'react';

import Tag from 'app/components/tag';
import {t} from 'app/locale';
import {ImageStackTraceInfo} from 'app/types/debugImage';

type Props = {
  status: ImageStackTraceInfo;
};

function StatusTag({status}: Props) {
  switch (status) {
    case ImageStackTraceInfo.OTHER:
    case ImageStackTraceInfo.FETCHING_FAILED:
    case ImageStackTraceInfo.MALFORMED:
    case ImageStackTraceInfo.TIMEOUT: {
      return <Tag type="warning">{t('Problem')}</Tag>;
    }
    case ImageStackTraceInfo.MISSING: {
      return <Tag type="error">{t('Missing')}</Tag>;
    }
    case ImageStackTraceInfo.FOUND: {
      return <Tag type="success">{t('Successful')}</Tag>;
    }
    case ImageStackTraceInfo.UNUSED: {
      return <Tag>{t('Unreferenced')}</Tag>;
    }
    default:
      return <Tag>{t('Unknown')}</Tag>; // This should not happen
  }
}

export default StatusTag;
