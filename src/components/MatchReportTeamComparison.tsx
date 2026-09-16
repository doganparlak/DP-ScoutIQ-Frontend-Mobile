import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, ChevronDown, Shield } from 'lucide-react-native';
import { ACCENT, LINE, MUTED, TEXT } from '@/theme';
import type { MatchReportMetric, MatchReportTeam, PostMatchCardData } from '@/services/matchPool';
import { expectedMetricOrder, matchMetricLabel, teamMetricOrder } from '@/utils/matchReportMetrics';
const AWAY = '#38BDF8';
const groups = [
  ['contribution_impact', 'Katkı ve Etki', 'Contribution & Impact'],
  ['shooting', 'Şut', 'Shooting'], ['passing', 'Pas', 'Passing'],
  ['set_pieces', 'Duran Toplar', 'Set Pieces'], ['defending', 'Savunma', 'Defending'],
  ['expected', 'Gelişmiş Metrikler', 'Advanced Metrics'], ['errors_discipline', 'Hatalar ve Disiplin', 'Errors & Discipline'],
] as const;
type Period = 'overall' | 'first_half' | 'second_half';
function metrics(team: MatchReportTeam | undefined, section: string): MatchReportMetric[] {
  return section === 'expected' ? (team?.expected_metrics || []).filter(metric => metric.name !== 'Expected Goals Against (xGA)') : team?.categories?.[section] || [];
}
function numeric(value: unknown) {
  return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
}
function format(value: unknown) {
  const number = numeric(value);
  return value == null || value === '' ? '—' : number == null ? String(value) : Number.isInteger(number) ? String(number) : number.toFixed(2);
}
function TeamHeading({ team, away }: { team?: MatchReportTeam; away?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <View style={s.teamHeading}>
    {team?.image_url && !failed ? <Image source={{ uri: team.image_url }} resizeMode="contain" style={s.logo} onError={() => setFailed(true)} /> : <Shield size={25} color={away ? AWAY : ACCENT} />}
    <Text style={[s.teamName, { color: away ? AWAY : ACCENT }]}>{team?.name || '—'}</Text>
  </View>;
}
export default function MatchReportTeamComparison({ data, tr, preMatch = false }: { data: PostMatchCardData; tr: boolean; preMatch?: boolean }) {
  const [period, setPeriod] = useState<Period>('overall');
  const [section, setSection] = useState('contribution_impact');
  const [pickerOpen, setPickerOpen] = useState(false);
  const scoped = period === 'overall' ? data.teams : data.period_teams?.[period] || [];
  const available = groups.filter(([key]) => (!preMatch || key !== 'set_pieces') && (key !== 'expected' || period === 'overall') && scoped.some(team => metrics(team, key).length));
  const active = available.find(([key]) => key === section) || available[0];
  const key = active?.[0] || '';
  const home = data.teams.find(team => team.location === 'home') || data.teams[0];
  const away = data.teams.find(team => team.location === 'away') || data.teams[1];
  const left = metrics(scoped.find(team => team.id === home?.id), key);
  const right = metrics(scoped.find(team => team.id === away?.id), key);
  const preferred = key === 'expected' ? expectedMetricOrder : teamMetricOrder[key] || [];
  const rank = (name: string) => { const index = preferred.indexOf(name); return index < 0 ? preferred.length : index; };
  const names = [...new Set(scoped.flatMap(team => metrics(team, key).map(metric => metric.name)))].sort((a, b) => rank(a) - rank(b));
  const periods: [Period, string][] = [['overall', tr ? 'Genel' : 'Overall'], ['first_half', tr ? '1. Yarı' : '1st Half'], ['second_half', tr ? '2. Yarı' : '2nd Half']];
  return <View style={s.page}>
    <View style={s.controls}>
      <View style={s.rule} />
      {!preMatch && <View style={s.switch}>{periods.map(([value, label]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: period === value }} onPress={() => { setPeriod(value); setPickerOpen(false); }} style={[s.option, period === value && s.selected]}><Text style={[s.optionText, period === value && { color: ACCENT }]}>{label}</Text></Pressable>)}</View>}
      <Text style={s.controlLabel}>{tr ? 'Analiz Bölümü' : 'Analysis Section'}</Text>
      <Pressable disabled={!available.length} accessibilityRole="button" accessibilityLabel={tr ? 'Analiz bölümünü seç' : 'Select analysis section'} accessibilityState={{ expanded: pickerOpen, disabled: !available.length }} onPress={() => setPickerOpen(!pickerOpen)} style={s.selector}><Text style={s.selectorText}>{active ? active[tr ? 1 : 2] : tr ? 'Veri bulunmuyor' : 'No data available'}</Text><ChevronDown size={18} color={ACCENT} style={pickerOpen ? { transform: [{ rotate: '180deg' }] } : undefined} /></Pressable>
      {pickerOpen && <View style={s.options}>{available.map(([value, turkish, english]) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: key === value }} onPress={() => { setSection(value); setPickerOpen(false); }} style={[s.choice, key === value && { backgroundColor: `${ACCENT}15` }]}><Text style={[s.choiceText, key === value && { color: ACCENT }]}>{tr ? turkish : english}</Text>{key === value && <Check size={16} color={ACCENT} />}</Pressable>)}</View>}
    </View>
    <View style={s.table}>
      <View style={s.tableHeader}><TeamHeading team={home} /><Text style={s.metricHeading}>{tr ? 'Metrik' : 'Metric'}</Text><TeamHeading team={away} away /></View>
      {names.map(name => {
        const lv = left.find(metric => metric.name === name)?.value;
        const rv = right.find(metric => metric.name === name)?.value;
        const ln = numeric(lv), rn = numeric(rv);
        const comparable = ln != null && rn != null && ln !== rn;
        const leftWins = comparable && (key === 'errors_discipline' ? ln! < rn! : ln! > rn!);
        const rightWins = comparable && !leftWins;
        return <View key={name} style={s.row}>
          <View style={[s.value, leftWins && { backgroundColor: `${ACCENT}22`, borderColor: `${ACCENT}70` }]}><Text style={[s.valueText, leftWins && { color: ACCENT }]}>{format(lv)}</Text></View>
          <Text style={s.metric}>{matchMetricLabel(name, tr ? 'tr' : 'en')}</Text>
          <View style={[s.value, rightWins && { backgroundColor: `${AWAY}22`, borderColor: `${AWAY}70` }]}><Text style={[s.valueText, rightWins && { color: AWAY }]}>{format(rv)}</Text></View>
        </View>;
      })}
      {!names.length && <Text style={s.empty}>{tr ? period === 'overall' ? 'Bu bölüm için takım istatistiği bulunmuyor.' : 'Bu yarı için takım istatistiği bulunmuyor.' : 'No team statistics are available for this period.'}</Text>}
    </View>
  </View>;
}
const s = StyleSheet.create({
  page: { gap: 14 }, controls: { borderWidth: 1, borderColor: `${ACCENT}70`, borderRadius: 18, padding: 13, gap: 12 }, rule: { height: 3, backgroundColor: ACCENT, borderRadius: 3 },
  switch: { flexDirection: 'row', borderWidth: 1, borderColor: LINE, borderRadius: 14, padding: 4, gap: 3, backgroundColor: 'rgba(0,0,0,.16)' }, option: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' }, selected: { borderColor: `${ACCENT}60`, backgroundColor: `${ACCENT}20` }, optionText: { color: MUTED, fontSize: 12, fontWeight: '800' },
  controlLabel: { color: MUTED, fontSize: 11, fontWeight: '700' }, selector: { borderWidth: 1, borderColor: ACCENT, borderRadius: 13, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8 }, selectorText: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '700' }, options: { borderWidth: 1, borderColor: LINE, borderRadius: 12, overflow: 'hidden' }, choice: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13 }, choiceText: { flex: 1, fontSize: 13, color: TEXT, fontWeight: '600' },
  table: { borderWidth: 1, borderColor: `${ACCENT}50`, borderRadius: 18, padding: 10, backgroundColor: 'rgba(255,255,255,.015)' }, tableHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: LINE, paddingBottom: 13, marginBottom: 2, gap: 4 }, teamHeading: { flex: 1, alignItems: 'center', gap: 7 }, logo: { width: 36, height: 40 }, teamName: { fontSize: 11, fontWeight: '800', textAlign: 'center' }, metricHeading: { flex: 1.7, color: MUTED, fontSize: 10, textAlign: 'center', fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 10 }, value: { flex: 1, paddingVertical: 10, paddingHorizontal: 2, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' }, valueText: { color: TEXT, fontSize: 13, fontWeight: '800', textAlign: 'center' }, metric: { flex: 1.7, color: TEXT, fontSize: 11, lineHeight: 17, fontWeight: '700', textAlign: 'center', paddingHorizontal: 3 }, empty: { color: MUTED, fontSize: 13, lineHeight: 20, textAlign: 'center', paddingVertical: 32 },
});
