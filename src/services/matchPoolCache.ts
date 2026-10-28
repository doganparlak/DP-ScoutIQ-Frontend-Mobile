import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MatchFixture } from './matchPool';

export type CachedFixtureSearch = {
  isDefault?: boolean;
  teamId: number;
  leagueId: number;
  filterLeagueId?: number;
  teamName: string;
  fixtures: MatchFixture[];
  selectedId: number | null;
};
const key = (userId: number) => `match-pool:last-search:v1:${userId}`;
let writes: Promise<void> = Promise.resolve();
export async function readFixtureSearch(userId: number): Promise<CachedFixtureSearch | null> {
  try {
    await writes;
    const raw = await AsyncStorage.getItem(key(userId));
    const value = raw ? JSON.parse(raw) : null;
    const positiveId = (id: unknown) => typeof id === 'number' && Number.isSafeInteger(id) && id > 0;
    if (!value || !positiveId(value.teamId) || !positiveId(value.leagueId) ||
        (value.filterLeagueId !== undefined && !positiveId(value.filterLeagueId)) ||
        typeof value.teamName !== 'string' || !Array.isArray(value.fixtures) ||
        (value.selectedId !== null && !positiveId(value.selectedId))) return null;
    if (!value.fixtures.every((f: MatchFixture) => f && positiveId(f.fixtureId) && typeof f.name === 'string' &&
        typeof f.startingAt === 'string' && typeof f.country?.name === 'string' && typeof f.league?.name === 'string' &&
        positiveId(f.homeTeam?.id) && typeof f.homeTeam?.name === 'string' &&
        positiveId(f.awayTeam?.id) && typeof f.awayTeam?.name === 'string' &&
        typeof f.state?.code === 'string' && typeof f.state?.name === 'string')) return null;
    return value;
  } catch { return null; }
}
export function writeFixtureSearch(userId: number, value: CachedFixtureSearch): Promise<void> {
  writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(key(userId), JSON.stringify(value))).catch(() => {});
  return writes;
}
