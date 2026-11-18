import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useTranslation } from 'react-i18next';
import { Pressable,StyleSheet,Text } from 'react-native';


export default function PlanManagementButton({onPress, label, highlighted = false}: {onPress: () => void; label?: string; highlighted?: boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles} = themed;

  const {t} = useTranslation();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [styles.button, highlighted && styles.highlighted, pressed && {opacity: .8}]}><Text style={[styles.label, highlighted && styles.highlightedLabel]}>{label ?? t('managePlan', 'Manage Plan')}</Text></Pressable>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, themeColor} = colors;

  const styles = StyleSheet.create({
  button: {flex: 1, minHeight: 44, backgroundColor: CARD, borderWidth: 1, borderColor: ACCENT, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center'},
  highlighted: {backgroundColor: '#1E40AF', borderColor: '#3B82F6'},
  highlightedLabel: {color: '#FFF'},
  label: {color: ACCENT, fontSize: 14, fontWeight: '800'},
});
  return {ACCENT, CARD, styles, themeColor};
});
