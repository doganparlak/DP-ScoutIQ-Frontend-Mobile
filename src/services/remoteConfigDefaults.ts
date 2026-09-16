export const remoteConfigDefaults = {
  "ads_potential_every": 4,
  "ads_matchup_launch_every": 3,
  "ads_matchup_add_every": 4,
  "ads_missing_score_action_every": 3,
  "ads_portfolio_lineup_every": 4,
  "ads_report_every": 3,
  "ads_save_match_every": 4,
  "ads_daily_hidden_portfolio_every": 3,
  "ads_daily_revealed_portfolio_every": 4,
  "ads_season_search_every": 4
} as const;

export type AdFrequencyKey = keyof typeof remoteConfigDefaults;

export function validatedFrequency(key: AdFrequencyKey, value: unknown): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isInteger(parsed) && parsed >= 2 && parsed <= 100
    ? parsed : remoteConfigDefaults[key];
}
