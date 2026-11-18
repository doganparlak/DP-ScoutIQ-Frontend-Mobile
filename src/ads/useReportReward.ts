import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useEffect, useRef, useState } from 'react';
import { matchPoolRequest } from '@/services/api';
import { acquireAdPresentation, releaseAdPresentation } from './presentation';
import { preloadRewarded, showRewardedSafely } from './rewarded';

const unlocked = new Map<string, Set<string>>();
let accountToken: string | null = null;

export const ReportRewardContext = createContext<ReturnType<typeof useReportReward> | null>(null);

export function useReportReward(reportKey: string, activeSection: string | undefined, enabled: boolean) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const pendingFallback = useRef<{ claim: () => boolean } | null>(null);
  const dismissUpsell = () => {
    pendingFallback.current = null;
    setUnavailable(false);
  };
  const visit = useRef({ reportKey, enabled, preloaded: false });
  if (visit.current.reportKey !== reportKey || visit.current.enabled !== enabled) {
    visit.current = { reportKey, enabled, preloaded: false };
  }
  const currentVisit = visit.current;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const sectionRef = useRef(activeSection);
  sectionRef.current = activeSection;

  useEffect(() => {
    let active = true;
    setToken(null);
    if (enabled) {
      Promise.all([
        AsyncStorage.getItem('auth_token'),
        matchPoolRequest<{enabled: boolean}>('/report-rewards'),
      ]).then(([nextToken, capability]) => {
        if (!active) return;
        if (accountToken !== nextToken) {
          unlocked.clear();
          accountToken = nextToken;
        }
        if (capability.enabled) setToken(nextToken);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [enabled]);

  useEffect(() => {
    pendingFallback.current = null;
    setUnavailable(false);
  }, [enabled, reportKey]);

  const sections = unlocked.get(reportKey);
  const available = enabled && !!token && accountToken === token;
  return {
    available,
    activeSection,
    busy,
    unavailable: enabled && unavailable,
    dismissUpsell,
    claimUnavailableReward() {
      const fallback = pendingFallback.current;
      dismissUpsell();
      return fallback?.claim() ?? false;
    },
    unlockedSections: available && sections ? [...sections] : [],
    isUnlocked: (section: string) => available && !!sections?.has(section),
    prepare(section: string) {
      if (!available || activeSection !== section || currentVisit.preloaded || sections?.has(section)) return;
      currentVisit.preloaded = true;
      preloadRewarded();
    },
    async watch(section: string, grant = section, isStillActive = () => true) {
      if (!available || activeSection !== section || sections?.has(grant)) return;
      const lease = acquireAdPresentation();
      if (!lease) return;
      const active = () => mounted.current && visit.current === currentVisit && sectionRef.current === section && isStillActive();
      const grantReward = () => {
        if (accountToken !== token) return false;
        const reportSections = unlocked.get(reportKey) ?? new Set<string>();
        if (reportSections.has(grant)) return false;
        reportSections.add(grant);
        unlocked.set(reportKey, reportSections);
        return active();
      };
      setBusy(section);
      try {
        const result = await showRewardedSafely(active);
        if (result === 'rewarded') return grantReward();
        if (result === 'unavailable' && active()) {
          pendingFallback.current = { claim: () => active() && grantReward() };
          setUnavailable(true);
        }
      } finally {
        releaseAdPresentation(lease);
        if (mounted.current) setBusy(null);
      }
    },
  };
}
