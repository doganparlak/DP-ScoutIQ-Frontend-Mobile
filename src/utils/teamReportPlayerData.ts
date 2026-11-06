import type { MatchReportLineup, PostMatchCardData } from '@/services/matchPool';
import { normalizeMatchMetrics } from './matchReportMetrics';
import { numeric, setPieceTarget } from './matchReportPlayers';

// These views receive individual fixtures, so pool their raw inputs using the
// backend's rules rather than averaging their individual percentages.
const rates: Record<string, [string, string, string]> = {
  'Shots On Target (%)': ['Shots On Target', 'Shots Total', 'shooting'],
  'Goal Conversion (%)': ['Goals', 'Shots Total', 'shooting'],
  'On Target Goal Conversion (%)': ['Goals', 'Shots On Target', 'shooting'],
  'Assist Efficiency (%)': ['Assists', 'Key Passes', 'passing'],
  'Dribble Accuracy (%)': ['Successful Dribbles', 'Dribble Attempts', 'contribution_impact'],
  'Tackles Won (%)': ['Tackles Won', 'Tackles', 'defending'],
  'Aerials Won (%)': ['Aerials Won', 'Aerials', 'defending'],
  'Duels Won (%)': ['Duels Won', 'Total Duels', 'defending'],
  'Long Balls Won (%)': ['Long Balls Won', 'Long Balls', 'passing'],
  'Accurate Passes (%)': ['Accurate Passes', 'Passes', 'passing'],
  'Accurate Crosses (%)': ['Accurate Crosses', 'Total Crosses', 'passing'],
  'Shot Quality (%)': ['Expected Goals', 'Shots Total', 'shooting'],
  'On Target Shot Quality (%)': ['Expected Goals On Target', 'Shots On Target', 'shooting'],
};
const matched = new Set(['Shot Quality (%)', 'On Target Shot Quality (%)']);
const capped = new Set([...matched, 'Assist Efficiency (%)']);
type RateInput = { numerator: number; denominator: number; minutes: number; invalid: boolean };
type MetricInput = { sum: number; weighted: number; weight: number; average: boolean };
type PlayerInput = {
  player: MatchReportLineup;
  minutes: number;
  starts: number;
  bench: number;
  appearances: number;
  stats: Record<string, Map<string, MetricInput>>;
  rates: Record<string, RateInput>;
  incompleteAttempts: Set<string>;
};

export function aggregatePlayerData(reports: PostMatchCardData[], teamId: string) {
  const players = new Map<number, PlayerInput>();
  for (const report of reports) {
    const seen = new Set<number>();
    for (const row of report.lineups || []) {
      if (String(row.team_id) !== String(teamId) || seen.has(row.player_id)) continue;
      seen.add(row.player_id);
      const minutes = numeric(row.categories?.contribution_impact?.find(m => m.name === 'Minutes Played')?.value) || 0;
      if (minutes <= 0) continue;
      const p = players.get(row.player_id) || {
        player: { ...row }, minutes: 0, starts: 0, bench: 0, appearances: 0,
        stats: {}, rates: {}, incompleteAttempts: new Set<string>(),
      } as PlayerInput;
      p.minutes += minutes;
      p.appearances++;
      if (row.starter) p.starts++; else p.bench++;
      const sources: Record<string, NonNullable<MatchReportLineup['expected_metrics']>> = {};
      for (const [group, metrics] of Object.entries(row.categories || {})) {
        for (const metric of metrics) {
          const target = group === 'set_pieces' ? setPieceTarget(metric.name) : group;
          (sources[target] ??= []).push(metric);
        }
      }
      for (const metric of row.expected_metrics || []) {
        (sources[setPieceTarget(metric.name)] ??= []).push(metric);
      }
      const recorded = new Map<string, number>();
      for (const [group, metrics] of Object.entries(sources)) {
        for (const metric of normalizeMatchMetrics(metrics)) {
          if (group === 'contribution_impact' && /^Shooting Performance(?: \(SP\))?$/i.test(metric.name)) continue;
          const value = numeric(metric.value);
          if (value === null) continue;
          if (!(metric as { _inferred_zero?: boolean })._inferred_zero) recorded.set(metric.name, value);
          // Known percentages are replaced with the pooled result below.
          if (metric.name in rates) continue;
          const entry = (p.stats[group] ??= new Map()).get(metric.name) || {
            sum: 0, weighted: 0, weight: 0, average: /%|percentage|rating|performance|captain/i.test(metric.name),
          };
          entry.sum += value;
          entry.weighted += value * minutes;
          entry.weight += minutes;
          p.stats[group].set(metric.name, entry);
        }
      }
      for (const [name, [numerator, denominator]] of Object.entries(rates)) {
        const input = p.rates[name] ??= { numerator: 0, denominator: 0, minutes: 0, invalid: false };
        let a = recorded.get(numerator), b = recorded.get(denominator);
        if (name === 'Aerials Won (%)' && b === undefined) {
          const lost = recorded.get('Aerials Lost');
          if (a !== undefined && lost !== undefined && lost >= 0) b = a + lost;
        }
        if (matched.has(name)) {
          if (a === undefined || b === undefined || a < 0 || b < 0) continue;
        } else if (b === undefined || b < 0) {
          if (a !== undefined && a > 0) {
            input.invalid = true;
            p.incompleteAttempts.add(denominator);
          }
          continue;
        } else {
          a ??= 0; // Recorded attempts establish coverage for omitted successes.
        }
        if (a < 0 || (!capped.has(name) && a > b)) input.invalid = true;
        input.numerator += a;
        input.denominator += b;
        input.minutes += minutes;
      }
      players.set(row.player_id, p);
    }
  }
  return [...players.values()]
    .sort((a, b) => b.minutes - a.minutes || b.starts - a.starts || b.appearances - a.appearances)
    .map(p => {
      const categories: NonNullable<MatchReportLineup['categories']> = {};
      for (const [group, stats] of Object.entries(p.stats)) {
        categories[group] = [...stats.entries()]
          .filter(([name]) => !p.incompleteAttempts.has(name))
          .map(([name, v]) => ({
            name,
            value: v.average ? v.weighted / v.weight : v.sum * 90 /
              (/expected|^xg|^xa|^npxg/i.test(name) ? v.weight : p.minutes),
          }));
      }
      for (const [name, [, , group]] of Object.entries(rates)) {
        const input = p.rates[name];
        if (!input || input.invalid || input.minutes < 90 || input.denominator <= 0) continue;
        const value = input.numerator / input.denominator * 100;
        (categories[group] ??= []).push({ name, value: capped.has(name) ? Math.min(100, value) : value });
      }
      for (const metrics of Object.values(categories)) metrics.sort((a, b) => a.name.localeCompare(b.name));
      const rating = categories.contribution_impact?.find(m => m.name === 'Rating')?.value;
      return { ...p, rating: numeric(rating), player: { ...p.player, categories, expected_metrics: [] } };
    });
}
