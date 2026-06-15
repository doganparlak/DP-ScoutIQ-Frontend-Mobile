// App.tsx
import React from 'react';
import RootNavigator from '@/navigation/RootNavigator';
import '@/i18n';
import { LanguageProvider } from '@/context/LanguageProvider';
import mobileAds from 'react-native-google-mobile-ads';
export default function App() {
  // /**
  React.useEffect(() => {
    mobileAds()
      .initialize()
      .then(() => {
        //console.log('[ADS] initialized');
      })
      .catch((e) => {});
  }, []);
  // */

  return (
    <LanguageProvider>
      <RootNavigator />
    </LanguageProvider>
  );
}
