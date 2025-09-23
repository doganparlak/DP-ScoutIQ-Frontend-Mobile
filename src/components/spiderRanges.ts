// src/components/spiderRanges.ts
import type { SpiderPoint } from './SpiderChart';

/** === Category metric whitelists (what we try to plot, in this order) === */
export const GK_METRICS = [
  'Diving', 'Standing', 'Head', 'Both Hands', 'Right Hand', 'Left Hand', 'Right Foot', 'Left Foot',
  'Shot Faced', 'Shot Saved', 'Penalty Conceded', 'Collected', 'Punch', 'Smother', 'Keeper Sweeper',
  'Success', 'Lost in Play', 'Clear', 'No Touch', 'In Play Safe', 'In Play Danger', 'Touched Out', 'Touched In',
] as const;

export const IN_POS_METRICS = [
  'Shots', 'Shot Accuracy (%)', 'Shot Accuracy %', 'Goals', 'Assists', 'xG', 'Key Passes',
  'Passes Attempted', 'Pass Accuracy (%)', 'Pass Accuracy %', 'Crosses Attempted', 'Cross Accuracy (%)',
  'Cross Accuracy %', 'Carries', 'Dribbles', 'Dribble Accuracy (%)', 'Dribble Accuracy %'
] as const;

export const OUT_POS_METRICS = [
  'Pressures', 'Counterpressures', 'Interceptions', 'Fouls', 'Blocks', 'Duels Attempted',
  'Duel Won Accuracy (%)', 'Duel Won Accuracy %', 'Ball Recoveries', 'Clearances',
] as const;

/** === Canonicalization for alternate labels/spellings ===
 * Left side: possible incoming value
 * Right side: canonical key we keep in RANGES and on the chart
 */
const ALIAS_RAW: Record<string, string> = {
  // Percent label variants
  'Shot Accuracy %': 'Shot Accuracy (%)',
  'Pass Accuracy %': 'Pass Accuracy (%)',
  'Cross Accuracy %': 'Cross Accuracy (%)',
  'Duel Won Accuracy %': 'Duel Won Accuracy (%)',

  // GK label variants
  'Shots Faced': 'Shot Faced',
  'Shots Saved': 'Shot Saved',
  'Sweeper Keeper': 'Keeper Sweeper',
  'Balls Collected': 'Collected',

  // Minor spacing/case variants that sometimes appear
  'In-Play Safe': 'In Play Safe',
  'In-Play Danger': 'In Play Danger',

  // Just in case some feeds include colons/extra spaces
  'Shot: Faced': 'Shot Faced',
  'Shot: Saved': 'Shot Saved',
};

/** Normalized-key map for case/whitespace-insensitive matching */
function mkKey(s: string) {
  return s.replace(/\s+/g, ' ').trim().toLowerCase();
}
const ALIAS: Record<string, string> = {};
Object.entries(ALIAS_RAW).forEach(([k, v]) => (ALIAS[mkKey(k)] = v));

/** === Static ranges per canonical metric (tweak to your data scale) === */
const RANGES: Record<string, { min: number; max: number }> = {
  // GK
  'Diving': { min: 0, max: 9.0 },
  'Standing': { min: 0, max: 13.0 },
  'Head': { min: 0, max: 1.0 },
  'Both Hands': { min: 0, max: 9.0 },
  'Right Hand': { min: 0, max: 2.0 },
  'Left Hand': { min: 0, max: 2.0 },
  'Right Foot': { min: 0, max: 3.0 },
  'Left Foot': { min: 0, max: 2.0 },
  'Shot Faced': { min: 0, max: 23.0 },
  'Shot Saved': { min: 0, max: 10.0 },
  'Penalty Conceded': { min: 0, max: 2.5 },
  'Collected': { min: 0, max: 6.0 },
  'Punch': { min: 0, max: 5.0 },
  'Smother': { min: 0, max: 1.0 },
  'Keeper Sweeper': { min: 0, max: 5.0 },
  'Success': { min: 0, max: 11.0 },
  'Lost in Play': { min: 0, max: 10.0 },
  'Clear': { min: 0, max: 3.0 },
  'No Touch': { min: 0, max: 11.0 },
  'In Play Safe': { min: 0, max: 5.0 },
  'In Play Danger': { min: 0, max: 4.5 },
  'Touched Out': { min: 0, max: 5.0 },
  'Touched In': { min: 0, max: 3.0 },

  // In possession
  'Shots': { min: 0, max: 10.0 },
  'Shot Accuracy (%)': { min: 0, max: 100.0 },
  'Goals': { min: 0, max: 2.0 },
  'Assists': { min: 0, max: 2.0 },
  'xG': { min: 0, max: 1.34 },
  'Passes Attempted': { min: 0, max: 115.0 },
  'Pass Accuracy (%)': { min: 0, max: 100.0 },
  'Crosses Attempted': { min: 0, max: 17.0 },
  'Cross Accuracy (%)': { min: 0, max: 100.0 },
  'Carries': { min: 0, max: 97.0 },
  'Dribbles': { min: 0, max: 13.0 },
  'Dribble Accuracy (%)': { min: 0, max: 100.0 },

  // Out of possession
  'Pressures': { min: 0, max: 55.0 },
  'Counterpressures': { min: 0, max: 17.0 },
  'Interceptions': { min: 0, max: 4.0 },
  'Fouls': { min: 0, max: 8.0 },
  'Blocks': { min: 0, max: 7.0 },
  'Duels Attempted': { min: 0, max: 17.0 },
  'Duel Won Accuracy (%)': { min: 0, max: 100.0 },
  'Ball Recoveries': { min: 0, max: 16.0 },
  'Clearances': { min: 0, max: 16.0 }
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

