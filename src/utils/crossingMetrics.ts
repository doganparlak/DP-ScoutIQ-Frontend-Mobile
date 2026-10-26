const CROSSING_RATE = "Accurate Crosses (%)";
const CROSSING_NAMES = new Set([CROSSING_RATE, "Successful Crosses Percentage", "Successful Crosses (%)"]);

export function canonicalCrossingMetricName(name: string): string {
  return CROSSING_NAMES.has(name.trim()) ? CROSSING_RATE : name;
}

export function normalizeCrossingMetrics<T extends { name: string; value?: unknown }>(metrics: T[]): T[] {
  let chosen: T | undefined;
  for (const metric of metrics) {
    if (!CROSSING_NAMES.has(metric.name) || metric.value == null || metric.value === "") continue;
    const raw = String(metric.value).trim().replace(/%$/, "").trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) continue;
    if (!chosen || (metric.name === CROSSING_RATE && chosen.name !== CROSSING_RATE)) chosen = metric;
  }
  let inserted = false;
  return metrics.flatMap(metric => {
    if (!CROSSING_NAMES.has(metric.name)) return [metric];
    if (inserted || !chosen) return [];
    inserted = true;
    return [{ ...chosen, name: CROSSING_RATE }];
  });
}
