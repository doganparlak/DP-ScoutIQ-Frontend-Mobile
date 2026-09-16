import { getAdFrequency } from '../services/remoteConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

const POTENTIAL_KEY = 'ads.playerPool.potentialRevealCount.v1';
const MATCHUP_LAUNCH_KEY = 'ads.playerPool.matchupLaunchCount.v1';
// New shared counters start fresh; legacy per-screen counters remain untouched.
const MATCHUP_ADD_KEY = 'ads.shared.matchupAddCount.v1';
const PLAYER_POOL_MISSING_SCORE_ACTION_KEY = 'ads.playerPool.missingScoreActionCount.v1';
// v2 counts explicit result-row taps; the earlier key also counted automatic card renders.
const PLAYER_CARD_PLAN_NUDGE_KEY = 'ads.playerPool.playerCardPlanNudgeCount.v2';
const TEAM_CARD_PLAN_NUDGE_KEY = 'ads.teamPool.teamCardPlanNudgeCount.v1';
const LEAGUE_CARD_PLAN_NUDGE_KEY = 'ads.leaguePool.leagueCardPlanNudgeCount.v1';
const MATCH_CARD_PLAN_NUDGE_KEY = 'ads.matchPool.matchCardPlanNudgeCount.v1';
const SEASON_HISTORY_PLAN_NUDGE_KEY = 'ads.seasonData.careerHistoryPlanNudgeCount.v1';
const PORTFOLIO_LINEUP_KEY = 'ads.portfolio.lineupLaunchCount.v1';
// Player, team-analysis, pre-match, and post-match reports share this counter.
const REPORT_ACTION_KEY = 'ads.shared.reportActionCount.v1';

function shouldShowEveryThird(count: number) {
  return count > 0 && count % 3 === 0;
}

export function shouldPrepareNextInterstitial(count: number) {
  const every = getAdFrequency('ads_potential_every');
  return count > 0 && count % every === every - 1;
}

export function shouldShowPotentialInterstitial(revealCount: number) {
  return revealCount > 0 && revealCount % getAdFrequency('ads_potential_every') === 0;
}

export async function incrementPotentialRevealCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(POTENTIAL_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(POTENTIAL_KEY, String(next));
  return next;
}

export function shouldShowMatchupLaunchInterstitial(launchCount: number) {
  return launchCount > 0 && launchCount % getAdFrequency('ads_matchup_launch_every') === 0;
}

export async function incrementMatchupLaunchCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(MATCHUP_LAUNCH_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(MATCHUP_LAUNCH_KEY, String(next));
  return next;
}

export function shouldShowMatchupMissingScoreInterstitial(addCount: number) {
  return addCount > 0 && addCount % getAdFrequency('ads_matchup_add_every') === 0;
}

export function shouldShowPlayerPoolMissingScoreActionInterstitial(addCount: number) {
  return addCount > 0 && addCount % getAdFrequency('ads_missing_score_action_every') === 0;
}

// Serialize increments per key so actions from different cards cannot lose a count.
const pendingCounts = new Map<string, Promise<number>>();
async function incrementStoredCount(key: string): Promise<number> {
  const pending = (pendingCounts.get(key) ?? Promise.resolve(0))
    .catch(() => 0)
    .then(async () => {
      const raw = await AsyncStorage.getItem(key);
      const current = raw ? parseInt(raw, 10) : 0;
      const next = (Number.isFinite(current) ? current : 0) + 1;
      await AsyncStorage.setItem(key, String(next));
      return next;
    });
  pendingCounts.set(key, pending);
  try {
    return await pending;
  } finally {
    if (pendingCounts.get(key) === pending) pendingCounts.delete(key);
  }
}

export async function incrementMatchupMissingScoreAddCount(): Promise<number> {
  return incrementStoredCount(MATCHUP_ADD_KEY);
}

export async function incrementPlayerPoolMissingScoreActionCount(): Promise<number> {
  return incrementStoredCount(PLAYER_POOL_MISSING_SCORE_ACTION_KEY);
}

export async function incrementPlayerCardPlanNudgeCount(): Promise<number> {
  return incrementStoredCount(PLAYER_CARD_PLAN_NUDGE_KEY);
}

export function shouldShowPlayerCardPlanNudge(count: number) {
  return shouldShowEveryThird(count);
}

export async function incrementTeamCardPlanNudgeCount(): Promise<number> {
  return incrementStoredCount(TEAM_CARD_PLAN_NUDGE_KEY);
}

export function shouldShowTeamCardPlanNudge(count: number) {
  return shouldShowEveryThird(count);
}

export async function incrementLeagueCardPlanNudgeCount(): Promise<number> {
  return incrementStoredCount(LEAGUE_CARD_PLAN_NUDGE_KEY);
}

export function shouldShowLeagueCardPlanNudge(count: number) {
  return shouldShowEveryThird(count);
}

export async function incrementMatchCardPlanNudgeCount(): Promise<number> {
  return incrementStoredCount(MATCH_CARD_PLAN_NUDGE_KEY);
}

export function shouldShowMatchCardPlanNudge(count: number) {
  return shouldShowEveryThird(count);
}

export async function incrementSeasonHistoryPlanNudgeCount(): Promise<number> {
  return incrementStoredCount(SEASON_HISTORY_PLAN_NUDGE_KEY);
}

export function shouldShowSeasonHistoryPlanNudge(count: number) {
  return shouldShowEveryThird(count);
}

export function shouldShowPortfolioLineupInterstitial(launchCount: number) {
  return launchCount > 0 && launchCount % getAdFrequency('ads_portfolio_lineup_every') === 0;
}

export async function incrementPortfolioLineupLaunchCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(PORTFOLIO_LINEUP_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(PORTFOLIO_LINEUP_KEY, String(next));
  return next;
}

export function shouldShowReportActionInterstitial(actionCount: number) {
  return actionCount > 0 && actionCount % getAdFrequency('ads_report_every') === 0;
}

export async function incrementReportActionCount(): Promise<number> {
  return incrementStoredCount(REPORT_ACTION_KEY);
}

// Report and Matchup sources share counters; other actions retain independent counters.
const WORKSPACE_AD_ACTIONS = {
  teamAnalysisReport: { key: REPORT_ACTION_KEY, frequency: 'ads_report_every' },
  preMatchReport: { key: REPORT_ACTION_KEY, frequency: 'ads_report_every' },
  postMatchReport: { key: REPORT_ACTION_KEY, frequency: 'ads_report_every' },
  saveMatch: { key: 'ads.match.saveActionCount.v1', frequency: 'ads_save_match_every' },
  portfolioPlayerMatchupAdd: { key: MATCHUP_ADD_KEY, frequency: 'ads_matchup_add_every' },
  dailyScoutMatchupAdd: { key: MATCHUP_ADD_KEY, frequency: 'ads_matchup_add_every' },
  dailyScoutHiddenScorePortfolioAdd: { key: 'ads.dailyScout.hiddenScorePortfolioAddCount.v1', frequency: 'ads_daily_hidden_portfolio_every' },
  dailyScoutRevealedScorePortfolioAdd: { key: 'ads.dailyScout.revealedScorePortfolioAddCount.v1', frequency: 'ads_daily_revealed_portfolio_every' },
  leagueMatchupAdd: { key: MATCHUP_ADD_KEY, frequency: 'ads_matchup_add_every' },
  seasonMatchupAdd: { key: MATCHUP_ADD_KEY, frequency: 'ads_matchup_add_every' },
  seasonSearch: { key: 'ads.seasonData.searchActionCount.v1', frequency: 'ads_season_search_every' },
} as const;

export type WorkspaceAdAction = keyof typeof WORKSPACE_AD_ACTIONS;

export async function incrementWorkspaceActionAndShouldShowAd(action: WorkspaceAdAction) {
  const { key, frequency } = WORKSPACE_AD_ACTIONS[action];
  const count = await incrementStoredCount(key);
  return count % getAdFrequency(frequency) === 0;
}
