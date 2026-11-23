import type { MatchTeamAnalysis, PostMatchCardData } from '@/services/matchPool';
import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import { matchMetricLabel } from '@/utils/matchReportMetrics';
import { teamFindingMetricLabel } from '@/utils/teamStyleMetricLabels';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MatchReportSelector } from './MatchReportPlayerAnalysis';

export default function MatchReportTeamAnalysis({data, tr, analysis}: {
  data: PostMatchCardData;
  tr: boolean;
  analysis?: MatchTeamAnalysis;
}) {
  const {ACCENT, s, themeColor} = useThemedStyles(getModuleTheme);
  const [selectedId, setSelectedId] = useState<number>();
  const teams = [...data.teams].sort((a, b) => Number(a.location !== 'home') - Number(b.location !== 'home'));
  const team = teams.find(item => item.id === selectedId) ?? teams[0];
  const awayAccent = themeColor('#38BDF8', 'text');
  const teamColor = (location: string) => location === 'away' ? awayAccent : ACCENT;
  const locale = tr ? 'tr' : 'en';
  const format = new Intl.NumberFormat(locale, {maximumFractionDigits: 2});
  const findings = (analysis?.teams[String(team?.id)] ?? [])
    .filter(finding => Array.isArray(finding.metrics))
    .sort((a, b) => Number(a.side === 'weakness') - Number(b.side === 'weakness'));

  return <View style={s.page}>
    <View style={[s.panel, {borderColor: teamColor(team?.location || 'home') + '80'}]}>
      <MatchReportSelector label={tr ? 'Takım Seçimi' : 'Select Team'} value={team?.name || '—'}
        imageUrl={team?.image_url} options={teams.map(item => ({
          id: item.id, name: item.name, color: teamColor(item.location),
          detail: item.location === 'away' ? (tr ? 'Deplasman' : 'Away') : (tr ? 'Ev Sahibi' : 'Home'),
        }))} onSelect={setSelectedId} accent={teamColor(team?.location || 'home')} tr={tr}/>
    </View>
    {findings.map(finding => {
      const color = finding.side === 'weakness' ? themeColor('#FB7185', 'text') : ACCENT;
      return <View key={finding.id} style={[s.card, {borderColor: color + '80', backgroundColor: color + '08'}]}>
        <View style={[s.heading, {backgroundColor: color + '0B'}]}>
          <Text accessibilityRole="header" style={[s.title, {color}]}>{finding.title}</Text>
          <Text style={s.description}>{finding.description}</Text>
        </View>
        <View style={s.values}>
          <Text accessibilityRole="header" style={s.valuesTitle}>{tr ? 'Bu Maçın Değerleri' : 'This Match’s Values'}</Text>
          <View style={[s.table, {borderColor: color + '45'}]}>
            <View style={[s.row, {backgroundColor: color + '0D'}]}>
              <Text style={[s.metric, s.columnHeading]}>{tr ? 'Metrik' : 'Metric'}</Text>
              {teams.map(side => <Text key={side.id} style={[s.value, s.columnHeading, {color: teamColor(side.location)}]}>
                {side.name}
              </Text>)}
            </View>
            {finding.metrics.map(metric => {
              const name = metric.metric_name;
              const suffix = /%|percentage/i.test(name) ? '%' : '';
              return <View key={name} style={[s.row, s.metricRow]}>
                <Text style={[s.metric, s.metricName]}>{teamFindingMetricLabel(name, tr) ?? matchMetricLabel(name, locale)}</Text>
                {teams.map(side => <Text key={side.id} style={[s.value, {color: teamColor(side.location)}]}>
                  {format.format(side.id === team?.id ? metric.team.value : metric.opponent.value)}{suffix}
                </Text>)}
              </View>;
            })}
          </View>
        </View>
      </View>;
    })}
    {!findings.length && <View style={s.panel}>
      <Text style={s.description}>{tr ? 'Bu maç için yeterli karşılaştırma verisi bulunmuyor.' : 'This match has insufficient comparison data.'}</Text>
    </View>}
  </View>;
}

const getModuleTheme = createThemedStyles(({ACCENT, LINE, MUTED, TEXT, themeColor}: ThemeColors) => {
  const s = StyleSheet.create({
    page: {gap: 13},
    panel: {padding: 14, borderWidth: 1, borderColor: LINE, borderRadius: 18},
    card: {borderWidth: 1, borderRadius: 18, overflow: 'hidden'},
    heading: {padding: 14, gap: 5},
    title: {fontSize: 17, fontWeight: '800'},
    description: {color: MUTED, fontSize: 13, lineHeight: 20},
    values: {padding: 12, gap: 8},
    valuesTitle: {color: TEXT, fontSize: 13, fontWeight: '800'},
    table: {borderWidth: 1, borderColor: LINE, borderRadius: 12, overflow: 'hidden'},
    row: {flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, gap: 8},
    metricRow: {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: LINE},
    metric: {flex: 1.5, minWidth: 0},
    metricName: {color: TEXT, fontSize: 12, fontWeight: '600'},
    value: {flex: 1, minWidth: 0, textAlign: 'right', fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums']},
    columnHeading: {color: MUTED, fontSize: 11, fontWeight: '700'},
  });
  return {ACCENT, s, themeColor};
});
