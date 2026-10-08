import { Platform } from 'react-native';
import { getAnalytics, logEvent } from '@react-native-firebase/analytics';
type AdKind = 'interstitial' | 'rewarded';

export function logAdLifecycle(kind: AdKind, event: string, details?: Record<string, string | number | boolean>) {
  if (__DEV__) console.info('[ADS]', kind, event, details ?? {});
  // Only controlled diagnostics; never player data, emails or raw SDK error messages.
  const safe = Object.fromEntries(Object.entries(details ?? {}).filter(([key]) => key !== 'message')
    .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 100) : value]));
  if (!__DEV__) {
    try {
      void Promise.resolve(logEvent(getAnalytics(), 'scoutwise_ad_lifecycle', { kind, stage: event, platform: Platform.OS, ...safe })).catch(() => {});
    } catch { /* Analytics must never interrupt an ad or a user action. */ }
  }
}
