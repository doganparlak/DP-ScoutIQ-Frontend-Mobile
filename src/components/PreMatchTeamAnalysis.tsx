import type { PostMatchCardData } from '@/services/matchPool';
import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import { compactSavedExplanation } from '@/utils/compactSavedExplanation';
import { formatNarrativeNumbers } from '@/utils/narrativeNumbers';
import { ShieldAlert, ShieldCheck, Target } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ActionSpinner from './ActionSpinner';
import { MatchReportSelector } from './MatchReportPlayerAnalysis';
import { usePreMatchSection } from './PreMatchReportContext';
import TeamReportLockedDetail from './TeamReportLockedDetail';

type Props = {
  data: PostMatchCardData;
  tr: boolean;
  free: boolean;
  onOpenPlans: () => void;
};

export default function PreMatchTeamAnalysis({data, tr, free, onOpenPlans}: Props) {
  const {ACCENT, s, themeColor} = useThemedStyles(getModuleTheme);
  const {result, error, loading, onRetry} = usePreMatchSection('team_analysis');
  const [teamId, setTeamId] = useState<number>();
  const [width, setWidth] = useState(0);
  const teams = [...data.teams].sort((a, b) => Number(a.location !== 'home') - Number(b.location !== 'home'));
  const team = teams.find(candidate => candidate.id === teamId) ?? teams[0];
  const awayAccent = themeColor('#38BDF8', 'text');
  const accent = team?.location === 'away' ? awayAccent : ACCENT;
  const analysis = result?.teams[String(team?.id)];
  const strategy = analysis?.strategy && !result?.compact_strategy
    ? compactSavedExplanation(analysis.strategy)
    : analysis?.strategy;
  const riskColor = themeColor('#F87171', 'text');
  const planColor = themeColor('#FCD34D', 'text');
  const sections = [
    {key: 'strength' as const, title: tr ? 'Güçlü Yönler' : 'Strengths', color: ACCENT, Icon: ShieldCheck},
    {key: 'weakness' as const, title: tr ? 'Zayıf Yönler & Riskler' : 'Weaknesses & Risks', color: riskColor, Icon: ShieldAlert},
  ];
  const wide = width >= 580;

  return <View style={s.page} onLayout={event => setWidth(Math.round(event.nativeEvent.layout.width))}>
    <View style={[s.selectorPanel, {borderColor: accent + '80'}]}>
      <MatchReportSelector
        label={tr ? 'Takım Seçimi' : 'Select Team'}
        value={team?.name || '—'}
        imageUrl={team?.image_url}
        options={teams.map(option => ({
          id: option.id,
          name: option.name,
          detail: option.location === 'away' ? (tr ? 'Deplasman' : 'Away') : (tr ? 'Ev Sahibi' : 'Home'),
          color: option.location === 'away' ? awayAccent : ACCENT,
        }))}
        onSelect={setTeamId} accent={accent} tr={tr}
      />
    </View>

    {loading ? <View style={s.feedback}>
      <ActionSpinner size={25} color={accent}/>
      <Text style={s.body}>{tr ? 'Takım analizi hazırlanıyor…' : 'Preparing team analysis…'}</Text>
    </View> : error ? <View style={s.feedback}>
      <Text style={s.body}>{tr ? 'Takım analizi yüklenemedi.' : 'Unable to load team analysis.'}</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={s.retry}>
        <Text style={{color: accent}}>{tr ? 'Tekrar Dene' : 'Try Again'}</Text>
      </Pressable>
    </View> : <>
      <View style={[s.findingsLayout, wide && s.columns]}>
        {sections.map(({key, title, color, Icon}) => {
          const findings = analysis?.findings?.[key]?.slice(0, 2) ?? [];
          return <View key={key} style={wide && s.column}>
            {key === 'weakness' && free
              ? <TeamReportLockedDetail tr={tr} accent={color} kind="teamRisks" onOpenPlans={onOpenPlans}/>
              : <View style={[s.section, {borderColor: color + '80', backgroundColor: color + '08'}]}>
                <View style={[s.sectionHeader, {backgroundColor: color + '0B'}]}>
                  <Icon size={19} color={color}/>
                  <Text accessibilityRole="header" style={[s.sectionTitle, {color}]}>{title}</Text>
                </View>
                <View style={s.findingList}>
                  {findings.length ? findings.map(finding => <View key={finding.id} style={[s.finding, {borderColor: color + '45'}]}>
                    <View style={[s.dot, {backgroundColor: color}]}/>
                    <View style={s.findingText}>
                      <Text style={s.findingTitle}>{finding.title}</Text>
                      <Text style={s.body}>{finding.description}</Text>
                    </View>
                  </View>) : <Text style={s.body}>
                    {tr ? 'Bu bölüm için yeterli maç verisi bulunamadı.' : 'There is not enough match data for this section.'}
                  </Text>}
                </View>
              </View>}
          </View>;
        })}
      </View>
      <View style={[s.section, {borderColor: planColor + '80', backgroundColor: planColor + '08'}]}>
        <View style={[s.sectionHeader, {backgroundColor: planColor + '0B'}]}>
          <Target size={19} color={planColor}/>
          <Text accessibilityRole="header" style={[s.sectionTitle, {color: planColor}]}>
            {tr ? 'Rakibe Karşı Plan' : 'Plan Against the Opponent'}
          </Text>
        </View>
        <View style={s.findingList}>
          <View style={[s.finding, {borderColor: planColor + '45'}]}>
            <View style={[s.dot, {backgroundColor: planColor}]}/>
            <Text style={[s.findingText, s.body]}>
              {formatNarrativeNumbers(strategy || '—', tr ? 'tr' : 'en')}
            </Text>
          </View>
        </View>
      </View>
    </>}
  </View>;
}

const getModuleTheme = createThemedStyles(({ACCENT, LINE, MUTED, TEXT, themeColor}: ThemeColors) => {
  const s = StyleSheet.create({
    page: {gap: 14},
    selectorPanel: {padding: 14, borderWidth: 1, borderRadius: 18},
    findingsLayout: {gap: 12},
    columns: {flexDirection: 'row'},
    column: {flex: 1, minWidth: 0},
    section: {flex: 1, borderRadius: 18, borderWidth: 1, overflow: 'hidden'},
    sectionHeader: {flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 12, paddingHorizontal: 14},
    sectionTitle: {flex: 1, fontSize: 15, fontWeight: '800'},
    findingList: {padding: 10, gap: 8},
    finding: {flexDirection: 'row', gap: 10, padding: 11, borderRadius: 12, borderWidth: 1},
    dot: {width: 6, height: 6, borderRadius: 3, marginTop: 7},
    findingText: {flex: 1, minWidth: 0, gap: 4},
    findingTitle: {color: TEXT, fontSize: 14, fontWeight: '800'},
    body: {color: MUTED, fontSize: 13, lineHeight: 19},
    feedback: {paddingVertical: 40, alignItems: 'center', gap: 14},
    retry: {borderWidth: 1, borderColor: LINE, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9},
  });
  return {ACCENT, s, themeColor};
});
