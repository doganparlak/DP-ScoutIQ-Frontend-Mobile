import { leaguePerformanceRequest, getLeaguePerformancePlayer } from './api';
export { getLeaguePerformancePlayer };
export type LeagueFilters = { countries: string[]; leagues: string[] };
export type LeagueResult = { league_id: number; league_name: string; country_name: string | null; image_url: string | null; team_count: number };
export type LeagueStanding = {
  position: number | null; teamId: number | null; teamName: string; teamImageUrl: string | null;
  played: number | null; won: number | null; drawn: number | null; lost: number | null;
  goalsFor: number | null; goalsAgainst: number | null; goalDifference: number | null; points: number | null;
  form: string | null; standingRule: {name: string; code: string} | null;
};
export type StandingTable = { key: string; label: string; rows: LeagueStanding[] };
export type LeagueStandings = { leagueId: number; seasonId: number; seasonName: string | null; tables: StandingTable[] };
export const getLeaguePerformanceOptions = (filters: LeagueFilters) => leaguePerformanceRequest<LeagueFilters>('/league-performance/options', filters);
export const searchLeaguePerformance = (filters: LeagueFilters) => leaguePerformanceRequest<LeagueResult[]>('/league-performance/search', {...filters, limit: 100});
export const getLeagueStandings = (leagueId: number) => leaguePerformanceRequest<LeagueStandings>('/league-standings', {leagueId});
export const getLeagueInsights = (leagueId: number, seasonId: number, periodStart = '') => leaguePerformanceRequest<LeagueInsights>('/league-insights', {leagueId, seasonId, periodStart: periodStart || null});
export type LeagueBestPlayer = {
  playerId: number; teamId: number; name: string; teamName: string;
  imageUrl: string | null; averageRating: number; appearances: number;
  ratedAppearances: number; minutes: number;
};
export type LeagueMetric = {
  key: string; label: string; locked?: boolean; aggregation: "total" | "average" | "derived_rate";
  unit: string; direction: "asc" | "desc";
};
export type TeamSeasonMetrics = {
  teamName: string; matches: number;
  metrics: Record<string, { value: number | null; perMatch: number | null; matchesCovered: number; aggregation: string }>;
};
type Summary = {
  status: "pending" | "processing" | "ready" | "failed"; computed_at: string | null;
  team_best_players: Record<string, LeagueBestPlayer>; league_best_player: LeagueBestPlayer | null;
  fixture_count: number;
};
export type LeagueInsights = {
  leagueId: number; seasonId: number; refreshing: boolean;
  access: {tier: 'free' | 'plus' | 'pro'; biweekly: boolean};
  season: Summary & { team_metrics: Record<string, TeamSeasonMetrics>; metric_catalog: LeagueMetric[] };
  biweekly: (Summary & { period_start: string; period_end: string }) | null;
  periods: { period_start: string; period_end: string; fixture_count: number }[];
  selectedPeriodStart: string; periodTimezone: string;
};
export function sortLeagueRows(rows: LeagueStanding[], teams: Record<string, TeamSeasonMetrics>, metric: string, perMatch: boolean, direction: "asc" | "desc") {
  if (!metric) return rows;
  return [...rows].sort((a, b) => {
    const av = teams[String(a.teamId)]?.metrics[metric]?.[perMatch ? "perMatch" : "value"];
    const bv = teams[String(b.teamId)]?.metrics[metric]?.[perMatch ? "perMatch" : "value"];
    if (av == null && bv == null) return (a.position ?? 9999) - (b.position ?? 9999);
    if (av == null) return 1;
    if (bv == null) return -1;
    return (direction === "asc" ? av - bv : bv - av) || (a.position ?? 9999) - (b.position ?? 9999);
  });
}

export const PLUS_LEAGUE_METRICS = ['Goals', 'Shots Total', 'Shots On Target', 'Passes', 'Ball Possession %', 'Accurate Passes (%)', 'Corners', 'Fouls'];
export function orderLeagueMetrics(metrics: LeagueMetric[], tr: boolean) {
  return [...metrics].sort((a, b) => {
    const ai = PLUS_LEAGUE_METRICS.indexOf(a.key), bi = PLUS_LEAGUE_METRICS.indexOf(b.key);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
    return a.label.localeCompare(b.label, tr ? 'tr-TR' : 'en-GB');
  });
}
