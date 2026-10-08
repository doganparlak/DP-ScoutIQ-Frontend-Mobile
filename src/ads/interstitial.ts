import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import { AppState, InteractionManager, Keyboard, Platform } from 'react-native';
import { logAdLifecycle } from './logging';
import { initializeAdvertising } from './initialization';
import { acquireAdPresentation, releaseAdPresentation, ownsAdPresentation, AdFlowCancelledError } from './presentation';

const UNIT_ID = __DEV__ ? TestIds.INTERSTITIAL : Platform.OS === 'ios'
  ? 'ca-app-pub-2754612075301490/1118898057' : 'ca-app-pub-2754612075301490/6842816261';
const MAX_AGE_MS = 55 * 60 * 1000;
let cached: { ad: InterstitialAd; loadedAt: number; dispose: () => void } | null = null;
let loadTask: Promise<boolean> | null = null;
let failures = 0, retryAt = 0, consentGeneration = 0;

function failLoad(error: unknown, action: string) {
  failures++;
  const delay = Math.min(300000, 30000 * 2 ** Math.min(failures - 1, 4));
  retryAt = Date.now() + delay;
  logAdLifecycle('interstitial', 'load_failed', { action, code: String((error as { code?: string | number })?.code ?? 'unknown'), retry_ms: delay });
}
function ready() {
  if (cached && Date.now() - cached.loadedAt >= MAX_AGE_MS) {
    cached.dispose(); cached = null;
    logAdLifecycle('interstitial', 'cache_expired');
  }
  return !!cached;
}
function startLoad(action: string): Promise<boolean> {
  if (ready()) return Promise.resolve(true);
  if (loadTask) return loadTask;
  if (AppState.currentState !== 'active' || Date.now() < retryAt) return Promise.resolve(false);
  const generation = consentGeneration;
  // Defer work until loadTask is assigned, so even synchronous failures cannot create duplicate loads.
  loadTask = Promise.resolve().then(async () => {
    if (!await initializeAdvertising() || AppState.currentState !== 'active') return false;
    return new Promise<boolean>(resolve => {
      const started = Date.now();
      let candidate: InterstitialAd;
      try { candidate = InterstitialAd.createForAdRequest(UNIT_ID); }
      catch (error) { failLoad(error, action); resolve(false); return; }
      let settled = false;
      const subs: (() => void)[] = [];
      const dispose = () => subs.splice(0).forEach(unsubscribe => unsubscribe());
      const finish = (ok: boolean) => {
        if (settled) return;
        settled = true; clearTimeout(watchdog);
        if (!ok) dispose();
        resolve(ok);
      };
      const watchdog = setTimeout(() => {
        failLoad({ code: 'load_watchdog' }, action); finish(false);
      }, 60000);
      subs.push(candidate.addAdEventListener(AdEventType.LOADED, () => {
        if (generation !== consentGeneration) { finish(false); return; }
        cached = { ad: candidate, loadedAt: Date.now(), dispose };
        failures = 0; retryAt = 0;
        logAdLifecycle('interstitial', 'loaded', { action, duration_ms: Date.now() - started });
        finish(true);
      }));
      subs.push(candidate.addAdEventListener(AdEventType.ERROR, error => {
        if (!settled) { failLoad(error, action); finish(false); }
        else if (cached?.ad === candidate) { cached.dispose(); cached = null; }
      }));
      subs.push(candidate.addAdEventListener(AdEventType.PAID, () => logAdLifecycle('interstitial', 'paid_impression', { action })));
      logAdLifecycle('interstitial', 'load_started', { action });
      try { candidate.load(); } catch (error) { failLoad(error, action); finish(false); }
    });
  }).catch(error => { failLoad(error, action); return false; }).finally(() => { loadTask = null; });
  return loadTask;
}

export function invalidateInterstitial() { consentGeneration++; if (cached) { cached.dispose(); cached = null; } }

export function prepareInterstitial(action = 'next_action') {
  // Never reload a cached ad or start a second load. Failures retry only at a future eligible action.
  void startLoad(action);
}
export type InterstitialResult = 'shown' | 'unavailable' | 'busy' | 'cancelled';
type ShowOptions = { action?: string; isActive?: () => boolean; presentationOwner?: symbol };

export async function showInterstitial(options: ShowOptions = {}): Promise<InterstitialResult> {
  const action = options.action ?? 'legacy_action';
  const active = () => AppState.currentState === 'active' && (options.isActive?.() ?? true);
  if (!active()) return 'cancelled';
  const borrowed = ownsAdPresentation(options.presentationOwner);
  const owner = borrowed ? options.presentationOwner! : acquireAdPresentation();
  if (!owner) { logAdLifecycle('interstitial', 'show_skipped', { action, reason: 'busy' }); return 'busy'; }
  try {
    if (!await initializeAdvertising()) return active() ? 'unavailable' : 'cancelled';
    if (!active()) return 'cancelled';
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const loaded = await Promise.race([
      startLoad(action),
      new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), 3000); }),
    ]).finally(() => clearTimeout(timeout));
    if (!active()) return 'cancelled';
    if (!loaded || !ready()) {
      logAdLifecycle('interstitial', 'show_skipped', { action, reason: loadTask ? 'load_timeout' : Date.now() < retryAt ? 'retry_cooldown' : 'unavailable' });
      return 'unavailable';
    }
    const item = cached!;
    // A loaded ad is single use. Keep its event listeners until presentation finishes.
    cached = null;
    Keyboard.dismiss();
    const result = await new Promise<InterstitialResult>(resolve => {
      let finished = false, opened = false;
      let delay: ReturnType<typeof setTimeout> | undefined;
      const subs: (() => void)[] = [];
      const finish = (result: InterstitialResult) => {
        if (finished) return;
        finished = true; clearTimeout(timer); clearTimeout(delay);
        interaction.cancel(); subs.forEach(unsubscribe => unsubscribe()); appState.remove();
        // A cancelled pre-presentation attempt can still be reused.
        if (result === 'cancelled' && !showCalled) cached = item;
        else item.dispose();
        if (result === 'shown') setTimeout(() => resolve(result), 450);
        else resolve(result);
      };
      let showCalled = false;
      const interaction = InteractionManager.runAfterInteractions(() => {
        delay = setTimeout(() => {
          if (finished) return;
          if (!active()) { finish('cancelled'); return; }
          showCalled = true;
          logAdLifecycle('interstitial', 'show_called', { action });
          try {
            void Promise.resolve(item.ad.show()).catch(error => {
              logAdLifecycle('interstitial', 'show_failed', { action, code: String((error as { code?: string })?.code ?? 'unknown') });
              finish('unavailable');
            });
          } catch (error) {
            logAdLifecycle('interstitial', 'show_failed', { action, code: String((error as {code?: string})?.code ?? 'unknown') });
            finish('unavailable');
          }
        }, 400);
      });
      // Bound preparation/presentation only, never time out an ad being watched.
      const timer = setTimeout(() => {
        logAdLifecycle('interstitial', 'presentation_timeout', { action }); finish('unavailable');
      }, 10000);
      const appState = AppState.addEventListener('change', state => {
        if (state !== 'active' && !showCalled) finish('cancelled');
      });
      subs.push(item.ad.addAdEventListener(AdEventType.OPENED, () => {
        opened = true; clearTimeout(timer); logAdLifecycle('interstitial', 'opened', { action });
      }));
      subs.push(item.ad.addAdEventListener(AdEventType.CLOSED, () => {
        logAdLifecycle('interstitial', 'closed', { action }); finish(opened ? 'shown' : 'unavailable');
      }));
      subs.push(item.ad.addAdEventListener(AdEventType.ERROR, error => {
        logAdLifecycle('interstitial', 'show_failed', { action, code: String((error as { code?: string })?.code ?? 'unknown') }); finish('unavailable');
      }));
    });
    if (result === 'shown' && active()) prepareInterstitial('after_close');
    return result;
  } finally { if (!borrowed) releaseAdPresentation(owner); }
}

// Preserve legacy access rules. Cancellation is distinct from a failed ad: no upsell on navigation or competing presentations.
export async function showInterstitialAndWaitSafely(options: ShowOptions = {}): Promise<boolean> {
  const result = await showInterstitial(options);
  if (result === 'busy' || result === 'cancelled' || AppState.currentState !== 'active' || options.isActive?.() === false) throw new AdFlowCancelledError();
  return result === 'shown';
}
