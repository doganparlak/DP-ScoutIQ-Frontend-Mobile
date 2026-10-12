import { createThemedStyles,useThemedStyles,useThemePreference,type ThemeMode } from '@/theme';
import { Moon,Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable,StyleSheet,Text,View } from 'react-native';

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const {mode, setMode} = useThemePreference();
  const {i18n} = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const {styles, ACCENT, MUTED} = useThemedStyles(getStyles);
  return <View style={[styles.row, compact && styles.compactRow]}>
    <Text style={[styles.label, compact && styles.compactLabel]}>{tr ? 'Görünüm' : 'Appearance'}</Text>
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={tr ? 'Görünüm' : 'Appearance'}>
      {([{value: 'light', Icon: Sun, label: tr ? 'Açık' : 'Light'},
        {value: 'dark', Icon: Moon, label: tr ? 'Koyu' : 'Dark'}] as const).map(({value, Icon, label}) =>
        <Pressable key={value} accessibilityRole="radio" accessibilityState={{checked: mode === value}}
          accessibilityLabel={label} onPress={() => setMode(value as ThemeMode)}
          style={({pressed}) => [styles.option, mode === value && styles.selected, pressed && {opacity: 0.7}]}>
          <Icon size={15} color={mode === value ? ACCENT : MUTED}/>
        </Pressable>
      )}
    </View>
  </View>;
}
const getStyles = createThemedStyles(({ACCENT, CARD, LINE, MUTED}) => ({ACCENT, MUTED,
  styles: StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', maxWidth: 178},
    compactRow: {flexDirection: 'column', alignItems: 'flex-end', gap: 4},
    compactLabel: {width: 'auto', textAlign: 'right', flexShrink: 1},
    label: {color: MUTED, width: 78, minWidth: 0, flexShrink: 1, fontSize: 12, fontWeight: '600'},
    segment: {width: 92, minHeight: 44, flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 3, gap: 3, backgroundColor: CARD},
    option: {flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: 'transparent'},
    selected: {borderColor: `${ACCENT}55`, backgroundColor: `${ACCENT}12`},
  }),
}));
