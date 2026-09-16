import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Check, Minus, X } from 'lucide-react-native';

import { ACCENT, WORLD_CUP_COLORS } from '@/theme';

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
  const { t } = useTranslation();
  const accent = worldCupMode ? WORLD_CUP_COLORS.lavender : ACCENT;
  const available = () => <Check size={14} color="#4ADE80" strokeWidth={3} />;
  const unavailable = () => <Minus size={14} color="#68736C" strokeWidth={2.5} />;
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
        worldCupMode && { borderColor: accent, backgroundColor: 'rgba(167, 132, 244, 0.10)' },
        containerStyle,
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.icon,
            {
              borderColor: accent,
              backgroundColor: worldCupMode ? 'rgba(167, 132, 244, 0.16)' : 'rgba(22, 163, 74, 0.12)',
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
          <X size={16} color="#8F8F99" strokeWidth={2.4} />
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

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.32)',
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
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
    backgroundColor: 'rgba(8, 18, 13, 0.72)',
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
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  table: {
    overflow: 'hidden',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#26362E',
    backgroundColor: '#131916',
  },
  tableRow: { minHeight: 38, flexDirection: 'row', alignItems: 'stretch' },
  tableHeader: { minHeight: 34, backgroundColor: '#101512' },
  tableBorder: { borderTopWidth: 1, borderTopColor: '#26362E' },
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
    borderLeftColor: '#26362E',
  },
  plusCell: { backgroundColor: 'rgba(56, 189, 248, 0.08)' },
  proCell: { backgroundColor: 'rgba(22, 163, 74, 0.11)' },
  plusValue: { backgroundColor: 'rgba(56, 189, 248, 0.025)' },
  proValue: { backgroundColor: 'rgba(22, 163, 74, 0.035)' },
  plusText: { color: '#38BDF8', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  proText: { color: '#4ADE80', fontSize: 10, fontWeight: '900', letterSpacing: 0.6 },
  featureText: { color: '#D4DED8', fontSize: 10, lineHeight: 13, fontWeight: '700' },
  valueText: { color: '#F2F5F3', fontSize: 9, lineHeight: 11, fontWeight: '800', textAlign: 'center' },
  button: {
    minHeight: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
  pressed: { opacity: 0.82 },
});
