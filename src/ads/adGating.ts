import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ads.chat.queryCount.v1';
const POTENTIAL_KEY = 'ads.playerPool.potentialRevealCount.v1';

// TEST MODE:
// show on 3,5,7,9...
export function shouldShowFullscreenAd(queryCount: number) {
  if (queryCount < 3) return false;
  return (queryCount - 3) % 3 === 0;
}

export async function incrementChatQueryCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(KEY, String(next));
  return next;
}

export async function resetChatQueryCount(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function shouldShowPotentialInterstitial(revealCount: number) {
  return revealCount > 0 && revealCount % 2 === 0;
}

export async function incrementPotentialRevealCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(POTENTIAL_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(POTENTIAL_KEY, String(next));
  return next;
}
