// src/components/spiderRanges.ts
import type { SpiderPoint } from './SpiderChart';

/** === Category metric whitelists (what we try to plot, in this order) === */

// GK-specific metrics
export const GK_METRICS = [
  'Saves',
  'Saves Insidebox',
  'Penalties Saved',
  'Punches',
  'Good High Claim',
  'Goalkeeper Goals Conceded',
] as const;

// Shooting / finishing metrics
export const SHOOTING_METRICS = [
  'Goals',
  'Shots Total',
  'Penalties Scored',
  'Shots On Target',
  'Hit Woodwork',
] as const;

// Passing / delivery metrics
export const PASSING_METRICS = [
  'Assists',
  'Long Balls',
  'Long Balls Won',
  'Long Balls Won (%)',
  'Accurate Passes',
  'Accurate Passes (%)',
  'Backward Passes',
  'Total Crosses',
  'Accurate Crosses',
  'Successful Crosses (%)',
  'Passes',
  'Key Passes',
  'Passes In Final Third',
  'Through Balls',
  'Through Balls Won',
] as const;

// Contribution & Impact (formerly "other positive")
export const CONTRIBUTION_IMPACT_METRICS = [
  'Penalties Won',
  'Touches',
  'Big Chances Created',
  'Dribble Attempts',
  'Successful Dribbles',
  'Man Of Match',
  'Rating',
  'Captain',
  'Fouls Drawn',
] as const;

// Errors & Discipline (formerly "other negative")
export const ERRORS_DISCIPLINE_METRICS = [
  'Goals Conceded',
  'Penalties Committed',
  'Penalties Missed',
  'Shots Off Target',
  'Big Chances Missed',
  'Aerials Lost',
  'Duels Lost',
  'Fouls',
  'Dispossessed',
  'Dribbled Past',
  'Turn Over',
  'Possession Lost',
  'Offsides',
  'Offsides Provoked',
  'Own Goals',
  'Error Lead To Goal',
  'Error Lead To Shot',
  'Yellow Cards',
  'Yellow & Red Cards',
  'Red Cards',
] as const;

// Defending metrics
export const DEFENDING_METRICS = [
  'Interceptions',
  'Tackles',
  'Tackles Won',
  'Tackles Won (%)',
  'Last Man Tackle',
  'Blocked Shots',
  'Shots Blocked',
  'Clearances',
  'Clearance Offline',
  'Ball Recovery',
  'Aerials',
  'Aerials Won (%)',
  'Aerials Won',
  'Duels Won',
  'Duels Won (%)',
  'Total Duels',
] as const;


/** Normalized-key map for case/whitespace-insensitive matching */
function mkKey(s: string) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}
const ALIAS: Record<string, string> = {};

/** === Static ranges per canonical metric (min: 0, max: from your data) === */
const RANGES: Record<string, { min: number; max: number }> = {
  'Blocked Shots': { min: 0, max: 5.0 },
  'Tackles Won': { min: 0, max: 8.0 },
  'Big Chances Missed': { min: 0, max: 3.0 },
  'Chances Created': { min: 0, max: 7.0 },
  'Goals Conceded': { min: 0, max: 8.0 },
  'Long Balls Won': { min: 0, max: 17.0 },
  'Successful Crosses (%)': { min: 0, max: 100.0 },
  'Last Man Tackle': { min: 0, max: 1.0 },
  'Accurate Passes (%)': { min: 0, max: 100.0 },
  'Aerials Won (%)': { min: 0, max: 89.0 },
  'Fouls': { min: 0, max: 6.0 },
  'Hit Woodwork': { min: 0, max: 1.0 },
  'goals_from_events': { min: 0, max: 3.0 },
  'Total Duels': { min: 0, max: 28.0 },
  'Accurate Passes': { min: 0, max: 131.5 },
  'Error Lead To Goal': { min: 0, max: 2.0 },
  'Error Lead To Shot': { min: 0, max: 2.0 },
  'Key Passes': { min: 0, max: 7.0 },
  'Penalties Missed': { min: 0, max: 1.0 },
  'Yellow Cards': { min: 0, max: 1.0 },
  'Duels Won': { min: 0, max: 16.0 },
  'Rating': { min: 0, max: 10.0 },
  'Shots Total': { min: 0, max: 8.0 },
  'Total Crosses': { min: 0, max: 18.0 },
  'Passes': { min: 0, max: 138.0 },
  'Offsides': { min: 0, max: 3.0 },
  'Aerials Lost': { min: 0, max: 14.0 },
  'Penalties Committed': { min: 0, max: 1.0 },
  'Possession Lost': { min: 0, max: 33.0 },
  'Long Balls': { min: 0, max: 41.0 },
  'Aerials Won': { min: 0, max: 14.0 },
  'Clearances': { min: 0, max: 20.0 },
  'Man Of Match': { min: 0, max: 1.0 },
  'Ball Recovery': { min: 0, max: 22.0 },
  'Red Cards': { min: 0, max: 1.0 },
  'Accurate Crosses': { min: 0, max: 6.0 },
  'Goals': { min: 0, max: 3.0 },
  'Offsides Provoked': { min: 0, max: 1.0 },
  'Aerials': { min: 0, max: 19.0 },
  'Saves': { min: 0, max: 9.0 },
  'Touches': { min: 0, max: 149.5 },
  'Assists': { min: 0, max: 3.0 },
  'Minutes Played': { min: 0, max: 120.0 },
  'Dribble Attempts': { min: 0, max: 8.0 },
  'Shots Blocked': { min: 0, max: 4.0 },
  'Goalkeeper Goals Conceded': { min: 0, max: 8.0 },
  'Tackles': { min: 0, max: 8.0 },
  'Turn Over': { min: 0, max: 4.0 },
  'Fouls Drawn': { min: 0, max: 7.0 },
  'Big Chances Created': { min: 0, max: 2.0 },
  'Long Balls Won (%)': { min: 0, max: 100.0 },
  'Penalties Scored': { min: 0, max: 1.0 },
  'Penalties Won': { min: 0, max: 1.0 },
  'Duels Lost': { min: 0, max: 16.0 },
  'Penalties Saved': { min: 0, max: 1.0 },
  'Saves Insidebox': { min: 0, max: 6.0 },
  'Shots Off Target': { min: 0, max: 5.0 },
  'Good High Claim': { min: 0, max: 5.0 },
  'Dispossessed': { min: 0, max: 6.0 },
  'Shots On Target': { min: 0, max: 4.0 },
  'Through Balls Won': { min: 0, max: 0.0 },
  'assists_from_events': { min: 0, max: 3.0 },
  'Duels Won (%)': { min: 0, max: 100.0 },
  'Punches': { min: 0, max: 3.0 },
  'Successful Dribbles': { min: 0, max: 4.0 },
  'Tackles Won (%)': { min: 0, max: 100.0 },
  'Interceptions': { min: 0, max: 8.0 },
  'Yellow & Red Cards': { min: 0, max: 1.0 },
  'Backward Passes': { min: 0, max: 22.0 },
  'Captain': { min: 0, max: 1.0 },
  'Own Goals': { min: 0, max: 1.0 },
  'Dribbled Past': { min: 0, max: 4.0 },
  'Clearance Offline': { min: 0, max: 1.0 },
  'Through Balls': { min: 0, max: 1.0 },
  'Passes In Final Third': { min: 0, max: 32.0 },
};

/** Build a case/space–insensitive lookup of canonical keys */
const CANON_BY_KEY: Record<string, string> = {};
Object.keys(RANGES).forEach((label) => {
  CANON_BY_KEY[mkKey(label)] = label;
});

/** Resolve any raw label to a canonical label we know in RANGES */
function canonicalizeLabel(raw: string): string {
  const norm = mkKey(raw || '');
  // First, alias map (handles %-variants, pluralization etc.)
  const aliasHit = ALIAS[norm];
  if (aliasHit) return aliasHit;
  // Then try direct case-insensitive hit in our ranges
  const direct = CANON_BY_KEY[norm];
  if (direct) return direct;
  // Fallback: return the raw (so unknown metrics can still pass through with default range)
  return (raw || '').trim();
}

/** === Public: convert raw stats into SpiderPoints for a given category list === */
export function toSpiderPoints(
  stats: Array<{ metric: string; value: number | string }>,
  metrics: readonly string[],
): SpiderPoint[] {
  const index = new Map(
    (stats || []).map((s) => {
      const key = canonicalizeLabel((s.metric || '').trim());
      return [key, s.value];
    }),
  );

  const points: SpiderPoint[] = [];
  for (const m of metrics) {
    const canonical = canonicalizeLabel(m);
    const r = RANGES[canonical];
    if (!r) continue;

    // drop zero/invalid ranges
    if (!Number.isFinite(r.min) || !Number.isFinite(r.max) || r.max <= r.min) continue;

    const raw = index.get(canonical);
    // coerce numeric; drop if NaN/undefined/empty
    const vNum =
      typeof raw === 'number' ? raw :
      typeof raw === 'string' ? Number(raw.replace('%', '').trim()) :
      NaN;
    if (!Number.isFinite(vNum)) continue;

    points.push({ label: canonical, value: vNum, min: r.min, max: r.max });
  }
  return points;
}
