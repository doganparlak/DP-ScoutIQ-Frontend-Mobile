import { Platform } from 'react-native';
import {
  initConnection,
  endConnection,
  getAvailablePurchases,
  finishTransaction,
  type Purchase,
  type PurchaseAndroid,
  type PurchaseIOS,
} from 'react-native-iap';

import { activateIAPSubscription } from '@/services/api';

const TAG = '[RESTORE_IAP]';
const log = (...args: any[]) => console.log(TAG, ...args);

const IOS_SKUS = new Set(['scoutwise_pro_monthly_ios', 'scoutwise_pro_yearly_ios']);
const ANDROID_SKUS = new Set(['scoutwise_pro_monthly_android', 'scoutwise_pro_yearly_android']);

const isYearly = (sku: string) => (sku || '').toLowerCase().includes('yearly');

function pickBestSubscription(purchases: Purchase[]): Purchase | null {
  const subs = purchases.filter(p => {
    const sku = p.productId ?? '';
    if (Platform.OS === 'ios') return IOS_SKUS.has(sku);
    return ANDROID_SKUS.has(sku);
  });

  log('pickBestSubscription: total=', purchases.length, 'matchingSubs=', subs.length);
  log(
    'pickBestSubscription: matching SKUs=',
    subs.map(s => s.productId),
  );

  if (!subs.length) return null;

  // Prefer yearly if both exist
  const yearly = subs.find(p => isYearly(p.productId ?? ''));
  const best = yearly ?? subs[0];

  log('pickBestSubscription: picked=', best.productId, 'yearlyPreferred=', !!yearly);
  return best;
}

export async function restoreSubscriptionIfAny(): Promise<boolean> {
  // returns true if we sent something to backend and it returned ok
  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
  log('restoreSubscriptionIfAny: START platform=', platform);

  try {
    log('initConnection: starting...');
    await initConnection();
    log('initConnection: OK');

    log('getAvailablePurchases: fetching...');
    const purchases = await getAvailablePurchases();
    log(
      'getAvailablePurchases: OK count=',
      purchases.length,
      'productIds=',
      purchases.map(p => p.productId),
    );

    const best = pickBestSubscription(purchases);
    if (!best) {
      log('No matching subscription purchase found -> returning false');
      return false;
    }

    let externalId = '';
    let receipt: string | undefined = undefined;

    if (platform === 'ios') {
      const pIOS = best as PurchaseIOS;
      externalId =
        pIOS.originalTransactionIdentifierIOS ??
        pIOS.transactionId ??
        '';
      log('iOS: extracted externalId=', externalId);
      log('iOS: productId=', best.productId);
    } else {
      const pA = best as PurchaseAndroid;
      externalId = pA.purchaseToken ?? pA.transactionId ?? '';
      receipt = (pA as any).transactionReceipt ?? undefined;

      log('Android: extracted externalId(purchaseToken/txId)=', externalId);
      log('Android: productId=', best.productId);
      log('Android: receipt present=', !!receipt, 'receiptLen=', receipt?.length ?? 0);
    }

    if (!externalId || !best.productId) {
      log('Missing externalId or productId -> returning false', {
        externalIdPresent: !!externalId,
        productId: best.productId,
      });
      return false;
    }

    const payload: any = {
      platform,
      product_id: best.productId,
      external_id: externalId,
      ...(platform === 'android' ? { receipt } : {}),
    };

    log('Calling backend activateIAPSubscription payload=', payload);

    const res = await activateIAPSubscription(payload);
    log('Backend response=', res);

    // safety: close transaction (especially helpful on Android)
    try {
      log('finishTransaction: attempting...');
      await finishTransaction({ purchase: best, isConsumable: false });
      log('finishTransaction: OK');
    } catch (e: any) {
      log('finishTransaction: FAILED (ignored)', String(e?.message ?? e));
    }

    const ok = !!res?.ok;
    log('restoreSubscriptionIfAny: DONE ok=', ok);
    return ok;
  } catch (e: any) {
    log('restoreSubscriptionIfAny: ERROR', String(e?.message ?? e));
    return false;
  } finally {
    try {
      log('endConnection: attempting...');
      endConnection();
      log('endConnection: OK');
    } catch (e: any) {
      log('endConnection: FAILED (ignored)', String(e?.message ?? e));
    }
  }
}
