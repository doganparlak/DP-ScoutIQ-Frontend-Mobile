// Ported from ScoutWise web enterprise-spider-ranges.ts. Keep metric math in sync.

export type EnterpriseSpiderPoint = {
  label: string;
  value: number;
  min: number;
  max: number;
};

export type EnterpriseMetricUnit = "perMatch" | "per90" | "total";

export type EnterpriseSpiderRangeOptions = {
  unit?: EnterpriseMetricUnit;
  matchCount?: number | string | null;
  averageMinutes?: number | string | null;
  worldCupMode?: boolean;
};

const PER90_RANGE_FACTOR = 90 / 70;
const CLUB_TOTAL_REFERENCE_MATCHES = 40;
const WORLD_CUP_TOTAL_REFERENCE_MATCHES = 4;

export const GK_METRICS = [
  "Saves",
  "Saves Insidebox",
  "Penalties Saved",
  "Punches",
  "Good High Claim",
] as const;

export const SHOOTING_METRICS = [
  "Shots Total",
  "Shots On Target",
  "Shots On Target (%)",
  "Expected Goals",
  "Expected Goals On Target",
  "Shooting Performance",
  "Shot Quality (%)",
  "On-Target Shot Quality (%)",
  "Goal Conversion (%)",
  "On-Target to Goal Conversion (%)",
  "Goals",
  "Hit Woodwork",
  "Penalties Scored",
] as const;

export const PASSING_METRICS = [
  "Assists",
  "Assist Efficiency (%)",
  "Long Balls",
  "Long Balls Won",
  "Long Balls Won (%)",
  "Total Crosses",
  "Accurate Crosses",
  "Successful Crosses (%)",
  "Passes",
  "Accurate Passes",
  "Accurate Passes (%)",
  "Backward Passes",
  "Key Passes",
  "Passes In Final Third",
  "Through Balls",
  "Through Balls Won",
] as const;

export const CONTRIBUTION_IMPACT_METRICS = [
  "Match Count",
  "Minutes Played",
  "Penalties Won",
  "Touches",
  "Big Chances Created",
  "Dribble Attempts",
  "Successful Dribbles",
  "Dribble Accuracy (%)",
  "Man Of Match",
  "Rating",
  "Captain",
  "Fouls Drawn",
  "Offsides Provoked",
] as const;

export const ERRORS_DISCIPLINE_METRICS = [
  "Goals Conceded",
  "Penalties Committed",
  "Penalties Missed",
  "Shots Off Target",
  "Big Chances Missed",
  "Aerials Lost",
  "Duels Lost",
  "Fouls",
  "Dispossessed",
  "Dribbled Past",
  "Turn Over",
  "Possession Lost",
  "Offsides",
  "Own Goals",
  "Error Lead To Goal",
  "Error Lead To Shot",
  "Yellow Cards",
  "Red Cards",
] as const;

export const DEFENDING_METRICS = [
  "Interceptions",
  "Tackles",
  "Tackles Won",
  "Tackles Won (%)",
  "Last Man Tackle",
  "Blocked Shots",
  "Clearances",
  "Clearance Offline",
  "Ball Recovery",
  "Aerials",
  "Aerials Won",
  "Aerials Won (%)",
  "Total Duels",
  "Duels Won",
  "Duels Won (%)",
] as const;

const RANGES: Record<string, { min: number; max: number }> = {
  "Blocked Shots": { min: 0, max: 0.5 },
  "Tackles Won": { min: 0, max: 1.5 },
  "Big Chances Missed": { min: 0, max: 1 },
  "Chances Created": { min: 0, max: 2 },
  "Goals Conceded": { min: 0, max: 2 },
  "Long Balls Won": { min: 0, max: 2 },
  "Successful Crosses (%)": { min: 0, max: 100 },
  "Last Man Tackle": { min: 0, max: 0.3 },
  "Accurate Passes (%)": { min: 0, max: 100 },
  "Aerials Won (%)": { min: 0, max: 100 },
  Fouls: { min: 0, max: 2 },
  "Hit Woodwork": { min: 0, max: 0.15 },
  "Total Duels": { min: 0, max: 9 },
  "Accurate Passes": { min: 0, max: 50 },
  "Error Lead To Goal": { min: 0, max: 0.25 },
  "Error Lead To Shot": { min: 0, max: 0.4 },
  "Key Passes": { min: 0, max: 2 },
  "Penalties Missed": { min: 0, max: 0.15 },
  "Yellow Cards": { min: 0, max: 0.4 },
  "Duels Won": { min: 0, max: 6.5 },
  Rating: { min: 0, max: 10 },
  "Shots Total": { min: 0, max: 2.5 },
  "Shots On Target (%)": { min: 0, max: 100 },
  "Expected Goals": { min: 0, max: 0.6 },
  "Expected Goals On Target": { min: 0, max: 0.4 },
  "Shooting Performance": { min: -0.4, max: 0.4 },
  "Shot Quality (%)": { min: 0, max: 40 },
  "On-Target Shot Quality (%)": { min: 0, max: 100 },
  "Goal Conversion (%)": { min: 0, max: 40 },
  "On-Target to Goal Conversion (%)": { min: 0, max: 40 },
  "Assist Efficiency (%)": { min: 0, max: 25 },
  "Dribble Accuracy (%)": { min: 0, max: 75 },
  "Total Crosses": { min: 0, max: 3 },
  Passes: { min: 0, max: 50 },
  Offsides: { min: 0, max: 0.3 },
  "Aerials Lost": { min: 0, max: 4 },
  "Penalties Committed": { min: 0, max: 0.15 },
  "Possession Lost": { min: 0, max: 20 },
  "Long Balls": { min: 0, max: 4 },
  "Aerials Won": { min: 0, max: 4 },
  Clearances: { min: 0, max: 1 },
  "Man Of Match": { min: 0, max: 0.15 },
  "Match Count": { min: 0, max: 35 },
  "Ball Recovery": { min: 0, max: 3 },
  "Red Cards": { min: 0, max: 0.2 },
  "Accurate Crosses": { min: 0, max: 1.5 },
  Goals: { min: 0, max: 0.4 },
  "Offsides Provoked": { min: 0, max: 0.5 },
  Aerials: { min: 0, max: 5 },
  Saves: { min: 0, max: 4 },
  Touches: { min: 0, max: 50 },
  Assists: { min: 0, max: 0.3 },
  "Minutes Played": { min: 0, max: 90 },
  "Dribble Attempts": { min: 0, max: 2 },
  Tackles: { min: 0, max: 3 },
  "Turn Over": { min: 0, max: 3 },
  "Fouls Drawn": { min: 0, max: 2 },
  "Big Chances Created": { min: 0, max: 0.75 },
  "Long Balls Won (%)": { min: 0, max: 100 },
  "Penalties Scored": { min: 0, max: 0.15 },
  "Penalties Won": { min: 0, max: 0.1 },
  "Duels Lost": { min: 0, max: 6 },
  "Penalties Saved": { min: 0, max: 0.5 },
  "Saves Insidebox": { min: 0, max: 4 },
  "Shots Off Target": { min: 0, max: 2.5 },
  "Good High Claim": { min: 0, max: 1.5 },
  Dispossessed: { min: 0, max: 5 },
  "Shots On Target": { min: 0, max: 1.25 },
  "Through Balls Won": { min: 0, max: 0.25 },
  "Duels Won (%)": { min: 0, max: 100 },
  Punches: { min: 0, max: 0.75 },
  "Successful Dribbles": { min: 0, max: 2 },
  "Tackles Won (%)": { min: 0, max: 100 },
  Interceptions: { min: 0, max: 2 },
  "Yellow & Red Cards": { min: 0, max: 1 },
  "Backward Passes": { min: 0, max: 10 },
  Captain: { min: 0, max: 0.5 },
  "Own Goals": { min: 0, max: 0.2 },
  "Dribbled Past": { min: 0, max: 2 },
  "Clearance Offline": { min: 0, max: 0.05 },
  "Through Balls": { min: 0, max: 0.5 },
  "Passes In Final Third": { min: 0, max: 6 },
};

const CANON_BY_KEY: Record<string, string> = {};
Object.keys(RANGES).forEach((label) => {
  CANON_BY_KEY[metricKey(label)] = label;
});
CANON_BY_KEY[metricKey("yellow_red_cards")] = "Yellow & Red Cards";
CANON_BY_KEY[metricKey("shots_blocked")] = "Blocked Shots";

function metricKey(value: string) {
  return value
    .replace(/%/g, " percentage ")
    .replace(/&/g, " and ")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function canonicalizeEnterpriseMetricLabel(raw: string) {
  return CANON_BY_KEY[metricKey(raw || "")] || (raw || "").trim();
}

function toFiniteNumber(
  value: number | string | null | undefined,
): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number(value.replace("%", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isFixedUnitMetric(label: string) {
  return label === "Rating" || label === "Match Count" || label.includes("(%)");
}

function getDerivedMetricValue(
  label: string,
  index: Map<string, number | string>,
) {
  if (label === "Shot Quality (%)") {
    const xg = toFiniteNumber(index.get("Expected Goals"));
    const shots = toFiniteNumber(index.get("Shots Total"));
    if (xg === null || shots === null || shots <= 0) return null;
    return (xg / shots) * 100;
  }
  if (label === "On-Target Shot Quality (%)") {
    const xgot = toFiniteNumber(index.get("Expected Goals On Target"));
    const shotsOnTarget = toFiniteNumber(index.get("Shots On Target"));
    if (xgot === null || shotsOnTarget === null || shotsOnTarget <= 0)
      return null;
    return (xgot / shotsOnTarget) * 100;
  }
  if (label === "Goal Conversion (%)") {
    const goals = toFiniteNumber(index.get("Goals"));
    const shots = toFiniteNumber(index.get("Shots Total"));
    if (goals === null || shots === null || shots <= 0) return null;
    return (goals / shots) * 100;
  }
  if (label === "On-Target to Goal Conversion (%)") {
    const goals = toFiniteNumber(index.get("Goals"));
    const shotsOnTarget = toFiniteNumber(index.get("Shots On Target"));
    if (goals === null || shotsOnTarget === null || shotsOnTarget <= 0)
      return null;
    return (goals / shotsOnTarget) * 100;
  }
  if (label === "Assist Efficiency (%)") {
    const assists = toFiniteNumber(index.get("Assists"));
    const keyPasses = toFiniteNumber(index.get("Key Passes"));
    if (assists === null || keyPasses === null || keyPasses <= 0) return null;
    return (assists / keyPasses) * 100;
  }
  if (label === "Dribble Accuracy (%)") {
    const successfulDribbles = toFiniteNumber(index.get("Successful Dribbles"));
    const dribbleAttempts = toFiniteNumber(index.get("Dribble Attempts"));
    if (
      successfulDribbles === null ||
      dribbleAttempts === null ||
      dribbleAttempts <= 0
    )
      return null;
    return (successfulDribbles / dribbleAttempts) * 100;
  }
  return null;
}

function scaleRange(
  label: string,
  range: { min: number; max: number },
  options?: EnterpriseSpiderRangeOptions,
) {
  if (label === "Match Count") {
    return {
      min: range.min,
      max: options?.worldCupMode
        ? WORLD_CUP_TOTAL_REFERENCE_MATCHES
        : CLUB_TOTAL_REFERENCE_MATCHES,
    };
  }
  const unit = options?.unit || "perMatch";
  if (unit === "perMatch" || isFixedUnitMetric(label)) return range;
  if (unit === "per90") {
    if (label === "Minutes Played") return range;
    return {
      min: range.min * PER90_RANGE_FACTOR,
      max: range.max * PER90_RANGE_FACTOR,
    };
  }

  const referenceMatches = options?.worldCupMode
    ? WORLD_CUP_TOTAL_REFERENCE_MATCHES
    : CLUB_TOTAL_REFERENCE_MATCHES;
  return {
    min: range.min * referenceMatches,
    max: range.max * referenceMatches,
  };
}

function scaleValue(
  label: string,
  value: number,
  options: EnterpriseSpiderRangeOptions | undefined,
  averageMinutes: number | null,
) {
  const unit = options?.unit || "perMatch";
  if (unit === "perMatch" || isFixedUnitMetric(label)) return value;
  if (unit === "per90") {
    if (label === "Minutes Played") return value;
    if (!averageMinutes || averageMinutes <= 0) return value;
    return value * (90 / averageMinutes);
  }

  const matchCount = toFiniteNumber(options?.matchCount);
  if (!matchCount || matchCount <= 0) return value;
  return value * matchCount;
}

export function toSpiderPoints(
  stats: Array<{ metric: string; value: number | string }>,
  metrics: readonly string[],
  options?: EnterpriseSpiderRangeOptions,
): EnterpriseSpiderPoint[] {
  const index = new Map(
    (stats || []).map((stat) => [
      canonicalizeEnterpriseMetricLabel(stat.metric || ""),
      stat.value,
    ]),
  );
  const averageMinutes =
    toFiniteNumber(options?.averageMinutes) ??
    toFiniteNumber(index.get("Minutes Played"));
  const matchCount =
    toFiniteNumber(options?.matchCount) ??
    toFiniteNumber(index.get("Match Count"));
  const effectiveOptions = { ...options, matchCount };

  return metrics
    .map((metric) => {
      const canonical = canonicalizeEnterpriseMetricLabel(metric);
      const range = RANGES[canonical];
      if (!range || range.max <= range.min) return null;
      const derivedValue = getDerivedMetricValue(canonical, index);
      const raw = index.get(canonical);
      const rawValue =
        derivedValue ??
        (typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Number(raw.replace("%", "").trim())
            : NaN);
      if (!Number.isFinite(rawValue)) return null;
      const nextRange = scaleRange(canonical, range, effectiveOptions);
      const value = scaleValue(
        canonical,
        rawValue,
        effectiveOptions,
        averageMinutes,
      );
      return {
        label: canonical,
        value,
        min: nextRange.min,
        max: nextRange.max,
      };
    })
    .filter(Boolean) as EnterpriseSpiderPoint[];
}
