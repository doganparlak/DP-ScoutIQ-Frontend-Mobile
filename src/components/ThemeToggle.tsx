import { createThemedStyles,useThemedStyles,useThemePreference,type ThemeMode } from '@/theme';
import { Moon,Sun } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable,StyleSheet,Text,View } from 'react-native';

export default function ThemeToggle() {
  const {mode, setMode} = useThemePreference();
  const {i18n} = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const {styles, ACCENT, MUTED} = useThemedStyles(getStyles);
  return <View style={styles.row}>
    <Text style={styles.label}>{tr ? 'Görünüm' : 'Appearance'}</Text>
    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={tr ? 'Görünüm' : 'Appearance'}>
      {([{value: 'light', Icon: Sun, label: tr ? 'Açık' : 'Light'},
        {value: 'dark', Icon: Moon, label: tr ? 'Koyu' : 'Dark'}] as const).map(({value, Icon, label}) =>
        <Pressable key={value} accessibilityRole="radio" accessibilityState={{checked: mode === value}}
          accessibilityLabel={label} onPress={() => setMode(value as ThemeMode)}
          style={({pressed}) => [styles.option, mode === value && styles.selected, pressed && {opacity: 0.7}]}>
          <Icon size={15} color={mode === value ? ACCENT : MUTED}/>
          <Text style={[styles.optionText, mode === value && {color: ACCENT}]}>{label}</Text>
        </Pressable>
      )}
    </View>
  </View>;
}
const getStyles = createThemedStyles(({ACCENT, CARD, LINE, MUTED}) => ({ACCENT, MUTED,
  styles: StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 14},
    label: {color: MUTED, fontSize: 12, fontWeight: '600'},
    segment: {flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 3, gap: 3, backgroundColor: CARD},
    option: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 34, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9, borderWidth: 1, borderColor: 'transparent'},
    optionText: {color: MUTED, fontSize: 12, fontWeight: '700'},
    selected: {borderColor: `${ACCENT}55`, backgroundColor: `${ACCENT}12`},
  }),
}));
