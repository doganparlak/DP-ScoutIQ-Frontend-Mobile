import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BadgeCheck, Check, Minus, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import type { MainTabsParamList } from '@/types';
import { ACCENT, BG, CARD, LINE, MUTED, PANEL, TEXT } from '@/theme';

type PlusProUpsellProps = {
  visible: boolean;
  onClose: () => void;
  onViewPlans?: () => void;
};

type ComparisonRow = {
  label: string;
  plus: React.ReactNode;
  pro: React.ReactNode;
};

export function PlusProUpsellScreen({ visible, onClose, onViewPlans }: PlusProUpsellProps) {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();
  const insets = useSafeAreaInsets();

  const available = (label?: string) => (
    <View style={styles.valueWrap}>
      <Check size={16} color="#4ADE80" strokeWidth={3} />
      {label ? <Text style={styles.valueText}>{label}</Text> : null}
    </View>
  );
  const unavailable = <Minus size={17} color="#667069" strokeWidth={2.5} />;
  const comparisonRows: ComparisonRow[] = [
    {
      label: t('planFeatures_NoAdsMonthly', 'Ad-free'),
      plus: available(),
      pro: available(),
    },
    {
      label: t('planFeatures_DetailedReports', 'Detailed Reports & Insights'),
      plus: available(),
      pro: available(),
    },
    {
      label: t('plusProComparisonPlayers', 'Player comparison'),
      plus: available(t('plusProThreePlayers', '3 players')),
      pro: available(t('plusProThreeOrFourPlayers', '3 or 4 players')),
    },
    {
      label: t('planFeatures_CustomComparison', 'Customizable comparison'),
      plus: unavailable,
      pro: available(),
    },
    {
      label: t('plusProStrategyDiscovery', 'Strategy-aligned player discovery'),
      plus: unavailable,
      pro: available(),
    },
  ];

  const openPlans = () => {
    if (onViewPlans) {
      onViewPlans();
      return;
    }
    onClose();
    navigation.navigate('Profile', { screen: 'ManagePlan' } as any);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <View style={styles.safe}>
        <View
          style={[
            styles.topBar,
            {
              height: Math.max(insets.top, 12) + 50,
              paddingTop: Math.max(insets.top, 12),
            },
          ]}
        >
          <View style={styles.topBarSpacer} />
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('close', 'Close')}
            hitSlop={10}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <X size={23} color={TEXT} strokeWidth={2.4} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 20 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Image
              source={require('../../assets/scoutwise_logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
            <Text style={styles.wordmark}>
              <Text style={styles.wordmarkScout}>SCOUT</Text>
              <Text style={styles.wordmarkWise}>WISE</Text>
            </Text>
            <Text style={styles.upgradeNow}>
              {t('plusProUpgradeNow', 'Upgrade to Plus or Pro now')}
            </Text>
          </View>

          <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeading}>
              <View style={styles.headingIcon}>
                <BadgeCheck size={19} color={ACCENT} strokeWidth={2.4} />
              </View>
              <View style={styles.headingCopy}>
                <Text style={styles.comparisonTitle}>
                  {t('plusProComparisonTitle', 'Compare Plus and Pro')}
                </Text>
                <Text style={styles.comparisonSubtitle}>
                  {t('plusProComparisonSubtitle', 'Choose the plan that fits your ScoutWise workflow.')}
                </Text>
              </View>
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={styles.featureCell} />
                <View style={[styles.planCell, styles.plusHeaderCell]}>
                  <Text style={styles.plusHeaderText}>{t('plusPlanName', 'PLUS')}</Text>
                </View>
                <View style={[styles.planCell, styles.proHeaderCell]}>
                  <Text style={styles.proHeaderText}>{t('proPlanName', 'PRO')}</Text>
                </View>
              </View>

              {comparisonRows.map((row, index) => (
                <View key={row.label} style={[styles.tableRow, index > 0 && styles.tableRowBorder]}>
                  <View style={styles.featureCell}>
                    <Text style={styles.featureText}>{row.label}</Text>
                  </View>
                  <View style={[styles.planCell, styles.plusValueCell]}>{row.plus}</View>
                  <View style={[styles.planCell, styles.proValueCell]}>{row.pro}</View>
                </View>
              ))}
            </View>

            <View style={styles.yearlyCallout}>
              <View style={styles.discountBadge}>
                <Text style={styles.discountBadgeText}>{t('plusProYearlyDiscountBadge', '30% OFF')}</Text>
              </View>
              <View style={styles.yearlyCopy}>
                <Text style={styles.yearlyTitle}>{t('proYearly', 'Yearly Pro')}</Text>
                <Text style={styles.yearlyText}>
                  {t('plusProYearlySaving', 'Get the best price with 30% off the yearly Pro plan.')}
                </Text>
              </View>
            </View>
          </View>

          <Pressable
            onPress={openPlans}
            accessibilityRole="button"
            accessibilityLabel={t('buyNow', 'View Plans')}
            style={({ pressed }) => [styles.plansButton, pressed && styles.plansButtonPressed]}
          >
            <Text style={styles.plansButtonText}>{t('buyNow', 'View Plans')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  topBar: {
    height: 50,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBarSpacer: { width: 42, height: 42 },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
  },
  pressed: { opacity: 0.76, transform: [{ scale: 0.96 }] },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingTop: 2, paddingBottom: 30 },
  hero: { alignItems: 'center', paddingBottom: 18 },
  logo: { width: 100, height: 100 },
  wordmark: { marginTop: 8, fontSize: 27, fontWeight: '900', letterSpacing: 0.8 },
  wordmarkScout: { color: TEXT },
  wordmarkWise: { color: ACCENT },
  upgradeNow: {
    marginTop: 12,
    color: TEXT,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  comparisonCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.58)',
    backgroundColor: PANEL,
    padding: 14,
    shadowColor: ACCENT,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  comparisonHeading: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 2 },
  headingIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22,163,74,0.13)',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.4)',
  },
  headingCopy: { flex: 1 },
  comparisonTitle: { color: TEXT, fontSize: 17, fontWeight: '900' },
  comparisonSubtitle: { color: MUTED, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  table: {
    marginTop: 14,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  tableRow: { minHeight: 54, flexDirection: 'row', alignItems: 'stretch' },
  tableHeader: { minHeight: 48, backgroundColor: '#111714' },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: LINE },
  featureCell: { flex: 1.35, minWidth: 0, justifyContent: 'center', paddingHorizontal: 10 },
  planCell: {
    flex: 0.82,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderLeftWidth: 1,
    borderLeftColor: LINE,
  },
  plusHeaderCell: { backgroundColor: 'rgba(56,189,248,0.08)' },
  proHeaderCell: { backgroundColor: 'rgba(22,163,74,0.12)' },
  plusValueCell: { backgroundColor: 'rgba(56,189,248,0.025)' },
  proValueCell: { backgroundColor: 'rgba(22,163,74,0.04)' },
  plusHeaderText: { color: '#38BDF8', fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  proHeaderText: { color: '#4ADE80', fontSize: 13, fontWeight: '900', letterSpacing: 0.7 },
  featureText: { color: '#D9E2DD', fontSize: 11.5, lineHeight: 16, fontWeight: '700' },
  valueWrap: { maxWidth: '100%', alignItems: 'center', justifyContent: 'center', gap: 3 },
  valueText: { color: TEXT, fontSize: 9.5, lineHeight: 12, fontWeight: '800', textAlign: 'center' },
  yearlyCallout: {
    marginTop: 12,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.45)',
    backgroundColor: 'rgba(22,163,74,0.09)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  discountBadge: {
    borderRadius: 999,
    backgroundColor: ACCENT,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  discountBadgeText: { color: '#06150B', fontSize: 11, fontWeight: '900' },
  yearlyCopy: { flex: 1, minWidth: 0 },
  yearlyTitle: { color: '#4ADE80', fontSize: 13, fontWeight: '900' },
  yearlyText: { color: '#B7C3BC', fontSize: 10.5, lineHeight: 14, marginTop: 2, fontWeight: '600' },
  plansButton: {
    minHeight: 54,
    marginTop: 16,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: '#35C66C',
    shadowColor: ACCENT,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  plansButtonPressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  plansButtonText: { color: '#06150B', fontSize: 16, fontWeight: '900' },
});
