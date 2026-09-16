import { reportScopeMatches } from '@/services/reportAccess';
import {createContext, useContext} from 'react';
import type {PreMatchSections, SavedPreMatchReport} from '@/services/matchPool';
export const PreMatchReportContext = createContext<{snapshot: SavedPreMatchReport | null; paid: boolean; onRetry: () => void}>({snapshot:null,paid:false,onRetry:()=>{}});
export function usePreMatchSection<K extends keyof PreMatchSections>(key:K) {
  const {snapshot,paid,onRetry} = useContext(PreMatchReportContext);
  const needsPaidScope = paid && ['players', 'momentum', 'team_analysis'].includes(key);
  const result = reportScopeMatches(snapshot?.content?.sections[key],needsPaidScope) ? snapshot?.content?.[key] ?? null : null;
  const error = !result && (snapshot?.content?.sections[key]?.status === 'failed' || snapshot?.status === 'failed');
  return {result,error,loading:!result && !error,onRetry};
}
