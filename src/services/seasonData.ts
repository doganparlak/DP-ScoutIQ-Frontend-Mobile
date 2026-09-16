import { seasonDataRequest } from "./api";
export type SeasonPlayerCandidate = {
  playerId: number;
  displayName: string;
  matchedAlias: string;
  nationality: string;
  latestTeam: string;
  latestPosition: string;
  latestSeason: string;
  firstSeason: string;
  rowCount: number;
};

export type SeasonPlayerIdentity = {
  playerId: number;
  displayName: string;
  imageUrl?: string | null;
  nationality: string;
  gender: string;
  latestTeam: string;
  latestSeason: string;
};

export type SeasonDataRow = {
  key: string;
  playerId: number;
  teamId: number;
  teamName: string;
  leagueId: number;
  leagueName: string;
  leagueType: string;
  leagueSubType: string;
  country: string;
  leagueShortCode: string;
  leagueImagePath: string;
  seasonId: number;
  seasonName: string;
  matchCount: number;
  positionName: string;
  positionCounts: Record<string, number>;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
};

export type SeasonPlayerRows = {
  player: SeasonPlayerIdentity;
  rows: SeasonDataRow[];
};

export type SeasonAggregate = {
  playerId: number;
  displayName: string;
  nationality: string;
  gender: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  selectedRowCount: number;
  matchCount: number;
  seasons: string[];
  teams: string[];
  competitions: string[];
  positionCounts: Record<string, number>;
  stats: Record<string, number>;
  selectedRows: SeasonDataRow[];
};

export const searchSeasonPlayers = (query: string, nationality = "") =>
  seasonDataRequest<SeasonPlayerCandidate[]>("search", {
    query: query.trim(),
    nationality: nationality || undefined,
    limit: 50,
  });
export const getSeasonPlayerOptions = () =>
  seasonDataRequest<{ nationalities: string[] }>("options");
export const getSeasonPlayerRows = (id: number) =>
  seasonDataRequest<SeasonPlayerRows>(`players/${id}/rows`);
export const aggregateSeasonPlayerRow = (id: number, row: SeasonDataRow) =>
  seasonDataRequest<SeasonAggregate>("aggregate", {
    playerId: id,
    sources: [
      { teamId: row.teamId, leagueId: row.leagueId, seasonId: row.seasonId },
    ],
  });
