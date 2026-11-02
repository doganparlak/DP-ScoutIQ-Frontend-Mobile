import {useCallback, useEffect, useState} from 'react';
import {getMatchForecast, type MatchForecastResponse} from '@/services/matchPool';

/** Hide only confirmed data gaps; network failures remain retryable. */
export function useReportForecastAvailability(fixtureId: number, review: boolean, active = true) {
  const key = `${fixtureId}:${review}`;
  const [result, setResult] = useState<{key: string; response: MatchForecastResponse} | null>(null);
  const onUnavailable = useCallback(() => {
    setResult({key, response: {status: 'unavailable'}});
  }, [key]);
  useEffect(() => {
    if (!active) return;
    let alive = true;
    getMatchForecast(fixtureId, false, review).then(response => {
      if (alive) setResult({key, response});
    }).catch(() => { /* The forecast page provides retry for transport errors. */ });
    return () => {alive = false;};
  }, [fixtureId, review, active, key]);
  const response = result?.key === key ? result.response : undefined;
  return {
    unavailable: response?.status === 'unavailable',
    forecast: response?.status === 'ready' ? response : undefined,
    onUnavailable,
  };
}
