import React from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMatchup } from '@/context/MatchupContext';
import { useTutorial } from './Tutorial';
import PlayerCard from './PlayerCard';
import ScoutingReport from './ScoutingReport';
import { PlusProUpsellScreen } from '@/ads/PlusProUpsellScreen';
import { showInterstitialAndWaitSafely } from '@/ads/interstitial';
import {
  incrementMatchupMissingScoreAddCount, shouldShowMatchupMissingScoreInterstitial,
  incrementPlayerPoolMissingScoreActionCount, shouldShowPlayerPoolMissingScoreActionInterstitial,
  incrementReportActionCount, shouldShowReportActionInterstitial,
} from '@/ads/adGating';
import {
  addFavoritePlayer, getMe, revealPlayerPoolPotential, revealPlayerPoolForm,
  getPlayerPoolScoutingReportProgress, getPlayerPoolScoutingReportSection,
  type Plan, type PlayerIdentityPayload, type ScoutingReportResponse,
} from '@/services/api';
import type { PlayerData } from '@/types';
import { ACCENT } from '@/theme';

export default function WeeklyPopularPlayerCard({ id, player }: { id: string; player: PlayerData }) {
  const { t } = useTranslation();
  const matchup = useMatchup();
  const tutorial = useTutorial();
  const [shownPlayer, setShownPlayer] = React.useState(player);
  const [busy, setBusy] = React.useState(false);
  const lock = React.useRef(false);
  const [upsell, setUpsell] = React.useState(false);
  const [report, setReport] = React.useState<ScoutingReportResponse | null>(null);
  const [reportPayload, setReportPayload] = React.useState<PlayerIdentityPayload | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [plan, setPlan] = React.useState<Plan>('Free');
  const full = matchup.rows.slice(0, matchup.mode).every(Boolean);
  const alreadyAdded = matchup.rows.some(row => row?.id === id);
  const hasScores = typeof shownPlayer.meta?.potential === 'number' && typeof shownPlayer.meta?.form === 'number';

  async function perform(action: () => Promise<boolean | void>) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    try { return await action(); }
    catch (error: any) {
      Alert.alert(t('error', 'Error'), String(error?.message || error));
      return false;
    } finally { lock.current = false; setBusy(false); }
  }

  async function gate(action: 'matchup' | 'portfolio' | 'report') {
    const current = (await getMe()).plan;
    const normalized: Plan = current === 'No Ads Monthly' || current === 'Pro Monthly' || current === 'Pro Yearly' ? current : 'Free';
    setPlan(normalized);
    if (normalized !== 'Free' || tutorial.active || (action !== 'report' && hasScores)) return true;
    const due = action === 'report'
      ? shouldShowReportActionInterstitial(await incrementReportActionCount())
      : action === 'matchup'
        ? shouldShowMatchupMissingScoreInterstitial(await incrementMatchupMissingScoreAddCount())
        : shouldShowPlayerPoolMissingScoreActionInterstitial(await incrementPlayerPoolMissingScoreActionCount());
    if (!due || await showInterstitialAndWaitSafely()) return true;
    setUpsell(true);
    // Player-pool score actions continue with the upsell fallback; reports wait.
    return action !== 'report';
  }

  async function ensureScores() {
    const potential = shownPlayer.meta?.potential ?? Math.round((await revealPlayerPoolPotential(id)).potential);
    const form = shownPlayer.meta?.form ?? Math.round((await revealPlayerPoolForm(id)).form);
    const enriched = { ...shownPlayer, meta: { ...shownPlayer.meta, potential, form } };
    setShownPlayer(enriched);
    return enriched;
  }

  return <View>
    <PlayerCard player={shownPlayer} visualTheme={{ cardBackground: '#19221D', accent: ACCENT }}
      addFavoriteDisabled={busy} reportDisabled={busy} matchupDisabled={busy || full || alreadyAdded}
      reportState={report?.status === 'ready' ? 'ready' : 'idle'}
      onAddFavorite={async () => !!await perform(async () => {
        await gate('portfolio');
        const enriched = await ensureScores();
        await addFavoritePlayer({ ...enriched.meta, playerId: id, name: enriched.name, roles: enriched.meta?.roles ?? [] });
        return true;
      })}
      onMatchup={async () => { await perform(async () => {
        if (full || alreadyAdded) return;
        const stableId = shownPlayer.meta?.sportmonksId;
        if (!Number.isSafeInteger(stableId) || (stableId ?? 0) <= 0) {
          throw new Error(t('matchupMissingStableId', 'Player identity is unavailable. Please search for the player again.'));
        }
        await gate('matchup');
        matchup.add({ id, player: await ensureScores() });
      }); }}
      onGenerateReport={async () => { await perform(async () => {
        if (!await gate('report')) return;
        const enriched = await ensureScores();
        const payload = { ...enriched.meta, playerId: id, name: enriched.name };
        setReportPayload(payload);
        setReport({ favorite_player_id: id, status: 'processing', content: '', content_json: { sections: { analysis: { status: 'processing' } } } });
        setReportOpen(true);
        try {
          const next = await getPlayerPoolScoutingReportProgress(payload);
          if (next.status === 'failed' || next.status === 'error') throw new Error(t('reportFailedBody', 'Could not generate the report. Please try again later.'));
          setReport(next);
        } catch (error) {
          setReport(current => current ? { ...current, status: 'failed' } : current);
          throw error;
        }
      }); }} />
    {report && <ScoutingReport visible={reportOpen} onClose={() => setReportOpen(false)} player={shownPlayer} report={report} plan={plan}
      reloadReport={reportPayload ? () => getPlayerPoolScoutingReportProgress(reportPayload) : undefined}
      loadReportSection={reportPayload ? section => getPlayerPoolScoutingReportSection(reportPayload, section) : undefined}
      onReportUpdate={setReport} />}
    <PlusProUpsellScreen visible={upsell} onClose={() => setUpsell(false)} />
  </View>;
}
