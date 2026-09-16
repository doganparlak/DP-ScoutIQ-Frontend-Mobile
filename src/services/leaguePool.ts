import { canonicalizeLeagueMetricLabel } from "@/utils/leagueMetricLabels";
import {
  leaguePoolRequest,
  getMatchupComparison,
  getMatchupSourcePlayer,
  type MatchupComparisonResponse,
} from "./api";
import type { SearchResultRow } from "@/components/CandidatePlayers";
import { getSeasonPlayerRows } from "./seasonData";
import { cleanImageUrl, sportmonksLeagueImage, sportmonksTeamImage } from "@/utils/sportmonksImages";

export type LeagueFilters = {
  leagues: string[];
  countries: string[];
  positions: string[];
};
export type LeagueOptions = LeagueFilters;
export type RawLeague = { id: string; content: Record<string, any> };
const numeric = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};
export function normalizeLeague(
  row: RawLeague,
  filters: LeagueFilters,
): SearchResultRow {
  const c = row.content;
  const counts = Object.fromEntries(
    Object.entries(c.position_counts || {}).map(([role, count]) => [
      role,
      numeric(count),
    ]),
  );
  const roles: string[] = Array.isArray(c.selected_positions)
    ? c.selected_positions.map(String)
    : Object.keys(counts);
  const stats = Object.entries(c.stats || {}).flatMap(([metric, value]) => {
    if (typeof value !== "number" && typeof value !== "string") return [];
    const cleaned =
      typeof value === "string" ? value.trim().replace(/%$/, "").trim() : value;
    if (cleaned === "") return [];
    const n = Number(cleaned);
    return Number.isFinite(n)
      ? [{ metric: canonicalizeLeagueMetricLabel(metric), value: n }]
      : [];
  });
  if (numeric(c.match_count))
    stats.push({ metric: "Match Count", value: numeric(c.match_count) });
  return {
    id: row.id,
    player: {
      entityType: "league",
      name: String(c.league_name || ""),
      stats,
      meta: {
        leagueId: numeric(c.league_id) || undefined,
        nationality: String(c.country_name || c.league_country_name || ""),
        league: String(c.league_name || ""),
        roles,
        positionNamesSeen: roles,
        positionCounts: counts,
        positionCountTotal: Object.values(counts).reduce(
          (sum, n) => sum + n,
          0,
        ),
        imageUrl: String(c.image_url || c.league_image_path || ""),
        leagueLogoUrl: String(c.image_url || c.league_image_path || ""),
        playerCount: numeric(c.player_count),
        teamCount: numeric(c.team_count),
        age: numeric(c.age) || undefined,
        height: numeric(c.height) || undefined,
        weight: numeric(c.weight) || undefined,
        matchCount: numeric(c.match_count),
        leagueFilters: {
          leagues: [String(c.league_name)],
          countries: filters.countries,
          positions: [...filters.positions],
        },
      },
    },
  };
}
export const getLeagueOptions = (filters: LeagueFilters) =>
  leaguePoolRequest<LeagueOptions>("options", {
    leagues: filters.leagues,
    countries: filters.countries,
  });
export async function searchLeagues(filters: LeagueFilters) {
  const rows = await leaguePoolRequest<RawLeague[]>("search", {
    ...filters,
    limit: 100,
  });
  return rows.map((row) => normalizeLeague(row, filters));
}
export async function getSharedMatchupComparison(
  rows: SearchResultRow[],
  worldCupMode = false,
  sources: Record<string, string[]> = {},
): Promise<MatchupComparisonResponse> {
  if (rows.length < 2 || rows.length > 4)
    throw new Error("Select 2–4 entries.");
  if (
    rows.every(
      (row) =>
        (!row.player.entityType || row.player.entityType === "player") &&
        !sources[row.id]?.length,
    )
  ) {
    return getMatchupComparison(
      rows[0].id,
      rows[1].id,
      worldCupMode,
      rows[2]?.id,
      rows[3]?.id,
      rows.map(row => row.player.meta?.sportmonksId),
    );
  }
  const entries = await Promise.all(
    rows.map(async (row) => {
      if (row.player.entityType === "season") {
        const match = row.id.match(/^season:(\d+):(.+)$/);
        if (!match) return row;
        const seasonRows = await getSeasonPlayerRows(Number(match[1]));
        const source = seasonRows.rows.find((item) => item.key === match[2]);
        if (!source) return row;
        return {
          ...row,
          player: {
            ...row.player,
            meta: {
              ...row.player.meta,
              teamId: source.teamId,
              leagueId: source.leagueId,
              teamLogoUrl: sportmonksTeamImage(source.teamId),
              leagueLogoUrl:
                cleanImageUrl(source.leagueImagePath) ||
                sportmonksLeagueImage(source.leagueId),
            },
          },
        };
      }
      if (row.player.entityType === "league") {
        const filters = row.player.meta?.leagueFilters;
        if (!filters)
          throw new Error(
            "League filters are missing. Select the league again.",
          );
        const current = await searchLeagues(filters);
        const refreshed =
          current.find((item) => item.id === row.id) ??
          current.find((item) => item.player.name === row.player.name);
        if (!refreshed)
          throw new Error("This league no longer has matching players.");
        return { ...refreshed, id: row.id };
      }
      if (sources[row.id]?.length)
        return getMatchupSourcePlayer(row.id, sources[row.id], row.player.meta?.sportmonksId);
      // Fetch complete player metrics, never send a league ID to the player endpoint.
      return (await getMatchupComparison(row.id, row.id, worldCupMode, undefined, undefined, [row.player.meta?.sportmonksId, row.player.meta?.sportmonksId])).player1;
    }),
  );
  return {
    player1: entries[0],
    player2: entries[1],
    ...(entries[2] ? { player3: entries[2] } : {}),
    ...(entries[3] ? { player4: entries[3] } : {}),
  };
}
