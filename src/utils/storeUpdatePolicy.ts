/** Store-release versions only: these are independent of OTA/runtime versions. */
export const storeUpdateDefaults = {
  store_update_ios_version: '',
  store_update_android_version: '',
} as const;

export const STORE_UPDATE_URLS = {
  ios: 'https://apps.apple.com/app/scoutwise/id6755595849',
  android: 'https://play.google.com/store/apps/details?id=com.dpformance.dpscoutiq',
} as const;

export function versionParts(value: string): number[] | null {
  if (!/^\d+(\.\d+){0,3}$/.test(value.trim())) return null;
  const parts = value.trim().split('.').map(Number);
  return parts.every(Number.isSafeInteger) ? parts : null;
}

export function isNewerStoreVersion(latest: string, installed: string): boolean {
  const a = versionParts(latest), b = versionParts(installed);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

export function shouldOfferStoreUpdate(installed: string, latest: string, dismissed: string | null): boolean {
  // A dismissal also covers equivalent versions such as 2.3 and 2.3.0.
  return isNewerStoreVersion(latest, installed) && (!dismissed || isNewerStoreVersion(latest, dismissed));
}
