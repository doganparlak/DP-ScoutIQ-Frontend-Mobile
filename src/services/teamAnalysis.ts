import { matchPoolRequest } from "./api";
import { Team } from "./teamPool";
export type PlayedMatch = {
  fixtureId: number;
  name: string;
  startingAt: string;
  country: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamId?: number | null;
  awayTeamId?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  thisSeason: boolean;
};
export type PlayedFilters = {
  opponents: string[];
  leagues: string[];
  location: string;
  startDate: string;
  endDate: string;
};
export const EMPTY_PLAYED_FILTERS: PlayedFilters = {
  opponents: [],
  leagues: [],
  location: "",
  startDate: "",
  endDate: "",
};
export const MAX_ANALYSIS_MATCHES = 5;
export const getTeamMatches = (team: Team) =>
  team.leagueId
    ? matchPoolRequest<PlayedMatch[]>(
        `/team-analysis/${encodeURIComponent(team.id)}/matches?leagueId=${team.leagueId}`,
      )
    : Promise.resolve([]);
export function playedMatchPasses(
  match: PlayedMatch,
  team: Team,
  filters: PlayedFilters,
) {
  const id = Number(team.id),
    opponent = match.homeTeamId === id ? match.awayTeam : match.homeTeam,
    date = match.startingAt.slice(0, 10);
  return (
    match.thisSeason &&
    (!filters.opponents.length || filters.opponents.includes(opponent)) &&
    (!filters.leagues.length || filters.leagues.includes(match.league)) &&
    (!filters.location ||
      (filters.location === "home"
        ? match.homeTeamId === id
        : match.awayTeamId === id)) &&
    (!filters.startDate || date >= filters.startDate) &&
    (!filters.endDate || date <= filters.endDate)
  );
}
export const playedDateBounds = (matches: PlayedMatch[]) => {
  const dates = matches
    .map((m) => m.startingAt.slice(0, 10))
    .filter(Boolean)
    .sort();
  return { minimum: dates[0] || "", maximum: dates[dates.length - 1] || "" };
};
export function toggleAnalysisMatch(ids: number[], id: number) {
  return ids.includes(id)
    ? ids.filter((v) => v !== id)
    : ids.length < MAX_ANALYSIS_MATCHES
      ? [...ids, id]
      : ids;
}
