import { normalizeSearchText } from "@/utils/searchSuggestions";
import { matchPoolRequest } from "./api";
export type MatchFilters = {
  country: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startDate: string;
  endDate: string;
};
export const EMPTY_MATCH_FILTERS: MatchFilters = {
  country: "",
  league: "",
  homeTeam: "",
  awayTeam: "",
  startDate: "",
  endDate: "",
};
export type MatchOptions = {
  countries: string[];
  leagues: string[];
  teams: string[];
};
export type MatchSide = {
  id: number;
  name: string;
  imageUrl?: string | null;
  score?: number | null;
};
export type MatchFixture = {
  fixtureId: number;
  name: string;
  startingAt: string;
  country: { name: string };
  league: { name: string };
  homeTeam: MatchSide;
  awayTeam: MatchSide;
  state: { code: string; name: string };
  resultInfo?: string | null;
};
export type FavoriteMatch = {
  reportStatus?:
    | "not_started"
    | "processing"
    | "ready"
    | "failed"
    | "error"
    | "";
  favoriteId: string;
  fixture: MatchFixture;
  reportType: "pre_match" | "post_match";
  createdAt: string;
};
export type MatchReportMetric = { name: string; value: number | string | null };
export type MatchReportTeam = {
  id: number; name: string; location: string; image_url?: string | null;
  player_count?: number | null;
  coach_name?: string | null; formation?: string | null; possession?: number | string | null;
  categories?: Record<string, MatchReportMetric[]>;
  expected_metrics?: MatchReportMetric[];
};
export type PostMatchCardData = {
  season?: { name?: string } | null;
  round?: { name?: string } | null;
  pressure?: { team_id: number; minute: number | null; value: number | string | null }[];
  period_teams?: Partial<Record<'first_half' | 'second_half', MatchReportTeam[]>>;
  lineups: MatchReportLineup[];
  events: MatchReportEvent[];
  fixture: { id: number; name?: string; starting_at?: string };
  league?: { name?: string; country?: { name?: string } } | null;
  venue?: { name?: string; city_name?: string } | null;
  weather?: { description?: string } | null;
  state?: { name?: string; short_name?: string; developer_name?: string } | null;
  teams: MatchReportTeam[];
  scores: { description: string; participant_id: number; score?: { goals?: number | null } }[];
  coverage: { unique_team_metrics: number; unique_player_metrics: number; players_with_minutes: number };
};
export type MatchReportLineup = {
  categories?: Record<string, MatchReportMetric[]>;
  expected_metrics?: MatchReportMetric[];
  id?: number; player_id: number; player_name?: string | null; team_id: number;
  position_id?: number | null; position_name?: string | null; starter: boolean;
  jersey_number?: number | null; formation_field?: string | null; formation_position?: number | null;
  player_image_url?: string | null;
};
export type MatchReportEvent = {
  id?: number; team_id?: number | null; player_id?: number | null; player_name?: string | null;
  related_player_id?: number | null; related_player_name?: string | null;
  minute?: number | null; extra_minute?: number | null; type_id?: number | null; type?: string | null;
  team_name?: string | null; result?: string | null;
};
export const getPostMatchCard = (fixtureId: number) =>
  matchPoolRequest<PostMatchCardData>(`/match-pool/fixtures/${fixtureId}/post-match-card`);
export const matchOptions = (filters: MatchFilters) =>
  matchPoolRequest<MatchOptions>("/match-pool/options", {
    country: filters.country,
    league: filters.league,
  });
export const searchMatches = (filters: MatchFilters, page = 1) =>
  matchPoolRequest<{
    fixtures: MatchFixture[];
    pagination: { hasMore: boolean; page: number; pagesRead: number };
  }>("/match-pool/search", {
    ...Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== ""),
    ),
    page,
    limit: 50,
  });
export const savedMatches = () =>
  matchPoolRequest<FavoriteMatch[]>("/favorite-matches");
export const saveMatch = (fixtureId: number) =>
  matchPoolRequest<FavoriteMatch>("/favorite-matches", { fixtureId });
export function matchSaveType(
  f: MatchFixture,
): "pre_match" | "post_match" | null {
  const code = (f.state.code || "").trim().toUpperCase().replace(/ /g, "_"),
    name = (f.state.name || "").trim().toLowerCase();
  if (
    ["FT", "AET", "PEN", "WO", "AWARDED"].includes(code) ||
    [
      "full time",
      "finished",
      "completed",
      "after extra time",
      "after penalties",
      "walkover",
      "awarded",
    ].some((v) => name.includes(v))
  )
    return "post_match";
  if (
    [
      "LIVE",
      "HT",
      "1ST",
      "2ND",
      "ET",
      "PEN_LIVE",
      "BREAK",
      "INT",
      "SUSP",
    ].includes(code) ||
    ["live", "in progress", "half time", "extra time", "penalty shootout"].some(
      (v) => name.includes(v),
    )
  )
    return null;
  if (
    ["NS", "TBA", "POSTP", "DELAYED"].includes(code) ||
    [
      "not started",
      "scheduled",
      "to be announced",
      "postponed",
      "delayed",
    ].some((v) => name.includes(v))
  )
    return "pre_match";
  return null;
}
export const matchScore = (f: MatchFixture) =>
  f.homeTeam.score == null || f.awayTeam.score == null
    ? "—"
    : `${f.homeTeam.score} – ${f.awayTeam.score}`;

export function matchStateLabel(f: MatchFixture, tr: boolean) {
  const raw = (f.state.name || f.state.code || "—").trim();
  if (!tr) return raw;
  const normalized = raw.toLowerCase();
  if (normalized === "not started" || normalized === "ns") return "Başlamadı";
  if (normalized === "full time" || normalized === "ft") return "Tamamlandı";
  return raw;
}
export function dateValidation(filters: MatchFilters, tr: boolean) {
  if (!filters.startDate || !filters.endDate) return "";
  const days =
    (Date.parse(filters.endDate) - Date.parse(filters.startDate)) / 86400000;
  return days < 0
    ? tr
      ? "Bitiş tarihi başlangıç tarihinden önce olamaz."
      : "End date cannot precede start date."
    : days > 100
      ? tr
        ? "Tarih aralığı 100 günü aşamaz."
        : "Date range cannot exceed 100 days."
      : "";
}
export const fixtureDate = (value: string, tr: boolean) =>
  new Date(
    value.replace(" ", "T") + (/Z$|[+-]\d\d:\d\d$/.test(value) ? "" : "Z"),
  ).toLocaleString(tr ? "tr-TR" : "en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Fill missing dates on search exactly as the enterprise match workspace does. */
export function effectiveMatchFilters(
  filters: MatchFilters,
  now = new Date(),
): MatchFilters {
  const localIso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const shift = (value: string, days: number) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + days);
    return localIso(date);
  };
  const today = localIso(now);
  return {
    ...filters,
    startDate: filters.startDate || shift(filters.endDate || today, -100),
    endDate:
      filters.endDate ||
      (filters.startDate ? shift(filters.startDate, 100) : today),
  };
}

export type ReportType = "pre_match" | "post_match";
export function matchReportAction(
  fixture: MatchFixture,
  type: ReportType,
  favorite?: FavoriteMatch,
): "view" | "generate" | "processing" | "unavailable" {
  const phase = matchSaveType(fixture);
  const eligible =
    type === "pre_match"
      ? phase === "pre_match" ||
        ["ready", "processing", "failed"].includes(favorite?.reportStatus || "")
      : phase === "post_match";
  if (!eligible) return "unavailable";
  if (favorite?.reportStatus === "ready") return "view";
  if (favorite?.reportStatus === "processing") return "processing";
  return "generate";
}
export function filterSavedMatches(
  fixtures: MatchFixture[],
  filters: MatchFilters,
): MatchFixture[] {
  return fixtures.filter(
    (f) =>
      !(["country", "league", "homeTeam", "awayTeam"] as const).some(
        (key) =>
          filters[key] &&
          !normalizeSearchText(f[key].name).includes(
            normalizeSearchText(filters[key]),
          ),
      ) &&
      (!filters.startDate || f.startingAt.slice(0, 10) >= filters.startDate) &&
      (!filters.endDate || f.startingAt.slice(0, 10) <= filters.endDate),
  );
}
export const matchDateOnly = (value: string) => {
  const [y, m, d] = value.slice(0, 10).split("-");
  return `${d}.${m}.${y.slice(-2)}`;
};
export const readMatchReport = (favoriteId: string) =>
  matchPoolRequest<{
    status: "ready";
    content: unknown;
    reportType: ReportType;
  }>(`/favorite-matches/${encodeURIComponent(favoriteId)}/report`);

export type MatchTeamInsight = { header: string; text: string; tone: 'positive' | 'neutral' | 'negative' };
export type MatchTeamAnalysis = { teams: Record<string, MatchTeamInsight[]> };
export const getMatchTeamAnalysis = (fixtureId: number, tr: boolean) =>
  matchPoolRequest<MatchTeamAnalysis>(`/match-pool/fixtures/${fixtureId}/team-analysis?language=${tr ? 'tr' : 'en'}`, {});

export type MatchPlayerPerspective = { player_id: number; player_name: string; selection_type: 'featured' | 'development'; text: string };
export type MatchPlayerPerspectives = { teams: Record<string, MatchPlayerPerspective[]> };
export const getMatchPlayerPerspectives = (fixtureId: number, tr: boolean) =>
  matchPoolRequest<MatchPlayerPerspectives>(`/match-pool/fixtures/${fixtureId}/player-perspectives?language=${tr ? 'tr' : 'en'}`, {});

export type SavedPostMatchReport = {
  favoriteId: string; status: 'not_started' | 'processing' | 'ready' | 'failed';
  content: null | { version: number; language: string; data?: PostMatchCardData;
    team_analysis?: MatchTeamAnalysis; player_perspectives?: MatchPlayerPerspectives;
    sections: Record<string, { status: 'pending' | 'processing' | 'ready' | 'failed'; access_tier?: 'free' | 'paid' }>;
  };
};
export const openSavedPostMatchReport = (fixtureId: number, tr: boolean) =>
  matchPoolRequest<SavedPostMatchReport>(`/match-pool/fixtures/${fixtureId}/saved-report?language=${tr ? 'tr' : 'en'}&lazy=true`, {});
export const pollSavedPostMatchReport = (fixtureId: number, tr: boolean) =>
  matchPoolRequest<SavedPostMatchReport>(`/match-pool/fixtures/${fixtureId}/saved-report?language=${tr ? 'tr' : 'en'}&lazy=true`);
export const ensureSavedPostMatchSection = (fixtureId:number,tr:boolean,section:'team_analysis'|'player_perspectives') =>
  matchPoolRequest<SavedPostMatchReport>(`/match-pool/fixtures/${fixtureId}/saved-report/sections/${section}?language=${tr?'tr':'en'}`,{});

export const getPreMatchCard = (fixtureId: number) => matchPoolRequest<PostMatchCardData>(`/match-pool/fixtures/${fixtureId}/pre-match-card`);

export type PreMatchPerformancePlayer = { player_id:number; player_name:string; player_image_url?:string|null; position_id?:number; position_name?:string; average_rating:number; standout_metrics?:{name:string;value:number;is_percentage?:boolean}[]; development_metrics?:{name:string;value:number;is_percentage?:boolean}[] };
export type PreMatchSquadUsage = { teams: { team_id: number; sample_size: number; summary?: { rotation_level: number; average_rating: number | null }; formations?: { formation: string; matches: number; percentage: number }[]; players: { player_id: number; player_name: string; player_image_url?: string | null; position_id?: number; position_name?: string; starts: number; substitute_appearances: number; last_match_starter?: boolean; average_rating?: number | null }[]; performance_summary?: {featured_players?:PreMatchPerformancePlayer[];top_rated?:PreMatchPerformancePlayer;top_scorers?:PreMatchPerformancePlayer[];development?:PreMatchPerformancePlayer} }[] };
const preMatchSquadCache = new Map<number, Promise<PreMatchSquadUsage>>();
export const getPreMatchSquad = (id: number) => {
  const cached = preMatchSquadCache.get(id);
  if (cached) return cached;
  const request = matchPoolRequest<PreMatchSquadUsage>(`/match-pool/fixtures/${id}/pre-match-squad`).catch(error => {
    preMatchSquadCache.delete(id);
    throw error;
  });
  preMatchSquadCache.set(id, request);
  return request;
};

export type PreMatchResult = { fixture_id: number; starting_at: string; opponent_name: string; opponent_image_url?: string; location: string; team_score: number | null; opponent_score: number | null; result: string; league_name: string };
export type PreMatchFormData = { teams: { team_id: number; sample_size: number; results: PreMatchResult[]; summary?: { wins: number; draws: number; losses: number; goals_for: number; goals_against: number; home: { goals_for: number; goals_against: number }; away: { goals_for: number; goals_against: number } } }[]; standings: Record<string,{ position: number | null; points: number | null; table_label: string }>; head_to_head?: { matches: { fixture_id:number; starting_at:string; home_name:string; away_name:string; home_score:number|null; away_score:number|null; league_name:string; season_name:string }[] } };
export const getPreMatchForm = (id: number) => matchPoolRequest<PreMatchFormData>(`/match-pool/fixtures/${id}/pre-match-form`);
export type PreMatchPlayersData = { teams:{team_id:number; sample_size:number; performance_summary?:{featured_players?:PreMatchPerformancePlayer[];top_rated?:PreMatchPerformancePlayer;top_scorers?:PreMatchPerformancePlayer[];development?:PreMatchPerformancePlayer}}[]; perspectives:Record<string,{text:string}> };
export const getPreMatchPlayers = (id:number,tr:boolean) => matchPoolRequest<PreMatchPlayersData>(`/match-pool/fixtures/${id}/pre-match-players?language=${tr?'tr':'en'}`);

export type PreMatchMomentumRow = { period:string; average_net_pressure:number; goals_for:number; goals_against:number };
export type PreMatchMomentumData = { teams:{team_id:number;sample_size:number;momentum:PreMatchMomentumRow[]}[]; perspective:{teams:Record<string,string>;match_outlook:string}|null };
export const getPreMatchMomentum = (id:number,tr:boolean) => matchPoolRequest<PreMatchMomentumData>(`/match-pool/fixtures/${id}/pre-match-momentum?language=${tr?'tr':'en'}`);

export type PreMatchScoreFlow = { teams: { team_id:number;sample_size:number;score_flow?:{states:{key:'ahead'|'level'|'behind';minutes:number;share:number}[]} }[] };
export const getPreMatchScoreFlow = (id:number) => matchPoolRequest<PreMatchScoreFlow>(`/match-pool/fixtures/${id}/pre-match-score-flow`);

export type PreMatchComparisonData = { teams:{team_id:number;sample_size:number;team_comparison:Record<string,MatchReportMetric[]>}[] };
export const getPreMatchComparison = (id:number) => matchPoolRequest<PreMatchComparisonData>(`/match-pool/fixtures/${id}/pre-match-comparison`);
export type PreMatchTeamAnalysisData = {teams:Record<string,{positive:string;strategy:string;weakness:string}>};
export const getPreMatchTeamAnalysis = (id:number,tr:boolean) => matchPoolRequest<PreMatchTeamAnalysisData>(`/match-pool/fixtures/${id}/pre-match-team-analysis?language=${tr?'tr':'en'}`);

export type PreMatchSections = {
  data: PostMatchCardData;
  squad: {teams: (PreMatchSquadUsage['teams'][number] & PreMatchScoreFlow['teams'][number] & PreMatchComparisonData['teams'][number])[]};
  form: PreMatchFormData;
  players: PreMatchPlayersData;
  momentum: PreMatchMomentumData;
  team_analysis: PreMatchTeamAnalysisData;
};
export type SavedPreMatchReport = {
  favoriteId: string;
  status: 'not_started' | 'processing' | 'ready' | 'failed';
  content: (Partial<PreMatchSections> & {
    version: number; language: string;
    sections: Record<string, {status: 'pending' | 'processing' | 'ready' | 'failed'; access_tier?: 'free' | 'paid'}>;
  }) | null;
};
export const openSavedPreMatchReport = (id:number,tr:boolean) => matchPoolRequest<SavedPreMatchReport>(`/match-pool/fixtures/${id}/saved-pre-report?language=${tr?'tr':'en'}&lazy=true`, {});
export const pollSavedPreMatchReport = (id:number,tr:boolean) => matchPoolRequest<SavedPreMatchReport>(`/match-pool/fixtures/${id}/saved-pre-report?language=${tr?'tr':'en'}&lazy=true`);
export const ensureSavedPreMatchSection = (id:number,tr:boolean,section:'players'|'momentum'|'team_analysis') => matchPoolRequest<SavedPreMatchReport>(`/match-pool/fixtures/${id}/saved-pre-report/sections/${section}?language=${tr?'tr':'en'}`,{});
