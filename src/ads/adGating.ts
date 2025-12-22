import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ads.chat.queryCount.v1';

// show on 15,20,25... (after first 10, every 5)
export function shouldShowFullscreenAd(queryCount: number) {
  if (queryCount <= 10) return false;
  return (queryCount - 10) % 5 === 0;
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
