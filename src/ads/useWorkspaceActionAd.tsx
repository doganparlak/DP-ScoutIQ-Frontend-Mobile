import React from 'react';
import { AppState } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getMe } from '@/services/api';
import { useTutorial } from '@/components/Tutorial';
import { PlusProUpsellScreen } from './PlusProUpsellScreen';
import { incrementWorkspaceActionAndShouldShowAd, type WorkspaceAdAction } from './adGating';
import { showInterstitial } from './interstitial';
import { acquireAdPresentation, releaseAdPresentation, isAdPresentationBusy, isAdFlowCancelled } from './presentation';
import { logAdLifecycle } from './logging';

export function useWorkspaceActionAd() {
  const tutorial = useTutorial();
  const navigation = useNavigation();
  const lock = React.useRef(false), focused = React.useRef(false), epoch = React.useRef(0);
  const owner = React.useRef<symbol | undefined>(undefined);
  const [busy, setBusy] = React.useState(false), [fallback, setFallback] = React.useState(false);
  const pendingFallback = React.useRef<((proceed: boolean) => void) | null>(null);
  useFocusEffect(React.useCallback(() => {
    focused.current = true; setBusy(lock.current);
    return () => {
      focused.current = false; epoch.current++;
      pendingFallback.current?.(false); pendingFallback.current = null;
      setFallback(false);
    };
  }, []));

  function closeFallback() {
    setFallback(false);
    const resume = pendingFallback.current;
    pendingFallback.current = null;
    // Wait for native modal dismissal before presenting the requested report.
    setTimeout(() => resume?.(focused.current && navigation.isFocused()), 450);
  }
  async function run(action: WorkspaceAdAction, perform: () => void | Promise<void>) {
    if (lock.current || isAdPresentationBusy() || !focused.current || AppState.currentState !== 'active') return;
    lock.current = true; setBusy(true);
    const version = epoch.current;
    const active = () => focused.current && epoch.current === version && navigation.isFocused() && AppState.currentState === 'active';
    let lease: symbol | null = null;
    try {
      if (!tutorial.active) {
        const profile = await getMe();
        if (!active()) return;
        const paid = profile.plan === 'No Ads Monthly' || profile.plan === 'Pro Monthly' || profile.plan === 'Pro Yearly';
        if (!paid) {
          lease = acquireAdPresentation();
          if (!lease) return;
          owner.current = lease;
          if (await incrementWorkspaceActionAndShouldShowAd(action, lease)) {
            const result = await showInterstitial({ action, presentationOwner: lease, isActive: active });
            if (!active() || result === 'busy' || result === 'cancelled') return;
            if (result === 'unavailable') {
              logAdLifecycle('interstitial', 'fallback_opened', { action });
              const proceed = await new Promise<boolean>(resolve => {
                pendingFallback.current = resolve; setFallback(true);
              });
              if (!proceed) return;
            }
          }
        }
      }
      // Native presentation has finished; a slow report/search request must not lock other screens.
      if (lease) { releaseAdPresentation(lease); lease = null; owner.current = undefined; }
      if (active()) await perform();
    } catch (error) {
      if (!isAdFlowCancelled(error)) throw error;
    } finally {
      if (lease) releaseAdPresentation(lease);
      owner.current = undefined; lock.current = false;
      if (focused.current) setBusy(false);
    }
  }
  return { run, busy, fallback: <PlusProUpsellScreen visible={fallback} presentationOwner={owner.current} onClose={closeFallback} /> };
}
