import { cleanImageUrl, sportmonksTeamImage, sportmonksLeagueImage } from '@/utils/sportmonksImages';
import { readLeagueSearch } from './leaguePoolCache';
import { readSeasonSearch } from './seasonDataCache';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { readPlayerSearch } from './playerPoolCache';
import { readLastTeam } from './teamPoolCache';
import { readFixtureSearch } from './matchPoolCache';

type SearchKind = 'player' | 'team' | 'fixtures' | 'league' | 'season';
type SearchVisit = { kind: SearchKind; searchedAt: number };
export type RecentSearch = SearchVisit & { title: string; imageUrl?: string };
const key = (userId: number) => `panel:recent-searches:v1:${userId}`;
let writes: Promise<void> = Promise.resolve();
async function readVisits(userId: number): Promise<SearchVisit[]> {
  try {
    const raw = await AsyncStorage.getItem(key(userId));
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter(item => item &&
      ['player', 'team', 'fixtures', 'league', 'season'].includes(item.kind) && Number.isFinite(item.searchedAt)) : [];
  } catch { return []; }
}

// Record explicit successful searches only; default cards and background refreshes do not count.
export function recordRecentSearch(userId: number, kind: SearchKind): Promise<void> {
  const searchedAt = Date.now();
  writes = writes.catch(() => {}).then(async () => {
    const previous = await readVisits(userId);
    await AsyncStorage.setItem(key(userId), JSON.stringify([
      { kind, searchedAt }, ...previous.filter(item => item.kind !== kind),
    ].slice(0, 5)));
  }).catch(() => {});
  return writes;
}

export async function readRecentSearches(userId: number): Promise<RecentSearch[]> {
  await writes;
  const [visits, player, team, fixtures, league, season] = await Promise.all([
    readVisits(userId), readPlayerSearch(userId), readLastTeam(userId), readFixtureSearch(userId), readLeagueSearch(userId), readSeasonSearch(userId),
  ]);
  // Older player/fixture caches are real searches. Legacy team caches may contain the default Real Madrid card.
  if (player && !visits.some(item => item.kind === 'player')) visits.push({ kind: 'player', searchedAt: 0 });
  if (fixtures && !fixtures.isDefault && !visits.some(item => item.kind === 'fixtures')) visits.push({ kind: 'fixtures', searchedAt: 0 });
  return visits.sort((a, b) => b.searchedAt - a.searchedAt).flatMap(visit => {
    const playerRow = player?.rows.find(row => row.id === player.selectedId) ?? player?.rows[0];
    const title = visit.kind === 'player'
      ? playerRow?.player.name || player?.payload.name || player?.payload.team || player?.payload.league
      : visit.kind === 'team' ? team?.name
      : visit.kind === 'fixtures' ? fixtures?.teamName
      : visit.kind === 'league' ? league?.row.player.name
      : season?.candidate?.displayName || season?.query;
    const imageUrl = cleanImageUrl(visit.kind === 'player' ? playerRow?.player.meta?.imageUrl
      : visit.kind === 'team' ? team?.logoUrl || sportmonksTeamImage(team?.id)
      : visit.kind === 'fixtures' ? sportmonksTeamImage(fixtures?.teamId)
      : visit.kind === 'league' ? league?.row.player.meta?.imageUrl || league?.row.player.meta?.leagueLogoUrl || sportmonksLeagueImage(league?.row.player.meta?.leagueId)
      : season?.data?.player.imageUrl);
    const exists = visit.kind === 'player' ? !!player : visit.kind === 'team' ? !!team
      : visit.kind === 'fixtures' ? !!fixtures : visit.kind === 'league' ? !!league : !!season;
    return exists ? [{ ...visit, title: title || '', imageUrl }] : [];
  });
}
