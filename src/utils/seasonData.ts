import type { SeasonAggregate, SeasonDataRow } from "@/services/seasonData";
import type { SearchResultRow } from "@/components/CandidatePlayers";
import { CATEGORIES, finite, type MetricUnit } from "./comparisonGroups";
import { canonicalizeEnterpriseMetricLabel as canonical } from "./comparisonRanges";
import { cleanImageUrl, sportmonksLeagueImage, sportmonksTeamImage } from "./sportmonksImages";
export const SEASON_EXCLUDED = new Set([
  "Touches",
  "Aerials",
  "Aerials Won",
  "Aerials Won (%)",
  "Yellow & Red Cards",
]);
export function seasonStats(aggregate: SeasonAggregate) {
  const stats = Object.entries(aggregate.stats).flatMap(([key, raw]) => {
    const metric = canonical(key),
      value = finite(raw);
    return value === undefined ||
      Math.abs(value) <= 1e-9 ||
      SEASON_EXCLUDED.has(metric)
      ? []
      : [{ metric, value }];
  });
  if (!stats.some((s) => s.metric === "Match Count"))
    stats.push({ metric: "Match Count", value: aggregate.matchCount });
  return stats;
}
export function seasonMetricGroups(aggregate: SeasonAggregate) {
  const values = new Map(
    seasonStats(aggregate).map((s) => [s.metric, s.value]),
  );
  return CATEGORIES.map((group) => ({
    ...group,
    rows: group.metrics.map(canonical).flatMap((metric) => {
      const value = values.get(metric);
      return value === undefined || Math.abs(value) <= 1e-9
        ? []
        : [{ metric, value }];
    }),
  })).filter((group) => group.rows.length);
}
export function convertSeasonMetric(
  metric: string,
  value: number,
  aggregate: SeasonAggregate,
  unit: MetricUnit,
) {
  if (
    unit === "perMatch" ||
    metric === "Match Count" ||
    metric === "Rating" ||
    metric.includes("(%)")
  )
    return value;
  if (unit === "total") return value * aggregate.matchCount;
  const minutes =
    finite(
      Object.entries(aggregate.stats).find(
        ([key]) => canonical(key) === "Minutes Played",
      )?.[1],
    ) ?? 0;
  return value * (90 / (minutes > 0 ? minutes : 70));
}
export function seasonMatchupRow(
  aggregate: SeasonAggregate,
  row: SeasonDataRow,
  imageUrl?: string | null,
): SearchResultRow {
  const roles = Object.entries(aggregate.positionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([role]) => role);
  return {
    id: `season:${aggregate.playerId}:${row.key}`,
    player: {
      entityType: "season",
      name: aggregate.displayName,
      stats: seasonStats(aggregate),
      meta: {
        seasonName: row.seasonName,
        imageUrl: imageUrl || undefined,
        teamId: row.teamId,
        leagueId: row.leagueId,
        teamLogoUrl: sportmonksTeamImage(row.teamId),
        leagueLogoUrl:
          cleanImageUrl(row.leagueImagePath) || sportmonksLeagueImage(row.leagueId),
        nationality: aggregate.nationality || row.country,
        age: aggregate.age ?? undefined,
        height: aggregate.height ?? undefined,
        weight: aggregate.weight ?? undefined,
        team: row.teamName,
        league: row.leagueName,
        matchCount: aggregate.matchCount,
        roles,
        positionCounts: aggregate.positionCounts,
        positionNamesSeen: roles,
        positionCountTotal: Object.values(aggregate.positionCounts).reduce(
          (a, b) => a + b,
          0,
        ),
        primaryPositionCode: roles[0] || row.positionName,
      },
    },
  };
}
export function filterSeasonRows(
  rows: SeasonDataRow[],
  season: string,
  team: string,
  competition: string,
) {
  return rows
    .filter(
      (row) =>
        (!season || row.seasonName === season) &&
        (!team || row.teamName === team) &&
        (!competition || row.leagueName === competition),
    )
    .sort(
      (a, b) =>
        b.seasonName.localeCompare(a.seasonName) ||
        a.teamName.localeCompare(b.teamName) ||
        a.leagueName.localeCompare(b.leagueName),
    );
}
