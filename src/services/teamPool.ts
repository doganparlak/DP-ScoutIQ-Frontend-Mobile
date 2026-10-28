import { teamPoolRequest, matchPoolRequest } from "./api";
export type Team = {
  id: string;
  name: string;
  country: string;
  league: string;
  leagueId?: number | null;
  logoUrl?: string | null;
  city: string;
  coachName: string;
  playerCount: number;
  stadiumName: string;
  stadiumImageUrl?: string | null;
};
export type TeamFilters = { team: string; country: string; league: string };
export type TeamOptions = {
  countries: string[];
  leagues: string[];
  teams: string[];
};
export const getTeamOptions = (filters: TeamFilters) =>
  teamPoolRequest<TeamOptions>("options", {
    country: filters.country,
    league: filters.league,
  });
export const searchTeams = (filters: TeamFilters, limit = 50) =>
  teamPoolRequest<Team[]>("search", { ...filters, limit });

export const getTeamCard = (teamId: number) => matchPoolRequest<Team>(`/team-pool/teams/${teamId}`);

export const getTeamSelectorOptions = (leagueId?: number) => matchPoolRequest<import('./matchPool').TeamFixtureOptions>('/team-pool/selector-options', {leagueId});
