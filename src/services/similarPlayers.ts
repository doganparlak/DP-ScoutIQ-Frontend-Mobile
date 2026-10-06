import {teamPortfolioRequest, normalizePlayerPoolContent, getLeaguePerformancePlayer, searchPlayerPool, type PlayerData} from './api';
import type {ContractStatus} from '@/components/ContractFilters';
export type SimilarReference = {id:string;player:PlayerData};
export type SimilarFilters = {nationality:string[];league:string[];minAge?:number;maxAge?:number;contractStatus:ContractStatus;contractEndDate:string;loanEndDate:string};
export const emptySimilarFilters = ():SimilarFilters => ({nationality:[],league:[],contractStatus:'',contractEndDate:'',loanEndDate:''});
export type SimilarMatch={entry:SimilarReference;similarity:number;coverage:number;commonMetricCount:number;matchedRoles:string[]};
export const similarResultLimit=(plan:string)=>plan==='Pro Monthly'||plan==='Pro Yearly'?15:plan==='No Ads Monthly'?6:3;
export const nextSimilarCount=(visible:number,total:number)=>Math.min(visible+3,total);
export function similarFiltersValid(filters:SimilarFilters){const valid=(age:number|undefined)=>age===undefined||Number.isInteger(age)&&age>=14&&age<=60;return valid(filters.minAge)&&valid(filters.maxAge)&&!(filters.minAge!==undefined&&filters.maxAge!==undefined&&filters.minAge>filters.maxAge);}
function payload(playerId:string,filters:SimilarFilters){return {playerId:Number(playerId),filters:{...filters,contractEndDate:filters.contractEndDate||undefined,loanEndDate:filters.loanEndDate||undefined}};}
export const getSimilarEligibility=(playerId:string)=>teamPortfolioRequest<{eligible:boolean;minimumMinutes:number;minimumMetrics:number;minimumCategories:number}>('/similar-players/eligibility','POST',payload(playerId,emptySimilarFilters()));
export async function findSimilarPlayers(playerId:string,filters:SimilarFilters){
  const result=await teamPortfolioRequest<{players:{player:{id:number;content:unknown};similarity:number;coverage:number;commonMetricCount:number;matchedRoles:string[]}[];limit:number;pageSize:number}>('/similar-players/search','POST',payload(playerId,filters));
  const rows=result.players.map(row=>{const id=String(row.player.id),player=normalizePlayerPoolContent(row.player.content,id);return player?{entry:{id,player},similarity:row.similarity,coverage:row.coverage,commonMetricCount:row.commonMetricCount,matchedRoles:row.matchedRoles}:null;}).filter((row):row is SimilarMatch=>row!==null);
  return {rows,limit:result.limit};
}

export async function resolveSimilarReference(player:import('@/types').PlayerData, rowId?:string):Promise<SimilarReference>{
  if(rowId && /^[1-9]\d*$/.test(rowId)){
    const stats=player.stats.flatMap(stat=>{const value=Number(stat.value);return Number.isFinite(value)?[{metric:stat.metric,value}]:[];});
    return {id:rowId,player:{...player,stats}};
  }
  const provider=player.meta?.sportmonksId;
  if(Number.isSafeInteger(provider)&&(provider||0)>0)return getLeaguePerformancePlayer(provider!);
  const fold=(value:string)=>value.replace(/ı/g,'i').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase().trim();
  const candidates=await searchPlayerPool({name:player.name,team:player.meta?.team,gender:player.meta?.gender==='male'||player.meta?.gender==='female'?player.meta.gender:undefined});
  const exact=candidates.filter(entry=>fold(entry.player.name)===fold(player.name)&&(!player.meta?.team||fold(entry.player.meta?.team||'')===fold(player.meta.team)));
  const identities=new Set(exact.map(entry=>String(entry.player.meta?.sportmonksId||`row:${entry.id}`)));
  if(exact.length&&identities.size===1)return exact[0];
  throw new Error('similar_reference_unavailable');
}

export function similarMoreAction(limit:number,shown:number,total:number):'more'|'plus'|'pro'|'done'{
  if(shown<Math.min(total,limit))return 'more';
  if(limit===3)return 'plus';
  if(limit===6&&shown>=6)return 'pro';
  return 'done';
}
