import {
  InterstitialAd,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { Platform, Alert, InteractionManager } from 'react-native';

const IOS_INTERSTITIAL = 'ca-app-pub-3940256099942544/4411468910';
const ANDROID_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

const UNIT_ID = Platform.OS === 'ios'
  ? IOS_INTERSTITIAL
  : ANDROID_INTERSTITIAL;

let ad: InterstitialAd | null = null;
let loaded = false;
let showing = false;

function getAd() {
  if (ad) return ad;

  ad = InterstitialAd.createForAdRequest(UNIT_ID);

  ad.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
    Alert.alert('Ad Debug', 'Interstitial loaded');
  });

  ad.addAdEventListener(AdEventType.OPENED, () => {
    showing = true;
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false;
    showing = false;
    ad?.load();
  });

  ad.addAdEventListener(AdEventType.ERROR, (e) => {
    loaded = false;
    showing = false;
    Alert.alert('Ad Error', String(e?.message ?? e));
  });

  return ad;
}

export function preloadInterstitial() {
  getAd().load();
}

/**
 * SAFE interstitial show:
 * - waits for UI to finish
 * - waits a short delay
 * - never blocks chat
 */
export function showInterstitialSafely() {
  if (showing) return;

  const a = getAd();

  if (!loaded) {
    a.load();
    return;
  }

  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      if (!loaded || showing) return;

      Alert.alert('Ad Debug', 'Showing interstitial (safe)');
      a.show();
    }, 600); // 👈 critical delay
  });
}
