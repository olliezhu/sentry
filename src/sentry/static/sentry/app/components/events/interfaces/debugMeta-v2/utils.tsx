import {ImageStackTraceInfo} from 'app/types/debugImage';

function getStatusWeight(status: ImageStackTraceInfo) {
  switch (status) {
    case null:
    case undefined:
    case ImageStackTraceInfo.UNUSED:
      return 0;
    case ImageStackTraceInfo.FOUND:
      return 1;
    default:
      return 2;
  }
}

export function combineStatus(
  debugStatus: ImageStackTraceInfo,
  unwindStatus: ImageStackTraceInfo
): ImageStackTraceInfo {
  const debugWeight = getStatusWeight(debugStatus);
  const unwindWeight = getStatusWeight(unwindStatus);

  const combined = debugWeight >= unwindWeight ? debugStatus : unwindStatus;
  return combined || ImageStackTraceInfo.UNUSED;
}

export function getFileName(path: string) {
  const directorySeparator = /^([a-z]:\\|\\\\)/i.test(path) ? '\\' : '/';
  return path.split(directorySeparator).pop();
}

export function normalizeId(id?: string) {
  return id?.trim().toLowerCase().replace(/[- ]/g, '') ?? '';
}
