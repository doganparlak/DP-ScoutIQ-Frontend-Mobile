import AsyncStorage from '@react-native-async-storage/async-storage';
import {getUtils} from '@react-native-firebase/app';
import {getRemoteConfig, getValue} from '@react-native-firebase/remote-config';
import {Linking, Platform} from 'react-native';
import {refreshRemoteConfig} from './remoteConfig';
import {shouldOfferStoreUpdate, STORE_UPDATE_URLS, versionParts} from '@/utils/storeUpdatePolicy';

const INSTALL_SEEN = 'app.storeUpdates.installSeen.v1';
const dismissedKey = () => `app.storeUpdates.dismissedVersion.v1:${Platform.OS}`;
export type StoreUpdate = {version: string; installedVersion: string; url: string};

export function installedStoreVersion(): string | null {
  // Read the installed binary, never the potentially newer OTA app manifest.
  try {const version = getUtils().appVersion; return version && versionParts(version) ? version : null;}
  catch {return null;}
}

export async function isExistingStoreUpdateInstall(): Promise<boolean> {
  const rows = await AsyncStorage.multiGet([INSTALL_SEEN, 'auth_token', 'app.lang']);
  const existing = rows.some(([, value]) => !!value);
  if (!rows[0][1]) await AsyncStorage.setItem(INSTALL_SEEN, '1');
  // Existing installs can use their previous local state; a genuinely fresh
  // install/reinstall never receives this prompt during its first session.
  return existing;
}

export async function availableStoreUpdate(): Promise<StoreUpdate | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  const installed = installedStoreVersion();
  if (!installed) return null;
  await refreshRemoteConfig();
  const key = Platform.OS === 'ios' ? 'store_update_ios_version' : 'store_update_android_version';
  const latest = getValue(getRemoteConfig(), key).asString().trim();
  const dismissed = await AsyncStorage.getItem(dismissedKey());
  return shouldOfferStoreUpdate(installed, latest, dismissed)
    ? {version: latest, installedVersion: installed, url: STORE_UPDATE_URLS[Platform.OS]} : null;
}

export const acknowledgeStoreUpdate = (version: string) => AsyncStorage.setItem(dismissedKey(), version);

export async function openStoreUpdate(update: StoreUpdate): Promise<void> {
  const nativeURL = Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/app/id6755595849'
    : 'market://details?id=com.dpformance.dpscoutiq';
  try {await Linking.openURL(nativeURL);}
  catch {await Linking.openURL(update.url);}
}
