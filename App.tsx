// App.tsx
import React from 'react';
import { AppState } from 'react-native';
import { getMessaging, getIsHeadless } from '@react-native-firebase/messaging';
import { initializePushNotifications } from '@/services/pushNotifications';
import { initializeRemoteConfig } from '@/services/remoteConfig';
import { initializeTelemetry } from '@/services/telemetry';
import RootNavigator from '@/navigation/RootNavigator';
import '@/i18n';
import { LanguageProvider } from '@/context/LanguageProvider';
import mobileAds from 'react-native-google-mobile-ads';
import { SafeAreaProvider } from 'react-native-safe-area-context';
export default function App() {
  const [headless, setHeadless] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    let mounted = true;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') setHeadless(false);
    });
    void getIsHeadless(getMessaging()).then(value => {
      if (mounted) setHeadless(AppState.currentState === 'active' ? false : Boolean(value));
    }).catch(() => { if (mounted) setHeadless(false); });
    return () => { mounted = false; subscription.remove(); };
  }, []);
  return headless === false ? <InteractiveApp /> : null;
}

function InteractiveApp() {
  React.useEffect(() => initializeRemoteConfig(), []);
  React.useEffect(() => initializePushNotifications(), []);
  React.useEffect(() => {
    initializeTelemetry();
  }, []);

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
    <SafeAreaProvider>
      <LanguageProvider>
        <RootNavigator />
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
