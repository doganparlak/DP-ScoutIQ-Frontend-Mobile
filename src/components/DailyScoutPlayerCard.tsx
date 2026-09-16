import React from 'react';
import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import { Alert, Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { useMatchup } from '@/context/MatchupContext';
import PlayerCard from './PlayerCard';
import ScoutingReport from './ScoutingReport';
import { PlusProUpsellScreen } from '@/ads/PlusProUpsellScreen';
import { showInterstitialAndWaitSafely } from '@/ads/interstitial';
import { incrementReportActionCount, shouldShowReportActionInterstitial } from '@/ads/adGating';
import { addFavoritePlayer, getMe, revealPlayerPoolPotential, revealPlayerPoolForm, getPlayerPoolScoutingReportProgress, getPlayerPoolScoutingReportSection, type Plan, type PlayerIdentityPayload, type ScoutingReportResponse } from '@/services/api';
import type { MainTabsParamList, PlayerData } from '@/types';
import { ACCENT } from '@/theme';

export default function DailyScoutPlayerCard({ id, player, onNavigate }: { id: string; player: PlayerData; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const matchup = useMatchup();
  const ads = useWorkspaceActionAd();
  const matchupFull = matchup.rows.slice(0, matchup.mode).every(Boolean);
  const alreadyInMatchup = matchup.rows.some(row => row?.id === id);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabsParamList>>();
  const [scores, setScores] = React.useState<{ potential?: number; form?: number }>({});
  const [busy, setBusy] = React.useState(false);
  const lock = React.useRef(false);
  const [upsell, setUpsell] = React.useState(false);
  const [report, setReport] = React.useState<ScoutingReportResponse | null>(null);
  const [reportPayload,setReportPayload]=React.useState<PlayerIdentityPayload|null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [plan, setPlan] = React.useState<Plan>('Free');
  const shownPlayer = { ...player, meta: { ...player.meta, potential: scores.potential, form: scores.form } };
  const gateReport = async (free: boolean) => {
    if (!free) return true;
    const count = await incrementReportActionCount();
    if (shouldShowReportActionInterstitial(count) && !await showInterstitialAndWaitSafely()) {
      setUpsell(true);
      return false;
    }
    return true;
  };
  const perform = async (action: () => Promise<boolean | void>) => {
    if (lock.current) return false;
    lock.current = true; setBusy(true);
    try { return await action(); }
    catch (error: any) { Alert.alert(t('dailyScoutErrorTitle'), String(error?.message || error)); return false; }
    finally { lock.current = false; setBusy(false); }
  };
  const ensureScores = async () => {
    const potential = scores.potential ?? Math.round((await revealPlayerPoolPotential(id)).potential);
    const form = scores.form ?? Math.round((await revealPlayerPoolForm(id)).form);
    setScores({ potential, form });
    return { ...player, meta: { ...player.meta, potential, form } };
  };
  const reveal = (kind: 'potential' | 'form') => perform(async () => {
    const value = kind === 'potential' ? (await revealPlayerPoolPotential(id)).potential : (await revealPlayerPoolForm(id)).form;
    setScores(previous => ({ ...previous, [kind]: Math.round(value) }));
  });
  return <View style={{ gap: 12, padding: 8 }}>
    <PlayerCard player={shownPlayer} titleAlign="left" addFavoriteDisabled={busy} reportDisabled={busy} matchupDisabled={busy || ads.busy || alreadyInMatchup || matchupFull}
      onAddFavorite={async () => !!await perform(async () => {
        // Capture visibility before ensureScores automatically reveals missing values.
        const action = scores.potential !== undefined && scores.form !== undefined
          ? 'dailyScoutRevealedScorePortfolioAdd'
          : 'dailyScoutHiddenScorePortfolioAdd';
        let saved = false;
        await ads.run(action, async () => {
          const enriched = await ensureScores();
          await addFavoritePlayer({ playerId: id, name: enriched.name, ...enriched.meta, roles: enriched.meta?.roles ?? [] });
          saved = true;
        });
        return saved;
      })}
      onMatchup={async () => { await perform(async () => {
        if (alreadyInMatchup || matchupFull) return;
        await ads.run('dailyScoutMatchupAdd', async () => {
          const enriched = await ensureScores();
          matchup.add({id, player: enriched});
        });
      }); }}
      onGenerateReport={async () => { await perform(async () => {
        const currentPlan = (await getMe()).plan;
        const normalizedPlan: Plan = currentPlan === 'No Ads Monthly' || currentPlan === 'Pro Monthly' || currentPlan === 'Pro Yearly' ? currentPlan : 'Free';
        setPlan(normalizedPlan);
        const free = normalizedPlan === 'Free';
        const enriched = await ensureScores();
        const allowed = await gateReport(free);
        if (!allowed) return;
        const payload={ playerId: id, name: enriched.name, ...enriched.meta };
        setReportPayload(payload);
        setReport({ favorite_player_id:id, status:'processing', content:'', content_json:{sections:{analysis:{status:'processing'}}} });
        setReportOpen(true);
        let result: ScoutingReportResponse;
        try {
          result = report?.status==='ready' ? report : await getPlayerPoolScoutingReportProgress(payload);
        } catch (error) {
          setReport(current => current ? {...current,status:'failed'} : current);
          throw error;
        }
        if (result.status === 'failed' || result.status === 'error') throw new Error(t('reportFailedBody'));
        setReport(result);
      }); }} />
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {(['potential', 'form'] as const).map(kind => scores[kind] === undefined && <Pressable key={kind} accessibilityRole="button" disabled={busy} onPress={() => { void reveal(kind); }} style={{ flex: 1, borderWidth: 1, borderColor: ACCENT, borderRadius: 12, minHeight: 44, padding: 10, justifyContent: 'center', opacity: busy ? 0.5 : 1 }}><Text style={{ color: ACCENT, textAlign: 'center', fontWeight: '800' }}>{t(kind === 'potential' ? 'revealPotential' : 'revealForm', kind === 'potential' ? 'Potansiyeli Hesapla' : 'Formu Hesapla')}</Text></Pressable>)}
    </View>
    {report && <ScoutingReport visible={reportOpen} onClose={() => setReportOpen(false)} player={shownPlayer} report={report} plan={plan} reloadReport={reportPayload?()=>getPlayerPoolScoutingReportProgress(reportPayload):undefined} loadReportSection={reportPayload?(section)=>getPlayerPoolScoutingReportSection(reportPayload,section):undefined} onReportUpdate={setReport}/>} 
    {ads.fallback}
    <PlusProUpsellScreen visible={upsell} onClose={() => setUpsell(false)} />
  </View>;
}
