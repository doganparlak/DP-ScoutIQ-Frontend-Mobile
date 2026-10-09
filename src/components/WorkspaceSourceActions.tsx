import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { ArrowUpRight,type LucideIcon } from 'lucide-react-native';
import { Pressable,StyleSheet,Text,View } from 'react-native';


type Source = {label: string; Icon: LucideIcon; onPress: () => void; color?: string; secondary?: boolean};

export default function WorkspaceSourceActions({sources, compact = false}: {sources: Source[]; compact?: boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT} = themed;

  if (compact) return <View style={styles.compactRow}>{sources.map(({label, Icon, onPress, color = ACCENT}) =>
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({pressed}) => [styles.compactTile, sources.length > 1 && styles.compactPairTile, pressed && {opacity: 0.7}]}>
      <View style={[styles.icon, {backgroundColor: `${color}14`}]}><Icon size={20} color={color}/></View>
      <Text style={styles.compactLabel}>{label}</Text>
      <ArrowUpRight size={16} color={color}/>
    </Pressable>
  )}</View>;
  return <View style={styles.row}>{sources.map(({label, Icon, onPress, color = ACCENT, secondary}) =>
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label.replace(/\n/g, ' ')} onPress={onPress}
      style={({pressed}) => [styles.tile, secondary && styles.secondary, pressed && {opacity: 0.7}]}>
      <View style={styles.top}>
        <View style={[styles.icon, {backgroundColor: `${color}14`}]}><Icon size={20} color={color}/></View>
        <ArrowUpRight size={14} color={color}/>
      </View>
      <Text style={styles.label} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.5}>{label}</Text>
    </Pressable>
  )}</View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, TEXT, themeColor} = colors;

  const styles = StyleSheet.create({
  compactRow: {flexDirection: 'row', alignItems: 'stretch', gap: 8},
  compactPairTile: {flex: 1, minWidth: 0},
  compactTile: {maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 1, borderColor: themeColor('rgba(22,163,74,0.48)', 'border'), backgroundColor: themeColor('rgba(22,163,74,0.08)', 'surface')},
  compactLabel: {flexShrink: 1, color: TEXT, fontSize: 13, lineHeight: 19, fontWeight: '700'},
  row: {flexDirection: 'row', alignItems: 'stretch', gap: 8},
  tile: {flex: 1, minWidth: 0, minHeight: 98, padding: 10, gap: 10, borderRadius: 14,
    borderWidth: 1, borderColor: themeColor('rgba(22,163,74,0.48)', 'border'), backgroundColor: themeColor('rgba(22,163,74,0.08)', 'surface')},
  secondary: {borderColor: LINE, backgroundColor: CARD},
  top: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4},
  icon: {width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  label: {minHeight: 36, color: TEXT, fontSize: 12, lineHeight: 18, fontWeight: '700'},
});
  return {ACCENT, CARD, LINE, TEXT, styles, themeColor};
});
