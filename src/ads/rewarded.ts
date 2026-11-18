import { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { AppState, Platform } from 'react-native';
import { initializeAdvertising } from './initialization';
import { logAdLifecycle } from './logging';

const UNIT_ID = __DEV__ ? TestIds.REWARDED : Platform.OS === 'ios'
  ? 'ca-app-pub-2754612075301490/7917252456' : 'ca-app-pub-2754612075301490/7680436978';
const MAX_AGE_MS = 55 * 60 * 1000;
const LOAD_TIMEOUT_MS = 6000;

let reusableAd: RewardedAd | null = null;
let cached: { ad: RewardedAd; loadedAt: number } | null = null;
let loading: Promise<boolean> | null = null;
let showing = false;
let retryAt = 0;
let consentVersion = 0;

function ready() {
  if (cached && Date.now() - cached.loadedAt >= MAX_AGE_MS) {
    cached = null;
    reusableAd = null;
  }
  return cached;
}

export function invalidateRewarded() {
  consentVersion++;
  reusableAd = null;
  cached = null;
  retryAt = 0;
}

function loadRewarded(): Promise<boolean> {
  if (ready()) return Promise.resolve(true);
  if (loading) return loading;
  if (showing || Date.now() < retryAt || AppState.currentState !== 'active') return Promise.resolve(false);

  const version = consentVersion;
  loading = initializeAdvertising().then(allowed => {
    if (!allowed || version !== consentVersion || AppState.currentState !== 'active') return false;
    return new Promise<boolean>(resolve => {
      const ad = reusableAd ??= RewardedAd.createForAdRequest(UNIT_ID);
      const unsubscribe: (() => void)[] = [];
      const finish = (loaded: boolean) => {
        clearTimeout(timer);
        unsubscribe.splice(0).forEach(remove => remove());
        if (version !== consentVersion) { resolve(false); return; }
        if (loaded) cached = { ad, loadedAt: Date.now() };
        else retryAt = Date.now() + 30000;
        logAdLifecycle('rewarded', loaded ? 'loaded' : 'load_failed');
        resolve(loaded);
      };
      const timer = setTimeout(() => {
        reusableAd = null;
        finish(false);
      }, LOAD_TIMEOUT_MS);
      unsubscribe.push(ad.addAdEventListener(RewardedAdEventType.LOADED, () => finish(true)));
      unsubscribe.push(ad.addAdEventListener(AdEventType.ERROR, () => finish(false)));
      logAdLifecycle('rewarded', 'load_started');
      try { ad.load(); }
      catch { finish(false); }
    });
  }).catch(() => false).finally(() => { loading = null; });
  return loading;
}

export function preloadRewarded() {
  void loadRewarded();
}

export async function showRewardedSafely(isActive: () => boolean): Promise<'rewarded' | 'skipped' | 'unavailable' | 'cancelled'> {
  let waitTimer: ReturnType<typeof setTimeout> | undefined;
  const loaded = await Promise.race([
    loadRewarded(),
    new Promise<false>(resolve => { waitTimer = setTimeout(() => resolve(false), LOAD_TIMEOUT_MS); }),
  ]).finally(() => clearTimeout(waitTimer));
  if (!isActive() || AppState.currentState !== 'active' || showing) return 'cancelled';
  const candidate = ready();
  if (!loaded || !candidate) return 'unavailable';

  cached = null;
  showing = true;
  try {
    return await new Promise(resolve => {
      const {ad} = candidate;
      let earned = false;
      let settled = false;
      const unsubscribe: (() => void)[] = [];
      const finish = (result: 'rewarded' | 'skipped' | 'unavailable') => {
        if (settled) return;
        settled = true;
        clearTimeout(openTimer);
        unsubscribe.splice(0).forEach(remove => remove());
        logAdLifecycle('rewarded', result);
        resolve(result);
      };
      const openTimer = setTimeout(() => {
        reusableAd = null;
        finish('unavailable');
      }, LOAD_TIMEOUT_MS);
      unsubscribe.push(ad.addAdEventListener(AdEventType.OPENED, () => clearTimeout(openTimer)));
      unsubscribe.push(ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
      unsubscribe.push(ad.addAdEventListener(AdEventType.CLOSED, () => finish(earned ? 'rewarded' : 'skipped')));
      unsubscribe.push(ad.addAdEventListener(AdEventType.ERROR, () => finish('unavailable')));
      try {
        ad.show().catch(() => { reusableAd = null; finish('unavailable'); });
      } catch {
        reusableAd = null;
        finish('unavailable');
      }
    });
  } catch {
    return 'unavailable';
  } finally {
    showing = false;
  }
}
