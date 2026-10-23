import type { PlayerData } from "@/types";
import {
  canonicalizeEnterpriseMetricLabel, CONTRIBUTION_IMPACT_METRICS, SHOOTING_METRICS,
  PASSING_METRICS, DEFENDING_METRICS, ERRORS_DISCIPLINE_METRICS, GK_METRICS,
} from "./comparisonRanges";

const PERFORMANCE_METRICS = new Set<string>([
  ...CONTRIBUTION_IMPACT_METRICS, ...SHOOTING_METRICS, ...PASSING_METRICS,
  ...DEFENDING_METRICS, ...ERRORS_DISCIPLINE_METRICS, ...GK_METRICS,
  "Rating", "Chances Created", "Goals Conceded", "Backward Passes", "Offsides Provoked",
].filter(label => label !== "Match Count" && label !== "Minutes Played"));

/** player_data contains the rolling year's per-appearance averages. */
export function playerReportEligibility(player: Pick<PlayerData, "stats" | "meta" | "reportSourceStats">) {
  const stats = new Map<string, number>();
  for (const stat of player.reportSourceStats || player.stats || []) {
    const value = typeof stat.value === 'number' ? stat.value
      : typeof stat.value === 'string' && stat.value.trim() ? Number(stat.value.replace('%', '').trim()) : NaN;
    if (!Number.isFinite(value)) continue;
    const label = canonicalizeEnterpriseMetricLabel(stat.metric);
    // These provider aliases represent one signal, not additional coverage.
    const canonical = label === "Goals Conceded.1" || label === "Goalkeeper Goals Conceded"
      ? "Goals Conceded" : label;
    if (canonical.includes("(%)") && (value < 0 || value > 100)) continue;
    stats.set(canonical, value);
  }
  const minutes = stats.get("Minutes Played") ?? 0;
  const appearances = stats.get("Match Count") ?? player.meta?.matchCount ?? 0;
  const annualMinutes = minutes > 0 && appearances > 0 ? minutes * appearances : 0;
  const metricCount = [...stats.keys()].filter(label => PERFORMANCE_METRICS.has(label) && stats.get(label) !== 0).length;
  return { annualMinutes, metricCount, eligible: annualMinutes > 300 && metricCount >= 15 };
}

export function canGeneratePlayerReport(player: Pick<PlayerData, "stats" | "meta" | "reportSourceStats">) {
  return playerReportEligibility(player).eligible;
}
