import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SeasonPlayerCandidate, SeasonPlayerRows, SeasonDataRow } from './seasonData';
export type CachedSeasonSearch = {
  isDefault?: boolean;
  query: string;
  country: string;
  candidates: SeasonPlayerCandidate[];
  candidate: SeasonPlayerCandidate | null;
  data: SeasonPlayerRows | null;
  selected: SeasonDataRow | null;
};
const key = (userId: number) => `season-data:last-search:v1:${userId}`;
let writes: Promise<void> = Promise.resolve();
export async function readSeasonSearch(userId: number): Promise<CachedSeasonSearch | null> {
  try {
    await writes;
    const raw = await AsyncStorage.getItem(key(userId));
    const value = raw ? JSON.parse(raw) : null;
    if (!value || typeof value.query !== 'string' || typeof value.country !== 'string' ||
      !Array.isArray(value.candidates) || !value.candidates.every((row: SeasonPlayerCandidate) => Number.isSafeInteger(row?.playerId) && typeof row.displayName === 'string') ||
      (value.candidate !== null && (!Number.isSafeInteger(value.candidate?.playerId) || typeof value.candidate?.displayName !== 'string')) ||
      (value.data !== null && (!value.candidate || value.data?.player?.playerId !== value.candidate.playerId || !Array.isArray(value.data?.rows))) ||
      (value.selected !== null && !value.data?.rows.some((row: SeasonDataRow) => row.key === value.selected?.key))) return null;
    return value;
  } catch { return null; }
}
export function writeSeasonSearch(userId: number, value: CachedSeasonSearch): Promise<void> {
  writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(key(userId), JSON.stringify(value))).catch(() => {});
  return writes;
}
