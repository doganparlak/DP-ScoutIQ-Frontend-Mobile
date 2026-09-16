import type { PlayerData } from "@/types";
import {
  CONTRIBUTION_IMPACT_METRICS,
  GK_METRICS,
  SHOOTING_METRICS,
  PASSING_METRICS,
  DEFENDING_METRICS,
  ERRORS_DISCIPLINE_METRICS,
  canonicalizeEnterpriseMetricLabel,
  toSpiderPoints,
  type EnterpriseMetricUnit,
  type EnterpriseSpiderPoint,
} from "./comparisonRanges";

export type MetricUnit = EnterpriseMetricUnit;
export const CATEGORIES = [
  {
    key: "contribution_impact",
    tr: "Katkı ve Etki",
    en: "Contribution & Impact",
    metrics: CONTRIBUTION_IMPACT_METRICS,
    lower: false,
  },
  {
    key: "goalkeeping",
    tr: "Kalecilik",
    en: "Goalkeeping",
    metrics: GK_METRICS,
    lower: false,
  },
  {
    key: "shooting",
    tr: "Şut ve Bitiricilik",
    en: "Shooting & Finishing",
    metrics: SHOOTING_METRICS,
    lower: false,
  },
  {
    key: "passing",
    tr: "Pas",
    en: "Passing & Delivery",
    metrics: PASSING_METRICS,
    lower: false,
  },
  {
    key: "defending",
    tr: "Savunma",
    en: "Defending",
    metrics: DEFENDING_METRICS,
    lower: false,
  },
  {
    key: "errors_discipline",
    tr: "Hatalar ve Disiplin",
    en: "Errors & Discipline",
    metrics: ERRORS_DISCIPLINE_METRICS,
    lower: true,
  },
] as const;
export type ComparisonRow = {
  metric: string;
  values: (number | undefined)[];
  points: (EnterpriseSpiderPoint | undefined)[];
  lower: boolean;
};
export type ComparisonGroup = {
  key: string;
  tr: string;
  en: string;
  rows: ComparisonRow[];
  lower: boolean;
};
export const finite = (value: unknown): number | undefined => {
  if (typeof value !== "number" && typeof value !== "string") return undefined;
  const cleaned =
    typeof value === "string" ? value.trim().replace(/%$/, "").trim() : value;
  if (cleaned === "") return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
};
export function preserveComparisonIdentity(
  fetched: PlayerData,
  slot: PlayerData,
): PlayerData {
  const meta = { ...fetched.meta };
  if (slot.meta?.imageUrl) meta.imageUrl = slot.meta.imageUrl;
  for (const key of ["teamId", "leagueId", "teamLogoUrl", "leagueLogoUrl"] as const) {
    if (meta[key] == null && slot.meta?.[key] != null) meta[key] = slot.meta[key] as never;
  }
  for (const key of ["height", "weight", "potential", "form"] as const) {
    const value = finite(slot.meta?.[key]) ?? finite(fetched.meta?.[key]);
    if (value !== undefined) meta[key] = value;
  }
  return { ...fetched, meta };
}
export function statValue(player: PlayerData, metric: string) {
  const stat = player.stats.find(
    (item) => canonicalizeEnterpriseMetricLabel(item.metric) === metric,
  );
  return finite(stat?.value);
}
export function playerPoints(
  player: PlayerData,
  metrics: readonly string[],
  unit: MetricUnit,
  worldCupMode = false,
) {
  const matchCount =
    player.meta?.matchCount ?? statValue(player, "Match Count");
  const stats =
    matchCount !== undefined && statValue(player, "Match Count") === undefined
      ? [...player.stats, { metric: "Match Count", value: matchCount }]
      : player.stats;
  const validStats = stats.flatMap((stat) => {
    const value = finite(stat.value);
    return value === undefined ? [] : [{ ...stat, value }];
  });
  return toSpiderPoints(validStats, metrics, {
    unit,
    worldCupMode,
    matchCount,
  });
}
export function comparisonScoreVisibility(players: PlayerData[]) {
  const hasLeague = players.some((player) => player.entityType === "league");
  return {
    potential:
      !hasLeague &&
      players.some((player) => finite(player.meta?.potential) !== undefined),
    form:
      !hasLeague &&
      players.some((player) => finite(player.meta?.form) !== undefined),
  };
}
export function scoreGroup(players: PlayerData[]): ComparisonGroup {
  const visible = comparisonScoreVisibility(players);
  return {
    key: "scoutwise_scores",
    tr: "ScoutWise Skorları & Puanlar",
    en: "ScoutWise Scores & Ratings",
    lower: false,
    rows: ["Potential", "Form", "Rating"]
      .filter(
        (metric) =>
          metric === "Rating" ||
          (metric === "Potential" ? visible.potential : visible.form),
      )
      .map((metric) => {
        const values = players.map((player) =>
          metric === "Potential"
            ? finite(player.meta?.potential)
            : metric === "Form"
              ? finite(player.meta?.form)
              : statValue(player, "Rating"),
        );
        return {
          metric,
          values,
          lower: false,
          points: values.map((value) =>
            value === undefined
              ? undefined
              : {
                  label: metric,
                  value,
                  min: 0,
                  max: metric === "Rating" ? 10 : 100,
                },
          ),
        };
      }),
  };
}
export function metricGroup(
  players: PlayerData[],
  category: (typeof CATEGORIES)[number],
  unit: MetricUnit,
  worldCupMode = false,
): ComparisonGroup {
  const metrics = category.metrics.filter((metric) => metric !== "Rating");
  const maps = players.map(
    (player) =>
      new Map(
        playerPoints(player, metrics, unit, worldCupMode).map((point) => [
          point.label,
          point,
        ]),
      ),
  );
  const rows: ComparisonRow[] = [];
  for (const metric of metrics) {
    const points = maps.map((map) =>
      map.get(canonicalizeEnterpriseMetricLabel(metric)),
    );
    if (!points.every(Boolean) || points.every((point) => point!.value === 0))
      continue;
    rows.push({
      metric,
      points,
      values: points.map((point) => point!.value),
      lower: category.lower,
    });
  }
  return { ...category, rows };
}
export function categorySummary(group: ComparisonGroup, count: number) {
  const wins = Array<number>(count).fill(0);
  for (const row of group.rows) {
    if (
      !row.values.every(
        (value) => value !== undefined && Number.isFinite(value),
      )
    )
      continue;
    const values = row.values as number[];
    const best = row.lower ? Math.min(...values) : Math.max(...values);
    const leaders = values.flatMap((value, index) =>
      value === best ? [index] : [],
    );
    if (leaders.length === 1) wins[leaders[0]]++;
  }
  const top = Math.max(0, ...wins);
  let winners = wins.flatMap((value, index) =>
    value > 0 && value === top ? [index] : [],
  );
  if (count === 2 && winners.length !== 1) winners = [];
  return { key: group.key, tr: group.tr, en: group.en, wins, winners };
}
export function leaderSummaries(
  players: PlayerData[],
  unit: MetricUnit,
  worldCupMode = false,
) {
  const groups = [
    scoreGroup(players),
    ...CATEGORIES.map((category) =>
      metricGroup(players, category, unit, worldCupMode),
    ),
  ];
  return groups
    .filter((group) =>
      group.rows.some((row) =>
        row.values.every((value) => value !== undefined),
      ),
    )
    .filter(
      (group) =>
        !players.some((player) => player.entityType === "league") ||
        group.rows.some((row) =>
          row.values.some((value) => value !== undefined && value !== 0),
        ),
    )
    .map((group) => categorySummary(group, players.length));
}
