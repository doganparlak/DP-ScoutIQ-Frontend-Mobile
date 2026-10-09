import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Search } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';

import type { PlayerData } from '@/services/api';
import { fold } from './LeaguePerformanceControls';
export type DiscoveryContext = {strategy:string;expectations:string;priorities:{category:string;importance:'important'|'decisive';metrics:string[]}[]};
export type ProPlayerEntry = {id: string; player: PlayerData; discoveryContext?:DiscoveryContext; discoveryIdentity?:string};
export type ProInspection = {entry: ProPlayerEntry; sourceStats?: {metric: string; value: number | string}[]; matchCount?: number; insights: Record<string, string>; categories: {key: string; metrics: {metric: string; values: number[]}[]}[]};
export const workspaceRequestId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

export function ProButton({label, onPress, disabled = false, Icon = Search, primary = false, color, compact = false, toolbar = false}: {label: string; onPress: () => void; disabled?: boolean; Icon?: typeof Search; primary?: boolean; color?: string; compact?: boolean; toolbar?: boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, styles, CARD, PANEL} = themed;
  color ??= ACCENT;

  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed}) => [styles.button, compact && {minHeight: 70, flexDirection: 'column', gap: 6}, toolbar && {minHeight: 44, minWidth: 0, borderRadius: 12, flexDirection: 'column', gap: 4, paddingHorizontal: 3, paddingVertical: 8}, {borderColor: color, backgroundColor: toolbar ? `${color}14` : primary ? color : CARD, opacity: disabled ? .4 : pressed ? .65 : 1}]}><Icon size={toolbar ? 17 : 18} color={primary && !toolbar ? PANEL : color}/><Text numberOfLines={toolbar ? 1 : undefined} adjustsFontSizeToFit={toolbar} minimumFontScale={.8} style={{color: primary && !toolbar ? PANEL : color, fontSize: toolbar ? 11 : 13, fontWeight: '800', textAlign: 'center', flexShrink: 1}}>{label}</Text></Pressable>;
}
export function ProTrialHint({trial=false,action}:{trial?:boolean;action?:string}) {
  const themed = useThemedStyles(getModuleTheme);
  const {proStyles} = themed;

  const {i18n}=useTranslation(),tr=i18n.language.startsWith('tr');
  if(!trial)return null;
  return <Text style={proStyles.hint}>{action?`${action}: `:''}{tr?'Yeni analiz 1 kredi kullanır. Aynı analizi tekrar açmak ücretsizdir.':'A new analysis uses 1 credit. Reopening the same analysis is free.'}</Text>;
}
export function ProFilterInput({label, value, onChange, placeholder, options = [], chipOptions = [], pillsOnly = false, disabled = false}: {label: string; value: string; onChange: (value: string) => void; placeholder: string; options?: string[]; chipOptions?: string[]; pillsOnly?: boolean; disabled?: boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, MUTED, TEXT, ACCENT, LINE, CARD, themeColor} = themed;

  const [focused, setFocused] = React.useState(false);
  const choices=(pillsOnly?options:chipOptions).filter(option=>!value.trim()||fold(option).includes(fold(value)));
  const suggestions = !pillsOnly && focused && value.trim() ? options.filter(option => fold(option).includes(fold(value)) && option !== value).slice(0, 5) : [];
  return <View style={{flex: 1, minWidth: 0, gap: 8}}><Text style={styles.hint}>{label}</Text><TextInput accessibilityLabel={label} style={styles.input} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={MUTED} editable={!disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoCorrect={false} returnKeyType="done"/>{suggestions.map(option => <Pressable key={option} accessibilityRole="button" onPress={() => {onChange(option); setFocused(false); Keyboard.dismiss();}} style={styles.suggestion}><Text style={{color: TEXT, fontSize: 12}}>{option}</Text></Pressable>)}{!!choices.length&&<ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{maxHeight:128}} contentContainerStyle={{flexDirection:'row',flexWrap:'wrap',gap:6}}>{choices.map(option=><Pressable key={option} accessibilityRole="button" accessibilityState={{selected:value===option,disabled}} disabled={disabled} onPress={()=>{onChange(value===option?'':option);setFocused(false);Keyboard.dismiss();}} style={{borderWidth:1,borderColor:value===option?ACCENT:LINE,borderRadius:18,paddingHorizontal:10,paddingVertical:7,backgroundColor:value===option?themeColor('rgba(22,163,74,.12)', 'surface'):CARD}}><Text style={{color:ACCENT,fontSize:12,fontWeight:'600',flexShrink:1}}>{option}</Text></Pressable>)}</ScrollView>}</View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, themeColor} = colors;

  const proStyles = StyleSheet.create({
  frame: {backgroundColor: PANEL, borderColor: ACCENT, borderWidth: 1, borderRadius: 22, padding: 16, gap: 14},
  heading: {flexDirection: 'row', alignItems: 'center', gap: 10},
  hint: {color: MUTED, fontSize: 13, lineHeight: 21},
  content: {padding: 16, paddingBottom: 40, gap: 16, width: '100%', maxWidth: 1060, alignSelf: 'center'},
  button: {minHeight: 46, borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  input: {height: 48, borderRadius: 14, borderWidth: 1, borderColor: LINE, color: TEXT, backgroundColor: CARD, paddingHorizontal: 14, fontSize: 14},
  suggestion: {borderRadius: 12, borderWidth: 1, borderColor: LINE, backgroundColor: CARD, padding: 10},
});

  const styles = proStyles;
  return {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, proStyles, styles, themeColor};
});
export const getThemed_proStyles = (colors: ThemeColors) => getModuleTheme(colors).proStyles;
