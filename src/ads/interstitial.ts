import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';
import { Platform, InteractionManager, Keyboard } from 'react-native';

const IOS_INTERSTITIAL = 'ca-app-pub-3940256099942544/4411468910';
const ANDROID_INTERSTITIAL = 'ca-app-pub-3940256099942544/1033173712';

const UNIT_ID = Platform.OS === 'ios'
  ? IOS_INTERSTITIAL
  : ANDROID_INTERSTITIAL;

let ad: InterstitialAd | null = null;
let loaded = false;
let showing = false;
let pendingShow = false;

function getAd() {
  if (ad) return ad;

  ad = InterstitialAd.createForAdRequest(UNIT_ID);

  ad.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
    console.log('[ADS] loaded');
  });

  ad.addAdEventListener(AdEventType.OPENED, () => {
    showing = true;
    pendingShow = false;
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false;
    showing = false;
    ad?.load();
  });

  ad.addAdEventListener(AdEventType.ERROR, (e) => {
    loaded = false;
    showing = false;
    pendingShow = false;
  });

  return ad;
}

export function preloadInterstitial() {
  getAd().load();
}

export function showInterstitialSafely() {
  if (showing || pendingShow) return;

  const a = getAd();

  if (!loaded) {
    a.load();
    return;
  }

  pendingShow = true;

  Keyboard.dismiss();

  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      if (!loaded || showing) {
        pendingShow = false;
        return;
      }
      a.show();
    }, 400);
  });
}
