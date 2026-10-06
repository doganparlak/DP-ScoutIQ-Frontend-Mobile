import {teamPortfolioRequest} from './api';
import type {Team, TeamFilters} from './teamPool';
import type {PlayedMatch} from './teamAnalysis';
import {normalizeSearchText} from '@/utils/searchSuggestions';
export type FavoriteTeam = {favoriteId: string; team: Team; latestReportId: string | null; createdAt: string; updatedAt: string};
export type SavedTeamReport = {id: string; teamId: number; team: Team; fixtureIds: number[]; matches: PlayedMatch[]; language: 'tr' | 'en'; status: string; content: any};
export const getFavoriteTeams = () => teamPortfolioRequest<FavoriteTeam[]>('/favorite-teams');
export const saveFavoriteTeam = (team: Team) => teamPortfolioRequest<FavoriteTeam>('/favorite-teams', 'POST', {team});
export const deleteFavoriteTeam = (id: string) => teamPortfolioRequest<{ok: boolean}>(`/favorite-teams/${encodeURIComponent(id)}`, 'DELETE');
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
