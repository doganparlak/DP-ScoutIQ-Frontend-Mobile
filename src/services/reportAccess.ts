export type ReportSectionState = {
  status?: string;
  access_tier?: 'free' | 'paid';
};

// Reports saved before scoped generation contain the full paid narrative.
export function reportScopeMatches(state: ReportSectionState | undefined, paid: boolean) {
  return !paid || state?.access_tier !== 'free';
}
