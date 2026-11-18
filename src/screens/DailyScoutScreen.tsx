import InlineBannerSlot from '@/ads/InlineBannerSlot';
import BannerAdFreePrompt from '@/components/BannerAdFreePrompt';
import { DailyScoutChallengeModal } from '@/components/DailyScoutChallenge';
import { DiscoveryLeagueHero, DiscoveryLeagueRankings } from '@/components/DiscoveryLeague';
import { TutorialPageGuide, useTutorial } from '@/components/Tutorial';
import { getDiscoveryLeague, type DiscoveryLeagueState } from '@/services/discoveryLeague';
import { useThemeColors } from '@/theme';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, KeyboardAvoidingView, Platform } from 'react-native';

export default function DailyScoutScreen() {
  const colors = useThemeColors();
  const {i18n} = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const focused = useIsFocused();
  const tutorial = useTutorial();
  const [bannerPrompt, setBannerPrompt] = React.useState(false);
  const [ranking, setRanking] = React.useState(false);
  const [data, setData] = React.useState<DiscoveryLeagueState|null>(null);
  const [error, setError] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const alive = React.useRef(false), version = React.useRef(0), day = React.useRef('');
  const refresh = React.useCallback(async () => {
    const id = ++version.current;
    try {
      const next = await getDiscoveryLeague();
      if (!alive.current || id !== version.current) return;
      if (day.current && day.current !== next.day) setRefreshKey(n => n+1);
      day.current = next.day; setData(next); setError(false);
    } catch { if (alive.current && id === version.current) setError(true); }
  }, []);
  useFocusEffect(React.useCallback(() => {
    alive.current = true; void refresh(); setRefreshKey(n => n+1);
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 60000);
    const sub = AppState.addEventListener('change', state => { if(state === 'active') { void refresh(); setRefreshKey(n => n+1); } });
    return () => { alive.current=false; version.current++; clearInterval(timer); sub.remove(); setRanking(false); setBannerPrompt(false); };
  }, [refresh]));
  const showBanner = focused && data?.tier === 'free' && !tutorial.active;
  const header = <>
    <TutorialPageGuide page='daily' frame={0} />
    <DiscoveryLeagueHero data={data} error={error} onRetry={() => void refresh()} onDayExpired={() => { void refresh(); setRefreshKey(n => n+1); }} onUpdated={() => { void refresh(); setRefreshKey(n => n+1); }} onRankings={() => { setRanking(true); void refresh(); }} />
    <TutorialPageGuide page='daily' frame={1} />
    {showBanner && <InlineBannerSlot canLoad tr={tr} onClose={()=>setBannerPrompt(true)}/>}
  </>;
  return <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':undefined} style={{flex:1,backgroundColor:colors.BG,padding:16}}>
    <DailyScoutChallengeModal embedded visible header={header} refreshKey={refreshKey} onUpdated={() => void refresh()} />
    <BannerAdFreePrompt visible={showBanner && bannerPrompt} tr={tr} onClose={()=>setBannerPrompt(false)}/>
    <DiscoveryLeagueRankings data={data} visible={ranking} onClose={() => setRanking(false)} />
  </KeyboardAvoidingView>;
}
