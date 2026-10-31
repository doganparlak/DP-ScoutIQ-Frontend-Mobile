import AsyncStorage from '@react-native-async-storage/async-storage';
import {matchPoolRequest} from './api';
import type {MatchFixture, MatchForecastResponse} from './matchPool';

export type ProForecastAccess = Omit<MatchForecastResponse, 'status'> & {
  status: MatchForecastResponse['status'] | 'locked';
  unlocked: boolean;
  creditCost: number;
  freeChatMessagesRemaining: number | null;
};
export const getProForecastAccess = (id: number) => matchPoolRequest<ProForecastAccess>(`/pro/match-forecast/${id}`);
export const unlockProForecast = (id: number) => matchPoolRequest<ProForecastAccess>(`/pro/match-forecast/${id}`, {});
export type ProForecastSearch = {leagueId?: number; teamId: number; teamName: string; fixtures: MatchFixture[]; selectedId: number | null};
const key = (userId: number) => `pro:match-forecast:last-search:v1:${userId}`;
let writes: Promise<void> = Promise.resolve();
export async function readProForecastSearch(userId: number): Promise<ProForecastSearch | null> {
  try {
    await writes;
    const raw = await AsyncStorage.getItem(key(userId));
    const value = raw ? JSON.parse(raw) : null;
    if (!value || !Number.isSafeInteger(value.teamId) || value.teamId <= 0 || typeof value.teamName !== 'string' || !Array.isArray(value.fixtures)) return null;
    if (value.leagueId != null && (!Number.isSafeInteger(value.leagueId) || value.leagueId <= 0)) return null;
    if (value.selectedId !== null && (!Number.isSafeInteger(value.selectedId) || value.selectedId <= 0)) return null;
    if (!value.fixtures.every((f: MatchFixture) => f && Number.isSafeInteger(f.fixtureId) && f.fixtureId > 0 && typeof f.startingAt === 'string' && f.homeTeam?.name && f.awayTeam?.name && f.league?.name)) return null;
    return value;
  } catch { return null; }
}
export function writeProForecastSearch(userId: number, value: ProForecastSearch) {
  writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(key(userId), JSON.stringify(value))).catch(() => {});
  return writes;
}
