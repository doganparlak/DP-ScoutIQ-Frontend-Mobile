// screens/ManagePlanScreen.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { BG, TEXT, PANEL, CARD, MUTED, LINE, ACCENT } from '@/theme';
import type { Plan } from '@/services/api';
import { getMe, activateIAPSubscription, type ActivateIAPSubscriptionIn } from '@/services/api';

import {
  initConnection,
  endConnection,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  ErrorCode,
  fetchProducts,
  type EventSubscription,
  type Purchase,
  type PurchaseAndroid,
  type PurchaseIOS,
} from 'react-native-iap';

// ✅ Monthly SKUs
const IOS_SKU_MONTHLY = 'scoutwise_pro_monthly_ios';
const ANDROID_SKU_MONTHLY = 'scoutwise_pro_monthly_android';

// ✅ No Ads Monthly SKUs
const IOS_SKU_NO_ADS_MONTHLY = 'scoutwise_no_ads_monthly_ios';
const ANDROID_SKU_NO_ADS_MONTHLY = 'scoutwise_no_ads_monthly_android';

// ✅ Yearly SKUs
const IOS_SKU_YEARLY = 'scoutwise_pro_yearly_ios';
const ANDROID_SKU_YEARLY = 'scoutwise_pro_yearly_android';

const isPro = (p: Plan) => p === 'Pro Monthly' || p === 'Pro Yearly';
const isPaidSubscription = (p: Plan) => p === 'No Ads Monthly' || isPro(p);

const multiplyDisplayPrice = (displayPrice: string | undefined, multiplier: number) => {
  if (!displayPrice) return null;

  const match = displayPrice.match(/\d[\d\s.,]*/);
  if (!match || match.index == null) return null;

  const rawNumber = match[0].trim().replace(/\s/g, '');
  const commaIndex = rawNumber.lastIndexOf(',');
  const dotIndex = rawNumber.lastIndexOf('.');
  const lastSeparatorIndex = Math.max(commaIndex, dotIndex);
  const digitsAfterSeparator = lastSeparatorIndex >= 0
    ? rawNumber.length - lastSeparatorIndex - 1
    : 0;
  const decimalSeparator = lastSeparatorIndex >= 0 && digitsAfterSeparator > 0 && digitsAfterSeparator <= 2
    ? rawNumber[lastSeparatorIndex]
    : null;
  const decimalPlaces = decimalSeparator ? digitsAfterSeparator : 0;
  const normalized = decimalSeparator
    ? `${rawNumber.slice(0, lastSeparatorIndex).replace(/[.,]/g, '')}.${rawNumber.slice(lastSeparatorIndex + 1)}`
    : rawNumber.replace(/[.,]/g, '');
  const amount = Number(normalized);

  if (!Number.isFinite(amount)) return null;

  const multiplied = (amount * multiplier).toFixed(decimalPlaces);
  const localizedNumber = decimalSeparator === ',' ? multiplied.replace('.', ',') : multiplied;
  const prefix = displayPrice.slice(0, match.index);
  const suffix = displayPrice.slice(match.index + match[0].length);

  return `${prefix}${localizedNumber}${suffix}`;
};

//const log = (...args: any[]) => console.log('[IAP]', ...args);

export default function ManagePlan() {
  const nav = useNavigation();
  const { t } = useTranslation();
  const goToProfileHome = React.useCallback(() => {
    (nav as any).navigate('Profile', { screen: 'MyProfile' });
  }, [nav]);

  const [currentPlan, setCurrentPlan] = React.useState<Plan>('Free');
  const [selected, setSelected] = React.useState<Plan>('Free');
  const [saving, setSaving] = React.useState(false);
  const [subscriptionEndAt, setSubscriptionEndAt] = React.useState<string | null>(null);
  const [iapReady, setIapReady] = React.useState(false);
  const [priceMap, setPriceMap] = React.useState<Record<string, string>>({});

  // ✅ plan label for UI
  const planLabel = React.useCallback(
    (p: Plan) => {
      if (p === 'No Ads Monthly') return t('noAdsMonthly', 'No Ads Monthly');
      if (p === 'Pro Monthly') return t('proMonthly', 'Pro Monthly');
      if (p === 'Pro Yearly') return t('proYearly', 'Pro Yearly');
      return t('free', 'Free');
    },
    [t],
  );

  const planFeatures = React.useCallback((plan: Plan) => {
    if (plan === 'Free') return [t('planFeatures_Free', 'Ad-supported')];
    if (plan === 'No Ads Monthly') {
      return [
        t('planFeatures_NoAdsMonthly', 'Ad-free'),
        t('planFeatures_ThreePlayer', '3-player comparison'),
        t('planFeatures_DetailedReports', 'Detailed Reports & Insights'),
      ];
    }
    return [
      t('planFeatures_Pro', 'Ad-free'),
      t('planFeatures_ThreeOrFourPlayer', '3- or 4-player comparison'),
      t('planFeatures_CustomComparison', 'Customizable comparison'),
      t('planFeatures_DetailedReports', 'Detailed Reports & Insights'),
    ];
  }, [t]);

  const yearlyReferencePrice = React.useMemo(
    () => multiplyDisplayPrice(priceMap['Pro Monthly'], 12),
    [priceMap],
  );

  // ✅ pick SKU by selected plan
  const selectedSku = React.useMemo(() => {
    if (selected === 'No Ads Monthly') {
      return Platform.select({ ios: IOS_SKU_NO_ADS_MONTHLY, android: ANDROID_SKU_NO_ADS_MONTHLY })!;
    }
    if (selected === 'Pro Monthly') {
      return Platform.select({ ios: IOS_SKU_MONTHLY, android: ANDROID_SKU_MONTHLY })!;
    }
    if (selected === 'Pro Yearly') {
      return Platform.select({ ios: IOS_SKU_YEARLY, android: ANDROID_SKU_YEARLY })!;
    }
    return null;
  }, [selected]);

  const PLANS: Array<{ name: Plan }> = React.useMemo(
    () => [{ name: 'Free' }, { name: 'No Ads Monthly' }, { name: 'Pro Monthly' }, { name: 'Pro Yearly' }],
    [],
  );

  // ---- Load /me once ----
  React.useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const cp = (me?.plan as Plan) || 'Free';
        setCurrentPlan(cp);
        setSelected(cp);
        setSubscriptionEndAt(me.subscriptionEndAt ?? null);
      } catch {
        Alert.alert(t('error', 'Error'));
      }
    })();
  }, [t]);

  ///**
  // ---- IAP init + listeners ----
  React.useEffect(() => {
    let purchaseSub: EventSubscription | null = null;
    let errorSub: EventSubscription | null = null;

    const initIap = async () => {
      try {
        await initConnection({});
        //log('initConnection OK', { platform: Platform.OS});
        const subs = await fetchProducts({
          skus: [
            IOS_SKU_MONTHLY,
            ANDROID_SKU_MONTHLY,
            IOS_SKU_NO_ADS_MONTHLY,
            ANDROID_SKU_NO_ADS_MONTHLY,
            IOS_SKU_YEARLY,
            ANDROID_SKU_YEARLY,
          ],
          type: 'subs',
        });

        const map: Record<string, string> = {};
        //log('Subs:', subs);
        if (subs) {
          for (const s of subs) {
            if (s.id === IOS_SKU_NO_ADS_MONTHLY || s.id === ANDROID_SKU_NO_ADS_MONTHLY) {
              map['No Ads Monthly'] = s.displayPrice;
            }
            if (s.id === IOS_SKU_MONTHLY || s.id === ANDROID_SKU_MONTHLY) {
              map['Pro Monthly'] = s.displayPrice;
            }
            if (s.id === IOS_SKU_YEARLY || s.id === ANDROID_SKU_YEARLY) {
              map['Pro Yearly'] = s.displayPrice;
            }
          }
        }
        setPriceMap(map);
        setIapReady(true);
      } catch (err) {
        //log('initConnection FAILED', err);
      }
      purchaseSub = purchaseUpdatedListener(async (purchase: Purchase) => {
        //log('purchaseUpdatedListener purchase=', JSON.stringify(purchase, null, 2));
        try {
          const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

          let externalId = '';
          
          if (platform === 'android') {
            const pAndroid = purchase as PurchaseAndroid;
            externalId = pAndroid.purchaseToken ?? pAndroid.transactionId ?? '';

          } else {
            const pIOS = purchase as PurchaseIOS;
            const originalTxId = pIOS.originalTransactionIdentifierIOS ?? pIOS.transactionId;
            externalId = originalTxId ?? '';
          }

          if (!externalId) {
            //log('No externalId -> finishTransaction and stop');
            await finishTransaction({ purchase, isConsumable: false });
            setSaving(false);
            return;
          }

          const payload: ActivateIAPSubscriptionIn = {
            platform,
            product_id: purchase.productId,
            external_id: externalId,
          };

          //log('activateIAPSubscription payload=', payload);
          const res = await activateIAPSubscription(payload);
          //log('activateIAPSubscription response=', res);
          await finishTransaction({ purchase, isConsumable: false });
          //log('finishTransaction done');
          if (res?.ok) {
            setCurrentPlan(res.plan);
            setSelected(res.plan);
            if (res.subscriptionEndAt) {
              setSubscriptionEndAt(res.subscriptionEndAt);
            }

            Alert.alert(
              t('planUpdated', 'Plan updated'),
              t('planNow', 'Your plan is now {{plan}}.', { plan: planLabel(res.plan) }),
            );

            goToProfileHome();
          } else {
            Alert.alert(
              t('error', 'Error'),
              t('couldNotUpdatePlan', 'Could not update plan. Please try again.'),
            );
          }
        } catch (err: any) {
          
        } finally {
          setSaving(false);
        }
      });

      errorSub = purchaseErrorListener(err => {
        if (err.code === ErrorCode.UserCancelled) {
          setSaving(false);
          return;
        }
        setSaving(false);
        Alert.alert(t('error', 'Error'), err.message || 'Payment failed.');
      });
    };

    initIap();

    return () => {
      purchaseSub?.remove();
      errorSub?.remove();
      endConnection();
    };
  }, [nav, t]);
  //*/

  const formattedEndDate = React.useMemo(() => {
    if (!subscriptionEndAt) return null;
    const d = new Date(subscriptionEndAt);
    if (Number.isNaN(d.getTime())) return null;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}.${month}.${year}`;
  }, [subscriptionEndAt]);

  const showManageStoreSubscriptionAlert = React.useCallback(() => {
    const message =
      Platform.OS === 'ios'
        ? t(
            'manageProIOS',
            'You are already on a paid plan. Please manage it in your Apple subscription settings.',
          )
        : t(
            'manageProAndroid',
            'You are already on a paid plan. Please manage it in your Google Play subscription settings.',
          );

    Alert.alert(t('manageSubscriptionTitle', 'Manage subscription'), message, [
      { text: t('ok', 'OK') },
    ]);
  }, [t]);

  const showDownGradeAlert = React.useCallback(() => {
    const message =
      Platform.OS === 'ios'
        ? t(
            'downgradeInfoIOS',
            'To cancel your Pro plan, please manage it in your Apple subscription settings.',
          )
        : t(
            'downgradeInfoAndroid',
            'To cancel your Pro plan, please manage it in your Google Play subscription settings.',
          );

    Alert.alert(t('manageSubscriptionTitle', 'Manage subscription'), message, [
          { text: t('ok', 'OK') },
    ]);
  }, [t]);

  const onSave = async () => {
    // If user selected the same plan they already have, block and warn
    if (selected === currentPlan) {
      if (isPro(currentPlan)) {
        Alert.alert(
          t('alreadyProTitle', 'Already on Pro'),
          t('alreadyProBody', 'You already have Pro access.'),
        );
      } else if (currentPlan === 'No Ads Monthly') {
        Alert.alert(
          t('alreadyNoAdsTitle', 'Already on No Ads'),
          t('alreadyNoAdsBody', 'Your Plus Monthly plan is already active.'),
        );
      } else {
        Alert.alert(
          t('alreadyFreeTitle', 'Already on Free'),
          t('alreadyFreeBody', 'Your plan is already Free.'),
        );
      }
      return;
    }

    // ✅ Store-managed paid plan changes
    if (isPaidSubscription(currentPlan) && isPaidSubscription(selected)) {
      showManageStoreSubscriptionAlert();
      return;
    }

    // Paid -> Free downgrade: stores handle cancellation.
    if (selected === 'Free') {
      if (isPaidSubscription(currentPlan)) {
        showDownGradeAlert();
        return;
      }
    // Free -> Free no-op 
    Alert.alert(
        t('alreadyFreeTitle', 'Already on Free'),
        t('alreadyFreeBody', 'Your plan is already Free.'),
    );
    return;
    }

    // 2) Free -> paid upgrade
    if (!iapReady) {
      Alert.alert(
        t('error', 'Error'),
        t('storeNotReady', 'Store connection is not ready yet. Please try again.'),
      );
      return;
    }

    if (!selectedSku) {
      Alert.alert(
        t('error', 'Error'),
        t('noProductConfigured', 'Subscription product is not configured for this platform.'),
      );
      return;
    }

    try {
      setSaving(true);
      ///**
      await requestPurchase({
        type: 'subs',
        request: {
          ios: { sku: selectedSku },
          android: { skus: [selectedSku] },
        },
      });
      //*/
    } catch (e: any) {
      setSaving(false);
      Alert.alert(
        t('error', 'Error'),
        t('couldNotUpdatePlan', 'Could not update plan. Please try again.'),
      );
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={goToProfileHome}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityLabel={t('backToProfile', 'Back to Profile')}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>{t('myProfile', 'My Profile')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('managePlan', 'Manage Plan')}</Text>
      </View>

      {/* ✅ Scrollable content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* 1) Mobile-first plan comparison */}
          <View style={styles.planComparisonHeader}>
            <Text style={styles.planComparisonTitle}>{t('tblFeatures', 'Features')}</Text>
            <Text style={styles.planComparisonHint}>{t('planComparisonHint', 'Choose the plan that fits your workflow')}</Text>
          </View>

          <View style={styles.planCards}>
            {PLANS.map(p => {
              const active = selected === p.name;
              const duration = p.name === 'Free'
                ? t('durationUnlimited', 'Unlimited')
                : p.name === 'No Ads Monthly' || p.name === 'Pro Monthly'
                  ? t('duration_month', '1 month')
                  : t('duration_year', '1 year');
              return (
                <Pressable
                  key={p.name}
                  onPress={() => setSelected(p.name)}
                  style={({ pressed }) => [
                    styles.planCard,
                    active && styles.planCardActive,
                    pressed && styles.planCardPressed,
                  ]}
                >
                  <View style={styles.planCardTop}>
                    <View style={styles.planIdentity}>
                      <View style={[styles.planSelector, active && styles.planSelectorActive]}>
                        {active ? <View style={styles.planSelectorDot} /> : null}
                      </View>
                      <View style={styles.planNameGroup}>
                        <Text style={[styles.planName, active && styles.planNameActive]}>{planLabel(p.name)}</Text>
                        <View style={styles.planSubtitleRow}>
                          <Text style={styles.planDuration}>{duration}</Text>
                          {p.name === 'Pro Yearly' ? (
                            <>
                              <Text style={styles.planSubtitleDivider}>•</Text>
                              <Text style={[styles.planBestPrice, active && styles.planBestPriceActive]}>
                                {t('proYearlySubtitle', 'Best price')}
                              </Text>
                            </>
                          ) : null}
                        </View>
                      </View>
                    </View>
                    <View style={styles.planPriceGroup}>
                      {p.name === 'Pro Yearly' ? (
                        <View style={styles.discountBadge}><Text style={styles.discountBadgeText}>{t('proYearlyDiscount', '-30%')}</Text></View>
                      ) : null}
                      <View style={styles.planPriceRow}>
                        {p.name === 'Pro Yearly' && yearlyReferencePrice ? (
                          <Text style={styles.planOriginalPrice}>{yearlyReferencePrice}</Text>
                        ) : null}
                        <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                          {p.name === 'Free' ? t('freePrice', 'Free') : priceMap[p.name] ?? t('pricePending', '...')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.planFeatureList}>
                    {planFeatures(p.name).map(feature => (
                      <View key={feature} style={[styles.planFeaturePill, active && styles.planFeaturePillActive]}>
                        <View style={[styles.planFeatureDot, active && styles.planFeatureDotActive]} />
                        <Text style={[styles.planFeatureText, active && styles.planFeatureTextActive]}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* 1.5) Subscription end date (Pro only) */}
          {isPaidSubscription(currentPlan) && formattedEndDate && (
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>
                {t('subscriptionEndsAt', 'Subscription end date')}
              </Text>
              <Text style={styles.subscriptionValue}>{formattedEndDate}</Text>
            </View>
          )}

          {/* 2) Current plan */}
          <View style={styles.currentWrap}>
            <Text style={styles.currentLabel}>{t('currentPlan', 'Current plan')}</Text>
            <View style={styles.currentPillRow}>
              <View style={styles.currentPillBox}>
                <View style={styles.currentPill}>
                  <Text style={styles.currentPillText}>{planLabel(currentPlan)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* 3) Select plan (segmented) */}
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>{t('selectPlan', 'Select plan')}</Text>
            <View style={styles.options}>
              {PLANS.map(p => {
                const active = selected === p.name;
                return (
                  <Pressable
                    key={p.name}
                    onPress={() => setSelected(p.name)}
                    style={({ pressed }) => [
                      styles.option,
                      active && styles.optionActive,
                      pressed && { transform: [{ scale: 0.98 }] },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('choose', 'Choose')} ${planLabel(p.name)}`}
                  >
                    <Text style={[styles.optionText, active && styles.optionTextActive]}>
                      {planLabel(p.name)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity
            onPress={onSave}
            disabled={saving}
            accessibilityRole="button"
            style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryBtnText}>
              {saving ? t('saving', 'Saving...') : t('setPlan', 'Set Plan')}
            </Text>
          </TouchableOpacity>

          {/* Cancel note */}
          <Text style={styles.cancelNote}>
            {t(
              'cancelNote',
              'Your paid access will stay active until your current period ends.',
            )}
          </Text>
        </View>

        {/* Pro benefits (always visible) */}
        <View style={styles.proUpsellTable}>
          <Text style={styles.proUpsellTitle}>{t('goProTitle', 'Pro benefits')}</Text>

          <Text style={styles.proUpsellBody}>
            {t(
              'goProBody',
              'Upgrade to Pro for a faster experience.',
            )}
          </Text>
          <View style={styles.proUpsellTableInner}>
            <View style={[styles.proUpsellRow, styles.proUpsellHeaderRow]}>
              <View style={styles.proUpsellCellWrap}>
                <Text style={[styles.proUpsellCell, styles.proUpsellHeaderCell]}>
                  {t('whyGoPro', 'Why Pro?')}
                </Text>
              </View>
            </View>

            {[
              t('proBenefit2', 'Player discovery aligned with your team strategy'),
              t('proBenefitDetailedReports', 'Detailed pre-match, post-match, and team analysis reports'),
              t('proBenefitThreeWay', '3- or 4-player comparison'),
              t('proBenefitCustomComparison', 'Customizable comparison charts'),
              t('proBenefit1', 'Ad-free experience'),
              t('proBenefit4', 'Priority customer support'),
              t('proBenefit5', 'Support the development of new features'),
            ].map((benefit, index) => (
              <View key={benefit} style={styles.proUpsellRow}>
                <View style={styles.benefitNumber}><Text style={styles.benefitNumberText}>{String(index + 1).padStart(2, '0')}</Text></View>
                <View style={styles.proUpsellCellWrap}>
                  <Text style={styles.proUpsellCell}>{benefit}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.proUpsellFootnote}>
            {t('upsellNote', 'Select your Pro plan and tap “Set plan” to upgrade.')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // ✅ scrolling
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },

  // header (title below back)
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { color: TEXT, fontSize: 18, fontWeight: '800', marginRight: 2 },
  backText: { color: TEXT, fontWeight: '700' },
  title: { color: TEXT, fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center' },

  // card
  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },

  sectionTitle: { color: MUTED, fontWeight: '600', marginBottom: 10 },

  planComparisonHeader: { alignItems: 'center', gap: 4, marginBottom: 12 },
  planComparisonTitle: { color: TEXT, fontSize: 18, fontWeight: '900' },
  planComparisonHint: { color: MUTED, fontSize: 12, lineHeight: 17, textAlign: 'center' },
  planCards: { gap: 10 },
  planCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    padding: 13,
    gap: 12,
  },
  planCardActive: {
    borderColor: ACCENT,
    backgroundColor: '#15241A',
    shadowColor: ACCENT,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  planCardPressed: { opacity: 0.9, transform: [{ scale: 0.992 }] },
  planCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  planIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  planSelector: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#55605A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSelectorActive: { borderColor: ACCENT },
  planSelectorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },
  planNameGroup: { flex: 1, minWidth: 0, gap: 2 },
  planName: { color: TEXT, fontSize: 15, fontWeight: '800' },
  planNameActive: { color: '#4ADE80' },
  planSubtitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  planDuration: { color: MUTED, fontSize: 11, fontWeight: '600' },
  planSubtitleDivider: { color: '#667069', fontSize: 10, fontWeight: '800' },
  planBestPrice: { color: '#A7B5AC', fontSize: 11, fontWeight: '800' },
  planBestPriceActive: { color: '#4ADE80' },
  planPriceGroup: { alignItems: 'flex-end', gap: 5 },
  planPriceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', gap: 7 },
  planOriginalPrice: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  planPrice: { color: TEXT, fontSize: 14, fontWeight: '900' },
  planPriceActive: { color: '#4ADE80' },
  discountBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: ACCENT,
  },
  discountBadgeText: { color: '#07150C', fontSize: 11, fontWeight: '900' },
  planFeatureList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  planFeaturePill: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: '#111614',
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  planFeaturePillActive: { borderColor: 'rgba(22,163,74,0.48)', backgroundColor: 'rgba(22,163,74,0.10)' },
  planFeatureDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#718078' },
  planFeatureDotActive: { backgroundColor: '#4ADE80' },
  planFeatureText: { flexShrink: 1, color: '#CAD4CE', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  planFeatureTextActive: { color: '#DDF5E5' },

  // subscription row
  subscriptionRow: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionLabel: { color: MUTED, fontWeight: '600' },
  subscriptionValue: { color: TEXT, fontWeight: '700' },

  // current plan pill
  currentWrap: { marginTop: 14 },
  currentLabel: { color: MUTED, fontWeight: '600', marginBottom: 6, textAlign: 'left' },
  currentPillRow: { alignItems: 'center' },
  currentPillBox: { minWidth: '33%', maxWidth: '70%' },
  currentPill: {
    backgroundColor: '#18221B',
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentPillText: { color: ACCENT, fontWeight: '800', textAlign: 'center' },

  // segmented options
  label: { color: MUTED, marginBottom: 6, marginTop: 12 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionActive: { borderColor: ACCENT, backgroundColor: '#18221B' },
  optionText: { color: TEXT, fontWeight: '600', textAlign: 'center' },
  optionTextActive: { color: ACCENT },

  // CTA
  primaryBtn: {
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  primaryBtnText: { color: ACCENT, fontWeight: '900', fontSize: 16 },

  cancelNote: {
    marginTop: 8,
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
  },

  // ---- Pro upsell (separate table below main frame) ----
  proUpsellTable: {
    marginTop: 12,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 14,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LINE,
  },
  proUpsellTitle: { color: ACCENT, fontWeight: '900', fontSize: 16, textAlign: 'center' },
  proUpsellBody: { color: MUTED, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 16 },

  proUpsellTableInner: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  proUpsellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
    backgroundColor: CARD,
  },
  proUpsellHeaderRow: { backgroundColor: '#151716', borderTopWidth: 0 },

  // text
  proUpsellCell: { textAlign: 'left', color: TEXT, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  proUpsellHeaderCell: { color: MUTED, fontWeight: '800', textAlign: 'center' },
  benefitNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.45)',
    backgroundColor: 'rgba(22,163,74,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitNumberText: { color: ACCENT, fontSize: 10, fontWeight: '900' },

  // ✅ true "cell" wrapper for vertical alignment
  proUpsellCellWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
  },

  proUpsellFootnote: {
    marginTop: 10,
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
  },
});
