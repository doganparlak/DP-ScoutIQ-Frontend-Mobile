import { matchPoolRequest } from './api';
import type { AllTimePredictionRank } from './scorePrediction';
export type DiscoveryRank = {rank:number;nickname:string|null;tier:string;basePoints:number;bonusPoints:number;score:number;played:number;correct:number;isYou:boolean};
export type DiscoveryLeagueState = {serverNow:string;day:string;weekStart:string;weekEnd:string;deadline:string;nickname:string|null;tier:string;answered:number;available:number;basePoints:number;bonusPoints:number;totalPoints:number;rank:number|null;leaderboard:DiscoveryRank[]};
export const getDiscoveryLeague = () => matchPoolRequest<DiscoveryLeagueState>('/daily-scout-league');
export const getDiscoveryAllTime = (sort:'total'|'average') => matchPoolRequest<AllTimePredictionRank[]>('/daily-scout-league/rankings/all-time?sort='+sort);
