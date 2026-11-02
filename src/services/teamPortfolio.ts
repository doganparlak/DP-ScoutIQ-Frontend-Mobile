import {teamPortfolioRequest} from './api';
import type {Team, TeamFilters} from './teamPool';
import type {PlayedMatch} from './teamAnalysis';
import {normalizeSearchText} from '@/utils/searchSuggestions';
export type FavoriteTeam = {favoriteId: string; team: Team; latestReportId: string | null; createdAt: string; updatedAt: string};
export type SavedTeamReport = {id: string; teamId: number; team: Team; fixtureIds: number[]; matches: PlayedMatch[]; language: 'tr' | 'en'; status: string; content: any};
const portfolioListeners=new Set<()=>void>();
export function subscribeTeamPortfolioChanges(listener:()=>void){portfolioListeners.add(listener);return ()=>{portfolioListeners.delete(listener);};}
function notifyTeamPortfolioChanges(){portfolioListeners.forEach(listener=>{try{listener();}catch{/* A listener must not turn a successful save into an error. */}});}
export const getFavoriteTeams = () => teamPortfolioRequest<FavoriteTeam[]>('/favorite-teams');
export const saveFavoriteTeam = async (team: Team) => {const saved=await teamPortfolioRequest<FavoriteTeam>('/favorite-teams', 'POST', {team});notifyTeamPortfolioChanges();return saved;};
export const deleteFavoriteTeam = async (id: string) => {const result=await teamPortfolioRequest<{ok: boolean}>(`/favorite-teams/${encodeURIComponent(id)}`, 'DELETE');notifyTeamPortfolioChanges();return result;};
export const getSavedTeamReport = (id: string) => teamPortfolioRequest<SavedTeamReport>(`/team-analysis/reports/${encodeURIComponent(id)}`);
export const EMPTY_TEAM_PORTFOLIO_FILTERS: TeamFilters = {team: '', country: '', league: ''};
export function filterFavoriteTeams(rows: FavoriteTeam[], filters: TeamFilters) {
  return rows.filter(({team}) => (!filters.country || team.country === filters.country) && (!filters.league || team.league === filters.league) && (!filters.team || normalizeSearchText(team.name).includes(normalizeSearchText(filters.team))));
}
export function favoriteTeamOptions(rows: FavoriteTeam[], filters: TeamFilters) {
  const distinct = (values: string[]) => [...new Set(values.filter(Boolean))].sort((a,b) => a.localeCompare(b));
  return {countries: distinct(rows.filter(({team}) => !filters.league || team.league === filters.league).map(({team}) => team.country)),
    leagues: distinct(rows.filter(({team}) => !filters.country || team.country === filters.country).map(({team}) => team.league))};
}
