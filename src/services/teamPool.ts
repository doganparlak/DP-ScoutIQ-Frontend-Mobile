import { teamPoolRequest } from "./api";
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
export const searchTeams = (filters: TeamFilters) =>
  teamPoolRequest<Team[]>("search", { ...filters, limit: 50 });
