import type { Profile } from '@/services/api';
export function isChatCreditPlan(plan: Profile['plan']) {
  return plan === 'Free' || plan === 'No Ads Monthly';
}

export function canUseChat(profile: Profile) {
  const pro = (profile.plan === 'Pro Monthly' || profile.plan === 'Pro Yearly') &&
    !!profile.subscriptionEndAt && new Date(profile.subscriptionEndAt).getTime() > Date.now();
  return pro || (isChatCreditPlan(profile.plan) && (profile.freeChatMessagesRemaining ?? 0) > 0);
}
