import { EMPTY_PREDICTION_PRIZES, PREDICTION_PRIZES_KEY, parsePredictionPrizes, type PredictionPrizeWeeks } from '@/utils/predictionPrizes';
import { AppState } from 'react-native';
import { getRemoteConfig, ensureInitialized, fetchAndActivate, getValue } from '@react-native-firebase/remote-config';
import { remoteConfigDefaults, validatedFrequency, type AdFrequencyKey } from './remoteConfigDefaults';

let values: Record<AdFrequencyKey, number> = { ...remoteConfigDefaults };
let pending: Promise<void> | undefined;
let lastError: string | null = null;
let prizeRaw = EMPTY_PREDICTION_PRIZES;
let prizeWeeks: PredictionPrizeWeeks = {};
const prizeListeners = new Set<() => void>();

export const getPredictionPrizeWeeks = () => prizeWeeks;
export function subscribePredictionPrizes(listener: () => void) {
  prizeListeners.add(listener);
  return () => { prizeListeners.delete(listener); };
}

export function getAdFrequency(key: AdFrequencyKey): number {
  return values[key];
}

function readActivatedValues() {
  const config = getRemoteConfig();
  const next = { ...remoteConfigDefaults } as Record<AdFrequencyKey, number>;
  for (const key of Object.keys(next) as AdFrequencyKey[]) {
    next[key] = validatedFrequency(key, getValue(config, key).asString());
  }
  values = next;
  const raw = getValue(config, PREDICTION_PRIZES_KEY).asString();
  if (raw !== prizeRaw) {
    prizeRaw = raw;
    prizeWeeks = parsePredictionPrizes(raw);
    prizeListeners.forEach(listener => listener());
  }
}

export function refreshRemoteConfig(): Promise<void> {
  if (pending) return pending;
  pending = (async () => {
    try {
      const config = getRemoteConfig();
      config.defaultConfig = { ...remoteConfigDefaults, [PREDICTION_PRIZES_KEY]: EMPTY_PREDICTION_PRIZES };
      config.settings = {
        minimumFetchIntervalMillis: __DEV__ ? 0 : 60 * 60 * 1000,
        fetchTimeoutMillis: 10000,
      };
      await ensureInitialized(config);
      // Restore activated values even if this fetch fails offline.
      readActivatedValues();
      await fetchAndActivate(config);
      readActivatedValues();
      lastError = null;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (__DEV__) console.warn('[Remote Config]', lastError);
    }
  })().finally(() => { pending = undefined; });
  return pending;
}

export function initializeRemoteConfig() {
  void refreshRemoteConfig();
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') void refreshRemoteConfig();
  });
  return () => subscription.remove();
}

if (__DEV__) {
  Object.assign(globalThis, {
    scoutwiseRemoteConfigTest: {
      refresh: refreshRemoteConfig,
      status: () => ({
        values: { ...values }, lastError,
        sources: Object.fromEntries(Object.keys(remoteConfigDefaults).map(key =>
          [key, getValue(getRemoteConfig(), key).getSource()])),
      }),
    },
  });
}
