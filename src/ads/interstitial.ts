import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { Platform, InteractionManager, Keyboard } from 'react-native';
import { logAdLifecycle } from './logging';

const IOS_INTERSTITIAL = 'ca-app-pub-2754612075301490/1118898057'; 
// REAL ca-app-pub-2754612075301490/1118898057
// TEST ca-app-pub-3940256099942544/4411468910
const ANDROID_INTERSTITIAL = 'ca-app-pub-2754612075301490/6842816261';
// REAL ca-app-pub-2754612075301490/6842816261
// TEST ca-app-pub-3940256099942544/1033173712

const UNIT_ID = Platform.OS === 'ios'
  ? IOS_INTERSTITIAL
  : ANDROID_INTERSTITIAL;

let ad: InterstitialAd | null = null;
let loaded = false;
let loading = false;
let showing = false;
let pendingShow = false;

function getAd() {
  if (ad) return ad;

  ad = InterstitialAd.createForAdRequest(UNIT_ID);

  ad.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
    loading = false;
    logAdLifecycle('interstitial', 'loaded');
  });

  ad.addAdEventListener(AdEventType.OPENED, () => {
    showing = true;
    pendingShow = false;
    logAdLifecycle('interstitial', 'opened');
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false;
    showing = false;
    logAdLifecycle('interstitial', 'closed');
  });

  ad.addAdEventListener(AdEventType.ERROR, (e) => {
    loaded = false;
    loading = false;
    showing = false;
    pendingShow = false;
    const errorDetails = e as Error & { code?: string | number };
    logAdLifecycle('interstitial', 'error', {
      code: String(errorDetails?.code ?? 'unknown'),
      message: String(e?.message ?? 'unknown'),
    });
  });

  return ad;
}

function loadInterstitial(timeoutMs = 3000): Promise<boolean> {
  const a = getAd();

  if (loaded) return Promise.resolve(true);
  if (!loading) {
    loading = true;
    logAdLifecycle('interstitial', 'load_started');
    a.load();
  }

  return new Promise((resolve) => {
    let done = false;

    const cleanup = () => {
      subLoaded?.();
      subError?.();
      clearTimeout(timer);
    };

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(ok);
    };

    const subLoaded = a.addAdEventListener(AdEventType.LOADED, () => finish(true));
    const subError = a.addAdEventListener(AdEventType.ERROR, () => finish(false));
    const timer = setTimeout(() => finish(loaded), timeoutMs);
  });
}

export function prepareInterstitial() {
  void loadInterstitial();
}

export function showInterstitialAndWaitSafely(): Promise<boolean> {
  if (showing || pendingShow) {
    logAdLifecycle('interstitial', 'show_skipped', { reason: 'busy' });
    return Promise.resolve(false);
  }

  const a = getAd();

  return new Promise(async (resolve) => {
    const ready = await loadInterstitial();
    if (!ready || showing || pendingShow) {
      logAdLifecycle('interstitial', 'show_skipped', { reason: ready ? 'busy' : 'not_ready' });
      resolve(false);
      return;
    }

    pendingShow = true;
    Keyboard.dismiss();

    let finished = false;

    const cleanup = () => {
      subClosed?.();
      subError?.();
    };

    const finish = (shown: boolean) => {
      if (finished) return;
      finished = true;
      pendingShow = false;
      cleanup();
      resolve(shown);
    };

    const subClosed = a.addAdEventListener(AdEventType.CLOSED, () => {
      finish(true);
    });

    const subError = a.addAdEventListener(AdEventType.ERROR, () => {
      finish(false);
    });

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        if (!loaded || showing) {
          logAdLifecycle('interstitial', 'show_skipped', { reason: loaded ? 'already_showing' : 'not_loaded' });
          finish(false);
          return;
        }
        logAdLifecycle('interstitial', 'show_called');
        a.show();
      }, 400);
    });
  });
}
