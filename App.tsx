// App.tsx
import { initializeAdvertising } from '@/ads/initialization';
import { LanguageProvider } from '@/context/LanguageProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import '@/i18n';
import RootNavigator from '@/navigation/RootNavigator';
import StoreUpdatePrompt from '@/components/StoreUpdatePrompt';
import { initializePushNotifications } from '@/services/pushNotifications';
import { initializeRemoteConfig } from '@/services/remoteConfig';
import { initializeTelemetry } from '@/services/telemetry';
import { getIsHeadless,getMessaging } from '@react-native-firebase/messaging';
import React from 'react';
import { AppState } from 'react-native';
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
  const [navigationReady, setNavigationReady] = React.useState(false);
  React.useEffect(() => initializeRemoteConfig(), []);
  React.useEffect(() => initializePushNotifications(), []);
  React.useEffect(() => {
    initializeTelemetry();
  }, []);

  React.useEffect(() => { void initializeAdvertising(); }, []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
      <LanguageProvider>
        <RootNavigator onReady={() => setNavigationReady(true)} />
        <StoreUpdatePrompt ready={navigationReady}/>
      </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
