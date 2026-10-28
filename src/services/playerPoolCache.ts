import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SearchResultRow } from '@/components/CandidatePlayers';
import type { PlayerPoolSearchInput } from './api';
export type CachedPlayerSearch = {payload:PlayerPoolSearchInput;rows:SearchResultRow[];selectedId:string|null};
const key=(userId:number)=>`player-pool:last-search:v1:${userId}`;
const defaultKey=(userId:number)=>`player-pool:default-search:v1:${userId}`;
let writes:Promise<void>=Promise.resolve();
async function readSearch(storageKey:string):Promise<CachedPlayerSearch|null>{
  try {
    await writes;
    const raw=await AsyncStorage.getItem(storageKey);
    const value=raw?JSON.parse(raw):null;
    if(!value || !value.payload || typeof value.payload!=='object' || Array.isArray(value.payload) || !Array.isArray(value.rows) || (value.selectedId!==null && typeof value.selectedId!=='string'))return null;
    if(!value.rows.every((r:any)=>typeof r?.id==='string' && typeof r.player?.name==='string' && Array.isArray(r.player.stats) && r.player.stats.every((s:any)=>typeof s.metric==='string' && (typeof s.value==='number'||typeof s.value==='string'))))return null;
    // Only retain filters available in the simplified Player Pool.
    const payload:PlayerPoolSearchInput={};
    for(const field of ['name','nationality','league','team','position'] as const){if(value.payload[field]!==undefined){if(typeof value.payload[field]!=='string')return null;payload[field]=value.payload[field];}}
    for(const field of ['nationalityExact','leagueExact','teamExact','worldCupMode'] as const){if(value.payload[field]!==undefined){if(typeof value.payload[field]!=='boolean')return null;payload[field]=value.payload[field];}}
    for(const field of ['minAge','maxAge','limit'] as const){if(value.payload[field]!==undefined){if(typeof value.payload[field]!=='number'||!Number.isFinite(value.payload[field]))return null;payload[field]=value.payload[field];}}
    return {...value,payload};
  } catch {return null;}
}
export const readPlayerSearch=(userId:number)=>readSearch(key(userId));
export const readDefaultPlayerSearch=(userId:number)=>readSearch(defaultKey(userId));
function writeSearch(storageKey:string,value:CachedPlayerSearch):Promise<void>{
  writes=writes.catch(()=>{}).then(()=>AsyncStorage.setItem(storageKey,JSON.stringify(value))).catch(()=>{});
  return writes;
}
export const writePlayerSearch=(userId:number,value:CachedPlayerSearch)=>writeSearch(key(userId),value);
export const writeDefaultPlayerSearch=(userId:number,value:CachedPlayerSearch)=>writeSearch(defaultKey(userId),value);
