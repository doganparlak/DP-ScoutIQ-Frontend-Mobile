import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'ads.chat.queryCount.v1';
const POTENTIAL_KEY = 'ads.playerPool.potentialRevealCount.v1';
const WEEKLY_POPULAR_KEY = 'ads.playerPool.weeklyPopularRevealCount.v1';
const MATCHUP_LAUNCH_KEY = 'ads.playerPool.matchupLaunchCount.v1';
const PORTFOLIO_LINEUP_KEY = 'ads.portfolio.lineupLaunchCount.v1';

// TEST MODE:
// show on 3,5,7,9...
export function shouldShowFullscreenAd(queryCount: number) {
  if (queryCount < 3) return false;
  return (queryCount - 3) % 3 === 0;
}

export async function incrementChatQueryCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(KEY, String(next));
  return next;
}

export async function resetChatQueryCount(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}

export function shouldShowPotentialInterstitial(revealCount: number) {
  return revealCount > 0 && revealCount % 2 === 0;
}

export async function incrementPotentialRevealCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(POTENTIAL_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(POTENTIAL_KEY, String(next));
  return next;
}

export function shouldShowWeeklyPopularInterstitial(revealCount: number) {
  return revealCount > 0 && revealCount % 2 === 0;
}

export async function incrementWeeklyPopularRevealCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(WEEKLY_POPULAR_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(WEEKLY_POPULAR_KEY, String(next));
  return next;
}

export function shouldShowMatchupLaunchInterstitial(launchCount: number) {
  return launchCount > 0;
}

export async function incrementMatchupLaunchCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(MATCHUP_LAUNCH_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(MATCHUP_LAUNCH_KEY, String(next));
  return next;
}

export function shouldShowPortfolioLineupInterstitial(launchCount: number) {
  return launchCount > 0 && launchCount % 2 === 0;
}

export async function incrementPortfolioLineupLaunchCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(PORTFOLIO_LINEUP_KEY);
  const current = raw ? parseInt(raw, 10) : 0;
  const next = (Number.isFinite(current) ? current : 0) + 1;
  await AsyncStorage.setItem(PORTFOLIO_LINEUP_KEY, String(next));
  return next;
}
