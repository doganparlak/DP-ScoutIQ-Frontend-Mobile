import { PlusProUpsellScreen } from '@/ads/PlusProUpsellScreen';
import { isAdFlowCancelled } from '@/ads/presentation';
import { useTutorial } from '@/components/Tutorial';
import { useMatchup } from '@/context/MatchupContext';
import { gateLeaguePlayerAction,hasPlayerScores,isPlayerScore } from '@/services/leaguePlayerActions';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useIsFocused } from '@react-navigation/native';
import { UserRound,X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert,Modal,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';

import { addFavoritePlayer,getMe,getPlayerPoolScoutingReportProgress,getPlayerPoolScoutingReportSection,revealPlayerPoolForm,revealPlayerPoolPotential,type Plan,type PlayerData,type PlayerIdentityPayload,type ScoutingReportResponse } from '@/services/api';
import { getLeaguePerformancePlayer,type LeagueBestPlayer } from '@/services/leaguePerformance';
import { Status } from './LeaguePerformanceControls';
import PlayerCard from './PlayerCard';
import ScoutingReport from './ScoutingReport';

type Entry = {id: string; player: PlayerData};
export default function LeaguePlayerCardModal({winner, initialEntry, inline = false, actionsDisabled = false, initialAction, onMatchupAdded, proMode = false, onCheckFit, onFindSimilar, renderPlayerCard, onClose}: {winner?: LeagueBestPlayer; initialEntry?: Entry; inline?: boolean; actionsDisabled?: boolean; proMode?: boolean; onCheckFit?: () => void; onFindSimilar?: () => void | Promise<void>; renderPlayerCard?: (props: React.ComponentProps<typeof PlayerCard>) => React.ReactNode; initialAction?: 'matchup'; onMatchupAdded?: () => void; onClose: () => void}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, FRAME_TITLE, DANGER} = themed;

  const {t, i18n} = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const focused = useIsFocused();
  const tutorial = useTutorial();
  const [upsellOpen, setUpsellOpen] = React.useState(false);
  const upsellShowing = React.useRef(false);
  const mounted = React.useRef(true);
  const matchup = useMatchup();
  const currentMatchup = React.useRef(matchup);
  currentMatchup.current = matchup;
  const [entry, setEntry] = React.useState<Entry | null>(null);
  const [error, setError] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [cardVisible, setCardVisible] = React.useState(true);
  const [plan, setPlan] = React.useState<Plan>('Free');
  const [report, setReport] = React.useState<ScoutingReportResponse | null>(null);
  const [reportPlayer, setReportPlayer] = React.useState<PlayerData | null>(null);
  const [reportPayload, setReportPayload] = React.useState<PlayerIdentityPayload | null>(null);
  const [reportOpen, setReportOpen] = React.useState(false);
  const locked = React.useRef(false);
  const cardShowing = React.useRef(cardVisible);
  cardShowing.current = cardVisible;
  React.useEffect(() => {
    let alive = true;
    mounted.current = true;
    (initialEntry ? Promise.resolve(initialEntry) : getLeaguePerformancePlayer(winner!.playerId)).then(value => {if (alive) setEntry(value);}).catch(() => {if (alive) setError(true);});
    getMe().then(profile => {if (alive) setPlan(profile.plan as Plan);}).catch(() => {});
    return () => {alive = false; mounted.current = false;};
  }, [winner?.playerId, initialEntry?.id]);
  const initialActionRun = React.useRef(false);
  React.useEffect(() => {
    if (focused && entry && initialAction === 'matchup' && !initialActionRun.current) {
      initialActionRun.current = true;
      void run('matchup');
    }
  }, [focused, entry?.id, initialAction]);
  const focusedRef = React.useRef(focused); focusedRef.current = focused;
  const close = () => {if (!locked.current) onClose();};
  async function hideCardForPresentation() {
    if (inline || !cardShowing.current) return;
    cardShowing.current = false;
    setCardVisible(false);
    // iOS must finish dismissing this modal before another presentation starts.
    await new Promise<void>(resolve => setTimeout(resolve, 350));
  }
  const showUpsell = async () => {
    upsellShowing.current = true;
    await hideCardForPresentation();
    if (mounted.current) setUpsellOpen(true);
  };
  const closeUpsell = () => {
    setUpsellOpen(false);
    setTimeout(() => {upsellShowing.current = false; if (mounted.current) setCardVisible(true);}, 450);
  };
  const full = matchup.rows.slice(0, matchup.mode).every(Boolean);
  const alreadyAdded = !!entry && matchup.rows.some(row => row?.id === entry.id);
  async function ensureScores(forPortfolio = false): Promise<Entry> {
    if (!entry) throw new Error(tr ? 'Oyuncu kartı yüklenemedi.' : 'Player card unavailable.');
    if (proMode && !forPortfolio) return entry;
    const meta = entry.player.meta || {};
    const [potential, form] = await Promise.all([
      !isPlayerScore(meta.potential) ? revealPlayerPoolPotential(entry.id).then(value => Math.round(value.potential)) : Promise.resolve(meta.potential),
      !isPlayerScore(meta.form) ? revealPlayerPoolForm(entry.id).then(value => Math.round(value.form)) : Promise.resolve(meta.form),
    ]);
    if (!isPlayerScore(potential) || !isPlayerScore(form)) throw new Error(tr ? 'Oyuncu puanları yüklenemedi.' : 'Player scores could not be loaded.');
    const enriched = {id: entry.id, player: {...entry.player, meta: {...meta, potential, form}}};
    setEntry(enriched);
    return enriched;
  }
  async function run(kind: 'portfolio' | 'matchup' | 'report') {
    if (locked.current || actionsDisabled || !entry) return false;
    if (kind === 'matchup') {
      const latest = currentMatchup.current;
      if (latest.rows.some(row => row?.id === entry.id)) {onMatchupAdded?.(); return true;}
      if (latest.rows.slice(0, latest.mode).every(Boolean)) {
        Alert.alert(tr ? 'Eşleşme alanı dolu' : 'Comparison is full', tr ? 'Eşleşme Merkezi’nde bir oyuncuyu kaldırıp tekrar dene.' : 'Remove a player in Matchup Center and try again.');
        return false;
      }
      const stableId = entry.player.meta?.sportmonksId;
      if (!Number.isSafeInteger(stableId) || (stableId ?? 0) <= 0) {
        Alert.alert(t('matchupComparisonFailed', 'Matchup comparison failed'), t('matchupMissingStableId', 'Player identity is unavailable. Please search for the player again.'));
        return false;
      }
    }
    locked.current = true; setBusy(true);
    let success = false, openedReport = false;
    try {
      const profile = await getMe();
      const paid = profile.plan === 'No Ads Monthly' || profile.plan === 'Pro Monthly' || profile.plan === 'Pro Yearly';
      setPlan(paid ? profile.plan as Plan : 'Free');
      const missingScores = !hasPlayerScores(entry.player.meta);
      // Report cadence is independent of missing-score reveals.
      if (kind !== 'report') {
        await gateLeaguePlayerAction(kind, missingScores, paid, tutorial.active, showUpsell, hideCardForPresentation, () => mounted.current && focusedRef.current);
        if (mounted.current && !upsellShowing.current) setCardVisible(true);
      }
      const enriched = await ensureScores(kind === 'portfolio');
      const player = enriched.player, meta = player.meta || {};
      if (kind === 'portfolio') {
        await addFavoritePlayer({playerId: enriched.id, sportmonksId: meta.sportmonksId, name: player.name, nationality: meta.nationality, age: meta.age, potential: meta.potential, form: meta.form, gender: meta.gender, height: meta.height, weight: meta.weight, team: meta.team, league: meta.league, roles: meta.roles || []});
        success = true;
      } else if (kind === 'matchup') {
        const latest = currentMatchup.current;
        if (!latest.rows.slice(0, latest.mode).every(Boolean) && !latest.rows.some(row => row?.id === enriched.id)) {
          latest.add(enriched);
          success = true;
        }
      } else {
        const hasAccess = await gateLeaguePlayerAction(kind, missingScores, paid, tutorial.active, showUpsell, hideCardForPresentation, () => mounted.current && focusedRef.current);
        const payload: PlayerIdentityPayload = {playerId: enriched.id, sportmonksId: meta.sportmonksId, worldCupMode: false, name: player.name, nationality: meta.nationality, gender: meta.gender, team: meta.team, league: meta.league, age: meta.age, height: meta.height, weight: meta.weight, potential: proMode ? undefined : meta.potential, form: proMode ? undefined : meta.form};
        if (hasAccess) {
          await hideCardForPresentation();
          setReportPlayer(player); setReportPayload(payload);
          setReport({favorite_player_id: enriched.id, status: 'processing', content_json: {sections: {analysis: {status: 'processing'}}}});
          setReportOpen(true); openedReport = true;
        }
        // As in PlayerPoolScreen, generation may complete without granting report access.
        const result = await getPlayerPoolScoutingReportProgress(payload);
        if (result.status === 'failed' || result.status === 'error') throw new Error(tr ? 'Rapor hazırlanamadı.' : 'Report could not be generated.');
        setReport(result);
        success = hasAccess;
      }
    } catch (err) {
      if (isAdFlowCancelled(err)) return false;
      setReportOpen(false);
      if (openedReport) await new Promise<void>(resolve => setTimeout(resolve, 350));
      openedReport = false;
      Alert.alert(tr ? 'İşlem tamamlanamadı' : 'Action could not be completed', err instanceof Error ? err.message : String(err));
    } finally {
      locked.current = false; setBusy(false);
      if (mounted.current && !openedReport && !upsellShowing.current) setCardVisible(true);
    }
    if (success && kind === 'matchup') onMatchupAdded?.();
    return success;
  }
  const playerCard = entry ? <PlayerCard hideScores={proMode} proActions={proMode} onFindSimilar={onFindSimilar} onCheckFit={onCheckFit} player={entry.player} similarPlayerId={entry.id} similarDisabled={busy || actionsDisabled} beforeFindSimilar={async()=>{if(!inline){onClose();await new Promise<void>(resolve=>setTimeout(resolve,350));}}} titleAlign="left" addFavoriteDisabled={busy || actionsDisabled} onAddFavorite={() => run('portfolio')} onGenerateReport={async () => {await run('report');}} reportState={busy ? 'loading' : report?.status === 'ready' ? 'ready' : 'idle'} reportDisabled={busy || actionsDisabled} matchupDisabled={busy || actionsDisabled || full || alreadyAdded} onMatchup={async () => {await run('matchup');}} /> : null;
  const cardBody = (entry ? (renderPlayerCard ? renderPlayerCard(playerCard!.props) : playerCard) : <Status busy={!error} error={error} text={error ? (tr ? 'Bu oyuncu henüz oyuncu havuzunda mevcut değil veya kartı yüklenemedi.' : 'This player is not yet available in the player pool or the card could not be loaded.') : (tr ? 'Oyuncu kartı yükleniyor…' : 'Loading player card…')} />);
  const cardContent = inline ? <View style={{paddingBottom:8}}>{cardBody}</View> : <ScrollView contentContainerStyle={{paddingBottom:8}}>{cardBody}</ScrollView>;
  return <>
    {inline ? cardContent : <Modal transparent visible={focused && cardVisible && !reportOpen} animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}><View style={styles.panel} accessibilityViewIsModal>
        <View style={styles.heading}><UserRound size={20} color={ACCENT} /><Text style={[FRAME_TITLE, {flex: 1}]}>{t('playerCard', 'Player Card')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('closePlayerCard', 'Close player card')} onPress={close} hitSlop={10} style={{padding: 6}}><X size={22} color={DANGER} /></Pressable></View>
        {cardContent}

      </View></View>
    </Modal>}
    <PlusProUpsellScreen visible={focused && upsellOpen} onClose={closeUpsell} />
    {report && reportPlayer && reportPayload && <ScoutingReport hidePlayerActions={proMode} visible={focused && reportOpen} player={reportPlayer} report={report} plan={plan} onClose={() => {setReportOpen(false); setTimeout(() => {if (mounted.current) setCardVisible(true);}, 350);}} reloadReport={() => getPlayerPoolScoutingReportProgress(reportPayload)} loadReportSection={section => getPlayerPoolScoutingReportSection(reportPayload, section)} onReportUpdate={setReport} />}
  </>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, DANGER, FRAME_TITLE, PANEL, themeColor} = colors;

  const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: themeColor('rgba(0,0,0,.55)', 'surface'), justifyContent: 'center', alignItems: 'center', padding: 16},
  panel: {width: '100%', maxWidth: 560, maxHeight: '90%', borderRadius: 16, overflow: 'hidden', backgroundColor: PANEL, borderWidth: 1, borderColor: ACCENT, padding: 12},
  heading: {flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10},
});
  return {ACCENT, DANGER, FRAME_TITLE, PANEL, styles, themeColor};
});
