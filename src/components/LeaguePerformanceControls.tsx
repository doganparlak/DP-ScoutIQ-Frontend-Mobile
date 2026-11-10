import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { ArrowUpRight,CalendarDays,Clock3,LockKeyhole,Trophy,UserRound,X } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator,Image,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';

import type { LeagueBestPlayer } from '@/services/leaguePerformance';
import { sportmonksTeamImage } from '@/utils/sportmonksImages';

export const fold = (s: string) => s.replace(/ı/g, 'i').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
export function Badge({url, size = 36, player = false}: {url?: string | null; size?: number; player?: boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT} = themed;

  const [failed, setFailed] = React.useState('');
  return <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>{url && failed !== url ? <Image source={{uri: url}} style={{width: size, height: size}} resizeMode="contain" onError={() => setFailed(url)} /> : player ? <UserRound size={size * .7} color={ACCENT} /> : <Trophy size={size * .65} color={ACCENT} />}</View>;
}
export function Action({label, onPress, disabled = false, danger = false, icon}: {label: string; onPress: () => void; disabled?: boolean; danger?: boolean; icon?: React.ReactNode}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, DANGER} = themed;

  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[styles.action, danger && {borderColor: DANGER}, disabled && {opacity: .5}]}><View style={{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>{icon}<Text style={[styles.actionText,{flexShrink:1,textAlign:'center'}, danger && {color: DANGER}]}>{label}</Text></View></Pressable>;
}
export function SelectField({label, value, onPress, valueContent, compact = false, additionalCount = 0}: {label: string; value: string; onPress: () => void; valueContent?: React.ReactNode; compact?: boolean; additionalCount?: number}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT} = themed;

  return <View style={{gap: 7, flexGrow: 1}}><Text style={styles.hint}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={onPress} style={[styles.field, compact && {height:46,alignItems:'center'}]}>{compact ? <View style={{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:4}}><Text numberOfLines={1} ellipsizeMode="tail" style={[styles.text,{flexShrink:1}]}>{valueContent ?? value}</Text>{additionalCount>0&&<Text style={[styles.text,{flexShrink:0}]}>+ {additionalCount}</Text>}</View> : <Text style={styles.text}>{valueContent ?? value}</Text>}<Text style={{color: ACCENT}}>⌄</Text></Pressable></View>;
}
export function Selector({title, options, selected, selectedKeys, searchPlaceholder, onSelect, onClose, tr, columns = 1, maxSelections, showSearch = true}: {title: string; options: {key: string; label: string; category?: string; locked?: boolean; plan?: 'plus' | 'pro'}[]; selected: string; selectedKeys?: string[]; searchPlaceholder?: string; onSelect: (key: string) => void; onClose: () => void; tr: boolean; columns?: 1 | 3; maxSelections?: number; showSearch?: boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, CARD, MUTED, DANGER, themeColor} = themed;

  const [query, setQuery] = React.useState('');
  const isSelected = (key: string) => selectedKeys ? (key === '' ? selectedKeys.length === 0 : selectedKeys.includes(key)) : key === selected;
  const results = options.filter(item => fold(item.label).includes(fold(query)));
  const renderOption = (item: typeof options[number]) => {
    const active = isSelected(item.key);
    const disabled = !!item.key && !active && maxSelections !== undefined && (selectedKeys?.length ?? 0) >= maxSelections;
    return <Pressable accessibilityRole="button" accessibilityState={{selected: active, disabled}} disabled={disabled} key={item.key} onPress={() => onSelect(item.key)} style={[styles.option, columns === 3 && {flex:1,minWidth:0,minHeight:48,marginBottom:0,paddingHorizontal:6,justifyContent:'center'}, active && {borderColor:ACCENT,backgroundColor:columns===3?themeColor('rgba(22,163,74,.1)', 'surface'):CARD}, disabled && {opacity:.35}]}><Text style={[styles.text, {flex:1}, columns===3 && {textAlign:'center',fontSize:14}, active && {color:ACCENT}]}>{item.label}</Text>{item.plan && <View style={{flexDirection:'row',gap:4,flexShrink:0}}>{item.plan==='plus' && <View style={[styles.planBadge,{borderColor:themeColor('#38BDF8', 'border'),backgroundColor:themeColor('rgba(56,189,248,.1)', 'surface')}]}><Text style={{color:themeColor('#38BDF8', 'text'),fontSize:10,fontWeight:'900'}}>PLUS</Text></View>}<View style={[styles.planBadge,{borderColor:ACCENT,backgroundColor:themeColor('rgba(22,163,74,.1)', 'surface')}]}><Text style={{color:ACCENT,fontSize:10,fontWeight:'900'}}>PRO</Text></View></View>}{item.locked && <LockKeyhole size={16} color={MUTED}/>}</Pressable>;
  };
  const gridOptions = results.filter(item=>item.key);
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={tr?'Kapat':'Close'} accessibilityRole="button"/><View style={styles.modal} accessibilityViewIsModal><View style={styles.row}><Text style={styles.title}>{title}</Text>{maxSelections!==undefined && <Text style={{color:ACCENT,fontSize:12,fontWeight:'800'}}>{selectedKeys?.length ?? 0}/{maxSelections}</Text>}<Pressable onPress={onClose} accessibilityLabel={tr?'Kapat':'Close'} accessibilityRole="button" style={{padding:10}}><X color={DANGER} size={22}/></Pressable></View>{columns===1 && showSearch && <TextInput style={styles.field} placeholder={searchPlaceholder ?? (tr?'Ara':'Search')} placeholderTextColor={MUTED} value={query} onChangeText={setQuery} autoFocus accessibilityLabel={tr?'Seçeneklerde ara':'Search options'}/>}<ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={columns===3?{gap:8}:undefined}>{columns===3 ? <>{results.filter(item=>!item.key).map(renderOption)}{Array.from({length:Math.ceil(gridOptions.length/3)},(_,row)=><View key={row} style={{flexDirection:'row',gap:8}}>{gridOptions.slice(row*3,row*3+3).map(renderOption)}</View>)}</> : results.map((item, index) => <React.Fragment key={item.key}>{item.category && item.category !== results[index - 1]?.category ? <Text accessibilityRole="header" style={[styles.hint, {color: ACCENT, fontWeight: '900', marginTop: 14, marginBottom: 10}]}>{item.category}</Text> : null}{renderOption(item)}</React.Fragment>)}{!results.length && <Text style={styles.empty}>{tr?'Sonuç bulunamadı.':'No results found.'}</Text>}</ScrollView></View></View></Modal>;
}
export function Status({text, busy = false, error = false}: {text: string; busy?: boolean; error?: boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, DANGER} = themed;

  return <View style={[styles.row, {justifyContent: 'center', padding: 22}]}>{busy && <ActivityIndicator color={ACCENT} />}<Text style={[styles.hint, {flexShrink: 1}, error && {color: DANGER}]} accessibilityLiveRegion="polite">{text}</Text></View>;
}
export function Winner({player, title, subtitle, compact = false, framed = true, pending, unavailable, tr, onPlayer, tone = 'season'}: {player?: LeagueBestPlayer | null; title?: string; subtitle?: string; compact?: boolean; framed?: boolean; pending?: boolean; unavailable?: boolean; tr: boolean; onPlayer: (player: LeagueBestPlayer) => void; tone?: 'biweekly' | 'season'}) {
  const {styles, ACCENT, MUTED, themeColor} = useThemedStyles(getModuleTheme);
  const accent = tone === 'biweekly' ? themeColor('#FBBF24', 'text') : ACCENT;
  const tint = tone === 'biweekly' ? 'rgba(245,158,11,.07)' : 'rgba(22,163,74,.06)';
  const border = tone === 'biweekly' ? 'rgba(245,158,11,.28)' : 'rgba(22,163,74,.26)';
  const rating = player?.averageRating.toLocaleString(tr ? 'tr-TR' : 'en-GB', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  return <View style={[framed ? styles.winner : {gap: 12, width: '100%'}, framed && {borderColor: themeColor(border, 'border'), backgroundColor: themeColor(tint, 'surface')}]}>
    {title && <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}><Trophy size={16} color={accent}/><Text style={[styles.winnerTitle, {color: accent, flex: 1}]}>{title}</Text></View>}
    {subtitle && <Text style={[styles.hint, {fontSize: 11, lineHeight: 16}]}>{subtitle}</Text>}
    {player ? <Pressable accessibilityRole="button" accessibilityLabel={`${player.name}, ${tr ? 'Oyuncu Kartı' : 'Player Card'}`} onPress={() => onPlayer(player)} style={({pressed}) => ({gap: 14, opacity: pressed ? .78 : 1})}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
        <View style={styles.winnerPortrait}><Badge url={player.imageUrl} size={compact ? 52 : 64} player/></View>
        <View style={{flex: 1, minWidth: 0, gap: 7}}>
          <Text style={styles.winnerName}>{player.name}</Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 5}}><Badge url={sportmonksTeamImage(player.teamId)} size={18}/><Text style={[styles.hint, {flex: 1, fontSize: 12}]}>{player.teamName}</Text></View>
        </View>
        <View style={[styles.winnerRating, {borderColor: themeColor(border, 'border'), backgroundColor: themeColor(tint, 'surface')}]}>
          <Text style={{color: accent, fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums']}}>{rating}</Text>
          <Text style={{color: MUTED, fontSize: 9, fontWeight: '700'}}>{tr ? 'ORT. PUAN' : 'AVG. RATING'}</Text>
        </View>
      </View>
      <View style={{flexDirection: 'row', gap: 8}}>
        <View style={styles.winnerStat}><CalendarDays size={15} color={accent}/><View style={{flexShrink: 1, gap: 2}}><Text style={styles.winnerStatValue}>{player.ratedAppearances}/{player.appearances}</Text><Text style={styles.winnerStatLabel}>{tr ? 'Puanlı maç' : 'Rated matches'}</Text></View></View>
        <View style={styles.winnerStat}><Clock3 size={15} color={accent}/><View style={{flexShrink: 1, gap: 2}}><Text style={styles.winnerStatValue}>{Math.round(player.minutes).toLocaleString(tr ? 'tr-TR' : 'en-GB')}</Text><Text style={styles.winnerStatLabel}>{tr ? 'Dakika' : 'Minutes'}</Text></View></View>
      </View>
      <View style={styles.winnerFooter}><Text style={{color: accent, fontSize: 12, fontWeight: '800'}}>{tr ? 'Oyuncu Kartı' : 'Player Card'}</Text><ArrowUpRight size={16} color={accent}/></View>
    </Pressable> : <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10}}>{pending && <ActivityIndicator size="small" color={accent}/>}<Text style={[styles.hint, {flex: 1}]}>{pending ? (tr ? 'Oyuncu hesaplanıyor…' : 'Calculating player…') : unavailable ? (tr ? 'Oyuncu bilgisi yüklenemedi.' : 'Player data unavailable.') : (tr ? 'Puanlı oyuncu verisi yok.' : 'No rated player data.')}</Text></View>}
  </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, DANGER, themeColor} = colors;

  function standingRuleMeta(rule: {name: string; code: string} | null, tr: boolean) {
  if (!rule) return null;
  const code = rule.code || '';
  let label = rule.name, color = themeColor('#C4B5FD');
  if (/relegation|bottom/i.test(code)) { color = themeColor('#F87171'); label = tr ? (code.includes('possible') ? 'Olası Küme Düşme' : 'Küme Düşme') + (code.includes('play-off') ? ' Play-off’u' : '') : label; }
  else if (/promotion/i.test(code)) { color = themeColor('#38BDF8'); label = tr ? (code.includes('possible') ? 'Olası Yükselme' : code === 'promotion' ? 'Doğrudan Yükselme' : 'Yükselme') + (code.includes('play-off') ? ' Play-off’u' : '') : label; }
  else if (/champions.league/i.test(code)) { color = themeColor('#22C55E'); label = tr ? 'Şampiyonlar Ligi' : label; }
  else if (/europa.league/i.test(code)) { color = themeColor('#38BDF8'); label = tr ? 'Avrupa Ligi' : label; }
  else if (/conference/i.test(code)) { color = themeColor('#A78BFA'); label = tr ? 'Konferans Ligi' : label; }
  else if (/libertadores|sudamericana|continental/i.test(code)) { color = themeColor('#22C55E'); label = tr ? 'Kıta Kupası' : label; }
  else if (/play.off/i.test(code)) { color = themeColor('#FBBF24'); label = tr ? 'Play-off' : label; }
  return label ? {label, color} : null;
}

  const styles = StyleSheet.create({
  row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
  text: {color: TEXT, fontSize: 13, fontWeight: '700'}, title: {color: TEXT, fontSize: 18, fontWeight: '800', flexShrink: 1}, hint: {color: MUTED, fontSize: 12, lineHeight: 18},
  action: {borderWidth: 1, borderColor: ACCENT, borderRadius: 12, minHeight: 44, paddingHorizontal: 14, paddingVertical: 11, justifyContent: 'center', alignItems: 'center'},
  actionText: {color: ACCENT, fontSize: 12, fontWeight: '800'},
  field: {borderWidth: 1, borderColor: LINE, backgroundColor: CARD, borderRadius: 12, minHeight: 46, padding: 12, color: TEXT, flexDirection: 'row', justifyContent: 'space-between', gap: 8},
  backdrop: {flex: 1, backgroundColor: themeColor('rgba(0,0,0,.75)', 'surface'), justifyContent: 'center', padding: 18},
  modal: {width: '100%', maxWidth: 540, maxHeight: '85%', alignSelf: 'center', backgroundColor: PANEL, borderRadius: 22, borderWidth: 1, borderColor: ACCENT, padding: 16, gap: 12},
  planBadge: {borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 4},
  option: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 46, marginBottom: 8, padding: 14, borderRadius: 12, backgroundColor: CARD, borderWidth: 1, borderColor: LINE},
  empty: {padding: 24, textAlign: 'center', color: MUTED, fontSize: 13},
  winner: {borderWidth: 1, borderColor: themeColor('rgba(245,158,11,.3)', 'border'), backgroundColor: themeColor('rgba(245,158,11,.05)', 'surface'), borderRadius: 14, padding: 14, gap: 12},
  winnerPortrait: {borderRadius: 16, padding: 4, overflow: 'hidden', backgroundColor: CARD, borderWidth: 1, borderColor: LINE},
  winnerName: {color: TEXT, fontSize: 17, fontWeight: '900', lineHeight: 22},
  winnerRating: {minWidth: 68, paddingHorizontal: 8, paddingVertical: 9, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 3},
  winnerStat: {flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 12, borderWidth: 1, borderColor: LINE, backgroundColor: CARD, paddingHorizontal: 12, paddingVertical: 9},
  winnerStatValue: {color: TEXT, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums']},
  winnerStatLabel: {color: MUTED, fontSize: 10, lineHeight: 14},
  winnerFooter: {flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, borderTopWidth: 1, borderColor: LINE, paddingTop: 10},
  winnerTitle: {color: themeColor('#FCD34D', 'text'), fontSize: 13, fontWeight: '800'},
});
  return {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, DANGER, standingRuleMeta, styles, themeColor};
});
export const getThemed_standingRuleMeta = (colors: ThemeColors) => getModuleTheme(colors).standingRuleMeta;
export const getThemed_styles = (colors: ThemeColors) => getModuleTheme(colors).styles;
