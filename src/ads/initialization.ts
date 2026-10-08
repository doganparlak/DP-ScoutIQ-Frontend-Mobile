import mobileAds, { AdsConsent } from 'react-native-google-mobile-ads';
import { AppState } from 'react-native';
import { logAdLifecycle } from './logging';

let initialization: Promise<boolean> | null = null;
let initialized = false;
let retryAt = 0;

export function invalidateAdvertisingConsent() { initialized = false; retryAt = 0; }

// No ad request is made here. Consent and SDK initialization are shared by all loaders.
export function initializeAdvertising(): Promise<boolean> {
  if (initialized) return Promise.resolve(true);
  if (initialization) return initialization;
  if (Date.now() < retryAt || AppState.currentState !== 'active') return Promise.resolve(false);
  initialization = (async () => {
    try {
      try { await AdsConsent.gatherConsent(); }
      catch (error) {
        logAdLifecycle('interstitial', 'consent_update_failed', { code: String((error as { code?: string })?.code ?? 'unknown') });
      }
      // A failed refresh may still have valid consent from a previous session.
      const info = await AdsConsent.getConsentInfo();
      if (!info.canRequestAds) {
        logAdLifecycle('interstitial', 'consent_not_ready');
        retryAt = Date.now() + 60000;
        return false;
      }
      await mobileAds().initialize();
      initialized = true;
      logAdLifecycle('interstitial', 'sdk_initialized');
      return true;
    } catch (error) {
      retryAt = Date.now() + 60000;
      logAdLifecycle('interstitial', 'initialization_failed', { code: String((error as { code?: string })?.code ?? 'unknown') });
      return false;
    }
  })().finally(() => { initialization = null; });
  return initialization;
}
