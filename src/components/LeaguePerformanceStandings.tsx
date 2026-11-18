import { sportmonksTeamImage } from '@/utils/sportmonksImages';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useReportReward } from '@/ads/useReportReward';
import { useIsFocused, useNavigation, type NavigatorScreenParams } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabsParamList } from '@/types';
import { LockKeyhole } from 'lucide-react-native';
import React from 'react';
import { AppState,Pressable,StyleSheet,Switch,Text,useWindowDimensions,View } from 'react-native';
import AdaptiveLeagueStandingsTable from './AdaptiveLeagueStandingsTable';
import RewardUnlockButton from './RewardUnlockButton';
import PlanManagementButton from './PlanManagementButton';
import ReportRewardProvider from './ReportRewardProvider';
import LeaguePerformanceUpgradeModal from './LeaguePerformanceUpgradeModal';

import { getLeagueInsights,completedLeaguePeriods,orderLeagueMetrics,leagueMetricPlan,sortLeagueRows,type LeagueBestPlayer,type LeagueInsights,type LeagueRewards,type LeagueStanding,type LeagueScope } from '@/services/leaguePerformance';
import { matchMetricLabel } from '@/utils/matchReportMetrics';
import { getThemed_styles as __getThemed_shared,getThemed_standingRuleMeta as __getThemed_standingRuleMeta,Action,SelectField,Selector,Status,Winner } from './LeaguePerformanceControls';
import LeaguePlayerCardModal from './LeaguePlayerCardModal';
import { groupLeagueMetrics } from '@/services/leagueMetricGroups';

const SEASON_ONLY_LEAGUES = new Set([2, 5, 2286, 1328, 1329]);

function periodLabel(start: string, end: string, tr: boolean) {
  const last = new Date(`${end}T12:00:00Z`); last.setUTCDate(last.getUTCDate() - 1);
  const locale = tr ? 'tr-TR' : 'en-GB';
  return `${new Date(`${start}T12:00:00Z`).toLocaleDateString(locale, {timeZone: 'UTC'})} – ${last.toLocaleDateString(locale, {timeZone: 'UTC'})}`;
}
export default function LeaguePerformanceStandings({leagueId, seasonId, rows: officialRows, tr, scope, official = true}: {leagueId: number; seasonId: number; rows: LeagueStanding[]; tr: boolean; scope?: LeagueScope; official?: boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {standingRuleMeta, shared, styles, MUTED, ACCENT, themeColor} = themed;

  const [upgrade, setUpgrade] = React.useState<
    {required: 'plus'; feature: 'biweekly'} |
    {required: 'plus' | 'pro'; feature: 'metric'; metricLabel: string; metricKey: string} | null
  >(null);
  const navigation = useNavigation<BottomTabNavigationProp<Omit<MainTabsParamList, 'Profile'> & {
    Profile: NavigatorScreenParams<{ManagePlan: undefined}>;
  }>>();
  const openPlans = () => navigation.navigate('Profile', {screen: 'ManagePlan'});
  const focused = useIsFocused();
  const {width} = useWindowDimensions();
  const [playersEnabled, setPlayersEnabled] = React.useState(true);
  const [active, setActive] = React.useState(AppState.currentState === 'active');
  const [data, setData] = React.useState<LeagueInsights | null>(null);
  const canBiweekly = data?.access?.biweekly ?? false;
  const showBiweekly = !SEASON_ONLY_LEAGUES.has(leagueId) && (!data || !canBiweekly || data.periods.length > 0);
  const tier = data?.access?.tier ?? 'free';
  const biweeklyLocked = !!data?.access.biweeklyAvailable && showBiweekly && !canBiweekly;
  const activeRewardKey = upgrade?.feature === 'metric' ? `metric:${upgrade.metricKey}`
    : biweeklyLocked ? 'biweekly' : undefined;
  const reward = useReportReward(`league:${leagueId}:${seasonId}`, activeRewardKey, focused && !!data?.access.rewarded && tier !== 'pro');
  const rewardedBiweekly = reward.isUnlocked('biweekly');
  const rewardedMetricsKey = JSON.stringify(reward.unlockedSections.filter(key => key.startsWith('metric:')).map(key => key.slice(7)));
  const canWatch = !!activeRewardKey && reward.available && !reward.isUnlocked(activeRewardKey);
  React.useEffect(() => {
    if (canWatch && activeRewardKey) reward.prepare(activeRewardKey);
  }, [canWatch, activeRewardKey, reward]);
  const [period, setPeriod] = React.useState('');
  const [metricKey, setMetricKey] = React.useState('');
  const pendingMetric = React.useRef<string | null>(null);
  const upgradeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => clearTimeout(upgradeTimer.current), []);
  const [perMatch, setPerMatch] = React.useState(false);
  const usePerMatch = !official || perMatch;
  const [direction, setDirection] = React.useState<'asc' | 'desc'>('desc');
  const [selector, setSelector] = React.useState<'metric' | 'period' | null>(null);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [retry, setRetry] = React.useState(0);
  const [winner, setWinner] = React.useState<LeagueBestPlayer | null>(null);
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  React.useEffect(() => {
    if (!focused || !active) return;
    const rewards: LeagueRewards = {rewardedBiweekly, rewardedMetrics: JSON.parse(rewardedMetricsKey)};
    let alive = true, failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true); setError(false);
    async function load() {
      try {
        let result: LeagueInsights;
        try {result = await getLeagueInsights(leagueId, seasonId, period, scope, rewards);}
        catch (failure) {
          if (!period) throw failure;
          // Recover a previously selected paid period after a plan downgrade.
          const current = await getLeagueInsights(leagueId, seasonId, '', scope, rewards);
          if (current.access.biweekly && completedLeaguePeriods(current.periods).some(p => p.period_start === period)) throw failure;
          result = current;
          if (alive) setPeriod('');
        }
        // Keep the OTA compatible while the completed-period backend rolls out.
        let periods = completedLeaguePeriods(result.periods);
        const selected = periods.find(p => p.period_start === period) || periods[0];
        if (result.access.biweekly && selected && result.biweekly?.period_start !== selected.period_start) {
          result = await getLeagueInsights(leagueId, seasonId, selected.period_start, scope, rewards);
          periods = completedLeaguePeriods(result.periods);
        }
        result = {...result, periods, selectedPeriodStart: selected?.period_start || null,
          biweekly: result.biweekly && periods.some(p => p.period_start === result.biweekly!.period_start) ? result.biweekly : null};
        if (!alive) return;
        setData(result);
        if (!result.access.biweekly) setPeriod('');
        const newlyUnlocked = result.season.metric_catalog.find(item => item.key === pendingMetric.current && !item.locked);
        if (newlyUnlocked) {
          pendingMetric.current = null;
          setMetricKey(newlyUnlocked.key);
          setDirection(newlyUnlocked.direction || 'desc');
        } else {
          setMetricKey(previous => result.season.metric_catalog.find(item => item.key === previous)?.locked ? '' : previous);
        }
        setError(false); failures = 0;
        if (result.refreshing) timer = setTimeout(load, 10000);
      } catch {
        if (!alive) return;
        setError(true);
        if (++failures < 3) timer = setTimeout(load, 15000);
      } finally { if (alive) setLoading(false); }
    }
    void load();
    return () => {alive = false; clearTimeout(timer);};
  }, [leagueId, seasonId, scope, period, retry, focused, active, rewardedBiweekly, rewardedMetricsKey]);
  const selectedPeriod = data?.periods.find(p => p.period_start === (period || data.selectedPeriodStart));
  const teams = data?.season.team_metrics || {};
  const rows: LeagueStanding[] = official ? officialRows : Object.entries(teams).map(([id, team]) => ({teamId: Number(id), teamName: team.teamName, teamImageUrl: officialRows.find(row => String(row.teamId) === id)?.teamImageUrl || sportmonksTeamImage(id) || null,
    position: null, played: team.matches, won: team.results?.won??null, drawn: team.results?.drawn??null, lost: team.results?.lost??null, goalsFor: team.results?.goalsFor??null, goalsAgainst: team.results?.goalsAgainst??null, goalDifference: team.results?.goalDifference??null, points: null, form: null, standingRule: null}));
  const playing = rows.filter(row => (row.played || 0) > 0);
  const metrics = orderLeagueMetrics((data?.season.metric_catalog || []).filter(metric => metric.locked || reward.isUnlocked(`metric:${metric.key}`) || (playing.length > 0 && playing.some(row => teams[String(row.teamId)]?.metrics[metric.key]?.value != null))), tr);
  const metric = metrics.find(item => item.key === metricKey && !item.locked);
  const sorted = sortLeagueRows(rows, teams, metric?.key || '', usePerMatch, direction);
  const ordered = official ? sorted : sorted.map((row, index) => ({...row, position: metric && teams[String(row.teamId)]?.metrics[metric.key]?.[usePerMatch ? 'perMatch' : 'value'] != null ? index + 1 : null}));
  const defaultMetricLabel = official ? (tr ? 'Puan · Resmî sıralama' : 'Points · Official standings') : (tr ? 'Takımlar ve en iyi oyuncuları' : 'Teams and top players');
  const unavailable = error || data?.season.status === 'failed';
  const busy = !unavailable && (loading || !!data?.refreshing);
  const seasonPending = busy && !data?.season.computed_at;
  const periodCurrent = !!data?.biweekly && (!period || data.biweekly.period_start === period);
  const biweeklyPending = busy && !periodCurrent;
  const seasonPlayers = data?.season.team_best_players || {};
  const biweeklyPlayers = periodCurrent ? data?.biweekly?.team_best_players || {} : {};
  const playerView = !metric && playersEnabled;
  const rules = [...new Map(rows.flatMap(row => {const rule = standingRuleMeta(row.standingRule, tr); return rule ? [[rule.label, rule] as const] : [];})).values()];
  const watchSelected = async () => {
    if (!activeRewardKey || !await reward.watch(activeRewardKey)) return;
    if (upgrade?.feature === 'metric') pendingMetric.current = upgrade.metricKey;
    setUpgrade(null);
  };
  const select = (key: string) => {
    if (selector === 'metric') {
      const selected = metrics.find(item => item.key === key);
      if (selected?.locked) {
        setSelector(null);
        clearTimeout(upgradeTimer.current);
        upgradeTimer.current = setTimeout(() => setUpgrade({
          required: leagueMetricPlan(selected) === 'pro' ? 'pro' : 'plus',
          feature: 'metric',
          metricKey: key,
          metricLabel: matchMetricLabel(selected.label, tr ? 'tr' : 'en'),
        }), 350);
        return;
      }
      pendingMetric.current = null;
      setMetricKey(key);
      setDirection(selected?.direction || 'desc');
    } else setPeriod(key);
    setSelector(null);
  };
  return <View style={{gap: 14}}>
    {busy && <Status busy text={tr ? 'İstatistikler ve en iyi oyuncular hazırlanıyor. Hazır olduğunda otomatik gösterilecek.' : 'Preparing statistics and top players. Results will appear automatically when ready.'} />}
    <SelectField label={scope ? (tr ? 'Aşama sıralama ölçütü' : 'Phase ordering metric') : (tr ? 'Sezon sıralama ölçütü' : 'Season ordering metric')} value={metric ? matchMetricLabel(metric.label, tr ? 'tr' : 'en') : defaultMetricLabel} onPress={() => setSelector('metric')} />
    {metric && <View style={[shared.row, {flexWrap: 'wrap'}]}>{official && metric.aggregation === 'total' && <Action label={perMatch ? (tr ? 'Maç başına' : 'Per match') : (scope ? (tr ? 'Toplam' : 'Total') : (tr ? 'Sezon toplamı' : 'Season total'))} onPress={() => setPerMatch(value => !value)} />}<Action label={direction === 'asc' ? (tr ? '↑ Artan' : '↑ Ascending') : (tr ? '↓ Azalan' : '↓ Descending')} onPress={() => setDirection(value => value === 'asc' ? 'desc' : 'asc')} /></View>}
    {!official && <Text style={shared.hint}>{tr ? 'Maç başına ortalamalar · Yüzdeler oran olarak gösterilir · Eksik veri: —' : 'Per-match averages · Percentages remain rates · Missing data: —'}</Text>}
    {showBiweekly && <SelectField label={tr ? 'İki haftalık dönem' : 'Two-week period'} valueContent={!canBiweekly ? <><Text style={styles.plusText}>PLUS</Text> / <Text style={styles.proText}>PRO</Text><Text style={{color: MUTED}}>{tr ? ' · Kilidi aç' : ' · Unlock'}</Text></> : undefined} value={!canBiweekly ? (tr ? 'PLUS / PRO · Kilidi aç' : 'PLUS / PRO · Unlock') : selectedPeriod ? periodLabel(selectedPeriod.period_start, selectedPeriod.period_end, tr) : (tr ? 'Tamamlanan dönemler yükleniyor…' : 'Loading completed periods…')} onPress={() => canBiweekly ? setSelector('period') : setUpgrade({required: 'plus', feature: 'biweekly'})} />}
    {data?.season.computed_at && <Text style={shared.hint}>{tr ? 'Son güncelleme' : 'Updated'}: {new Date(data.season.computed_at).toLocaleString(tr ? 'tr-TR' : 'en-GB')} · {data.season.fixture_count} {tr ? 'maç' : 'matches'}</Text>}
    {unavailable && <View style={{gap: 8}}><Text style={[shared.hint, {color: themeColor('#FCD34D', 'text')}]}>{tr ? 'İstatistikler güncellenemedi. Varsa son hesaplama gösteriliyor.' : 'Statistics could not be updated. The last calculation is shown where available.'}</Text><Action label={tr ? 'Yeniden kontrol et' : 'Check again'} onPress={() => setRetry(value => value + 1)} /></View>}
    <View style={styles.winnersFrame}>
      <View style={{flexDirection: width >= 640 ? 'row' : 'column', gap: 14}}>
        {showBiweekly && <View style={{flex: width >= 640 ? 1 : undefined, minWidth: 0}}>{!canBiweekly ? <View style={styles.lockedWinner}>
          <View style={styles.lockedHeading}><View style={styles.lockedIcon}><LockKeyhole size={17} color={ACCENT} strokeWidth={2.3} /></View><Text style={styles.lockedTitle}>{tr ? 'Ligin İki Haftalık En İyisi' : 'League’s Two-Week Top Player'}</Text></View>
          <Text style={styles.lockedText}>{tr ? <>İki haftanın öne çıkan oyuncularını <Text style={styles.plusText}>PLUS</Text> veya <Text style={styles.proText}>PRO</Text> ile keşfet.</> : <>Discover the two-week top players with <Text style={styles.plusText}>PLUS</Text> or <Text style={styles.proText}>PRO</Text>.</>}</Text>
          {!upgrade && canWatch && activeRewardKey === 'biweekly' && <RewardUnlockButton
            loading={!!reward.busy} disabled={!!reward.busy} onPress={() => void watchSelected()}/>}
          {reward.available ? <View style={styles.planAction}><PlanManagementButton highlighted onPress={openPlans}/></View> :
          <Pressable accessibilityRole="button" onPress={() => setUpgrade({required: 'plus', feature: 'biweekly'})} style={({pressed}) => [styles.unlockButton, pressed && {opacity: .82}]}><Text style={styles.unlockText}>{tr ? 'Kilidi aç' : 'Unlock'}</Text></Pressable>}
        </View> : <Winner tone="biweekly" title={tr ? 'Ligin İki Haftalık En İyisi' : 'League’s Two-Week Top Player'} subtitle={periodCurrent && data?.biweekly ? `${periodLabel(data.biweekly.period_start, data.biweekly.period_end, tr)} · ${data.biweekly.fixture_count} ${tr ? 'maç' : 'matches'}` : undefined} player={periodCurrent ? data?.biweekly?.league_best_player : null} pending={biweeklyPending} unavailable={unavailable} tr={tr} onPlayer={setWinner} />}</View>}
        <View style={{flex: width >= 640 ? 1 : undefined, minWidth: 0}}><Winner title={scope === 'qualifying' ? (tr ? 'Ön Elemelerin En İyisi' : 'Qualifiers Top Player') : scope === 'league' ? (tr ? 'Lig Aşamasının En İyisi' : 'League Phase Top Player') : scope === 'knockout' ? (tr ? 'Eleme Aşamasının En İyisi' : 'Knockout Phase Top Player') : (tr ? 'Ligin Sezonluk En İyisi' : 'League’s Season Top Player')} player={data?.season.league_best_player} pending={seasonPending} unavailable={unavailable} tr={tr} onPlayer={setWinner} /></View>
      </View>
    </View>
    {!metric && <View style={shared.row}><Text style={[shared.text, {flex: 1}]}>{tr ? 'Takımların en iyi oyuncularını göster' : 'Show teams’ top players'}</Text><Switch accessibilityLabel={showBiweekly && canBiweekly ? (tr ? 'İki haftanın ve sezonun oyuncularını göster' : 'Show two-week and season players') : (tr ? 'Sezonun oyuncularını göster' : 'Show season players')} value={playersEnabled} onValueChange={setPlayersEnabled} trackColor={{false: MUTED, true: ACCENT}} /></View>}
    <View style={[shared.row, {justifyContent: 'flex-start', flexWrap: 'wrap'}]}>{official && !rules.length && <Text style={shared.hint}>{tr ? 'Bu tablo için özel sıralama kuralı bulunmuyor.' : 'No position rules are available for this table.'}</Text>}{rules.map(rule => <Text key={rule.label} style={[styles.rule, {color: rule.color, borderColor: rule.color}]}>{rule.label}</Text>)}</View>
    <AdaptiveLeagueStandingsTable summaryStats={scope==='overall' && !official} phaseScoped={!!scope && scope !== 'overall'} official={official} rows={ordered} teams={teams} metric={metric} perMatch={usePerMatch} tr={tr} playerView={playerView} showSeason={playerView} showBiweekly={playerView && showBiweekly && canBiweekly} seasonPlayers={seasonPlayers} biweeklyPlayers={biweeklyPlayers} seasonPending={seasonPending} biweeklyPending={biweeklyPending} unavailable={unavailable} onPlayer={setWinner} />
    {!official && !rows.length && !busy && <Status text={tr ? 'Bu aşamada henüz tamamlanan maç yok.' : 'No completed matches in this phase yet.'} />}
    {upgrade ? <LeaguePerformanceUpgradeModal visible={focused} required={upgrade.required} feature={upgrade.feature}
      metricLabel={upgrade.feature === 'metric' ? upgrade.metricLabel : undefined} tr={tr} onClose={() => setUpgrade(null)}
      reward={reward} onWatch={canWatch ? () => void watchSelected() : undefined}/> :
      <ReportRewardProvider reward={reward} onOpenPlans={openPlans}>{null}</ReportRewardProvider>}
    {winner && <LeaguePlayerCardModal key={winner.playerId} winner={winner} onClose={() => setWinner(null)} />}
    {selector && <Selector title={selector === 'metric' ? (tr ? 'Sıralama Ölçütü' : 'Ordering Metric') : (tr ? 'İki Haftalık Dönem' : 'Two-Week Period')} tr={tr} selected={selector === 'metric' ? metric?.key || '' : period || data?.selectedPeriodStart || ''} options={selector === 'metric' ? [{key: '', label: defaultMetricLabel}, ...groupLeagueMetrics(metrics, tr).flatMap(group => group.metrics.map(item => ({key: item.key, label: matchMetricLabel(item.label, tr ? 'tr' : 'en'), category: group.label, locked: item.locked, rewardedUnlock: !!item.locked && reward.available, plan: leagueMetricPlan(item) === 'free' ? undefined : leagueMetricPlan(item) as 'plus' | 'pro'})))] : (data?.periods || []).map(p => ({key: p.period_start, label: periodLabel(p.period_start, p.period_end, tr)}))} onClose={() => setSelector(null)} onSelect={select} />}
  </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, MUTED, themeColor} = colors;
  const standingRuleMeta = __getThemed_standingRuleMeta(colors);
  const shared = __getThemed_shared(colors);
  const styles = StyleSheet.create({
  lockedWinner: {gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: themeColor('rgba(22,163,74,.33)', 'border'), backgroundColor: themeColor('rgba(22,163,74,.04)', 'surface')},
  lockedHeading: {flexDirection: 'row', alignItems: 'center', gap: 9},
  lockedIcon: {width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: themeColor('rgba(22,163,74,.4)', 'border'), backgroundColor: themeColor('rgba(22,163,74,.09)', 'surface'), alignItems: 'center', justifyContent: 'center'},
  lockedTitle: {flex: 1, color: themeColor('#FCD34D', 'text'), fontSize: 13, fontWeight: '800'},
  lockedText: {color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: '600'},
  plusText: {color: themeColor('#38BDF8', 'text'), fontWeight: '900'},
  proText: {color: ACCENT, fontWeight: '900'},
  unlockButton: {minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: ACCENT, backgroundColor: themeColor('rgba(22,163,74,.14)', 'surface'), alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12},
  unlockText: {color: ACCENT, fontSize: 12, fontWeight: '900', textTransform: 'uppercase'},
  planAction: {flexDirection: 'row'},
  winnersFrame: {gap: 12},
  rule: {fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6},
});
  return {ACCENT, MUTED, standingRuleMeta, shared, styles, themeColor};
});
