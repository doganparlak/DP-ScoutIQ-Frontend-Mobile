import {matchPoolRequest} from './api';
import type {FavoriteMatch, MatchFixture} from './matchPool';
export type PredictionFixture = MatchFixture & {predictionStatus:'pending'|'finished'|'excluded';excluded?:boolean};
export type PredictionPicks = Record<string,{home:number;away:number}>;
export type PredictionEntry = {picks:PredictionPicks;submittedAt:string|null;basePoints:number;bonusPoints:number;totalPoints:number;exactScores:number;matchPoints:Record<string,number>;tier:'free'|'plus'|'pro';bonusRate:number};
export type PredictionRound = {id:number;weekStart:string;deadline:string|null;fixtures:PredictionFixture[];status:'waiting'|'unavailable'|'open'|'closed'|'finalizing'|'settled';updatedAt:string};
export type PredictionRank = {nickname:string;basePoints:number;bonusPoints:number;totalPoints:number;exactScores:number;tier:string;rank:number;isYou:boolean};
export type AllTimePredictionRank = {nickname:string;championships:number;secondPlaces:number;thirdPlaces:number;totalPoints:number;weeksParticipated:number;averagePoints:number;rank:number;isYou:boolean};
export type PredictionState = {viewerId:string;championships:number;secondPlaces?:number;thirdPlaces?:number;serverNow:string;nickname:string|null;tier:string;headStartPoints:number;bonusRate:number;weeks:string[];entry:PredictionEntry|null;round:PredictionRound|null;favorites:FavoriteMatch[];leaderboard:PredictionRank[]};
export const getPredictionState=(week?:string)=>matchPoolRequest<PredictionState>(`/score-prediction${week?'?weekStart='+encodeURIComponent(week):''}`);
export const savePredictionEntry=(roundId:number,picks:PredictionPicks,submit:boolean)=>matchPoolRequest<PredictionEntry>('/score-prediction/entry',{roundId,picks,submit});
export const savePredictionNickname=(nickname:string)=>matchPoolRequest<{nickname:string}>('/score-prediction/nickname',{nickname});

export const getPredictionHonors=()=>matchPoolRequest<{championships:number;secondPlaces:number;thirdPlaces:number}>('/score-prediction/honors');

export const getAllTimePredictionRankings=(sort:'total'|'average'='total')=>matchPoolRequest<AllTimePredictionRank[]>(`/score-prediction/rankings/all-time?sort=${sort}`);
