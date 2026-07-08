import AsyncStorage from '@react-native-async-storage/async-storage';

const POTENTIAL_KEY = 'ads.playerPool.potentialRevealCount.v1';
const WEEKLY_POPULAR_KEY = 'ads.playerPool.weeklyPopularRevealCount.v1';
const MATCHUP_LAUNCH_KEY = 'ads.playerPool.matchupLaunchCount.v1';
const MATCHUP_MISSING_SCORE_ADD_KEY = 'ads.playerPool.matchupMissingScoreAddCount.v1';
const PLAYER_POOL_MISSING_SCORE_ACTION_KEY = 'ads.playerPool.missingScoreActionCount.v1';
const PORTFOLIO_LINEUP_KEY = 'ads.portfolio.lineupLaunchCount.v1';
const PORTFOLIO_REPORT_KEY = 'ads.portfolio.reportOpenCount.v1';
const DAILY_SCOUT_CHALLENGE_KEY = 'ads.profile.dailyScoutChallengeOpenCount.v1';

function shouldShowEveryThird(count: number) {
  return count > 0 && count % 3 === 0;
}

export function shouldPrepareNextInterstitial(count: number) {
  return count > 0 && count % 3 === 2;
}

export function shouldShowPotentialInterstitial(revealCount: number) {
  return shouldShowEveryThird(revealCount);
}

export async function incrementPotentialRevealCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(POTENTIAL_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(POTENTIAL_KEY, String(next));
  return next;
}

export function shouldShowWeeklyPopularInterstitial(revealCount: number) {
  return shouldShowEveryThird(revealCount);
}

export async function incrementWeeklyPopularRevealCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(WEEKLY_POPULAR_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(WEEKLY_POPULAR_KEY, String(next));
  return next;
}

export function shouldShowMatchupLaunchInterstitial(launchCount: number) {
  return shouldShowEveryThird(launchCount);
}

export async function incrementMatchupLaunchCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(MATCHUP_LAUNCH_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(MATCHUP_LAUNCH_KEY, String(next));
  return next;
}

export function shouldShowMatchupMissingScoreInterstitial(addCount: number) {
  return addCount > 0 && addCount % 2 === 0;
}

export function shouldPrepareNextMatchupMissingScoreInterstitial(addCount: number) {
  return addCount > 0 && addCount % 2 === 1;
}

export function shouldShowPlayerPoolMissingScoreActionInterstitial(addCount: number) {
  return addCount > 0 && addCount % 2 === 0;
}

export function shouldPrepareNextPlayerPoolMissingScoreActionInterstitial(addCount: number) {
  return addCount > 0 && addCount % 2 === 1;
}

async function incrementStoredCount(key: string): Promise<number> {
  const raw = await AsyncStorage.getItem(key);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(key, String(next));
  return next;
}

export async function incrementMatchupMissingScoreAddCount(): Promise<number> {
  return incrementStoredCount(MATCHUP_MISSING_SCORE_ADD_KEY);
}

export async function incrementPlayerPoolMissingScoreActionCount(): Promise<number> {
  return incrementStoredCount(PLAYER_POOL_MISSING_SCORE_ACTION_KEY);
}

export function shouldShowPortfolioLineupInterstitial(launchCount: number) {
  return shouldShowEveryThird(launchCount);
}

export async function incrementPortfolioLineupLaunchCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(PORTFOLIO_LINEUP_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(PORTFOLIO_LINEUP_KEY, String(next));
  return next;
}

export function shouldShowPortfolioReportInterstitial(openCount: number) {
  return shouldShowEveryThird(openCount);
}

export async function incrementPortfolioReportOpenCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(PORTFOLIO_REPORT_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(PORTFOLIO_REPORT_KEY, String(next));
  return next;
}

export function shouldShowDailyScoutChallengeInterstitial(openCount: number) {
  return shouldShowEveryThird(openCount);
}

export async function incrementDailyScoutChallengeOpenCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(DAILY_SCOUT_CHALLENGE_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(DAILY_SCOUT_CHALLENGE_KEY, String(next));
  return next;
}
