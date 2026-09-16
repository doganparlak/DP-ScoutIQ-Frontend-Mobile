import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ArrowRightLeft, CircleDot, Shield } from 'lucide-react-native';
import type { PostMatchCardData, MatchReportEvent } from '@/services/matchPool';
import { ACCENT, LINE, MUTED, TEXT } from '@/theme';
const AWAY = '#38BDF8';
function eventAppearance(event: MatchReportEvent, tr: boolean) {
  const type = (event.type || '').toLowerCase();
  if (Number(event.type_id) === 18 || type.includes('substitution')) return { label: tr ? 'Oyuncu Değişikliği' : 'Substitution', color: '#CBD5E1', kind: 'sub' };
  if (type.includes('yellow')) return { label: tr ? 'Sarı Kart' : event.type!, color: '#FACC15', kind: 'card' };
  if (type.includes('red')) return { label: tr ? 'Kırmızı Kart' : event.type!, color: '#F87171', kind: 'card' };
  if (type.includes('goal')) return { label: tr ? 'Gol' : event.type!, color: '#F59E0B', kind: 'goal' };
  if (type.includes('penalty')) return { label: tr ? 'Penaltı' : event.type!, color: '#F59E0B', kind: 'goal' };
  return { label: type.includes('var') ? 'VAR' : event.type || (tr ? 'Maç Olayı' : 'Event'), color: '#CBD5E1', kind: 'other' };
}
function Team({ team }: { team?: PostMatchCardData['teams'][number] }) {
  const [failed, setFailed] = useState(false);
  const accent = team?.location === 'away' ? AWAY : ACCENT;
  return <View style={s.team}>
    {team?.image_url && !failed ? <Image source={{ uri: team.image_url }} style={s.logo} resizeMode="contain" onError={() => setFailed(true)} /> : <Shield size={38} color={accent} />}
    <Text style={s.teamName}>{team?.name || '—'}</Text>
    <Text style={[s.formation, { color: accent, borderColor: `${accent}60` }]}>{team?.formation || '—'}</Text>
  </View>;
}
function finite(value: number | string | null | undefined) {
  return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
}
export default function MatchReportTimeline({ data, tr }: { data: PostMatchCardData; tr: boolean }) {
  const home = data.teams.find(team => team.location === 'home') || data.teams[0];
  const away = data.teams.find(team => team.location === 'away') || data.teams[1];
  const goals = (id?: number) => data.scores.find(score => score.description === 'CURRENT' && Number(score.participant_id) === id)?.score?.goals ?? '—';
  const events = [...(data.events || [])].sort((a, b) => Number(a.minute) - Number(b.minute) || Number(a.id) - Number(b.id));
  const hp = finite(home?.possession), ap = finite(away?.possession);
  const total = (hp || 0) + (ap || 0);
  const share = total > 0 ? Math.max(0, Math.min(100, (hp || 0) / total * 100)) : 50;
  const status = data.state?.name || data.state?.short_name || '—';
  const statusText = tr && /full time|finished|^ft$/i.test(status) ? 'Tamamlandı' : status;
  return <View style={s.page}>
    <View style={s.hero}>
      <Team team={home} />
      <View style={s.scoreColumn}><Text style={s.caption}>{tr ? 'MAÇ AKIŞI' : 'TIMELINE'}</Text><View style={s.scoreBox}><Text adjustsFontSizeToFit numberOfLines={1} style={s.score}>{goals(home?.id)} – {goals(away?.id)}</Text></View><Text style={s.status}>{statusText}</Text></View>
      <Team team={away} />
    </View>
    <View style={s.possession}>
      <View style={s.possessionHeading}><Text style={[s.percent, { color: ACCENT }]}>{hp == null ? '—' : `${hp}%`}</Text><Text style={s.possessionTitle}>{tr ? 'Topa Sahip Olma' : 'Ball Possession'}</Text><Text style={[s.percent, { color: AWAY }]}>{ap == null ? '—' : `${ap}%`}</Text></View>
      <View style={s.bar}><View style={{ width: `${share}%`, backgroundColor: ACCENT }} /><View style={{ flex: 1, backgroundColor: AWAY }} /></View>
    </View>
    <View style={s.timeline}>
      {!events.length && <Text style={s.empty}>{tr ? 'Maç olayı bulunamadı.' : 'No match events available.'}</Text>}
      {events.map((event, index) => {
        const homeEvent = Number(event.team_id) === home?.id;
        const accent = homeEvent ? ACCENT : Number(event.team_id) === away?.id ? AWAY : MUTED;
        const appearance = eventAppearance(event, tr);
        return <View key={`${event.id || index}`} style={s.eventRow}>
          <View style={s.minuteColumn}><View style={s.spine} /><View style={[s.minuteBadge, { borderColor: `${accent}90` }]}><Text style={[s.minute, { color: accent }]}>{event.minute ?? '—'}{Number(event.extra_minute) > 0 ? `+${event.extra_minute}` : ''}′</Text></View></View>
          <View style={[s.event, { borderColor: `${accent}80`, backgroundColor: `${accent}0D` }]}>
            <View style={s.eventHeading}>
              <View style={[s.icon, { borderColor: `${appearance.color}60` }]}>
                {appearance.kind === 'card' ? <View style={[s.cardIcon, { backgroundColor: appearance.color }]} /> : appearance.kind === 'sub' ? <ArrowRightLeft size={16} color={appearance.color} /> : appearance.kind === 'goal' ? <Text style={{ fontSize: 16 }}>⚽</Text> : <CircleDot size={15} color={appearance.color} />}
              </View>
              <Text style={[s.eventLabel, { color: appearance.color }]}>{appearance.label}</Text>
              {!!event.result && <Text style={s.result}>{event.result}</Text>}
            </View>
            <Text style={s.player}>{event.player_name || event.team_name || '—'}</Text>
            {!!event.related_player_name && <Text style={s.related}><Text style={s.relatedLabel}>{appearance.kind === 'sub' ? tr ? 'Çıkan: ' : 'Out: ' : tr ? 'Asist: ' : 'Assist: '}</Text>{event.related_player_name}</Text>}
            <Text style={[s.teamLabel, { color: accent }]}>{event.team_name || (homeEvent ? home?.name : Number(event.team_id) === away?.id ? away?.name : '')}</Text>
          </View>
        </View>;
      })}
    </View>
  </View>;
}
const s = StyleSheet.create({
  page: { gap: 14 }, hero: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: `${ACCENT}70`, borderRadius: 20, padding: 14, backgroundColor: 'rgba(22,163,74,.05)' },
  team: { flex: 1, alignItems: 'center', gap: 8 }, logo: { width: 55, height: 60 }, teamName: { color: TEXT, fontSize: 12, fontWeight: '800', textAlign: 'center' }, formation: { fontSize: 11, fontWeight: '800', borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 9 },
  scoreColumn: { width: '28%', alignItems: 'center', gap: 9 }, caption: { color: MUTED, fontSize: 8, fontWeight: '800', letterSpacing: 1 }, scoreBox: { width: '100%', borderWidth: 1, borderColor: LINE, borderRadius: 13, paddingVertical: 11, paddingHorizontal: 4, backgroundColor: 'rgba(0,0,0,.3)' }, score: { color: TEXT, fontWeight: '900', fontSize: 25, textAlign: 'center' }, status: { color: TEXT, fontSize: 9, textAlign: 'center', fontWeight: '700' },
  possession: { borderWidth: 1, borderColor: LINE, borderRadius: 15, padding: 12, gap: 10 }, possessionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, percent: { fontSize: 16, fontWeight: '800' }, possessionTitle: { flex: 1, textAlign: 'center', color: MUTED, fontSize: 10, fontWeight: '800' }, bar: { height: 9, flexDirection: 'row', borderRadius: 8, overflow: 'hidden' },
  timeline: { borderWidth: 1, borderColor: LINE, borderRadius: 18, padding: 10, gap: 0 }, eventRow: { flexDirection: 'row', gap: 9 }, minuteColumn: { width: 45, alignItems: 'center' }, spine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: LINE }, minuteBadge: { marginTop: 12, borderWidth: 1, borderRadius: 12, backgroundColor: '#14201A', paddingVertical: 9, paddingHorizontal: 3, width: '100%' }, minute: { textAlign: 'center', fontSize: 11, fontWeight: '800' },
  event: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 11, marginVertical: 5, gap: 7 }, eventHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }, icon: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 8 }, eventLabel: { flex: 1, fontSize: 11, fontWeight: '800' }, cardIcon: { width: 10, height: 15, borderRadius: 2 }, result: { color: TEXT, fontSize: 11, fontWeight: '800', padding: 5, backgroundColor: 'rgba(0,0,0,.2)', borderRadius: 7 }, player: { color: TEXT, fontSize: 13, fontWeight: '800', lineHeight: 19 }, related: { color: MUTED, fontSize: 11, lineHeight: 17 }, relatedLabel: { fontWeight: '700', color: TEXT }, teamLabel: { fontSize: 10, fontWeight: '600' }, empty: { color: MUTED, paddingVertical: 35, textAlign: 'center', fontSize: 13 },
});
