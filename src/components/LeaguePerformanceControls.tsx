import React from 'react';
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { LockKeyhole, Trophy, UserRound, X } from 'lucide-react-native';
import { ACCENT, CARD, LINE, MUTED, PANEL, TEXT, DANGER } from '@/theme';
import type { LeagueBestPlayer } from '@/services/leaguePerformance';

export const fold = (s: string) => s.replace(/ı/g, 'i').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
export function Badge({url, size = 36, player = false}: {url?: string | null; size?: number; player?: boolean}) {
  const [failed, setFailed] = React.useState('');
  return <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>{url && failed !== url ? <Image source={{uri: url}} style={{width: size, height: size}} resizeMode="contain" onError={() => setFailed(url)} /> : player ? <UserRound size={size * .7} color={ACCENT} /> : <Trophy size={size * .65} color={ACCENT} />}</View>;
}
export function Action({label, onPress, disabled = false, danger = false, icon}: {label: string; onPress: () => void; disabled?: boolean; danger?: boolean; icon?: React.ReactNode}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[styles.action, danger && {borderColor: DANGER}, disabled && {opacity: .5}]}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>{icon}<Text style={[styles.actionText,{flexShrink:1,textAlign:'center'}, danger && {color: DANGER}]}>{label}</Text></View></Pressable>;
}
export function SelectField({label, value, onPress, valueContent, compact = false, additionalCount = 0}: {label: string; value: string; onPress: () => void; valueContent?: React.ReactNode; compact?: boolean; additionalCount?: number}) {
  return <View style={{gap: 7, flexGrow: 1}}><Text style={styles.hint}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={[styles.field, compact && {height:46,alignItems:'center'}]}>{compact ? <View style={{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:4}}><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.text,{flexShrink:1}]}>{valueContent ?? value}</Text>{additionalCount>0&&<Text style={[styles.text,{flexShrink:0}]}>+ {additionalCount}</Text>}</View> : <Text style={styles.text}>{valueContent ?? value}</Text>}<Text style={{color: ACCENT}}>⌄</Text></Pressable></View>;
}
export function Selector({title, options, selected, selectedKeys, searchPlaceholder, onSelect, onClose, tr}: {title: string; options: {key: string; label: string; locked?: boolean; plan?: 'plus' | 'pro'}[]; selected: string; selectedKeys?: string[]; searchPlaceholder?: string; onSelect: (key: string) => void; onClose: () => void; tr: boolean}) {
  const [query, setQuery] = React.useState('');
  const isSelected = (key: string) => selectedKeys ? (key === '' ? selectedKeys.length === 0 : selectedKeys.includes(key)) : key === selected;
  const results = options.filter(item => fold(item.label).includes(fold(query)));
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={tr ? 'Kapat' : 'Close'} accessibilityRole="button" /><View style={styles.modal} accessibilityViewIsModal><View style={styles.row}><Text style={styles.title}>{title}</Text><Pressable onPress={onClose} accessibilityLabel={tr ? 'Kapat' : 'Close'} accessibilityRole="button" style={{padding: 10}}><X color={DANGER} size={22} /></Pressable></View><TextInput style={styles.field} placeholder={searchPlaceholder ?? (tr ? 'Ara' : 'Search')} placeholderTextColor={MUTED} value={query} onChangeText={setQuery} autoFocus accessibilityLabel={tr ? 'Seçeneklerde ara' : 'Search options'} /><ScrollView keyboardShouldPersistTaps="handled">{results.map(item => <Pressable accessibilityRole="button" accessibilityState={{selected: isSelected(item.key)}} key={item.key} onPress={() => onSelect(item.key)} style={[styles.option, isSelected(item.key) && {borderColor: ACCENT}]}><Text style={[styles.text, {flex: 1}, isSelected(item.key) && {color: ACCENT}]}>{item.label}</Text>{item.plan && <View style={{flexDirection: 'row', gap: 4, flexShrink: 0}}>{item.plan === 'plus' && <View style={[styles.planBadge, {borderColor: '#38BDF8', backgroundColor: 'rgba(56,189,248,.1)'}]}><Text style={{color: '#38BDF8', fontSize: 10, fontWeight: '900'}}>PLUS</Text></View>}<View style={[styles.planBadge, {borderColor: ACCENT, backgroundColor: 'rgba(22,163,74,.1)'}]}><Text style={{color: ACCENT, fontSize: 10, fontWeight: '900'}}>PRO</Text></View></View>}{item.locked && <LockKeyhole size={16} color={MUTED} />}</Pressable>)}{!results.length && <Text style={styles.empty}>{tr ? 'Sonuç bulunamadı.' : 'No results found.'}</Text>}</ScrollView></View></View></Modal>;
}
export function Status({text, busy = false, error = false}: {text: string; busy?: boolean; error?: boolean}) {
  return <View style={[styles.row, {justifyContent: 'center', padding: 22}]}>{busy && <ActivityIndicator color={ACCENT} />}<Text style={[styles.hint, {flexShrink: 1}, error && {color: DANGER}]} accessibilityLiveRegion="polite">{text}</Text></View>;
}
export function Winner({player, title, subtitle, compact = false, framed = true, pending, unavailable, tr, onPlayer}: {player?: LeagueBestPlayer | null; title?: string; subtitle?: string; compact?: boolean; framed?: boolean; pending?: boolean; unavailable?: boolean; tr: boolean; onPlayer: (player: LeagueBestPlayer) => void}) {
  return <View style={title && framed ? styles.winner : {gap: 8, width: '100%'}}>{title && <Text style={styles.winnerTitle}>{title}</Text>}{subtitle && <Text style={styles.hint}>{subtitle}</Text>}{player ? <Pressable accessibilityRole="button" accessibilityLabel={`${player.name}, ${tr ? 'Oyuncu Kartı' : 'Player Card'}`} onPress={() => onPlayer(player)}><View style={[styles.row, {justifyContent: 'flex-start'}]}><Badge url={player.imageUrl} size={44} player /><View style={{flex: 1, gap: 4}}><Text numberOfLines={compact ? 2 : undefined} style={styles.text}>{player.name} <Text style={{color: ACCENT}}>{player.averageRating.toFixed(2)}</Text></Text><Text numberOfLines={compact ? 1 : undefined} style={styles.hint}>{player.teamName}</Text><Text numberOfLines={compact ? 2 : undefined} style={styles.hint}>{player.ratedAppearances}/{player.appearances} {tr ? 'puanlı maç' : 'rated matches'} · {Math.round(player.minutes)} {tr ? 'dk' : 'min'}</Text><Text style={{color: ACCENT, fontSize: 11, fontWeight: '700'}}>{tr ? 'Oyuncu Kartı' : 'Player Card'}</Text></View></View></Pressable> : <Text style={styles.hint}>{pending ? (tr ? 'Oyuncu hesaplanıyor…' : 'Calculating player…') : unavailable ? (tr ? 'Oyuncu bilgisi yüklenemedi.' : 'Player data unavailable.') : (tr ? 'Puanlı oyuncu verisi yok.' : 'No rated player data.')}</Text>}</View>;
}
export function standingRuleMeta(rule: {name: string; code: string} | null, tr: boolean) {
  if (!rule) return null;
  const code = rule.code || '';
  let label = rule.name, color = '#C4B5FD';
  if (/relegation|bottom/i.test(code)) { color = '#F87171'; label = tr ? (code.includes('possible') ? 'Olası Küme Düşme' : 'Küme Düşme') + (code.includes('play-off') ? ' Play-off’u' : '') : label; }
  else if (/promotion/i.test(code)) { color = '#38BDF8'; label = tr ? (code.includes('possible') ? 'Olası Yükselme' : code === 'promotion' ? 'Doğrudan Yükselme' : 'Yükselme') + (code.includes('play-off') ? ' Play-off’u' : '') : label; }
  else if (/champions.league/i.test(code)) { color = '#22C55E'; label = tr ? 'Şampiyonlar Ligi' : label; }
  else if (/europa.league/i.test(code)) { color = '#38BDF8'; label = tr ? 'Avrupa Ligi' : label; }
  else if (/conference/i.test(code)) { color = '#A78BFA'; label = tr ? 'Konferans Ligi' : label; }
  else if (/libertadores|sudamericana|continental/i.test(code)) { color = '#22C55E'; label = tr ? 'Kıta Kupası' : label; }
  else if (/play.off/i.test(code)) { color = '#FBBF24'; label = tr ? 'Play-off' : label; }
  return label ? {label, color} : null;
}
export const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  text: {color: TEXT, fontSize: 13, fontWeight: '700'}, title: {color: TEXT, fontSize: 18, fontWeight: '800', flexShrink: 1}, hint: {color: MUTED, fontSize: 12, lineHeight: 18},
  action: {borderWidth: 1, borderColor: ACCENT, borderRadius: 12, minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, justifyContent: 'center', alignItems: 'center'},
  actionText: {color: ACCENT, fontSize: 12, fontWeight: '800'},
  field: {borderWidth: 1, borderColor: LINE, backgroundColor: CARD, borderRadius: 12, minHeight: 46, padding: 12, color: TEXT, flexDirection: 'row', justifyContent: 'space-between', gap: 8},
  backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,.75)', justifyContent: 'center', padding: 18},
  modal: {width: '100%', maxWidth: 540, maxHeight: '85%', alignSelf: 'center', backgroundColor: PANEL, borderRadius: 22, borderWidth: 1, borderColor: ACCENT, padding: 16, gap: 12},
  planBadge: {borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4},
  option: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 46, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: LINE},
  empty: {padding: 24, textAlign: 'center', color: MUTED, fontSize: 13},
  winner: {borderWidth: 1, borderColor: 'rgba(245,158,11,.3)', backgroundColor: 'rgba(245,158,11,.05)', borderRadius: 14, padding: 14, gap: 12},
  winnerTitle: {color: '#FCD34D', fontSize: 13, fontWeight: '800'},
});
