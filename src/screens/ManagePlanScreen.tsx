import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
// screens/ManagePlanScreen.tsx
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import type {TFunction} from 'i18next';
import {
Alert,
AppState,
Linking,
Platform,
Pressable,
ScrollView,
StyleSheet,
Text,
TextInput,
TouchableOpacity,
View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import type { Plan, ReferralState } from '@/services/api';
import {getReferralOffers, setReferralCode} from '@/services/api';
import {formatMoney, paidPlans, planPeriod, referralPlanKey, subscriptionSavings, subscriptionPrice} from '@/utils/subscriptionOffers';
import { activateIAPSubscription,getMe,type ActivateIAPSubscriptionIn } from '@/services/api';

import {
endConnection,
ErrorCode,
fetchProducts,
finishTransaction,
initConnection,
getStorefront,
getAppTransactionIOS,
presentCodeRedemptionSheetIOS,
purchaseErrorListener,
purchaseUpdatedListener,
requestPurchase,
type EventSubscription,
type Purchase,
type PurchaseAndroid,
type PurchaseIOS,
type ProductSubscription,
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

function periodLabel(period: string, t: TFunction) {
  const match = /^P(\d+)([DWMY])$/.exec(period);
  return match ? t(`offerPeriod${match[2]}`, {count: Number(match[1])}) : period;
}

//const log = (...args: any[]) => console.log('[IAP]', ...args);

function PlanFeatureLabel({ label, color }: { label: string; color: string }) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles} = themed;

  const emphasis = label.match(/^(?:3’lü ve 4’lü|3- and 4-way|2’li|3’lü|2-way|3-way|Temel|Genişletilmiş|Kapsamlı|Sınırlı|Sınırsız|Detaylı|Özel|Reklamlı|Reklamsız|Basic|Extended|Comprehensive|Limited|Unlimited|Detailed|Custom|Ad-free|With ads)(?=\s|$)/u)?.[0];
  return <Text style={styles.planFeatureText}>
    {emphasis ? <><Text style={{ color, fontWeight: '900' }}>{emphasis}</Text>{label.slice(emphasis.length)}</> : label}
  </Text>;
}

export default function ManagePlan() {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, themeColor} = themed;

  const nav = useNavigation();
  const { t, i18n } = useTranslation();
  const goToProfileHome = React.useCallback(() => {
    (nav as any).navigate('Profile', { screen: 'MyProfile' });
  }, [nav]);

  const [currentPlan, setCurrentPlan] = React.useState<Plan>('Free');
  const [selected, setSelected] = React.useState<Plan>('Free');
  const [proBillingPlan, setProBillingPlan] = React.useState<Plan>('Pro Monthly');

  React.useEffect(() => {
    if (selected === 'Pro Monthly' || selected === 'Pro Yearly') setProBillingPlan(selected);
  }, [selected]);
  const [saving, setSaving] = React.useState(false);
  const [subscriptionEndAt, setSubscriptionEndAt] = React.useState<string | null>(null);
  const [iapReady, setIapReady] = React.useState(false);
  const [products, setProducts] = React.useState<ProductSubscription[]>([]);
  const [referral, setReferral] = React.useState<ReferralState>({code: null, offers: {}});
  const [referralInput, setReferralInput] = React.useState('');
  const [referralBusy, setReferralBusy] = React.useState(false);
  const [referralError, setReferralError] = React.useState('');
  const [storeEnvironment, setStoreEnvironment] = React.useState<'production' | 'sandbox'>('production');
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const pricing = React.useMemo(() => {
    const result: Partial<Record<Plan, ReturnType<typeof subscriptionPrice>>> = {};
    for (const plan of paidPlans) {
      const sku = platform === 'ios'
        ? plan === 'No Ads Monthly' ? IOS_SKU_NO_ADS_MONTHLY : plan === 'Pro Monthly' ? IOS_SKU_MONTHLY : IOS_SKU_YEARLY
        : plan === 'No Ads Monthly' ? ANDROID_SKU_NO_ADS_MONTHLY : plan === 'Pro Monthly' ? ANDROID_SKU_MONTHLY : ANDROID_SKU_YEARLY;
      const product = products.find(item => item.id === sku);
      if (product) result[plan] = subscriptionPrice(product, plan, referral.offers[referralPlanKey(plan)], storeEnvironment);
    }
    return result;
  }, [products, referral, platform, storeEnvironment]);
  const refreshCatalog = React.useCallback(async () => {
    const skus = platform === 'ios'
      ? [IOS_SKU_MONTHLY, IOS_SKU_NO_ADS_MONTHLY, IOS_SKU_YEARLY]
      : [ANDROID_SKU_MONTHLY, ANDROID_SKU_NO_ADS_MONTHLY, ANDROID_SKU_YEARLY];
    const subs = await fetchProducts({skus, type: 'subs'});
    const nextProducts = (subs ?? []).filter((item): item is ProductSubscription => item.type === 'subs');
    const country = await getStorefront().catch(() => '');
    // TestFlight is a release build, but StoreKit identifies its sandbox environment.
    let nextEnvironment: 'production' | 'sandbox' = 'production';
    if (platform === 'ios') {
      const appTransaction = await getAppTransactionIOS().catch(() => null);
      const environment = appTransaction?.environment?.toLowerCase();
      if (environment === 'sandbox' || (!environment && __DEV__)) nextEnvironment = 'sandbox';
    }
    const nextReferral = await getReferralOffers(platform, country, nextEnvironment);
    setProducts(nextProducts);
    setReferral(nextReferral);
    setStoreEnvironment(nextEnvironment);
    setReferralError('');
    return {products: nextProducts, referral: nextReferral, storeEnvironment: nextEnvironment};
  }, [platform]);
  const applyReferral = async () => {
    if (referralBusy || saving || !referralInput.trim()) return;
    setReferralBusy(true);
    setReferralError('');
    try {
      const saved = await setReferralCode(referralInput);
      setReferral(previous => ({...previous, code: saved.code}));
      setReferralInput('');
      await refreshCatalog();
    } catch { setReferralError(t('referralApplyFailed')); }
    finally { setReferralBusy(false); }
  };

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
    const keys = plan === 'Free'
      ? ['Ads', 'LimitedPro', 'BasicSimilar', 'BasicLeague', 'LimitedReports', 'TwoWay']
      : plan === 'No Ads Monthly'
        ? ['NoAds', 'LimitedPro', 'MoreSimilar', 'ExtendedLeague', 'DetailedReports', 'ThreeWay']
        : ['NoAds', 'UnlimitedPro', 'ComprehensiveSimilar', 'DetailedLeague', 'DetailedReports', 'FourWay', 'Custom'];
    return keys.map(key => t(`planPill${key}`));
  }, [t]);

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
    () => [{ name: 'Free' }, { name: 'No Ads Monthly' }, { name: proBillingPlan }],
    [proBillingPlan],
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
      setIapReady(false);
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
            throw new Error('Purchase identifier unavailable');
          }

          const payload: ActivateIAPSubscriptionIn = {
            platform,
            product_id: purchase.productId,
            external_id: externalId,
          };

          //log('activateIAPSubscription payload=', payload);
          const res = await activateIAPSubscription(payload);
          //log('activateIAPSubscription response=', res);
          if (res?.ok) {
            await finishTransaction({purchase, isConsumable: false});
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
          Alert.alert(t('error'), t('couldNotUpdatePlan'));
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
      try {
        await initConnection({});
        //log('initConnection OK', { platform: Platform.OS});
        await refreshCatalog();
        setIapReady(true);
      } catch (err) {
        setReferralError(t('referralLoadFailed'));
      }
    };

    initIap();

    return () => {
      purchaseSub?.remove();
      errorSub?.remove();
      endConnection();
    };
  }, [nav, t, refreshCatalog]);
  //*/

  React.useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active' && iapReady) {
        refreshCatalog().catch(() => { setReferralError(t('referralLoadFailed')); });
        getMe().then(me => {
          setCurrentPlan(me.plan as Plan);
          setSubscriptionEndAt(me.subscriptionEndAt ?? null);
        }).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [iapReady, refreshCatalog, t]);

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
    if (saving || referralBusy) return;
    const appleRedemption = platform === 'ios' && pricing[selected]?.hasOffer;
    if (!appleRedemption && selected === currentPlan) {
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
    if (!appleRedemption && isPaidSubscription(currentPlan) && isPaidSubscription(selected)) {
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
      // Revalidate mappings immediately before checkout (a code/offer may be disabled).
      const fresh = await refreshCatalog();
      const product = fresh.products.find(item => item.id === selectedSku);
      if (!product) throw new Error('Product unavailable');
      const price = subscriptionPrice(product, selected, fresh.referral.offers[referralPlanKey(selected)], fresh.storeEnvironment);
      const shown = pricing[selected];
      if (price.hasOffer !== shown?.hasOffer || price.redemptionCode !== shown?.redemptionCode || price.sandbox !== shown?.sandbox
        || price.offerToken !== shown?.offerToken || price.offerAmount !== shown?.offerAmount
        || price.regularAmount !== shown?.regularAmount || price.currency !== shown?.currency
        || JSON.stringify(price.phases) !== JSON.stringify(shown?.phases)) {
        setSaving(false);
        Alert.alert(t('referralOfferChanged'), t('referralReviewPrices'));
        return;
      }
      if (platform === 'ios' && price.hasOffer) {
        setSaving(false);
        Alert.alert(t('referralRedeemTitle'), t(fresh.storeEnvironment === 'sandbox' ? 'referralSandboxBody' : 'referralRedeemBody', {code: price.redemptionCode}), [
          {text: t('cancel'), style: 'cancel'},
          {text: t('referralRedeem'), onPress: async () => {
            try {
              if (fresh.storeEnvironment === 'sandbox') {
                // Apple's sandbox uses one-time codes entered by the tester in this sheet.
                await presentCodeRedemptionSheetIOS();
              } else {
                await Linking.openURL(`https://apps.apple.com/redeem?ctx=offercodes&id=6755595849&code=${encodeURIComponent(price.redemptionCode!)}`);
              }
            } catch { Alert.alert(t('error'), t('referralRedemptionFailed')); }
          }},
        ]);
        return;
      }
      if (platform === 'android' && !price.offerToken) throw new Error('Base plan unavailable');
      await requestPurchase({type: 'subs', request: {
        ios: {sku: selectedSku},
        android: {skus: [selectedSku], subscriptionOffers: [{sku: selectedSku, offerToken: price.offerToken!}]},
      }});
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
          <View style={styles.referralBox}>
            <Text style={styles.referralTitle}>{t(referral.code ? 'referralApplied' : 'referralOptional', {code: referral.code})}</Text>
            {!referral.code && <View style={styles.referralInputRow}>
              <TextInput value={referralInput} onChangeText={setReferralInput}
                placeholder={t('referralPlaceholder')} placeholderTextColor={themed.MUTED}
                autoCapitalize="characters" autoCorrect={false} maxLength={32}
                editable={!saving && !referralBusy} style={styles.referralInput}
                returnKeyType="done" onSubmitEditing={applyReferral} />
              <Pressable onPress={applyReferral} disabled={saving || referralBusy || !referralInput.trim()}
                style={[styles.referralApply, (saving || referralBusy || !referralInput.trim()) && {opacity: .5}]}>
                <Text style={styles.referralApplyText}>{t(referralBusy ? 'saving' : 'referralApply')}</Text>
              </Pressable>
            </View>}
            <Text style={styles.billingHint}>{t(referral.code ? 'referralStoreEligibility' : 'referralPermanent')}</Text>
            {!!referralError && <Text style={styles.referralError}>{referralError}</Text>}
          </View>
          {/* 1) Mobile-first plan comparison */}
          <View style={styles.planComparisonHeader}>
            <Text style={styles.planComparisonTitle}>{t('tblFeatures', 'Features')}</Text>
            <Text style={styles.planComparisonHint}>{t('planComparisonHint', 'Choose the plan that fits your workflow')}</Text>
          </View>

          <View style={styles.planCards}>
            {PLANS.map(p => {
              const price = pricing[p.name];
              const offeredPrice = price?.offerAmount != null ? formatMoney(price.offerAmount, price.currency, i18n.language) : undefined;
              const displayPrice = price?.offerDisplay ?? offeredPrice ?? price?.regularDisplay;
              const {reference, discount} = subscriptionSavings(p.name, price, pricing['Pro Monthly']);
              const originalPrice = discount && reference != null && price
                ? formatMoney(reference, price.currency, i18n.language) : undefined;
              const regularYearlyPrice = p.name === 'Pro Yearly' && price?.hasOffer && price.comparable
                && price.regularAmount != null && price.offerAmount != null
                && price.offerAmount < price.regularAmount && price.regularAmount !== reference
                ? formatMoney(price.regularAmount, price.currency, i18n.language) : undefined;
              const active = selected === p.name;
              const proCard = isPro(p.name);
              const featureColor = proCard ? themeColor('#4ADE80') : p.name === 'No Ads Monthly' ? themeColor('#38BDF8') : themeColor('#CBD5E1');
              const duration = p.name === 'Free'
                ? t('durationUnlimited', 'Unlimited')
                : p.name === 'No Ads Monthly' || p.name === 'Pro Monthly'
                  ? t('duration_month', '1 month')
                  : t('duration_year', '1 year');
              return (
                <View
                  key={proCard ? 'pro' : p.name}
                  style={[styles.planCard, active && styles.planCardActive]}
                >
                  <Pressable
                    onPress={() => setSelected(p.name)}
                    disabled={saving}
                    accessibilityRole="radio"
                    accessibilityState={{checked: active, disabled: saving}}
                    accessibilityLabel={`${t('choose', 'Choose')} ${planLabel(p.name)}`}
                    style={({pressed}) => [styles.planCardTop, pressed && {opacity: .75}]}
                  >
                    <View style={styles.planIdentity}>
                      <View style={[styles.planSelector, active && styles.planSelectorActive]}>
                        {active ? <View style={styles.planSelectorDot} /> : null}
                      </View>
                      <View style={styles.planNameGroup}>
                        <Text style={[styles.planName, active && styles.planNameActive]}>{proCard ? 'Pro' : planLabel(p.name)}</Text>
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
                      {discount != null ? (
                        <View style={styles.discountBadge}><Text style={styles.discountBadgeText}>−{new Intl.NumberFormat(i18n.language, {maximumFractionDigits: 1}).format(discount)}%</Text></View>
                      ) : null}
                      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.planPriceRow}>
                        {originalPrice ? (
                          <Text style={styles.planOriginalPrice}>{originalPrice}{'  '}</Text>
                        ) : null}
                        {regularYearlyPrice ? (
                          <Text style={styles.planOriginalPrice}>{regularYearlyPrice}{'  '}</Text>
                        ) : null}
                        <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                          {p.name === 'Free' ? t('freePrice', 'Free') : displayPrice ?? t('pricePending', '...')}
                        </Text>
                      </Text>
                    </View>
                  </Pressable>

                  {price?.hasOffer && <View style={styles.offerDetails}>
                    <Text style={styles.referralTitle}>{t('referralOfferAvailable')}</Text>
                    {price.phases ? price.phases.map((phase, index) => <Text key={index} style={styles.offerDetailText}>
                      {phase.recurrenceMode === 1
                        ? t('referralRenewal', {price: phase.formattedPrice, period: periodLabel(phase.billingPeriod, t)})
                        : t('referralPhase', {price: phase.formattedPrice, period: periodLabel(phase.billingPeriod, t), count: phase.billingCycleCount || 1})}
                    </Text>) : <>
                      <Text style={styles.offerDetailText}>{price.offerAmount != null
                        ? t('referralPhase', {price: displayPrice, period: periodLabel(price.offerPeriod ?? planPeriod(p.name), t), count: price.offerCycles})
                        : t('referralApplePriceConfirmation')}</Text>
                      <Text style={styles.offerDetailText}>{t('referralRenewal', {price: price.regularDisplay, period: periodLabel(planPeriod(p.name), t)})}</Text>
                    </>}
                  </View>}

                  {proCard && <View style={styles.billingSection}>
                    <View accessibilityRole="radiogroup" accessibilityLabel={t('planBillingPeriod', 'Billing period')} style={styles.billingSwitch}>
                      {(['Pro Monthly', 'Pro Yearly'] as const).map(period => {
                        const chosen = proBillingPlan === period;
                        return <Pressable key={period} disabled={saving}
                          accessibilityRole="radio" accessibilityState={{checked: chosen, disabled: saving}}
                          accessibilityLabel={planLabel(period)}
                          onPress={() => {setProBillingPlan(period); setSelected(period);}}
                          style={({pressed}) => [styles.billingOption, chosen && styles.billingOptionActive, pressed && {opacity: .75}]}>
                          <Text style={[styles.billingOptionText, chosen && styles.billingOptionTextActive]}>{t(period === 'Pro Monthly' ? 'planBillingMonthly' : 'planBillingYearly')}</Text>
                        </Pressable>;
                      })}
                    </View>
                  </View>}

                  <View style={styles.planFeatureList}>
                    {planFeatures(p.name).map(feature => (
                      <View key={feature} style={[styles.planFeaturePill, active && styles.planFeaturePillActive]}>
                        <View style={[styles.planFeatureDot, active && styles.planFeatureDotActive]} />
                        <PlanFeatureLabel label={feature} color={featureColor} />
                      </View>
                    ))}
                  </View>
                </View>
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

          {/* Save */}
          <TouchableOpacity
            onPress={onSave}
            disabled={saving || referralBusy}
            accessibilityRole="button"
            style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
          >
            <Text style={styles.primaryBtnText}>
              {saving ? t('saving', 'Saving...') : platform === 'ios' && pricing[selected]?.hasOffer ? t('referralRedeem') : t('setPlan', 'Set Plan')}
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
              t('proBenefitUnlimited', "Unlimited access to ScoutWise Pro"),
              t('proBenefitFit', "Team, league and team strategy fit analysis"),
              t('proBenefitSimilar', "Discover alternative profiles with detailed similar-player analysis"),
              t('proBenefitLeaguePerformance', "League performance analysis with advanced metrics"),
              t('proBenefitDetailedReports', "Detailed scouting, pre-match, post-match and team analysis reports"),
              t('proBenefitThreeWay', "3- or 4-player comparison"),
              t('proBenefitCustomComparison', "Customizable comparison charts"),
              t('proBenefit1', "Ad-free experience"),
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


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {BG, TEXT, PANEL, CARD, MUTED, LINE, ACCENT, themeColor} = colors;

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
  referralBox: {marginBottom: 18, gap: 8},
  referralTitle: {color: ACCENT, fontWeight: '800', fontSize: 13},
  referralInputRow: {flexDirection: 'row', gap: 8, alignItems: 'center'},
  referralInput: {flex: 1, minWidth: 0, color: TEXT, backgroundColor: CARD, borderColor: LINE, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, minHeight: 46},
  referralApply: {backgroundColor: ACCENT, borderRadius: 12, paddingHorizontal: 14, minHeight: 46, justifyContent: 'center'},
  referralApplyText: {color: '#fff', fontWeight: '800'},
  referralError: {color: themeColor('#EF4444'), fontSize: 12},
  offerDetails: {padding: 12, gap: 5, borderWidth: 1, borderColor: LINE,
    borderRadius: 12, backgroundColor: BG},
  offerDetailText: {color: MUTED, fontSize: 12, lineHeight: 18},

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
    backgroundColor: themeColor('#15241A', 'surface'),
    shadowColor: ACCENT,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  planCardPressed: { opacity: 0.9, transform: [{ scale: 0.992 }] },
  planCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  planIdentity: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  planSelector: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: themeColor('#55605A', 'border'),
    alignItems: 'center',
    justifyContent: 'center',
  },
  planSelectorActive: { borderColor: ACCENT },
  planSelectorDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ACCENT },
  planNameGroup: { flex: 1, minWidth: 0, gap: 2 },
  planName: { color: TEXT, fontSize: 15, fontWeight: '800' },
  planNameActive: { color: themeColor('#4ADE80', 'text') },
  planSubtitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  planDuration: { color: MUTED, fontSize: 11, fontWeight: '600' },
  planSubtitleDivider: { color: themeColor('#667069', 'text'), fontSize: 10, fontWeight: '800' },
  planBestPrice: { color: themeColor('#A7B5AC', 'text'), fontSize: 11, fontWeight: '800' },
  planBestPriceActive: { color: themeColor('#4ADE80', 'text') },
  planPriceGroup: { flexGrow: 1.65, flexShrink: 1, flexBasis: 0, minWidth: 0, alignItems: 'flex-end', gap: 5 },
  planPriceRow: { alignSelf: 'stretch', textAlign: 'right', fontSize: 14 },
  planOriginalPrice: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
    textDecorationLine: 'line-through',
  },
  planPrice: { color: TEXT, fontSize: 14, fontWeight: '900' },
  planPriceActive: { color: themeColor('#4ADE80', 'text') },
  discountBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: ACCENT,
  },
  discountBadgeText: { color: themeColor('#07150C', 'onAccent'), fontSize: 11, fontWeight: '900' },
  billingSection: { gap: 8 },
  billingSwitch: { flexDirection: 'row', gap: 6, borderRadius: 14, padding: 5, borderWidth: 1, borderColor: LINE, backgroundColor: BG },
  billingOption: { flex: 1, minWidth: 0, minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  billingOptionActive: { borderColor: ACCENT, backgroundColor: themeColor('rgba(22,163,74,.15)', 'surface') },
  billingOptionText: { color: MUTED, fontSize: 13, fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  billingOptionTextActive: { color: themeColor('#4ADE80', 'text'), fontWeight: '900' },
  billingHint: { color: MUTED, fontSize: 11, lineHeight: 17 },
  planFeatureList: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  planFeaturePill: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: themeColor('#111614', 'surface'),
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  planFeaturePillActive: { borderColor: themeColor('rgba(22,163,74,0.48)', 'border'), backgroundColor: themeColor('rgba(22,163,74,0.10)', 'surface') },
  planFeatureDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: themeColor('#718078', 'surface') },
  planFeatureDotActive: { backgroundColor: themeColor('#4ADE80', 'surface') },
  planFeatureText: { flexShrink: 1, color: themeColor('#CAD4CE', 'text'), fontSize: 11, lineHeight: 15, fontWeight: '600' },

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
    backgroundColor: themeColor('#18221B', 'surface'),
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
  optionActive: { borderColor: ACCENT, backgroundColor: themeColor('#18221B', 'surface') },
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
    backgroundColor: themeColor('rgba(22, 163, 74, 0.12)', 'surface'),
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
  proUpsellHeaderRow: { backgroundColor: themeColor('#151716', 'surface'), borderTopWidth: 0 },

  // text
  proUpsellCell: { textAlign: 'left', color: TEXT, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  proUpsellHeaderCell: { color: MUTED, fontWeight: '800', textAlign: 'center' },
  benefitNumber: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: themeColor('rgba(22,163,74,0.45)', 'border'),
    backgroundColor: themeColor('rgba(22,163,74,0.10)', 'surface'),
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
  return {BG, TEXT, PANEL, CARD, MUTED, LINE, ACCENT, styles, themeColor};
});
