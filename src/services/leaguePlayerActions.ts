import { incrementMatchupMissingScoreAddCount, incrementPlayerPoolMissingScoreActionCount, incrementReportActionCount, shouldShowMatchupMissingScoreInterstitial, shouldShowPlayerPoolMissingScoreActionInterstitial, shouldShowReportActionInterstitial } from '@/ads/adGating';
import { showInterstitialAndWaitSafely } from '@/ads/interstitial';
export type LeaguePlayerAction = 'portfolio' | 'matchup' | 'report';

/** Match PlayerPoolScreen: score actions continue after fallback; reports require access. */
export async function gateLeaguePlayerAction(kind: LeaguePlayerAction, missingScores: boolean, paid: boolean, tutorialActive: boolean, onUpsell: () => void | Promise<void>, beforeAd?: () => Promise<void>): Promise<boolean> {
  if (paid || tutorialActive || (kind !== 'report' && !missingScores)) return true;
  try {
    const count = kind === 'report' ? await incrementReportActionCount() : kind === 'matchup' ? await incrementMatchupMissingScoreAddCount() : await incrementPlayerPoolMissingScoreActionCount();
    const scheduled = kind === 'report' ? shouldShowReportActionInterstitial(count) : kind === 'matchup' ? shouldShowMatchupMissingScoreInterstitial(count) : shouldShowPlayerPoolMissingScoreActionInterstitial(count);
    if (!scheduled) return true;
    await beforeAd?.();
    const shown = await showInterstitialAndWaitSafely();
    if (!shown) await onUpsell();
    return kind === 'report' ? shown : true;
  } catch (error) {
    if (kind !== 'report') throw error;
    await onUpsell();
    return false;
  }
}
export function isPlayerScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}
export function hasPlayerScores(meta?: {potential?: number; form?: number}) {
  return [meta?.potential, meta?.form].every(isPlayerScore);
}
