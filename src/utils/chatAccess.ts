import type { Profile } from '@/services/api';
export function canUseChat(profile: Profile) {
  const pro = (profile.plan === 'Pro Monthly' || profile.plan === 'Pro Yearly') &&
    !!profile.subscriptionEndAt && new Date(profile.subscriptionEndAt).getTime() > Date.now();
  return pro || (profile.plan === 'Free' && (profile.freeChatMessagesRemaining ?? 0) > 0);
}
