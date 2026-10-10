import React from 'react';
import { AppState } from 'react-native';
import { useTranslation } from 'react-i18next';
import ScorePredictionPrizes from '@/components/ScorePredictionPrizes';
import { getMyPrizes, type PendingPrizeClaim, type PrizeWin } from '@/services/scorePrediction';
import { getPredictionPrizeWeeks, subscribePredictionPrizes } from '@/services/remoteConfig';

type ClaimsContext = {
  claims: PendingPrizeClaim[];
  claimedRoundIds: number[];
  markClaimed: (roundId: number) => void;
  openClaim: (claim: PendingPrizeClaim) => void;
  openPrizes: () => void;
  refresh: () => Promise<void>;
};
const Context = React.createContext<ClaimsContext>({ claims: [], claimedRoundIds: [], markClaimed: () => {}, openClaim: () => {}, openPrizes: () => {}, refresh: async () => {} });
export const usePredictionPrizeClaims = () => React.useContext(Context);

export function PredictionPrizeClaimsProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const prizes = React.useSyncExternalStore(subscribePredictionPrizes, getPredictionPrizeWeeks);
  const [wins, setWins] = React.useState<PrizeWin[]>([]);
  const [claimedRoundIds, setClaimedRoundIds] = React.useState<number[]>([]);
  const submitted = React.useRef(new Set<number>());
  const [open, setOpen] = React.useState(false), [selected, setSelected] = React.useState<PrizeWin | null>(null);
  const [loading, setLoading] = React.useState(false), [error, setError] = React.useState(false);
  const alive = React.useRef(false), busy = React.useRef(false), opened = React.useRef(false);
  opened.current = open;
  const queuedReminder = React.useRef(false);
  const showHistory = React.useCallback(() => { setSelected(null); setOpen(true); }, []);
  const refresh = React.useCallback(async (remind = false) => {
    if (busy.current) return;
    busy.current = true; setLoading(true); setError(false);
    try {
      const next = (await getMyPrizes()).map(win => ({ ...win, claimed: win.claimed || submitted.current.has(win.roundId) }));
      if (!alive.current) return;
      setWins(next);
      setSelected(current => current ? next.find(win => win.roundId === current.roundId) ?? null : null);
      // An older unclaimed win never substitutes for the latest competition.
      if (remind && next.some(win => win.isLatest && !win.claimed)) {
        if (AppState.currentState === 'active') { if (!opened.current) showHistory(); }
        else queuedReminder.current = true;
      }
    } catch {
      if (alive.current) setError(true);
    } finally { busy.current = false; if (alive.current) setLoading(false); }
  }, [showHistory]);
  React.useEffect(() => {
    alive.current = true;
    void refresh(true);
    let wasBackground = AppState.currentState === 'background';
    const sub = AppState.addEventListener('change', state => {
      if (state === 'background') wasBackground = true;
      if (state === 'active' && queuedReminder.current) {
        queuedReminder.current = false;
        if (!opened.current) showHistory();
      }
      if (state === 'active' && wasBackground) { wasBackground = false; void refresh(true); }
    });
    return () => { alive.current = false; sub.remove(); };
  }, [refresh, showHistory]);
  const openClaim = React.useCallback((claim: PendingPrizeClaim) => {
    setSelected(wins.find(win => win.roundId === claim.roundId) ?? { ...claim, claimed: submitted.current.has(claim.roundId), isLatest: false });
    setOpen(true);
  }, [wins]);
  const markClaimed = React.useCallback((roundId: number) => {
    submitted.current.add(roundId);
    setClaimedRoundIds([...submitted.current]);
    setWins(current => current.map(win => win.roundId === roundId ? { ...win, claimed: true } : win));
    setSelected(current => current?.roundId === roundId ? { ...current, claimed: true } : current);
  }, []);
  const refreshQuietly = React.useCallback(() => refresh(false), [refresh]);
  const openPrizes = React.useCallback(() => { showHistory(); void refresh(false); }, [refresh, showHistory]);
  const displayed = selected ?? wins[0] ?? null;
  const claims = React.useMemo(() => wins.filter(win => !win.claimed), [wins]);
  const value = React.useMemo(() => ({ claims, claimedRoundIds, markClaimed, openClaim, openPrizes, refresh: refreshQuietly }), [claims, claimedRoundIds, markClaimed, openClaim, openPrizes, refreshQuietly]);
  return <Context.Provider value={value}>
    {children}
    {open && <ScorePredictionPrizes prizes={displayed ? displayed.prizes ?? prizes[displayed.weekStart] : undefined}
      weekStart={displayed?.weekStart ?? ''} roundId={displayed?.roundId ?? 0}
      canClaim={!!displayed} claimed={!!displayed?.claimed} startWithClaim={!!displayed && !displayed.claimed}
      history={{ wins, loading, error, onRetry: () => void refresh(false), onSelect: setSelected }}
      tr={tr} visible onClose={() => { setOpen(false); setSelected(null); queuedReminder.current = false; }}
      onClaimed={() => { if (displayed) markClaimed(displayed.roundId); }} />}
  </Context.Provider>;
}
