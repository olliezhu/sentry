import React from 'react';

import Tooltip from 'app/components/tooltip';
import {IconCheckmark, IconClose, IconInfo, IconWarning} from 'app/icons';
import {t} from 'app/locale';
import {ImageStackTraceInfo} from 'app/types/debugImage';

type Props = {
  status: ImageStackTraceInfo;
};

function StacktraceStatusIcon({status}: Props) {
  switch (status) {
    case ImageStackTraceInfo.TIMEOUT:
    case ImageStackTraceInfo.FETCHING_FAILED: {
      return (
        <Tooltip
          containerDisplayMode="inline-flex"
          title={t('The debug information file for this image could not be downloaded')}
        >
          <IconClose color="red300" size="xs" />
        </Tooltip>
      );
    }
    case ImageStackTraceInfo.MALFORMED: {
      return (
        <Tooltip
          containerDisplayMode="inline-flex"
          title={t('The debug information file for this image failed to process')}
        >
          <IconClose color="red300" size="xs" />
        </Tooltip>
      );
    }
    case ImageStackTraceInfo.MISSING: {
      return (
        <Tooltip
          containerDisplayMode="inline-flex"
          title={t('No debug information could be found in any of the specified sources')}
        >
          <IconWarning color="yellow300" size="xs" />
        </Tooltip>
      );
    }
    case ImageStackTraceInfo.FOUND: {
      return (
        <Tooltip
          containerDisplayMode="inline-flex"
          title={t(
            'Debug information for this image was found and successfully processed'
          )}
        >
          <IconCheckmark color="green300" size="xs" />
        </Tooltip>
      );
    }
    case ImageStackTraceInfo.UNUSED: {
      return (
        <Tooltip
          containerDisplayMode="inline-flex"
          title={t('The image was not required for processing the stack trace')}
        >
          <IconInfo color="blue300" size="xs" />
        </Tooltip>
      );
    }
    case ImageStackTraceInfo.OTHER: {
      return (
        <Tooltip
          containerDisplayMode="inline-flex"
          title={t('An internal error occurred while handling this image')}
        >
          <IconClose color="red300" size="xs" />
        </Tooltip>
      );
    }
    default:
      return null; // This should not happen
  }
}

export default StacktraceStatusIcon;
