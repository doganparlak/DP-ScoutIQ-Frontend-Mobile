import type {Plan} from '@/services/api';
import {
  CONTRIBUTION_IMPACT_METRICS, SHOOTING_METRICS, PASSING_METRICS,
  DEFENDING_METRICS, ERRORS_DISCIPLINE_METRICS,
  type EnterpriseMetricUnit,
} from './comparisonRanges';

export type PercentileMetric = {
  value: number; perMatch?: number; total?: number;
  basis: 'per90' | 'percentage' | 'rating' | 'coveredAverage' | 'context';
  percentile: number | null; peerCount: number; lowerIsBetter: boolean;
  unrankedReason?: string;
};
export type DomesticCompetition = {
  leagueId: number; leagueName: string; leagueLogoUrl?: string | null;
  teams: string[]; minutes: number; matches: number; roles: Record<string, number>;
  benchmarks: Record<string, {
    roles?: string[]; playerRoles?: Record<string, number>;
    peerCount: number; metrics: Record<string, PercentileMetric>;
  }>;
};
export type DomesticPercentiles = {
  version: number; minimumMinutes?: number; minimumPeers?: number;
  competitions: DomesticCompetition[];
};

export const REPORT_PERCENTILE_METRICS: Record<string, readonly string[]> = {
  contribution_impact: CONTRIBUTION_IMPACT_METRICS,
  shooting: SHOOTING_METRICS, passing: PASSING_METRICS,
  defending: DEFENDING_METRICS, errors_discipline: ERRORS_DISCIPLINE_METRICS,
};

export function reportPercentileCompetition(data: DomesticPercentiles | undefined, scope: string) {
  if (scope === 'annual') return undefined;
  const competitions = data?.competitions || [];
  return competitions.find(item => String(item.leagueId) === scope);
}

export function reportPercentileRows(competition: DomesticCompetition, role: string, groupKey: string, unit: EnterpriseMetricUnit, metricLabels: readonly string[] = REPORT_PERCENTILE_METRICS[groupKey] || []) {
  const options = reportPercentileRoles(competition, groupKey, unit, metricLabels);
  const selectedRole = options.some(([key]) => key === role) ? role : options[0]?.[0];
  const benchmark = selectedRole ? competition.benchmarks[selectedRole] : undefined;
  const rows = metricLabels.flatMap(label => {
    const metric = benchmark?.metrics[label];
    // Mirror Enterprise: no zero-valued or unranked percentile tiles. P0 is valid.
    if (!metric || !Number.isFinite(metric.value) || metric.value === 0
        || metric.peerCount < 5 || typeof metric.percentile !== 'number' || !Number.isFinite(metric.percentile)
        || metric.percentile < 0 || metric.percentile > 100) return [];
    const value = metric.basis === 'per90'
      ? unit === 'perMatch' ? metric.perMatch : unit === 'total' ? metric.total : metric.value
      : metric.value;
    if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) return [];
    return [{label, metric, value, percentile: metric.percentile}];
  });
  return {selectedRole, benchmark, rows};
}

export function reportPercentileColor(percentile: number) {
  return percentile >= 80 ? '#34d399' : percentile >= 50 ? '#a3e635'
    : percentile >= 25 ? '#fbbf24' : '#fb7185';
}

export function reportPercentileLimit(plan: Plan = 'Free') {
  if (plan === 'Pro Monthly' || plan === 'Pro Yearly') return Infinity;
  return plan === 'No Ads Monthly' ? 3 : 1;
}

export function reportPercentileRoles(competition: DomesticCompetition, groupKey: string, unit: EnterpriseMetricUnit, metricLabels: readonly string[] = REPORT_PERCENTILE_METRICS[groupKey] || [], minimumMinutes = 300) {
  return Object.entries(competition.benchmarks).filter(([, benchmark]) =>
    competition.minutes >= minimumMinutes && metricLabels.some(label => {
      const metric = benchmark.metrics[label];
      if (!metric) return false;
      const value = metric.basis === 'per90' ? unit === 'perMatch' ? metric.perMatch : unit === 'total' ? metric.total : metric.value : metric.value;
      return Number.isFinite(metric.value) && metric.value !== 0 && typeof value === 'number'
        && Number.isFinite(value) && value !== 0 && metric.peerCount >= 5
        && typeof metric.percentile === 'number' && Number.isFinite(metric.percentile)
        && metric.percentile >= 0 && metric.percentile <= 100;
    }));
}

export function reportPercentileCompetitions(data: DomesticPercentiles | undefined, groupKey: string, unit: EnterpriseMetricUnit) {
  return (data?.competitions || []).filter(competition =>
    reportPercentileRoles(competition, groupKey, unit, undefined, data?.minimumMinutes).length > 0);
}
