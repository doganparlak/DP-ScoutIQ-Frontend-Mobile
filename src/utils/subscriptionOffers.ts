import type {ProductSubscription, ProductSubscriptionAndroidOfferDetails} from 'react-native-iap';
import type {Plan, ReferralOffer} from '@/services/api';

export const paidPlans = ['No Ads Monthly', 'Pro Monthly', 'Pro Yearly'] as const;
export const referralPlanKey = (plan: Plan) => plan === 'No Ads Monthly' ? 'plus_monthly'
  : plan === 'Pro Monthly' ? 'pro_monthly' : 'pro_yearly';
export const planPeriod = (plan: Plan) => plan === 'Pro Yearly' ? 'P1Y' : 'P1M';

function sameBillingPeriod(period: string, expected: string) {
  if (period === expected) return true;
  // Play's single-payment annual offer uses P12M; its renewal uses P1Y.
  const months = (value: string) => {
    const match = /^P(?:(\d+)Y)?(?:(\d+)M)?$/.exec(value);
    return match && (match[1] || match[2]) ? Number(match[1] ?? 0) * 12 + Number(match[2] ?? 0) : null;
  };
  const periodMonths = months(period);
  return periodMonths != null && periodMonths === months(expected);
}

export function formatMoney(amount: number, currency: string, language: string) {
  return new Intl.NumberFormat(language.startsWith('tr') ? 'tr-TR' : 'en-US', {
    style: 'currency', currency,
  }).format(amount);
}

export function savingsPercent(amount: number | undefined, reference: number | undefined) {
  if (amount == null || reference == null || !Number.isFinite(amount) || !Number.isFinite(reference)
    || amount < 0 || reference <= 0 || amount >= reference) return null;
  const percent = Math.round((1 - amount / reference) * 1000) / 10;
  return percent;
}

export function subscriptionSavings(
  plan: Plan,
  price: ReturnType<typeof subscriptionPrice> | undefined,
  monthly: ReturnType<typeof subscriptionPrice> | undefined,
) {
  const yearlyReference = plan === 'Pro Yearly' && monthly?.currency === price?.currency
    && monthly?.regularAmount != null ? monthly.regularAmount * 12 : undefined;
  const hasPricedOffer = !!price?.hasOffer && price.offerAmount != null;
  // Annual savings always compare against 12 regular monthly payments.
  const reference = plan === 'Pro Yearly' ? yearlyReference
    : hasPricedOffer ? price?.regularAmount : undefined;
  const amount = price?.comparable ? price.offerAmount ?? price.regularAmount : undefined;
  return {
    reference,
    discount: savingsPercent(amount, reference),
    annualSavings: savingsPercent(amount, yearlyReference),
    hasPricedOffer,
  };
}

export function subscriptionPrice(product: ProductSubscription, plan: Plan, mapping?: ReferralOffer,
  storeEnvironment: 'production' | 'sandbox' = 'production') {
  const expectedPeriod = planPeriod(plan);
  let baseOffer: ProductSubscriptionAndroidOfferDetails | undefined;
  let offer: ProductSubscriptionAndroidOfferDetails | undefined;
  if (product.platform === 'android') {
    const basePlans = product.subscriptionOfferDetailsAndroid.filter(item => !item.offerId
      && item.pricingPhases.pricingPhaseList.some(phase => sameBillingPeriod(phase.billingPeriod, expectedPeriod) && phase.recurrenceMode === 1));
    // Never accidentally buy an introductory/developer offer for users without a code.
    baseOffer = basePlans.find(item => item.basePlanId === mapping?.basePlanId) ?? basePlans[0];
    offer = mapping?.productId === product.id ? product.subscriptionOfferDetailsAndroid.find(item =>
      item.basePlanId === mapping.basePlanId && item.offerId === mapping.offerId) : undefined;
  }
  const basePhase = baseOffer?.pricingPhases.pricingPhaseList.find(phase => phase.recurrenceMode === 1);
  const regularAmount = product.platform === 'android'
    ? basePhase ? Number(basePhase.priceAmountMicros) / 1e6 : undefined
    : product.price ?? undefined;
  const regularDisplay = product.platform === 'android' ? basePhase?.formattedPrice : product.displayPrice;
  const currency = basePhase?.priceCurrencyCode ?? product.currency;
  const phases = offer?.pricingPhases.pricingPhaseList;
  // Only use offers which renew into the same billing period/currency as this card.
  const validAndroidOffer = !!baseOffer && !!offer && !!phases?.length && sameBillingPeriod(phases[phases.length - 1].billingPeriod, expectedPeriod)
    && phases.every(phase => phase.priceCurrencyCode === currency)
    && phases[phases.length - 1].recurrenceMode === 1;
  const sandbox = !!mapping?.sandbox && storeEnvironment === 'sandbox';
  const appleOffer = product.platform === 'ios' && mapping?.productId === product.id
    && (mapping.sandbox ? sandbox : !!mapping.redemptionCode);
  const applePrice = appleOffer && mapping?.price?.currency === currency ? mapping.price : undefined;
  const firstPhase = validAndroidOffer ? phases![0] : undefined;
  const offerAmount = firstPhase ? Number(firstPhase.priceAmountMicros) / 1e6 : applePrice?.amount;
  const offerPeriod = firstPhase?.billingPeriod ?? (appleOffer ? mapping?.period : undefined);
  return {
    regularAmount, regularDisplay, currency,
    offerAmount, offerDisplay: firstPhase?.formattedPrice,
    offerPeriod, offerCycles: firstPhase?.billingCycleCount ?? mapping?.cycles ?? 1,
    phases: validAndroidOffer ? phases : undefined,
    hasOffer: appleOffer || validAndroidOffer,
    sandbox: appleOffer && sandbox,
    offerToken: validAndroidOffer ? offer!.offerToken : baseOffer?.offerToken,
    redemptionCode: appleOffer ? mapping?.redemptionCode : undefined,
    comparable: !offerPeriod || sameBillingPeriod(offerPeriod, expectedPeriod),
  };
}
