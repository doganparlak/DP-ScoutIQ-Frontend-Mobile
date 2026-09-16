import React, { useRef, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Shield, X } from 'lucide-react-native';
import Svg, { Line, Polygon, Text as SvgText, TSpan } from 'react-native-svg';
import { ACCENT, CARD, LINE, MUTED, TEXT } from '@/theme';
import type { PostMatchCardData, MatchReportLineup } from '@/services/matchPool';
import { numeric, playerValue, playerSections, positionOrder, teamPlayers } from '@/utils/matchReportPlayers';
import { toSpiderPoints } from '@/utils/comparisonRanges';
import { matchMetricLabel } from '@/utils/matchReportMetrics';
import ReportPlayerPortrait from './ReportPlayerPortrait';
const format = (v: unknown) => numeric(v) == null ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: 2 });
const aliases: Record<string, string> = { 'On Target Goal Conversion (%)': 'On-Target to Goal Conversion (%)', 'On Target Shot Quality (%)': 'On-Target Shot Quality (%)', 'Accurate Crosses (%)': 'Successful Crosses (%)' };
export function MatchReportSelector({ label, value, options, onSelect, accent, imageUrl }: { imageUrl?: string | null; label: string; value: string; options: { id: number; name: string; detail?: string; color?: string }[]; onSelect: (id: number) => void; accent: string }) {
  const [open, setOpen] = useState(false);
  const [failedImage, setFailedImage] = useState<string>();
  return <View style={s.selectWrap}><Text style={s.caption}>{label}</Text><Pressable accessibilityRole="button" accessibilityState={{ expanded: open, disabled: !options.length }} disabled={!options.length} onPress={() => setOpen(!open)} style={[s.selector, { borderColor: accent }]}><>{imageUrl && (failedImage !== imageUrl ? <Image source={{ uri: imageUrl }} resizeMode="contain" style={s.teamLogo} onError={() => setFailedImage(imageUrl)} /> : <Shield size={30} color={accent} />)}<Text style={s.selectorText}>{value}</Text></><ChevronDown size={18} color={accent} /></Pressable>{open && <ScrollView nestedScrollEnabled style={s.options}>{options.map(o => <Pressable key={o.id} accessibilityRole="button" onPress={() => { onSelect(o.id); setOpen(false); }} style={s.option}><Text style={s.body}>{o.name}</Text>{o.detail && <Text style={[s.caption, { color: o.color || accent, marginTop: 5 }]}>{o.detail}</Text>}</Pressable>)}</ScrollView>}</View>;
}
export function Metrics({ player, tr, accent, onClose, unit = 'perMatch' }: { player: MatchReportLineup; tr: boolean; accent: string; onClose: () => void; unit?: 'perMatch' | 'per90' }) {
  const insets = useSafeAreaInsets(), { height } = useWindowDimensions();
  const sections = playerSections(player);
  const detailScroll = useRef<ScrollView>(null);
  const [selected, setSelected] = useState(sections[0]?.key);
  const group = sections.find(g => g.key === selected) || sections[0];
  const points = (group?.metrics || []).flatMap(metric => {
    const value = numeric(metric.value);
    if (value == null) return [];
    const label = aliases[metric.name] || metric.name;
    const range = toSpiderPoints([{ metric: label, value }], [label], { unit })[0];
    return [{ name: metric.name, value, normalized: range ? Math.max(0, Math.min(1, (range.value - range.min) / (range.max - range.min))) : null }];
  });
  const radar = points.filter(p => p.normalized != null);
  const coordinate = (index: number, radius: number) => ({ x: 250 + Math.cos(-Math.PI / 2 + index / radar.length * Math.PI * 2) * radius, y: 212 + Math.sin(-Math.PI / 2 + index / radar.length * Math.PI * 2) * radius });
  const polygon = (scale: number) => radar.map((_, i) => { const p = coordinate(i, 138 * scale); return `${p.x},${p.y}`; }).join(' ');
  const label = (name: string) => matchMetricLabel(name, tr ? 'tr' : 'en');
  return <Modal transparent animationType="fade" onRequestClose={onClose}><View style={[s.backdrop, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}><View style={[s.modal, { height: Math.min(height * .88, height - insets.top - insets.bottom - 16), borderColor: accent }]}>
    <View style={s.heading}><ReportPlayerPortrait imageUrl={player.player_image_url} accent={accent} size={45}/><View style={{ flex: 1, gap: 5 }}><Text style={[s.caption, { color: accent }]}>{tr ? 'Oyuncu Metrikleri' : 'Player Metrics'}</Text><Text style={s.name}>{player.player_name}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={tr ? 'Kapat' : 'Close'} onPress={onClose} style={s.close}><X color="#FB7185" size={24} /></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabStrip} contentContainerStyle={s.tabs}>{sections.map(g => <Pressable key={g.key} accessibilityRole="button" accessibilityState={{ selected: group?.key === g.key }} onPress={() => { setSelected(g.key); detailScroll.current?.scrollTo({ y: 0, animated: false }); }} style={[s.tab, group?.key === g.key && { borderColor: accent, backgroundColor: `${accent}20` }]}><Text style={[s.caption, group?.key === g.key && { color: accent }]}>{tr ? g.tr : g.en}</Text></Pressable>)}</ScrollView>
    <ScrollView ref={detailScroll} style={s.detailScroll} contentContainerStyle={s.details}>
      {group && <Text style={[s.title, { color: accent }]}>{tr ? group.tr : group.en}</Text>}
      {group?.key !== 'errors_discipline' && radar.length >= 5 && <View style={[s.chart, { borderColor: `${accent}60` }]}><Svg width="100%" viewBox="0 0 500 430" style={{ aspectRatio: 500 / 430 }}>
        {[.25, .5, .75, 1].map(scale => <Polygon key={scale} points={polygon(scale)} fill="none" stroke={MUTED} strokeOpacity={.2} />)}
        {radar.map((p, i) => { const pos = coordinate(i, 186); const words = label(p.name).split(/\s+/); const lines: string[] = []; for (const word of words) { const last = lines.length - 1; if (last >= 0 && `${lines[last]} ${word}`.length <= 17) lines[last] += ` ${word}`; else lines.push(word); } return <React.Fragment key={`${p.name}-${i}`}><Line x1={250} y1={212} x2={pos.x} y2={pos.y} stroke={MUTED} strokeOpacity={.15} /><SvgText x={pos.x} y={pos.y} textAnchor="middle" fill={MUTED} fontSize={14} fontWeight="800">{lines.map((line, j) => <TSpan key={j} x={pos.x} dy={j ? 16 : -(lines.length - 1) * 8}>{line}</TSpan>)}</SvgText></React.Fragment>; })}
        <Polygon points={radar.map((p, i) => { const pos = coordinate(i, 138 * p.normalized!); return `${pos.x},${pos.y}`; }).join(' ')} fill={accent} fillOpacity={.2} stroke={accent} strokeWidth={2.8} />
      </Svg></View>}
      {points.map((p, i) => <View key={`${p.name}-${i}`} style={s.tile}><View style={s.metricRow}><Text style={[s.body, { flex: 1 }]}>{label(p.name)}</Text><Text style={[s.title, { color: accent }]}>{format(p.value)}</Text></View><View style={s.track}><View style={{ height: 6, borderRadius: 3, backgroundColor: accent, width: `${p.normalized == null ? 0 : Math.max(3, p.normalized * 100)}%` }} /></View></View>)}
      {!points.length && <Text style={s.empty}>{tr ? 'Oyuncu metriği bulunmuyor.' : 'No player metrics available.'}</Text>}
    </ScrollView>
  </View></View></Modal>;
}
export default function MatchReportPlayerAnalysis({ data, tr }: { data: PostMatchCardData; tr: boolean }) {
  const [teamId, setTeamId] = useState<number>();
  const [playerId, setPlayerId] = useState<number>();
  const [showMetrics, setShowMetrics] = useState(false);
  const teams = [...data.teams].sort((a, b) => Number(a.location !== 'home') - Number(b.location !== 'home'));
  const team = teams.find(t => t.id === teamId) || teams[0];
  const players = teamPlayers(data.lineups, data.events, team?.id);
  const player = players.find(p => p.player_id === playerId) || players[0];
  const accent = team?.location === 'away' ? '#38BDF8' : ACCENT;
  const events = data.events.filter(e => Number(e.player_id) === player?.player_id);
  const badges = [
    { label: tr ? 'Gol' : 'Goal', count: events.filter(e => e.type?.toLowerCase() === 'goal').length, color: accent },
    { label: tr ? 'Asist' : 'Assist', count: data.events.filter(e => e.type?.toLowerCase() === 'goal' && Number(e.related_player_id) === player?.player_id).length, color: accent },
    { label: tr ? 'Sarı Kart' : 'Yellow Card', count: events.filter(e => e.type?.toLowerCase().includes('yellow')).length, color: '#FACC15' },
    { label: tr ? 'Kırmızı Kart' : 'Red Card', count: events.filter(e => e.type?.toLowerCase().includes('red')).length, color: '#FB7185' },
  ];
  return <View style={s.page}>
    <View style={[s.frame, { borderColor: `${accent}70` }]}><View style={[s.rule, { backgroundColor: accent }]} />
      <MatchReportSelector imageUrl={team?.image_url} label={tr ? 'Takım Seçimi' : 'Select Team'} value={team?.name || '—'} options={teams.map(t => ({ id: t.id, name: t.name }))} accent={accent} onSelect={id => { setTeamId(id); setPlayerId(undefined); setShowMetrics(false); }} />
      <MatchReportSelector key={team?.id} label={tr ? 'Oyuncu Seçimi' : 'Select Player'} value={player?.player_name || (tr ? 'Süre alan oyuncu bulunmuyor' : 'No players available')} options={players.map(p => ({ id: p.player_id, name: p.player_name || '—' }))} accent={accent} onSelect={id => { setPlayerId(id); setShowMetrics(false); }} />
      <Text style={s.caption}>{players.length} {tr ? 'süre alan oyuncu' : 'players used'}</Text>
    </View>
    {player ? <View style={[s.frame, { borderColor: `${accent}70` }]}>
      <View style={s.heading}><ReportPlayerPortrait imageUrl={player.player_image_url} accent={accent} size={55}/><View style={{ flex: 1, gap: 7 }}><Text style={s.name}>{player.player_name}</Text><Text style={s.caption}>{team?.name} · {player.jersey_number ? `#${player.jersey_number}` : '—'}</Text></View></View>
      <View style={s.badges}><Text style={[s.badge, { color: accent, borderColor: `${accent}60` }]}>{player.starter ? tr ? 'İlk 11' : 'Starter' : tr ? 'Sonradan Girdi' : 'Substitute'}</Text><Text style={s.badge}>{(tr ? ['Kaleci', 'Savunma', 'Orta Saha', 'Hücum', 'Oyuncu'] : ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker', 'Player'])[positionOrder(player)]}</Text>{badges.filter(b => b.count).map(b => <Text key={b.label} style={[s.badge, { color: b.color, borderColor: `${b.color}60` }]}>{b.label}{b.count > 1 ? ` ×${b.count}` : ''}</Text>)}</View>
      <View style={s.metricRow}>{[['Rating', tr ? 'Puan' : 'Rating'], ['Minutes Played', tr ? 'Dakika' : 'Minutes']].map(([key, title]) => <View key={key} style={[s.tile, { flex: 1, alignItems: 'center', gap: 7 }]}><Text style={s.caption}>{title}</Text><Text style={s.title}>{format(playerValue(player, key))}</Text></View>)}</View>
      <Pressable accessibilityRole="button" onPress={() => setShowMetrics(true)} style={[s.selector, { borderColor: accent, justifyContent: 'center', backgroundColor: `${accent}18` }]}><Text style={[s.title, { color: accent }]}>{tr ? 'Metrikleri Gör' : 'View Metrics'}</Text></Pressable>
    </View> : <Text style={s.empty}>{tr ? 'Bu takım için oyuncu istatistiği bulunmuyor.' : 'No player statistics available for this team.'}</Text>}
    {showMetrics && player && <Metrics key={player.player_id} player={player} tr={tr} accent={accent} onClose={() => setShowMetrics(false)} />}
  </View>;
}
const s = StyleSheet.create({
  page: { gap: 14 }, frame: { padding: 14, gap: 15, borderWidth: 1, borderRadius: 18 }, rule: { height: 3, borderRadius: 3 }, selectWrap: { gap: 8 }, caption: { color: MUTED, fontSize: 11, fontWeight: '700' }, selector: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 13, borderWidth: 1, borderRadius: 12 }, selectorText: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '700' }, options: { maxHeight: 220, borderWidth: 1, borderColor: LINE, borderRadius: 12 }, option: { padding: 13, borderBottomWidth: 1, borderBottomColor: LINE }, body: { color: TEXT, fontSize: 13, lineHeight: 20 }, heading: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 12 }, name: { color: TEXT, fontSize: 21, fontWeight: '800' }, title: { color: TEXT, fontSize: 16, fontWeight: '800' }, jersey: { width: 55, height: 60, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, badge: { color: MUTED, fontWeight: '700', fontSize: 10, borderColor: LINE, borderWidth: 1, borderRadius: 10, padding: 7 }, metricRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, tile: { borderWidth: 1, borderColor: LINE, padding: 12, borderRadius: 13, gap: 9, backgroundColor: 'rgba(255,255,255,.025)' }, track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.06)' }, empty: { color: MUTED, textAlign: 'center', padding: 22, lineHeight: 21 }, backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,.82)', paddingHorizontal: 10 }, modal: { width: '100%', maxWidth: 620, backgroundColor: CARD, borderWidth: 1, borderRadius: 22, overflow: 'hidden', padding: 14 }, close: { padding: 10 }, teamLogo: { width: 34, height: 38 }, tabStrip: { flexGrow: 0, flexShrink: 0 }, tabs: { gap: 8, paddingVertical: 15, alignItems: 'center' }, detailScroll: { flex: 1, minHeight: 0 }, tab: { padding: 11, borderRadius: 12, borderWidth: 1, borderColor: LINE }, details: { gap: 12, paddingBottom: 16 }, chart: { borderWidth: 1, borderRadius: 18, backgroundColor: 'rgba(0,0,0,.18)' },
});
