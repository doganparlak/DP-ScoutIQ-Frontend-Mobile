// src/ads/rewarded.ts
import { RewardedAd, AdEventType, RewardedAdEventType } from 'react-native-google-mobile-ads';
import { InteractionManager, Keyboard, Platform } from 'react-native';
import { logAdLifecycle } from './logging';

const IOS_REWARDED = 'ca-app-pub-2754612075301490/7917252456';
// REAL: ca-app-pub-2754612075301490/7917252456
// TEST: ca-app-pub-3940256099942544/1712485313
const ANDROID_REWARDED = 'ca-app-pub-2754612075301490/7680436978';
// REAL ca-app-pub-2754612075301490/7680436978
// TEST ca-app-pub-3940256099942544/5224354917

const UNIT_ID = Platform.OS === 'ios' ? IOS_REWARDED : ANDROID_REWARDED;

let ad: RewardedAd | null = null;
let loaded = false;
let showing = false;
let pendingShow = false;

function getAd() {
  if (ad) return ad;

  ad = RewardedAd.createForAdRequest(UNIT_ID);

  ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
    loaded = true;
    pendingShow = false;
    logAdLifecycle('rewarded', 'loaded');
  });

  ad.addAdEventListener(AdEventType.OPENED, () => {
    showing = true;
    pendingShow = false;
    logAdLifecycle('rewarded', 'opened');
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false;
    showing = false;
    pendingShow = false; 
    logAdLifecycle('rewarded', 'closed');
    logAdLifecycle('rewarded', 'load_started', { reason: 'preload_next' });
    ad?.load(); // preload next
  });

  ad.addAdEventListener(AdEventType.ERROR, (e) => {
    loaded = false;
    showing = false;
    pendingShow = false;
    const errorDetails = e as Error & { code?: string | number };
    logAdLifecycle('rewarded', 'error', {
      code: String(errorDetails?.code ?? 'unknown'),
      message: String(e?.message ?? 'unknown'),
    });
  });

  return ad;
}

export function preloadRewarded() {
  logAdLifecycle('rewarded', 'load_started', { reason: 'preload' });
  getAd().load();
}

export function isRewardedLoaded() {
  return loaded;
}

/**
 * Shows rewarded ad safely.
 * Resolves with:
 *  - rewarded: true if user earned reward
 *  - rewarded: false if ad shown but no reward (rare)
 *  - shown: false if not ready (so you can skip / show message)
 */
export function showRewardedSafely(): Promise<{ shown: boolean; rewarded: boolean }> {
  if (showing || pendingShow) {
    logAdLifecycle('rewarded', 'show_skipped', { reason: 'busy' });
    return Promise.resolve({ shown: false, rewarded: false });
  }

  const a = getAd();

  if (!loaded) {
    logAdLifecycle('rewarded', 'show_skipped', { reason: 'not_ready' });
    logAdLifecycle('rewarded', 'load_started', { reason: 'show_not_ready' });
    a.load();
    return Promise.resolve({ shown: false, rewarded: false });
  }

  pendingShow = true;
  Keyboard.dismiss();

  return new Promise((resolve) => {
    let gotReward = false;
    let finished = false;

    const cleanup = () => {
      subReward?.();
      subClosed?.();
      subError?.();
    };

    const finish = (shown: boolean, rewarded: boolean) => {
      if (finished) return;
      finished = true;
      pendingShow = false;
      cleanup();
      resolve({ shown, rewarded });
    };

    const subReward = a.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      gotReward = true;
      logAdLifecycle('rewarded', 'earned_reward');
    });

    const subClosed = a.addAdEventListener(AdEventType.CLOSED, () => {
      finish(true, gotReward);
    });

    const subError = a.addAdEventListener(AdEventType.ERROR, () => {
      finish(false, false);
    });

    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        if (!loaded || showing) {
          pendingShow = false;
          logAdLifecycle('rewarded', 'show_skipped', { reason: loaded ? 'already_showing' : 'not_loaded' });
          finish(false, false);
          return;
        }
        logAdLifecycle('rewarded', 'show_called');
        a.show();
      }, 400);
    });
  });
}

export function ensureRewardedLoaded(timeoutMs = 15000): Promise<boolean> {
  const a = getAd();

  // kick load if needed
  if (!loaded) {
    logAdLifecycle('rewarded', 'load_started', { reason: 'ensure_loaded' });
    a.load();
  }
  if (loaded) return Promise.resolve(true);

  return new Promise((resolve) => {
    let done = false;

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      subLoad?.();
      subErr?.();
      if (timer) clearTimeout(timer);
      resolve(ok);
    };

    const subLoad = a.addAdEventListener(RewardedAdEventType.LOADED, () => finish(true));
    const subErr = a.addAdEventListener(AdEventType.ERROR, () => finish(false));

    const timer = setTimeout(() => finish(loaded), timeoutMs);
  });
}
