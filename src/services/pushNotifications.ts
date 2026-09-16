import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState, PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus, getMessaging, getToken, getAPNSToken, hasPermission, getIsHeadless,
  requestPermission, onMessage, onTokenRefresh, onNotificationOpenedApp,
  getInitialNotification, setBackgroundMessageHandler,
  type RemoteMessage,
} from '@react-native-firebase/messaging';

const TOKEN_KEY = 'push.fcmToken.v1';
const PERMISSION_REQUESTED_KEY = 'push.permissionRequested.v1';
const recentEvents: { kind: string; messageId?: string; at: string }[] = [];
const debugError = (error: unknown) => {
  if (__DEV__) console.warn('[Push notifications]', error);
};
function received(kind: string, message: RemoteMessage) {
  if (__DEV__) {
    recentEvents.push({ kind, messageId: message.messageId, at: new Date().toISOString() });
    if (recentEvents.length > 20) recentEvents.shift();
    console.log('[Push notifications]', kind, message.messageId ?? '(no message ID)');
  }
}

// Registered at module load, before React mounts. The OS displays background
// notification payloads; do not display a second notification here.
setBackgroundMessageHandler(getMessaging(), async message => {
  received('background', message);
});

async function isAllowed() {
  if (Platform.OS === 'android') {
    return Number(Platform.Version) < 33 || PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  }
  const status = await hasPermission(getMessaging());
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
}

let pendingRegistration: Promise<string | null> | undefined;
export function registerPushNotifications(askPermission = false): Promise<string | null> {
  if (pendingRegistration) {
    return askPermission
      ? pendingRegistration.then(() => registerPushNotifications(true))
      : pendingRegistration;
  }
  pendingRegistration = (async () => {
    let allowed = await isAllowed();
    const alreadyAsked = await AsyncStorage.getItem(PERMISSION_REQUESTED_KEY);
    if (!allowed && askPermission && !alreadyAsked) {
      await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, '1');
      if (Platform.OS === 'android') {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      } else {
        await requestPermission(getMessaging(), { alert: true, badge: true, sound: true });
      }
      allowed = await isAllowed();
    }
    if (!allowed) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return null;
    }
    // iOS needs its APNs token before FCM token registration. Return while
    // registration is pending or unavailable on the current device/simulator.
    if (Platform.OS === 'ios' && !(await getAPNSToken(getMessaging()))) return null;
    const token = await getToken(getMessaging());
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return token;
  })().finally(() => { pendingRegistration = undefined; });
  return pendingRegistration;
}

export function initializePushNotifications() {
  const messaging = getMessaging();
  const unsubscribeMessage = onMessage(messaging, message => {
    received('foreground', message);
    // iOS displays its native banner through firebase.json presentation options.
    if (Platform.OS === 'android' && message.notification) {
      Alert.alert(message.notification.title || 'ScoutWise', message.notification.body || '');
    }
  });
  const unsubscribeToken = onTokenRefresh(messaging, token => {
    void isAllowed().then(allowed => allowed
      ? AsyncStorage.setItem(TOKEN_KEY, token)
      : AsyncStorage.removeItem(TOKEN_KEY)).catch(debugError);
  });
  const unsubscribeOpen = onNotificationOpenedApp(messaging, message => received('opened', message));
  void getInitialNotification(messaging).then(message => {
    if (message) received('opened_from_quit', message);
  }).catch(debugError);
  const subscription = AppState.addEventListener('change', state => {
    if (state === 'active') void registerPushNotifications().catch(debugError);
  });
  void registerPushNotifications().catch(debugError);
  return () => {
    unsubscribeMessage(); unsubscribeToken(); unsubscribeOpen(); subscription.remove();
  };
}

// Manual diagnostics only; tokens and message contents are never logged automatically.
if (__DEV__) Object.assign(globalThis, {
  scoutwisePushTest: {
    async status() {
      return {
        permissionGranted: await isAllowed(),
        appState: AppState.currentState,
        headless: Boolean(await getIsHeadless(getMessaging())),
        hasAPNsToken: Platform.OS === 'ios' ? Boolean(await getAPNSToken(getMessaging())) : null,
        hasFCMToken: Boolean(await AsyncStorage.getItem(TOKEN_KEY)),
        events: [...recentEvents],
      };
    },
    requestPermission: () => registerPushNotifications(true).then(token => ({ hasFCMToken: Boolean(token) })),
    getToken: () => registerPushNotifications(),
  },
});
