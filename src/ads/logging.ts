type AdKind = 'interstitial' | 'rewarded';

const LOG_PREFIX = '[ADS]';

export function logAdLifecycle(kind: AdKind, event: string, details?: Record<string, string | number | boolean>) {
  if (details) {
    console.info(LOG_PREFIX, kind, event, details);
    return;
  }

  console.info(LOG_PREFIX, kind, event);
}
