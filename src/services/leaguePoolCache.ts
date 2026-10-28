import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SearchResultRow } from '@/components/CandidatePlayers';
import type { LeagueFilters } from './leaguePool';
export type CachedLeagueSearch = {filters:LeagueFilters;row:SearchResultRow};
const key=(userId:number)=>`league-pool:last-search:v1:${userId}`;
let writes:Promise<void>=Promise.resolve();
export async function readLeagueSearch(userId:number):Promise<CachedLeagueSearch|null>{
  try {
    const raw=await AsyncStorage.getItem(key(userId));
    const value=raw?JSON.parse(raw):null;
    if(!value || !['countries','leagues','positions'].every(k=>Array.isArray(value.filters?.[k]) && value.filters[k].every((s:unknown)=>typeof s==='string')) || value.filters.leagues.length!==1 || typeof value.row?.id!=='string' || value.row.player?.entityType!=='league' || typeof value.row.player.name!=='string' || !Array.isArray(value.row.player.stats) || !value.row.player.stats.every((s:any)=>typeof s.metric==='string' && (typeof s.value==='number'||typeof s.value==='string')) || !value.row.player.meta) return null;
    return value;
  } catch {return null;}
}
export function writeLeagueSearch(userId:number,value:CachedLeagueSearch):Promise<void>{
  writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(key(userId),JSON.stringify(value))).catch(()=>{});
  return writes;
}
