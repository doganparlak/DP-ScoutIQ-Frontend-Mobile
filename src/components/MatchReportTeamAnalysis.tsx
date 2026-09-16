import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, Shield } from 'lucide-react-native';
import { ACCENT, LINE, MUTED, TEXT } from '@/theme';
import { type MatchTeamAnalysis, type PostMatchCardData } from '@/services/matchPool';
import ActionSpinner from './ActionSpinner';
import TeamReportLockedDetail from './TeamReportLockedDetail';

export default function MatchReportTeamAnalysis({ data, tr, analysis, loading, error, onRetry, free, onOpenPlans }: { data: PostMatchCardData; tr: boolean; analysis?: MatchTeamAnalysis; loading: boolean; error: boolean; onRetry: () => void; free: boolean; onOpenPlans: () => void }) {
  const teams = [...data.teams].sort((a, b) => Number(a.location !== 'home') - Number(b.location !== 'home'));
  const [selectedId, setSelectedId] = useState<number>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const team = teams.find(item => item.id === selectedId) || teams[0];
  const accent = team?.location === 'away' ? '#38BDF8' : ACCENT;
  const order = { positive: 0, neutral: 1, negative: 2 };
  const insights = [...(analysis?.teams[String(team?.id)] || [])].sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 3);
  return <View style={s.page}>
    <View style={[s.controls, { borderColor: `${accent}70` }]}>
      <View style={[s.rule, { backgroundColor: accent }]} />
      <Text style={s.caption}>{tr ? 'Takım Seçimi' : 'Select Team'}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: pickerOpen }} onPress={() => setPickerOpen(!pickerOpen)} style={[s.selector, { borderColor: accent }]}>
        <Text style={s.selectorName}>{team?.name || '—'}</Text><ChevronDown size={18} color={accent} style={pickerOpen ? { transform: [{ rotate: '180deg' }] } : undefined} />
      </Pressable>
      {pickerOpen && <View style={s.choices}>{teams.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ selected: item.id === team?.id }} onPress={() => { setSelectedId(item.id); setPickerOpen(false); }} style={[s.choice, item.id === team?.id && { backgroundColor: `${accent}15` }]}>
        <Text style={s.choiceName}>{item.name}</Text><Text style={[s.location, { color: item.location === 'home' ? ACCENT : '#38BDF8' }]}>{item.location === 'home' ? tr ? 'Ev Sahibi' : 'Home' : tr ? 'Deplasman' : 'Away'}</Text>
      </Pressable>)}</View>}
    </View>
    <View style={[s.hero, { borderColor: `${accent}60`, backgroundColor: `${accent}0C` }]}>
      {team?.image_url && failedLogo !== team.image_url ? <Image source={{ uri: team.image_url }} style={s.logo} resizeMode="contain" onError={() => setFailedLogo(team.image_url || '')} /> : <Shield size={35} color={accent} />}
      <View style={s.identity}><Text style={[s.eyebrow, { color: accent }]}>ScoutWise · {tr ? 'Takım Analizi' : 'Team Analysis'}</Text><Text style={s.teamName}>{team?.name || '—'}</Text><Text style={s.caption}>{team?.formation || '—'} · {tr ? '3 analiz başlığı' : '3 analysis points'}</Text></View>
    </View>
    {loading ? <View style={s.feedback}><ActionSpinner size={25} color={accent} /><Text style={s.feedbackText}>{tr ? 'Takım analizi hazırlanıyor…' : 'Preparing team analysis…'}</Text></View>
      : error || (analysis && insights.length !== 3) ? <View style={s.feedback}><Text style={s.feedbackText}>{tr ? 'Takım analizi şu anda yüklenemedi.' : 'Team analysis could not be loaded.'}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={[s.retry, { borderColor: accent }]}><Text style={{ color: accent, fontWeight: '700' }}>{tr ? 'Tekrar Dene' : 'Try Again'}</Text></Pressable></View>
      : insights.map((insight, index) => {
        const color = insight.tone === 'negative' ? '#FB7185' : insight.tone === 'neutral' ? '#94A3B8' : accent;
        if (free && index === 2) return <TeamReportLockedDetail key="locked-third-analysis" tr={tr} accent={color} kind="thirdTeamAnalysis" onOpenPlans={onOpenPlans} />;
        return <View key={`${index}-${insight.header}`} style={[s.insight, { borderColor: `${color}70`, backgroundColor: `${color}09` }]}> 
          <View style={s.insightHeading}><View style={[s.number, { backgroundColor: `${color}18`, borderColor: `${color}50` }]}><Text style={[s.numberText, { color }]}>{String(index + 1).padStart(2, '0')}</Text></View><Text style={[s.insightTitle, { color }]}>{insight.header}</Text></View>
          <Text style={s.explanation}>{insight.text}</Text>
        </View>;
      })}
  </View>;
}
const s = StyleSheet.create({
  page: { gap: 13 }, controls: { padding: 13, borderWidth: 1, borderRadius: 18, gap: 11 }, rule: { height: 3, borderRadius: 3 }, caption: { color: MUTED, fontSize: 11, fontWeight: '600' }, selector: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderRadius: 12, padding: 13 }, selectorName: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '800' }, choices: { borderWidth: 1, borderColor: LINE, borderRadius: 12, overflow: 'hidden' }, choice: { padding: 13, gap: 5 }, choiceName: { color: TEXT, fontSize: 13, fontWeight: '700' }, location: { fontSize: 10, fontWeight: '700' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 18, padding: 15 }, logo: { width: 49, height: 57 }, identity: { flex: 1, gap: 7 }, eyebrow: { fontSize: 10, fontWeight: '700' }, teamName: { color: TEXT, fontSize: 20, fontWeight: '800' },
  insight: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 12 }, insightHeading: { flexDirection: 'row', alignItems: 'center', gap: 11 }, number: { width: 33, height: 33, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, numberText: { fontSize: 12, fontWeight: '800' }, insightTitle: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '800' }, explanation: { color: TEXT, fontSize: 13, lineHeight: 22 },
  feedback: { minHeight: 170, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 18 }, feedbackText: { color: MUTED, textAlign: 'center', fontSize: 13, lineHeight: 21 }, retry: { borderWidth: 1, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 20 },
});
