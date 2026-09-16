import { MatchReportSelector } from './MatchReportPlayerAnalysis';
import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { ArrowDown, ArrowUp, ArrowRightLeft, Shield, Users } from 'lucide-react-native';
import { ACCENT, CARD, LINE, MUTED, TEXT } from '@/theme';
import type { MatchReportLineup, PostMatchCardData } from '@/services/matchPool';
import ReportPlayerPortrait from './ReportPlayerPortrait';

// Same position grouping and shirt-number ordering as enterprise's LineupSection.
export function lineupPositionOrder(player: MatchReportLineup) {
  const value = (player.position_name || '').toLowerCase();
  if (player.position_id === 24 || value.includes('goalkeeper') || value.includes('kaleci')) return 0;
  if (player.position_id === 25 || value.includes('defender') || value.includes('back')) return 1;
  if (player.position_id === 26 || value.includes('midfielder') || value.includes('midfield')) return 2;
  if (player.position_id === 27 || value.includes('attacker') || value.includes('forward')) return 3;
  return 4;
}
function TeamLineup({ team, data, tr }: { team: PostMatchCardData['teams'][number]; data: PostMatchCardData; tr: boolean }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const home = team.location === 'home';
  const accent = home ? ACCENT : '#38BDF8';
  const positions = tr ? ['Kaleci', 'Savunma', 'Orta Saha', 'Hücum', 'Oyuncu'] : ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Player'];
  const lineups = data.lineups || [];
  const starters = lineups.filter(player => player.team_id === team.id && player.starter)
    .sort((a, b) => lineupPositionOrder(a) - lineupPositionOrder(b) || Number(a.jersey_number || 99) - Number(b.jersey_number || 99));
  const substitutions = (data.events || []).filter(event => Number(event.team_id) === team.id &&
    (Number(event.type_id) === 18 || (event.type || '').toLowerCase() === 'substitution'))
    .sort((a, b) => Number(a.minute) - Number(b.minute));
  const playerName = (id: number | null | undefined, name: string | null | undefined) => name || lineups.find(player => player.player_id === id)?.player_name || '—';
  return <View style={[s.card, { borderColor: `${accent}90` }]}>
    <View style={[s.hero, { backgroundColor: `${accent}12` }]}>
      <View style={[s.rule, { backgroundColor: accent }]} />
      <View style={s.teamRow}>
        <View style={[s.logoFrame, { borderColor: `${accent}70` }]}>
          {team.image_url && !logoFailed ? <Image source={{ uri: team.image_url }} style={s.logo} resizeMode="contain" onError={() => setLogoFailed(true)} /> : <Shield size={34} color={accent} />}
        </View>
        <View style={s.teamInfo}>
          <Text style={[s.location, { color: accent }]}>{home ? tr ? 'EV SAHİBİ' : 'HOME' : tr ? 'DEPLASMAN' : 'AWAY'}</Text>
          <Text style={s.teamName}>{team.name}</Text>
          <View style={s.formation}><Text style={s.formationLabel}>{tr ? 'Diziliş' : 'Formation'}</Text><Text style={[s.formationValue, { color: accent }]}>{team.formation || '—'}</Text></View>
        </View>
      </View>
    </View>
    <View style={s.body}>
      <View style={s.sectionHeader}><Users size={16} color={accent} /><Text style={s.sectionTitle}>{tr ? 'Başlangıç Kadrosu' : 'Starting Lineup'}</Text><Text style={[s.count, { color: accent, backgroundColor: `${accent}18` }]}>{starters.length}</Text></View>
      {!starters.length && <Text style={s.empty}>{tr ? 'Kadro verisi bulunmuyor.' : 'No lineup data is available.'}</Text>}
      {positions.map((position, group) => {
        const players = starters.filter(player => lineupPositionOrder(player) === group);
        if (!players.length) return null;
        return <View key={position} style={s.group}>
          <View style={s.groupHeader}><Text style={[s.groupTitle, { color: accent }]}>{position}</Text><View style={[s.groupRule, { backgroundColor: `${accent}35` }]} /></View>
          {players.map((player, index) => <View key={`${player.player_id}-${index}`} style={s.playerRow}>
            <ReportPlayerPortrait imageUrl={player.player_image_url} accent={accent} size={38}/>
            <View style={[s.number, { borderColor: `${accent}70`, backgroundColor: `${accent}12` }]}><Text style={[s.numberText, { color: accent }]}>{player.jersey_number ?? '—'}</Text></View>
            <Text style={s.playerName}>{player.player_name || '—'}</Text>
          </View>)}
        </View>;
      })}
      {substitutions.length > 0 && <View style={s.substitutions}>
        <View style={s.sectionHeader}><ArrowRightLeft size={16} color={accent} /><Text style={s.sectionTitle}>{tr ? 'Oyuncu Değişiklikleri' : 'Substitutions'}</Text><Text style={[s.count, { color: accent, backgroundColor: `${accent}18` }]}>{substitutions.length}</Text></View>
        {substitutions.map((event, index) => <View key={`${event.id || index}`} style={s.substitution}>
          <View style={[s.minute, { borderColor: `${accent}60` }]}><Text style={[s.minuteText, { color: accent }]}>{event.minute ?? '—'}{event.extra_minute ? `+${event.extra_minute}` : ''}′</Text></View>
          <View style={s.changes}>
            {([true, false] as const).map(incoming => {
              const color = incoming ? '#22C55E' : '#F87171';
              const Icon = incoming ? ArrowUp : ArrowDown;
              return <View key={String(incoming)} style={s.change}>
                <Icon size={14} color={color} />
                <View style={s.changeInfo}><Text style={s.changeName}>{incoming ? playerName(event.player_id, event.player_name) : playerName(event.related_player_id, event.related_player_name)}</Text><Text style={[s.direction, { color }]}>{incoming ? tr ? 'Giren' : 'In' : tr ? 'Çıkan' : 'Out'}</Text></View>
              </View>;
            })}
          </View>
        </View>)}
      </View>}
    </View>
  </View>;
}
export default function MatchReportLineups({ data, tr }: { data: PostMatchCardData; tr: boolean }) {
  const [teamId, setTeamId] = useState<number>();
  const teams = [...data.teams].sort((a, b) => Number(a.location !== 'home') - Number(b.location !== 'home'));
  const team = teams.find(t => t.id === teamId) || teams[0];
  return <View style={s.page}><View style={{ padding: 13, gap: 11, borderWidth: 1, borderRadius: 18, borderColor: `${team?.location === 'away' ? '#38BDF8' : ACCENT}70` }}><View style={{ height: 3, borderRadius: 3, backgroundColor: team?.location === 'away' ? '#38BDF8' : ACCENT }} /><MatchReportSelector label={tr ? 'Takım Seçimi' : 'Select Team'} value={team?.name || '—'} options={teams.map(t => ({ id: t.id, name: t.name, detail: t.location === 'away' ? tr ? 'Deplasman' : 'Away' : tr ? 'Ev Sahibi' : 'Home', color: t.location === 'away' ? '#38BDF8' : ACCENT }))} onSelect={setTeamId} accent={team?.location === 'away' ? '#38BDF8' : ACCENT} /></View>{team ? <TeamLineup key={team.id} team={team} data={data} tr={tr} /> : <Text style={s.empty}>{tr ? 'Kadro verisi bulunmuyor.' : 'No lineup data is available.'}</Text>}</View>;
}
const s = StyleSheet.create({
  page: { gap: 18 }, card: { borderWidth: 1, borderRadius: 20, backgroundColor: CARD, overflow: 'hidden' },
  hero: { padding: 15, borderBottomWidth: 1, borderBottomColor: LINE }, rule: { height: 3, borderRadius: 3, marginBottom: 15 }, teamRow: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  logoFrame: { width: 68, height: 76, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.18)' }, logo: { width: 52, height: 60 },
  teamInfo: { flex: 1, minWidth: 0, gap: 7 }, location: { fontSize: 9, fontWeight: '800', letterSpacing: 1.4 }, teamName: { color: TEXT, fontSize: 19, fontWeight: '800' },
  formation: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', alignSelf: 'flex-start', gap: 9, borderWidth: 1, borderColor: LINE, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 6 }, formationLabel: { color: MUTED, fontSize: 10, fontWeight: '600' }, formationValue: { fontWeight: '800', fontSize: 14 },
  body: { padding: 13, gap: 9 }, sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7 }, sectionTitle: { flex: 1, color: TEXT, fontSize: 12, fontWeight: '800' }, count: { fontSize: 11, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10 },
  group: { gap: 7 }, groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 8, marginBottom: 2 }, groupTitle: { fontSize: 11, fontWeight: '700' }, groupRule: { height: 1, flex: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: LINE, backgroundColor: 'rgba(255,255,255,.025)', borderRadius: 12, padding: 9 }, number: { width: 31, height: 31, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, numberText: { fontSize: 12, fontWeight: '800' }, playerName: { flex: 1, color: TEXT, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  substitutions: { borderTopWidth: 1, borderTopColor: LINE, paddingTop: 14, marginTop: 9, gap: 10 }, substitution: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, borderWidth: 1, borderColor: LINE, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.12)' }, minute: { width: 47, minHeight: 38, borderWidth: 1, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingVertical: 5 }, minuteText: { fontSize: 12, fontWeight: '800' }, changes: { flex: 1, gap: 10 }, change: { flexDirection: 'row', alignItems: 'center', gap: 7 }, changeInfo: { flex: 1, gap: 2 }, changeName: { color: TEXT, fontSize: 12, fontWeight: '700', lineHeight: 18 }, direction: { fontSize: 9, fontWeight: '700' },
  empty: { color: MUTED, fontSize: 12, lineHeight: 20, paddingVertical: 18, textAlign: 'center' },
});
