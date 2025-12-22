import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
const PROD_IOS_INTERSTITIAL = 'ca-app-pub-xxx/ios111';
const PROD_ANDROID_INTERSTITIAL = 'ca-app-pub-xxx/android222';


const FORCE_TEST_ADS = true;

const UNIT_ID =
  (__DEV__ || FORCE_TEST_ADS)
    ? TestIds.INTERSTITIAL
    : Platform.select({ ios: PROD_IOS_INTERSTITIAL, android: PROD_ANDROID_INTERSTITIAL })!;


let ad: InterstitialAd | null = null;
let loaded = false;
let showing = false;

function getAd() {
  if (ad) return ad;

  ad = InterstitialAd.createForAdRequest(UNIT_ID);

  ad.addAdEventListener(AdEventType.LOADED, () => {
    loaded = true;
  });

  ad.addAdEventListener(AdEventType.CLOSED, () => {
    loaded = false;
    showing = false;
    ad?.load(); // preload next
  });

  ad.addAdEventListener(AdEventType.ERROR, () => {
    loaded = false;
    showing = false;
  });

  return ad;
}

export function preloadInterstitial() {
  const a = getAd();
  a.load();
}

export async function showInterstitialIfReady(): Promise<boolean> {
  const a = getAd();
  if (showing) return false;

  if (!loaded) {
    a.load(); // attempt to load for next time
    return false;
  }

  showing = true;
  await a.show();
  return true;
}
