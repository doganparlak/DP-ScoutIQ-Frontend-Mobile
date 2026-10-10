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
        </Pressable>
      )}
    </View>
  </View>;
}
const getStyles = createThemedStyles(({ACCENT, CARD, LINE, MUTED}) => ({ACCENT, MUTED,
  styles: StyleSheet.create({
    row: {flexDirection: 'row', alignItems: 'center', gap: 8},
    label: {color: MUTED, width: 78, fontSize: 12, fontWeight: '600'},
    segment: {width: 92, height: 40, flexDirection: 'row', alignItems: 'stretch', borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 3, gap: 3, backgroundColor: CARD},
    option: {flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: 'transparent'},
    selected: {borderColor: `${ACCENT}55`, backgroundColor: `${ACCENT}12`},
  }),
}));
