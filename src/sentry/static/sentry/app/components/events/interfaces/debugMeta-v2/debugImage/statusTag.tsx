import React from 'react';

import Tag from 'app/components/tag';
import {t} from 'app/locale';
import {Image, ImageStackTraceInfo} from 'app/types/debugImage';

import {combineStatus} from '../utils';

type Props = {
  image: Image;
};

function StatusTag({image}: Props) {
  const {debug_status, unwind_status} = image;
  const status = combineStatus(debug_status, unwind_status);

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
