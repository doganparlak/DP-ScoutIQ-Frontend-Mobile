import React from 'react';
import { getMe } from '@/services/api';
import { useTutorial } from '@/components/Tutorial';
import { PlusProUpsellScreen } from './PlusProUpsellScreen';
import { incrementWorkspaceActionAndShouldShowAd, type WorkspaceAdAction } from './adGating';
import { showInterstitialAndWaitSafely } from './interstitial';

export function useWorkspaceActionAd() {
  const tutorial = useTutorial();
  const lock = React.useRef(false);
  const [busy, setBusy] = React.useState(false);
  const [fallback, setFallback] = React.useState(false);
  const pendingFallback = React.useRef<((proceed: boolean) => void) | null>(null);
  React.useEffect(() => () => {
    pendingFallback.current?.(false);
    pendingFallback.current = null;
  }, []);

  function closeFallback() {
    setFallback(false);
    // Allow the native modal dismissal to finish before presenting a report modal.
    setTimeout(() => {
      pendingFallback.current?.(true);
      pendingFallback.current = null;
    }, 450);
  }

  async function run(action: WorkspaceAdAction, perform: () => void | Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      if (!tutorial.active) {
        const profile = await getMe();
        const paid = profile.plan === 'No Ads Monthly' || profile.plan === 'Pro Monthly' || profile.plan === 'Pro Yearly';
        if (!paid && await incrementWorkspaceActionAndShouldShowAd(action)) {
          if (!await showInterstitialAndWaitSafely()) {
            const proceed = await new Promise<boolean>(resolve => {
              pendingFallback.current = resolve;
              setFallback(true);
            });
            if (!proceed) return;
          }
        }
      }
      await perform();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return {
    run,
    busy,
    fallback: <PlusProUpsellScreen visible={fallback} onClose={closeFallback} />,
  };
}
