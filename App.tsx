// App.tsx
import React from 'react';
import RootNavigator from '@/navigation/RootNavigator';
import '@/i18n';
import { LanguageProvider } from '@/context/LanguageProvider';
import {
  Alert
} from 'react-native';
 ///**
import mobileAds from 'react-native-google-mobile-ads';
import { preloadInterstitial } from '@/ads/interstitial';
import { preloadRewarded } from '@/ads/rewarded';
//  */
export default function App() {
  // /**
  React.useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => {
        console.log('[ADS] initialized');
        preloadInterstitial();
        preloadRewarded();
      })
      .catch((e) => {});
  }, []);
  //  */

  return (
    <LanguageProvider>
      <RootNavigator />
    </LanguageProvider>
  );
}
