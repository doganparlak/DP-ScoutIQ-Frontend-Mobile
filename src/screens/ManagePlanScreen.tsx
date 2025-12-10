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
  NativeModules
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { BG, TEXT, PANEL, CARD, MUTED, LINE, ACCENT } from '@/theme';
import type { Plan } from '@/services/api';
import {
  getMe,
  activateIAPSubscription,
  type ActivateIAPSubscriptionIn,
} from '@/services/api';
/**

import {
  initConnection,
  endConnection,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  ErrorCode,
  type EventSubscription,
  type Purchase,
  type PurchaseAndroid,
  type PurchaseIOS,
} from 'react-native-iap';

 */
const IOS_SKU = 'scoutwise_pro_monthly_ios'; // <- your App Store product id
const ANDROID_SKU = 'scoutwise_pro_monthly_android'; // <- your Play Store product id
const SUBS_SKU = Platform.select({ ios: IOS_SKU, android: ANDROID_SKU })!;

const PLANS: Array<{ name: Plan; price: string }> = [
  { name: 'Free', price: 'FREE' },
  { name: 'Pro', price: '$2.99' },
];

export default function ManagePlan() {
  const nav = useNavigation();
  const { t } = useTranslation();

  const [currentPlan, setCurrentPlan] = React.useState<Plan>('Free');
  const [selected, setSelected] = React.useState<Plan>('Free');
  const [saving, setSaving] = React.useState(false);
  const [subscriptionEndAt, setSubscriptionEndAt] = React.useState<string | null>(null);
  const [iapReady, setIapReady] = React.useState(false);

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
        // ignore
        Alert.alert(
              t('error', 'Error'),
        );
      }
    })();
  }, []);

  /**
  // ---- IAP init + listeners ----
  React.useEffect(() => {
    let purchaseSub: EventSubscription | null = null;
    let errorSub: EventSubscription | null = null;

    const initIap = async () => {
      try {
        await initConnection({});
        setIapReady(true);
      } catch (err) {

      }

      purchaseSub = purchaseUpdatedListener(async (purchase: Purchase) => {
        try {
          const platform: 'ios' | 'android' =
            purchase.platform === 'ios' ? 'ios' : 'android';

          let externalId = '';

          if (platform === 'android') {
            const pAndroid = purchase as PurchaseAndroid;
            // For server-side Google Play validation you need purchaseToken
            externalId = pAndroid.purchaseToken ?? pAndroid.transactionId ?? '';
          } else {
            const pIOS = purchase as PurchaseIOS;

            // For App Store Server API we want the *original* transaction id
            const originalTxId =
              pIOS.originalTransactionIdentifierIOS ?? pIOS.transactionId;

            externalId = originalTxId ?? '';
          }

          if (!externalId) {
            // Still finish the transaction to avoid it being re-delivered forever
            await finishTransaction({ purchase, isConsumable: false });
            setSaving(false);
            return;
          }

          const payload: ActivateIAPSubscriptionIn = {
            platform,
            product_id: purchase.productId, // e.g. "scoutwise_pro_monthly_ios"
            external_id: externalId,        // iOS: originalTxId, Android: purchaseToken
          };

          const res = await activateIAPSubscription(payload);

          // Always finish the transaction (non-consumable subscription)
          await finishTransaction({ purchase, isConsumable: false });

          if (res?.ok) {
            setCurrentPlan(res.plan);
            setSelected(res.plan);
            if (res.subscriptionEndAt) {
              setSubscriptionEndAt(res.subscriptionEndAt);
            }

            Alert.alert(
              t('planUpdated', 'Plan updated'),
              t('planNow', 'Your plan is now {{plan}}.', { plan: res.plan }),
            );

            // @ts-ignore
            nav.goBack();
          } else {
            Alert.alert(
              t('error', 'Error'),
              t('couldNotUpdatePlan', 'Could not update plan. Please try again.'),
            );
          }
        } catch (err: any) {
          Alert.alert(
            'purchaseUpdatedListener error',
            t('couldNotUpdatePlan', 'Could not update plan. Please try again.'),
          );
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
 */
  const formattedEndDate = React.useMemo(() => {
  if (!subscriptionEndAt) return null;
  const d = new Date(subscriptionEndAt);
  if (Number.isNaN(d.getTime())) return null;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}.${month}.${year}`;
}, [subscriptionEndAt]);

  const onSave = async () => {
    // 0) If user selected the same plan they already have, block and warn
      if (selected === currentPlan) {
        if (currentPlan === 'Pro') {
          Alert.alert(
            t('alreadyProTitle', 'Already on Pro'),
            t('alreadyProBody', 'You already have Pro access.'),
          );
        } else {
          Alert.alert(
            t('alreadyFreeTitle', 'Already on Free'),
            t('alreadyFreeBody', 'Your plan is already Free.'),
          );
        }
        return;
      }
   
    // 1) Pro -> Free downgrade just inform stores handle those
    if (selected === 'Free') {
      if (currentPlan === 'Pro') {
        const endDateText =
          formattedEndDate ??
          t('currentPeriodEnd', 'the end of your current billing period');
        const message =
          Platform.OS === 'ios'
            ? t(
                'downgradeInfoIOS',
                'To cancel your Pro plan, please manage it in your Apple subscription settings. You will keep Pro access until {{date}}.',
                { date: endDateText },
              )
            : t(
                'downgradeInfoAndroid',
                'To cancel your Pro plan, please manage it in your Google Play subscription settings. You will keep Pro access until {{date}}.',
                { date: endDateText },
              );
        Alert.alert(
          t('manageSubscriptionTitle', 'Manage subscription'),
          message,
          [{ text: t('ok', 'OK') }],
        );
        return;
      }
            // If somehow not Pro but switching to Free, just explain nothing to do
      Alert.alert(
        t('alreadyFreeTitle', 'Already on Free'),
        t('alreadyFreeBody', 'Your plan is already Free.'),
      );
      return;
    }

    // 2) Free -> Pro upgrade
    if (!iapReady) {
      Alert.alert(
        t('error', 'Error'),
        t('storeNotReady', 'Store connection is not ready yet. Please try again.'),
      );
      return;
    }

    if (!SUBS_SKU) {
      Alert.alert(
        t('error', 'Error'),
        t(
          'noProductConfigured',
          'Subscription product is not configured for this platform.',
        ),
      );
      return;
    }

    try {
      setSaving(true);
      /**
      await requestPurchase({
        type: 'subs',       
        request: {
          ios: {
            sku: SUBS_SKU,
          },
          android: {
            skus: [SUBS_SKU],
          },
        },
      });
      */
    } catch (e: any) {
      setSaving(false);
      Alert.alert(
        t('error', 'Error'),
        t('couldNotUpdatePlan', 'Could not update plan. Please try again.'),
      );
    }
  };

  const Row = ({ p }: { p: (typeof PLANS)[number] }) => {
    const active = selected === p.name;
    return (
      <Pressable
        onPress={() => setSelected(p.name)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: CARD },
          active && styles.rowActive,
          pressed && { opacity: 0.9 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${p.name} plan row`}
      >
        <Text style={[styles.cell, styles.name, active && styles.cellActive]}>{p.name}</Text>
        <Text style={[styles.cell, active && styles.cellActive]}>{p.price}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityLabel={t('backToProfile', 'Back to Profile')}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>{t('myProfile', 'My Profile')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('managePlan', 'Manage Plan')}</Text>
      </View>

      <View style={styles.card}>
        {/* 1) Plans table */}
        <Text style={styles.sectionTitle}>{t('planOptions', 'Plan options')}</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.name]}>
              {t('plan', 'Plan')}
            </Text>
            <Text style={[styles.cell, styles.headerCell]}>
              {t('price', 'Price/Month')}
            </Text>
          </View>
          {PLANS.map(p => (
            <Row key={p.name} p={p} />
          ))}
        </View>

        {/* 1.5) Subscription end date (Pro only) */}
        {currentPlan === 'Pro' && formattedEndDate && (
          <View style={styles.subscriptionRow}>
            <Text style={styles.subscriptionLabel}>
              {t('subscriptionEndsAt', 'Pro subscription end date')}
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
                <Text style={styles.currentPillText}>{currentPlan}</Text>
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
                  accessibilityLabel={`${t('choose', 'Choose')} ${p.name}`}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {p.name}
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
            {saving ? t('saving', 'Saving...') : t('setPlan', 'Set plan')}
          </Text>
        </TouchableOpacity>

        {/* Cancel note */}
        <Text style={styles.cancelNote}>
          {t(
            'cancelNote',
            'To cancel your Pro subscription, set your plan to Free. Your Pro access will stay active until your current period ends.',
          )}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

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

  // table
  table: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  headerRow: { backgroundColor: '#151716', borderTopWidth: 0 },
  rowActive: { backgroundColor: '#18221B', borderLeftWidth: 3, borderLeftColor: ACCENT },
  cell: { flex: 1, color: TEXT, fontSize: 14, textAlign: 'center' },
  cellActive: { color: ACCENT },
  headerCell: { color: MUTED, fontWeight: '700' },
  name: { flex: 1.2, textAlign: 'left' },

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
  currentPillBox: { width: '33%' },
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
  options: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionActive: { borderColor: ACCENT, backgroundColor: '#18221B' },
  optionText: { color: TEXT, fontWeight: '600' },
  optionTextActive: { color: ACCENT },

  // CTA
  primaryBtn: {
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: ACCENT,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  cancelNote: {
    marginTop: 8,
    color: MUTED,
    fontSize: 12,
    textAlign: 'center',
  },
});
