import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Team } from './teamPool';

const key = (userId: number) => `team-pool:last-team:v1:${userId}`;
let writes: Promise<void> = Promise.resolve();
export async function readLastTeam(userId: number): Promise<Team | null> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    const team = raw ? JSON.parse(raw) : null;
    return team && typeof team.id === 'string' && /^\d+$/.test(team.id) &&
      typeof team.name === 'string' && typeof team.country === 'string' &&
      typeof team.league === 'string' && typeof team.city === 'string' &&
      typeof team.coachName === 'string' && typeof team.playerCount === 'number' &&
      typeof team.stadiumName === 'string' ? team : null;
  } catch { return null; }
}
export function writeLastTeam(userId: number, team: Team): Promise<void> {
  // Preserve write order when a background refresh and a new search finish together.
  writes = writes.catch(() => {}).then(() => AsyncStorage.setItem(key(userId), JSON.stringify(team))).catch(() => {});
  return writes;
}
