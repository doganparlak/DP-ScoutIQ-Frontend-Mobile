import LeaguePerformanceUpgradeModal from './LeaguePerformanceUpgradeModal';
import { Pressable } from 'react-native';
import { LockKeyhole } from 'lucide-react-native';
import React from 'react';
import { AppState, StyleSheet, Switch, Text, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import AdaptiveLeagueStandingsTable from './AdaptiveLeagueStandingsTable';
import { ACCENT, MUTED } from '@/theme';
import { matchMetricLabel } from '@/utils/matchReportMetrics';
import { getLeagueInsights, sortLeagueRows, orderLeagueMetrics, PLUS_LEAGUE_METRICS, type LeagueBestPlayer, type LeagueInsights, type LeagueStanding } from '@/services/leaguePerformance';
import LeaguePlayerCardModal from './LeaguePlayerCardModal';
import { Action, SelectField, Selector, Status, Winner, standingRuleMeta, styles as shared } from './LeaguePerformanceControls';

function periodLabel(start: string, end: string, tr: boolean) {
  const last = new Date(`${end}T12:00:00Z`); last.setUTCDate(last.getUTCDate() - 1);
  const locale = tr ? 'tr-TR' : 'en-GB';
  return `${new Date(`${start}T12:00:00Z`).toLocaleDateString(locale, {timeZone: 'UTC'})} – ${last.toLocaleDateString(locale, {timeZone: 'UTC'})}`;
}
export default function LeaguePerformanceStandings({leagueId, seasonId, rows, tr}: {leagueId: number; seasonId: number; rows: LeagueStanding[]; tr: boolean}) {
  const [upgrade, setUpgrade] = React.useState<{required: 'plus' | 'pro'; feature: 'biweekly' | 'metric'; metricLabel?: string} | null>(null);
  const focused = useIsFocused();
  const {width} = useWindowDimensions();
  const [playersEnabled, setPlayersEnabled] = React.useState(true);
  const [active, setActive] = React.useState(AppState.currentState === 'active');
  const [data, setData] = React.useState<LeagueInsights | null>(null);
  const canBiweekly = data?.access?.biweekly ?? false;
  const tier = data?.access?.tier ?? 'free';
  const [period, setPeriod] = React.useState('');
  const [metricKey, setMetricKey] = React.useState('');
  const [perMatch, setPerMatch] = React.useState(false);
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
    let alive = true, failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLoading(true); setError(false);
    async function load() {
      try {
        let result: LeagueInsights;
        try {result = await getLeagueInsights(leagueId, seasonId, period);}
        catch (failure) {
          if (!period) throw failure;
          // Recover a previously selected paid period after a plan downgrade.
          const current = await getLeagueInsights(leagueId, seasonId);
          if (current.access.biweekly) throw failure;
          result = current;
        }
        if (!alive) return;
        setData(result);
        if (!result.access.biweekly) setPeriod('');
        if (metricKey && result.season.metric_catalog.find(item => item.key === metricKey)?.locked) setMetricKey('');
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
  }, [leagueId, seasonId, period, retry, focused, active]);
  const teams = data?.season.team_metrics || {};
  const playing = rows.filter(row => (row.played || 0) > 0);
  const metrics = orderLeagueMetrics((data?.season.metric_catalog || []).filter(metric => metric.locked || (playing.length > 0 && playing.every(row => teams[String(row.teamId)]?.metrics[metric.key]?.value != null))), tr);
  const metric = metrics.find(item => item.key === metricKey && !item.locked);
  const ordered = sortLeagueRows(rows, teams, metric?.key || '', perMatch, direction);
  const unavailable = error || data?.season.status === 'failed';
  const busy = !unavailable && (loading || !!data?.refreshing);
  const seasonPending = busy && !data?.season.computed_at;
  const periodCurrent = !!data?.biweekly && (!period || data.biweekly.period_start === period);
  const biweeklyPending = busy && !periodCurrent;
  const seasonPlayers = data?.season.team_best_players || {};
  const biweeklyPlayers = periodCurrent ? data?.biweekly?.team_best_players || {} : {};
  const playerView = !metric && playersEnabled;
  const rules = [...new Map(rows.flatMap(row => {const rule = standingRuleMeta(row.standingRule, tr); return rule ? [[rule.label, rule] as const] : [];})).values()];
  return <View style={{gap: 14}}>
    {busy && <Status busy text={tr ? 'İstatistikler ve en iyi oyuncular hazırlanıyor. Hazır olduğunda otomatik gösterilecek.' : 'Preparing statistics and top players. Results will appear automatically when ready.'} />}
    <SelectField label={tr ? 'Sezon sıralama ölçütü' : 'Season ordering metric'} value={metric ? matchMetricLabel(metric.label, tr ? 'tr' : 'en') : (tr ? 'Puan · Resmî sıralama' : 'Points · Official standings')} onPress={() => setSelector('metric')} />
    {metric && <View style={[shared.row, {flexWrap: 'wrap'}]}>{metric.aggregation === 'total' && <Action label={perMatch ? (tr ? 'Maç başına' : 'Per match') : (tr ? 'Sezon toplamı' : 'Season total')} onPress={() => setPerMatch(value => !value)} />}<Action label={direction === 'asc' ? (tr ? '↑ Artan' : '↑ Ascending') : (tr ? '↓ Azalan' : '↓ Descending')} onPress={() => setDirection(value => value === 'asc' ? 'desc' : 'asc')} /></View>}
    <SelectField label={tr ? 'İki haftalık dönem' : 'Two-week period'} valueContent={!canBiweekly ? <><Text style={styles.plusText}>PLUS</Text> / <Text style={styles.proText}>PRO</Text><Text style={{color: MUTED}}>{tr ? ' · Kilidi aç' : ' · Unlock'}</Text></> : undefined} value={!canBiweekly ? (tr ? 'PLUS / PRO · Kilidi aç' : 'PLUS / PRO · Unlock') : period ? periodLabel(period, data?.periods.find(p => p.period_start === period)?.period_end || new Date(new Date(`${period}T12:00:00Z`).getTime() + 14 * 86400000).toISOString().slice(0, 10), tr) : (tr ? 'Güncel dönem' : 'Current period')} onPress={() => canBiweekly ? setSelector('period') : setUpgrade({required: 'plus', feature: 'biweekly'})} />
    {data?.season.computed_at && <Text style={shared.hint}>{tr ? 'Son güncelleme' : 'Updated'}: {new Date(data.season.computed_at).toLocaleString(tr ? 'tr-TR' : 'en-GB')} · {data.season.fixture_count} {tr ? 'lig maçı' : 'league matches'}</Text>}
    {unavailable && <View style={{gap: 8}}><Text style={[shared.hint, {color: '#FCD34D'}]}>{tr ? 'İstatistikler güncellenemedi. Varsa son hesaplama gösteriliyor.' : 'Statistics could not be updated. The last calculation is shown where available.'}</Text><Action label={tr ? 'Yeniden kontrol et' : 'Check again'} onPress={() => setRetry(value => value + 1)} /></View>}
    <View style={styles.winnersFrame}>
      <View style={{flexDirection: width >= 640 ? 'row' : 'column', gap: 14}}>
        <View style={{flex: width >= 640 ? 1 : undefined, minWidth: 0}}>{!canBiweekly ? <View style={styles.lockedWinner}>
          <View style={styles.lockedHeading}><View style={styles.lockedIcon}><LockKeyhole size={17} color={ACCENT} strokeWidth={2.3} /></View><Text style={styles.lockedTitle}>{tr ? 'Ligin İki Haftalık En İyisi' : 'League’s Two-Week Top Player'}</Text></View>
          <Text style={styles.lockedText}>{tr ? <>İki haftanın öne çıkan oyuncularını <Text style={styles.plusText}>PLUS</Text> veya <Text style={styles.proText}>PRO</Text> ile keşfet.</> : <>Discover the two-week top players with <Text style={styles.plusText}>PLUS</Text> or <Text style={styles.proText}>PRO</Text>.</>}</Text>
          <Pressable accessibilityRole="button" onPress={() => setUpgrade({required: 'plus', feature: 'biweekly'})} style={({pressed}) => [styles.unlockButton, pressed && {opacity: .82}]}><Text style={styles.unlockText}>{tr ? 'Kilidi aç' : 'Unlock'}</Text></Pressable>
        </View> : <Winner framed={false} title={tr ? 'Ligin İki Haftalık En İyisi' : 'League’s Two-Week Top Player'} subtitle={periodCurrent && data?.biweekly ? `${periodLabel(data.biweekly.period_start, data.biweekly.period_end, tr)} · ${data.biweekly.fixture_count} ${tr ? 'maç' : 'matches'}` : undefined} player={periodCurrent ? data?.biweekly?.league_best_player : null} pending={biweeklyPending} unavailable={unavailable} tr={tr} onPlayer={setWinner} />}</View>
        <View style={{width: width >= 640 ? 1 : '100%', height: width >= 640 ? undefined : 1, backgroundColor: 'rgba(245,158,11,.2)'}} />
        <View style={{flex: width >= 640 ? 1 : undefined, minWidth: 0}}><Winner framed={false} title={tr ? 'Ligin Sezonluk En İyisi' : 'League’s Season Top Player'} player={data?.season.league_best_player} pending={seasonPending} unavailable={unavailable} tr={tr} onPlayer={setWinner} /></View>
      </View>
    </View>
    {!metric && <View style={shared.row}><Text style={[shared.text, {flex: 1}]}>{tr ? 'Takımların en iyi oyuncularını göster' : 'Show teams’ top players'}</Text><Switch accessibilityLabel={canBiweekly ? (tr ? 'İki haftanın ve sezonun oyuncularını göster' : 'Show two-week and season players') : (tr ? 'Sezonun oyuncularını göster' : 'Show season players')} value={playersEnabled} onValueChange={setPlayersEnabled} trackColor={{false: MUTED, true: ACCENT}} /></View>}
    <View style={[shared.row, {justifyContent: 'flex-start', flexWrap: 'wrap'}]}>{!rules.length && <Text style={shared.hint}>{tr ? 'Bu tablo için özel sıralama kuralı bulunmuyor.' : 'No position rules are available for this table.'}</Text>}{rules.map(rule => <Text key={rule.label} style={[styles.rule, {color: rule.color, borderColor: rule.color}]}>{rule.label}</Text>)}</View>
    <AdaptiveLeagueStandingsTable rows={ordered} teams={teams} metric={metric} perMatch={perMatch} tr={tr} playerView={playerView} showSeason={playerView} showBiweekly={playerView && canBiweekly} seasonPlayers={seasonPlayers} biweeklyPlayers={biweeklyPlayers} seasonPending={seasonPending} biweeklyPending={biweeklyPending} unavailable={unavailable} onPlayer={setWinner} />
    <LeaguePerformanceUpgradeModal visible={focused && upgrade !== null} required={upgrade?.required || 'plus'} feature={upgrade?.feature || 'biweekly'} metricLabel={upgrade?.metricLabel} tr={tr} onClose={() => setUpgrade(null)} />
    {winner && <LeaguePlayerCardModal key={winner.playerId} winner={winner} onClose={() => setWinner(null)} />}
    {selector && <Selector title={selector === 'metric' ? (tr ? 'Sıralama Ölçütü' : 'Ordering Metric') : (tr ? 'İki Haftalık Dönem' : 'Two-Week Period')} tr={tr} selected={selector === 'metric' ? metric?.key || '' : period} options={selector === 'metric' ? [{key: '', label: tr ? 'Puan · Resmî sıralama' : 'Points · Official standings'}, ...metrics.map(item => ({key: item.key, label: matchMetricLabel(item.label, tr ? 'tr' : 'en'), locked: item.locked, plan: PLUS_LEAGUE_METRICS.includes(item.key) ? 'plus' as const : 'pro' as const}))] : [{key: '', label: tr ? 'Güncel dönem' : 'Current period'}, ...(data?.periods || []).map(p => ({key: p.period_start, label: periodLabel(p.period_start, p.period_end, tr)}))]} onClose={() => setSelector(null)} onSelect={key => {if (selector === 'metric') {if (metrics.find(item => item.key === key)?.locked) {setSelector(null); setTimeout(() => setUpgrade({required: tier === 'free' && PLUS_LEAGUE_METRICS.includes(key) ? 'plus' : 'pro', feature: 'metric', metricLabel: matchMetricLabel(metrics.find(item => item.key === key)?.label || key, tr ? 'tr' : 'en')}), 350); return;} setMetricKey(key); setDirection(metrics.find(item => item.key === key)?.direction || 'desc');} else setPeriod(key); setSelector(null);}} />}
  </View>;
}
const styles = StyleSheet.create({
  lockedWinner: {gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(22,163,74,.33)', backgroundColor: 'rgba(22,163,74,.04)'},
  lockedHeading: {flexDirection: 'row', alignItems: 'center', gap: 9},
  lockedIcon: {width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(22,163,74,.4)', backgroundColor: 'rgba(22,163,74,.09)', alignItems: 'center', justifyContent: 'center'},
  lockedTitle: {flex: 1, color: '#FCD34D', fontSize: 13, fontWeight: '800'},
  lockedText: {color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: '600'},
  plusText: {color: '#38BDF8', fontWeight: '900'},
  proText: {color: ACCENT, fontWeight: '900'},
  unlockButton: {minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: ACCENT, backgroundColor: 'rgba(22,163,74,.14)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12},
  unlockText: {color: ACCENT, fontSize: 12, fontWeight: '900', textTransform: 'uppercase'},
  winnersFrame: {borderWidth: 1, borderColor: 'rgba(245,158,11,.3)', backgroundColor: 'rgba(245,158,11,.05)', borderRadius: 14, padding: 14},
  rule: {fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6},
});
