import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { BadgeCheck,Check,Minus,X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable,StyleSheet,Text,View,type StyleProp,type ViewStyle } from 'react-native';


type Props = {
  onOpenPlans: () => void;
  onClose: () => void;
  worldCupMode?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export default function PlanDiscoveryNudge({
  onOpenPlans,
  onClose,
  worldCupMode = false,
  containerStyle,
}: Props) {
  const themed = useThemedStyles(getModuleTheme);
  const {WORLD_CUP_COLORS, ACCENT, styles, themeColor} = themed;

  const { t } = useTranslation();
  const accent = worldCupMode ? WORLD_CUP_COLORS.lavender : ACCENT;
  const available = () => <Check size={14} color={themeColor("#4ADE80", 'text')} strokeWidth={3} />;
  const unavailable = () => <Minus size={14} color={themeColor("#68736C", 'text')} strokeWidth={2.5} />;
  const rows = [
    { label: t('planFeatures_NoAdsMonthly', 'Ad-free'), plus: available(), pro: available() },
    { label: t('planFeatures_DetailedReports', 'Detailed reports'), plus: available(), pro: available() },
    {
      label: t('plusProComparisonPlayers', 'Player comparison'),
      plus: <Text style={styles.valueText}>{t('plusProThreePlayers', '3 players')}</Text>,
      pro: <Text style={styles.valueText}>{t('plusProThreeOrFourPlayers', '3 or 4 players')}</Text>,
    },
    { label: t('planFeatures_CustomComparison', 'Customizable comparison'), plus: unavailable(), pro: available() },
    { label: t('plusProChatAccess', 'ScoutWise chat'), plus: unavailable(), pro: available() },
  ];

  return (
    <View
      style={[
        styles.container,
        worldCupMode && { borderColor: accent, backgroundColor: themeColor('rgba(167, 132, 244, 0.10)', 'surface') },
        containerStyle,
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.icon,
            {
              borderColor: accent,
              backgroundColor: worldCupMode ? themeColor('rgba(167, 132, 244, 0.16)', 'surface') : themeColor('rgba(22, 163, 74, 0.12)', 'surface'),
            },
          ]}
        >
          <BadgeCheck size={19} color={accent} strokeWidth={2.3} />
        </View>
        <View style={[styles.titlePill, { borderColor: `${accent}66` }]}>
          <Text style={[styles.title, { color: accent, textShadowColor: `${accent}55` }]}>
            {t('playerCardPlanNudgeTitle', 'Discover Plus & Pro')}
          </Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <X size={16} color={themeColor("#8F8F99", 'text')} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          <View style={styles.featureCell} />
          <View style={[styles.valueCell, styles.plusCell]}>
            <Text style={styles.plusText}>{t('plusPlanName', 'PLUS')}</Text>
          </View>
          <View style={[styles.valueCell, styles.proCell]}>
            <Text style={styles.proText}>{t('proPlanName', 'PRO')}</Text>
          </View>
        </View>
        {rows.map((row) => (
          <View key={row.label} style={[styles.tableRow, styles.tableBorder]}>
            <View style={styles.featureCell}>
              <Text style={styles.featureText}>{row.label}</Text>
            </View>
            <View style={[styles.valueCell, styles.plusValue]}>{row.plus}</View>
            <View style={[styles.valueCell, styles.proValue]}>{row.pro}</View>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onOpenPlans}
        style={({ pressed }) => [styles.button, { borderColor: accent, backgroundColor: accent }, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{t('viewPlans', 'View Plans')}</Text>
      </Pressable>
    </View>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, WORLD_CUP_COLORS, themeColor} = colors;

  const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: themeColor('rgba(36, 245, 166, 0.32)', 'border'),
    backgroundColor: themeColor('rgba(22, 163, 74, 0.08)', 'surface'),
    padding: 12,
    gap: 10,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePill: {
    flex: 1,
    minWidth: 0,
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    backgroundColor: themeColor('rgba(8, 18, 13, 0.72)', 'surface'),
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  title: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  close: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColor('rgba(255,255,255,0.035)', 'surface'),
  },
  table: {
    overflow: 'hidden',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: themeColor('#26362E', 'border'),
    backgroundColor: themeColor('#131916', 'surface'),
  },
  tableRow: { minHeight: 38, flexDirection: 'row', alignItems: 'stretch' },
  tableHeader: { minHeight: 34, backgroundColor: themeColor('#101512', 'surface') },
  tableBorder: { borderTopWidth: 1, borderTopColor: themeColor('#26362E', 'border') },
  featureCell: {
    flex: 1.4,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  valueCell: {
    flex: 0.72,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderLeftWidth: 1,
    borderLeftColor: themeColor('#26362E', 'border'),
  },
  plusCell: { backgroundColor: themeColor('rgba(56, 189, 248, 0.08)', 'surface') },
  proCell: { backgroundColor: themeColor('rgba(22, 163, 74, 0.11)', 'surface') },
  plusValue: { backgroundColor: themeColor('rgba(56, 189, 248, 0.025)', 'surface') },
  proValue: { backgroundColor: themeColor('rgba(22, 163, 74, 0.035)', 'surface') },
  plusText: { color: themeColor('#38BDF8', 'text'), fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  proText: { color: themeColor('#4ADE80', 'text'), fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  featureText: { color: themeColor('#D4DED8', 'text'), fontSize: 10, lineHeight: 13, fontWeight: '700' },
  valueText: { color: themeColor('#F2F5F3', 'text'), fontSize: 9, lineHeight: 11, fontWeight: '800', textAlign: 'center' },
  button: {
    minHeight: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonText: { color: themeColor('#FFFFFF', 'text'), fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  pressed: { opacity: 0.82 },
});
  return {ACCENT, WORLD_CUP_COLORS, styles, themeColor};
});
