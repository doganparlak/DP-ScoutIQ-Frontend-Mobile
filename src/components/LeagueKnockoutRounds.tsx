import React from 'react';
import {Pressable, Text, View} from 'react-native';
import type {KnockoutMatch, KnockoutRound} from '@/services/leaguePerformance';
import {createThemedStyles, useThemedStyles, type ThemeColors} from '@/theme';
import {getThemed_styles, Badge, Status} from './LeaguePerformanceControls';

const ROUND_NAMES: Record<string, string> = {'1st qualifying round': '1. Ön Eleme Turu', '2nd qualifying round': '2. Ön Eleme Turu', '3rd qualifying round': '3. Ön Eleme Turu', 'first qualifying round': '1. Ön Eleme Turu', 'second qualifying round': '2. Ön Eleme Turu', 'third qualifying round': '3. Ön Eleme Turu', 'preliminary round': 'Ön Tur', 'play-offs': 'Play-off Turu', 'round of 16': 'Son 16', '8th finals': 'Son 16', 'quarter-finals': 'Çeyrek Final', 'quarter finals': 'Çeyrek Final', 'semi-finals': 'Yarı Final', 'semi finals': 'Yarı Final', 'final': 'Final', 'knockout round play-offs': 'Eleme Play-off Turu', 'knockout phase play-offs': 'Eleme Play-off Turu'};
const FINISHED = [5, 7, 8];
function ties(matches: KnockoutMatch[]) {
  const grouped = new Map<string, KnockoutMatch[]>();
  matches.forEach(match => {
    const key = match.aggregateId ? `tie:${match.aggregateId}` : `match:${match.id}`;
    grouped.set(key, [...(grouped.get(key) || []), match]);
  });
  return [...grouped.values()];
}
export default function LeagueKnockoutRounds({rounds, tr, qualifying = false}: {rounds: KnockoutRound[]; tr: boolean; qualifying?: boolean}) {
  const {shared, LINE, CARD, TEXT, ACCENT} = useThemedStyles(theme);
  const [expanded, setExpanded] = React.useState(!qualifying);
  if (!rounds.length) return <Status text={qualifying ? (tr ? 'Ön eleme eşleşmeleri henüz açıklanmadı.' : 'Qualifying fixtures have not been announced yet.') : (tr ? 'Eleme eşleşmeleri henüz açıklanmadı.' : 'Knockout fixtures have not been announced yet.')} />;
  return <View style={{gap: 16}}>
    {qualifying && <Pressable accessibilityRole="button" accessibilityState={{expanded}} onPress={() => setExpanded(value => !value)} style={{borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 12, backgroundColor: CARD, flexDirection: 'row', alignItems: 'center', gap: 8}}><Text style={[shared.text, {flex: 1, fontWeight: '700'}]}>{tr ? 'Ön Eleme Eşleşmeleri' : 'Qualifying Fixtures'} · {rounds.reduce((count, round) => count + round.matches.length, 0)} {tr ? 'maç' : 'matches'}</Text><Text style={{color: ACCENT, fontWeight: '700'}}>{expanded ? (tr ? 'Gizle' : 'Hide') : (tr ? 'Göster' : 'Show')}</Text></Pressable>}
    {expanded && rounds.map(round => <View key={round.id} style={{gap: 10}}>
    <Text style={[shared.text, {fontWeight: '800'}]}>{tr ? ROUND_NAMES[round.label.toLowerCase()] || round.label : round.label}</Text>
    {ties(round.matches).map(matches => {
      const first = matches[0];
      const complete = first.home.id != null && first.away.id != null && matches.length === 2 && matches.every(m => FINISHED.includes(m.stateId) && m.homeScore != null && m.awayScore != null && !m.placeholder);
      const scoreFor = (id: number | null) => matches.reduce((sum, m) => sum + (m.home.id === id ? m.homeScore || 0 : m.awayScore || 0), 0);
      return <View key={first.id} style={{borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 12, backgroundColor: CARD, gap: 12}}>
        {matches.map(match => <View key={match.id} style={{gap: 6}}>
          <Text style={shared.hint}>{match.startingAt ? new Date(match.startingAt.replace(' ', 'T') + (/(?:Z|[+-]\d{2}:?\d{2})$/.test(match.startingAt) ? '' : 'Z')).toLocaleString(tr ? 'tr-TR' : 'en-GB') : (tr ? 'Tarih bekleniyor' : 'Date to be confirmed')}{match.leg && match.leg !== '1/1' ? ` · ${match.leg}` : ''}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <View style={{flex: 1, alignItems: 'center', gap: 5}}><Badge url={match.home.imageUrl} size={24} /><Text style={[shared.text, {textAlign: 'center'}]}>{match.home.name || (tr ? 'Takım bekleniyor' : 'Team to be confirmed')}</Text></View>
            <Text style={{color: TEXT, fontWeight: '800'}}>{match.homeScore ?? '—'} – {match.awayScore ?? '—'}</Text>
            <View style={{flex: 1, alignItems: 'center', gap: 5}}><Badge url={match.away.imageUrl} size={24} /><Text style={[shared.text, {textAlign: 'center'}]}>{match.away.name || (tr ? 'Takım bekleniyor' : 'Team to be confirmed')}</Text></View>
          </View>
          {match.homePenalties != null && match.awayPenalties != null && <Text style={shared.hint}>{tr ? 'Penaltılar' : 'Penalties'}: {match.homePenalties} – {match.awayPenalties}</Text>}
        </View>)}
        {complete && <Text style={{color: ACCENT, fontWeight: '800', textAlign: 'center'}}>{tr ? 'Toplam' : 'Aggregate'}: {first.home.name} {scoreFor(first.home.id)} – {scoreFor(first.away.id)} {first.away.name}</Text>}
      </View>;
    })}
  </View>)}</View>;
}
const theme = createThemedStyles((colors: ThemeColors) => ({shared: getThemed_styles(colors), LINE: colors.LINE, CARD: colors.CARD, TEXT: colors.TEXT, ACCENT: colors.ACCENT}));
