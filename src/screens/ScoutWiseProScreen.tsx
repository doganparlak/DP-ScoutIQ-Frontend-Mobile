import React from 'react';
import { View, Text, StyleSheet, Pressable, Image, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

import { BG, PANEL, TEXT, ACCENT, MUTED, LINE } from '@/theme';
import type { MainTabsParamList } from '@/types';

const SHIFT_UP = 14;
const SHIFT_UP_ANDROID = 44;
const isAndroid = Platform.OS === 'android';

export default function ScoutWiseProScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            isAndroid && { paddingTop: -SHIFT_UP_ANDROID },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.logoWrap}>
              <Image
                source={require('../../assets/scoutwise_logo.png')}
                style={styles.logo}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            </View>

            <View style={styles.titleWrap}>
              <Text style={styles.title}>
                <Text style={styles.titleScout}>SCOUT</Text>
                <Text style={styles.titleWise}>WISE</Text>
                <Text style={styles.titlePro}> PRO</Text>
              </Text>
            </View>

            <View style={styles.midWrap}>
              <Text style={styles.upgradeNow}>{t('goProCta', 'Upgrade to Pro now')}</Text>
            </View>

            <View style={styles.plansPanel}>
              <Text style={styles.plansTitle}>{t('proPlansTitle', 'Choose your plan')}</Text>
              <View style={styles.divider} />

              <View style={styles.plansRow}>
                <View style={styles.planCard}>
                  <View style={styles.planCenter}>
                    <Text style={styles.planName}>{t('proMonthly', 'Pro Monthly')}</Text>
                    <Text style={styles.planSub}>
                      {t('proMonthlySubtitle', 'Flexible billing')}
                    </Text>
                  </View>
                </View>

                <View style={[styles.planCard, styles.planCardFeatured]}>
                  <View style={styles.yearlyBadgeOutside}>
                    <Text style={styles.yearlyBadgeText}>{t('proYearlyDiscount', '-30%')}</Text>
                  </View>

                  <View style={styles.planCenter}>
                    <Text style={styles.planName}>{t('proYearly', 'Pro Yearly')}</Text>
                    <Text style={styles.planSub}>{t('proYearlySubtitle', 'Best value')}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.buyWrap}>
              <Pressable
                onPress={() => {
                  navigation.navigate('Profile', { screen: 'ManagePlan' } as never);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('buyNow', 'Buy now')}
                style={({ pressed }) => [styles.buyButton, pressed && { opacity: 0.9 }]}
              >
                <Text style={styles.buyButtonText}>{t('buyNow', 'Buy now')}</Text>
              </Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.panelTitle}>{t('proBenefitsTitle', 'Pro Benefits')}</Text>
              <View style={styles.divider} />

              <View style={styles.bullets}>
                <Benefit text={t('proBenefit1', 'A focused, ad-free experience')} />
                <Benefit text={t('proBenefit2', 'Priority customer support')} />
                <Benefit
                  text={t('proBenefit3', 'Support the development of new features')}
                />
              </View>
            </View>

            <View style={styles.sloganWrap}>
              <Text style={styles.slogan}>
                {t(
                  'goProSloganLine',
                  'Enhanced player scouting — seamless, sharper, and built for your next decision.',
                )}
              </Text>
              <Text style={styles.sloganCta}>{t('goProSloganCta', 'Go Pro. Stay in flow.')}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Benefit({ text }: { text: string }) {
  const { i18n } = useTranslation();

  const renderRich = () => {
    let out: React.ReactNode[] = [text];

    const apply = (needle: string) => {
      if (!needle) return;

      out = out.flatMap((chunk, idx) => {
        if (typeof chunk !== 'string') return [chunk];

        const i = chunk.indexOf(needle);
        if (i === -1) return [chunk];

        const before = chunk.slice(0, i);
        const match = chunk.slice(i, i + needle.length);
        const after = chunk.slice(i + needle.length);

        return [
          before,
          <Text key={`${needle}-${idx}`} style={styles.bulletAccent}>
            {match}
          </Text>,
          after,
        ].filter(Boolean) as React.ReactNode[];
      });
    };

    if (i18n.language?.startsWith('tr')) {
      apply('Reklamsız');
      apply('Öncelikli');
      apply('Yeni özelliklerin');
    } else {
      apply('ad-free');
      apply('Priority');
      apply('new features');
    }

    return out;
  };

  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDotOuter}>
        <View style={styles.bulletDotInner} />
      </View>

      <Text style={styles.bulletText}>{renderRich()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    transform: [{ translateY: isAndroid ? -SHIFT_UP : 0 }],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
  },
  content: {
    flex: 1,
  },
  logoWrap: {
    alignItems: 'center',
    marginTop: 14,
  },
  logo: {
    width: 126,
    height: 126,
  },
  titleWrap: {
    marginTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  titleScout: { color: TEXT },
  titleWise: { color: ACCENT },
  titlePro: { color: TEXT },
  midWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  upgradeNow: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  plansPanel: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  plansTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: LINE,
    marginTop: 12,
    marginBottom: 18,
  },
  plansRow: {
    flexDirection: 'row',
    gap: 12,
  },
  planCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: BG,
    position: 'relative',
  },
  planCardFeatured: {
    borderColor: ACCENT,
  },
  planCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
  },
  planSub: {
    marginTop: 6,
    color: MUTED,
    fontSize: 12.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  yearlyBadgeOutside: {
    position: 'absolute',
    top: -10,
    right: -10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: ACCENT,
    zIndex: 5,
    elevation: 5,
  },
  yearlyBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  panel: {
    marginTop: 16,
    borderRadius: 20,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  panelTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  bullets: {
    gap: 24,
    paddingVertical: 6,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletDotInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: ACCENT,
  },
  bulletText: {
    flex: 1,
    color: TEXT,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  bulletAccent: {
    color: ACCENT,
    fontWeight: '900',
  },
  buyWrap: {
    marginTop: 14,
    alignItems: 'center',
  },
  buyButton: {
    width: '100%',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 1,
    borderColor: ACCENT,
  },
  buyButtonText: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sloganWrap: {
    marginTop: 18,
    alignItems: 'center',
    paddingTop: 18,
  },
  slogan: {
    color: MUTED,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 520,
  },
  sloganCta: {
    marginTop: 8,
    color: TEXT,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
});
