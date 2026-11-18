import { PlusProUpsellScreen } from '@/ads/PlusProUpsellScreen';
import { ReportRewardContext, type useReportReward } from '@/ads/useReportReward';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export default function ReportRewardProvider({ reward, onOpenPlans, onDismissUnavailable, unavailableSubtitle, children }: {
  reward: ReturnType<typeof useReportReward>;
  onOpenPlans: () => void;
  onDismissUnavailable?: () => void;
  unavailableSubtitle?: string;
  children: ReactNode;
}) {
  const {t} = useTranslation();
  return <ReportRewardContext.Provider value={reward}>
    {children}
    <PlusProUpsellScreen visible={reward.unavailable} onClose={onDismissUnavailable ?? reward.dismissUpsell}
      subtitle={unavailableSubtitle ?? t('scoutingRewardUnavailable')}
      onViewPlans={() => { reward.dismissUpsell(); onOpenPlans(); }}/>
  </ReportRewardContext.Provider>;
}
