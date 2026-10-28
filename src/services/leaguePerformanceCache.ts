import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LeagueFilters, LeagueResult, LeagueStandings } from './leaguePerformance';
export type CachedLeaguePerformance = {filters:LeagueFilters; row:LeagueResult; card?:import('@/components/CandidatePlayers').SearchResultRow; standings?:LeagueStandings};
const key=(userId:number)=>`league-performance:last-search:v1:${userId}`;
let writes:Promise<void>=Promise.resolve();
export async function readLeaguePerformance(userId:number):Promise<CachedLeaguePerformance|null>{
  try {
    const raw=await AsyncStorage.getItem(key(userId));
    const value=raw?JSON.parse(raw):null;
    if(!value || !['countries','leagues'].every(k=>Array.isArray(value.filters?.[k]) && value.filters[k].length===1 && value.filters[k].every((item:unknown)=>typeof item==='string')) ||
      !Number.isSafeInteger(value.row?.league_id) || value.row.league_id<=0 || typeof value.row.league_name!=='string')return null;
    if(value.standings && (value.standings.leagueId!==value.row.league_id || !Array.isArray(value.standings.tables) || !value.standings.tables.every((table:any)=>typeof table?.key==='string' && Array.isArray(table.rows))))delete value.standings;
    return value;
  }catch{return null;}
}
export function writeLeaguePerformance(userId:number,value:CachedLeaguePerformance):Promise<void>{
  writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(key(userId),JSON.stringify(value))).catch(()=>{});
  return writes;
}
