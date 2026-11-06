/** Comparisons require a recorded, non-zero value for every participant. */
export function hasComparableMetricValues(values: readonly unknown[]): boolean {
  return values.length >= 2 && values.every(
    (value) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) > 1e-9,
  );
}
