import { readRecentSearches, type RecentSearch } from '@/services/recentSearches';
import { getMe, matchPoolRequest } from '@/services/api';
import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import type { MainTabsParamList } from '@/types';
import { useFocusEffect, useNavigation, type NavigationProp } from '@react-navigation/native';
import { ChevronRight, Goal, Shield, CalendarSearch, Target, UserRound, History, Trophy, Database, Search, CalendarDays } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';

function RecentImage({ uri, Icon, color }: {uri?:string; Icon:typeof UserRound; color:string}) {
  const { s } = useThemedStyles(getModuleTheme);
  const [failed, setFailed] = useState(false);
  return <View style={s.portrait}>{uri && !failed
    ? <Image source={{uri}} resizeMode="contain" style={s.image} onError={() => setFailed(true)} />
    : <Icon size={24} color={color} />}</View>;
}

type Summary = {
  weeklyScorePredictions?: number;
  dailyPlayerQuestionAvailable?: boolean;
};

export default function ProfileSummary() {
  const { s, ACCENT, MUTED, FEATURE_COLORS } = useThemedStyles(getModuleTheme);
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentFailed, setRecentFailed] = useState(false);
  const [recentRetry, setRecentRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setRecent([]);setRecentLoading(true);setRecentFailed(false);
    getMe().then(me => readRecentSearches(me.id))
      .then(value => { if (active) setRecent(value); })
      .catch(() => { if (active) setRecentFailed(true); })
      .finally(() => { if (active) setRecentLoading(false); });
    return () => { active = false; };
  }, [recentRetry]));
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [summaryRetry, setSummaryRetry] = useState(0);
  useFocusEffect(useCallback(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    matchPoolRequest<Summary>('/me/dashboard-summary')
      .then(value => { if (active) setSummary(value); })
      .catch(() => { if (active) { setSummary(null); setFailed(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [summaryRetry]));
  const count = (key: 'weeklyScorePredictions') => loading ? '…' : summary?.[key] == null ? '—' : String(summary[key]);
  const recentTypes = {
    player: { route: 'Strategy', label: tr ? 'Oyuncu Havuzu' : 'Player Pool', Icon: UserRound },
    team: { route: 'TeamPool', label: tr ? 'Takım Havuzu' : 'Team Pool', Icon: Shield },
    fixtures: { route: 'MatchPool', label: tr ? 'Maç Havuzu' : 'Match Pool', Icon: CalendarSearch },
    league: { route: 'LeaguePool', label: tr ? 'Lig Havuzu' : 'League Pool', Icon: Trophy },
    season: { route: 'SeasonData', label: tr ? 'Sezon Verileri' : 'Season Data', Icon: Database },
  } as const;
  const predictions = [
    { route: 'ScorePrediction', label: tr ? 'Skor Tahmini' : 'Score Predictions', value: `${count('weeklyScorePredictions')}/10`, Icon: Goal, color: FEATURE_COLORS.scorePrediction },
    { route: 'DailyScout', label: tr ? 'Oyuncu Tahmini' : 'Player Predictions', value: '', Icon: Target, color: FEATURE_COLORS.discoveryLeague },
  ] as const;
  return (
    <View style={s.container}>
      <View style={s.recentCard}>
        <View style={s.sectionHeading}><History size={18} color={ACCENT} /><Text style={s.heading}>{tr ? 'Son Araman' : 'Your Last Search'}</Text></View>
        {recentLoading ? <ActivityIndicator style={{ padding: 20 }} color={ACCENT} /> : recentFailed ? (
          <View style={s.emptyState}>
            <Text style={s.description}>{tr ? 'Son aramaların yüklenemedi.' : 'Could not load your recent searches.'}</Text>
            <Pressable accessibilityRole="button" onPress={() => setRecentRetry(value => value + 1)} style={s.emptyButton}>
              <Text style={s.buttonText}>{tr ? 'Tekrar Dene' : 'Retry'}</Text>
            </Pressable>
          </View>
        ) : recent.length ? recent.slice(0, 1).map(({ kind, title, imageUrl, searchedAt }) => {
          const { route, label, Icon } = recentTypes[kind];
          return <Pressable key={kind} accessibilityRole="button" onPress={() => navigation.navigate(route)}
            accessibilityLabel={`${label}: ${title}. ${tr ? 'Devam et' : 'Continue'}`}
            style={({ pressed }) => [s.recentRow, pressed && s.pressed]}>
            <RecentImage key={`${kind}:${title}:${imageUrl}`} uri={imageUrl} Icon={Icon} color={ACCENT} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={s.recentTitle} numberOfLines={2}>{title || label}</Text>
              <Text style={s.description}>{label}{searchedAt > 0 ? ` · ${new Date(searchedAt).toLocaleDateString(tr ? 'tr-TR' : 'en-GB', {day:'numeric',month:'long'})}` : ''}</Text>
            </View>
            <Text style={s.continueText}>{tr ? 'Devam Et' : 'Continue'}</Text>
            <ChevronRight size={16} color={MUTED} />
          </Pressable>;
        }) : (
          <View style={s.searchEmpty}>
            <View style={s.emptyIntro}>
              <View style={s.emptySearchIcon}><Search size={23} color={ACCENT} strokeWidth={1.75} /></View>
              <View style={{flex:1,gap:4}}>
                <Text style={s.recentTitle}>{tr ? 'İlk aramanla başla' : 'Start your first search'}</Text>
                <Text style={s.description}>{tr ? 'Son aramana buradan kolayca dön.' : 'Pick up your latest search here.'}</Text>
              </View>
            </View>
            <View style={s.emptyActions}>
              {([
                {route:'Strategy', label:tr ? 'Oyuncu\nAra' : 'Find\nPlayers', Icon:UserRound},
                {route:'TeamPool', label:tr ? 'Takım\nAra' : 'Find\nTeams', Icon:Shield},
                {route:'MatchPool', label:tr ? 'Maç\nAra' : 'Find\nMatches', Icon:CalendarSearch},
              ] as const).map(({route,label,Icon}) => (
                <Pressable key={route} accessibilityRole="button" accessibilityLabel={label.replace(/\s+/g, ' ')} onPress={() => navigation.navigate(route)}
                  style={({ pressed }) => [s.searchAction, pressed && s.pressed]}>
                  <Icon size={20} color={ACCENT} />
                  <Text style={s.emptyActionText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </View>
      <View style={s.predictions}>
        <View style={s.sectionHeading}><CalendarDays size={18} color={ACCENT} /><Text style={s.heading}>{tr ? 'Tahminlerin' : 'Your Predictions'}</Text></View>
        {predictions.map(({ route, label, value, Icon, color }, index) => (
          <Pressable key={route} accessibilityRole="button" onPress={() => navigation.navigate(route)}
            accessibilityLabel={route === 'DailyScout' ? `${label}: ${loading ? (tr ? 'Yükleniyor' : 'Loading') : summary?.dailyPlayerQuestionAvailable ? (tr ? 'Günün sorusu hazır. Tahmin Yap' : 'Today’s question is ready. Make a prediction') : (tr ? 'Günün yeni sorusu yakında' : 'A new daily question is coming')} ` : `${label}: ${value} ${tr ? 'tamamlandı' : 'completed'}`}
            style={({ pressed }) => [s.predictionRow, index > 0 && s.divider, pressed && s.pressed]}>
            <View style={[s.icon, {backgroundColor:`${color}12`}]}><Icon size={20} color={color} /></View>
            {route === 'DailyScout' ? <>
              <View style={{flex:1,gap:4}}>
                <Text style={s.label}>{label}</Text>
                <Text style={s.description}>{loading ? (tr ? 'Yükleniyor…' : 'Loading…') : failed ? (tr ? 'Bilgi yüklenemedi' : 'Status unavailable') : summary?.dailyPlayerQuestionAvailable ? (tr ? 'Günün sorusu hazır' : 'Today’s question is ready') : (tr ? 'Günün yeni sorusu yakında' : 'A new daily question is coming')}</Text>
              </View>
              {!loading && summary?.dailyPlayerQuestionAvailable && <Text style={[s.continueText,{color}]}>{tr ? 'Tahmin Yap' : 'Predict'}</Text>}
            </> : <View style={{flex:1,gap:7}}>
              <View style={s.progressHeading}><Text style={s.label}>{label}</Text><Text style={[s.progress, { color }]}>{value}</Text></View>
              <View style={s.track}><View style={[s.trackFill, {backgroundColor:color, width:`${Math.min(100, Math.max(0, (Number(value.split('/')[0]) / Number(value.split('/')[1]) || 0) * 100))}%`}]} /></View>
            </View>}
            <ChevronRight size={17} color={MUTED} />
          </Pressable>
        ))}
      </View>
      {failed && <Pressable accessibilityRole="button" onPress={() => setSummaryRetry(value => value + 1)} style={s.retryRow}>
        <Text style={s.error}>{tr ? 'Tahmin bilgileri yüklenemedi.' : 'Prediction information could not be loaded.'}</Text>
        <Text style={s.continueText}>{tr ? 'Tekrar Dene' : 'Retry'}</Text>
      </Pressable>}
    </View>
  );
}

const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const { PANEL, LINE, TEXT, MUTED, ACCENT, FEATURE_COLORS } = colors;
  const s = StyleSheet.create({
    container: { marginHorizontal: 16, marginTop: 16, paddingBottom: 12 },
    heading: { color: ACCENT, fontSize: 15, fontWeight: '800', flex:1 },
    sectionHeading: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:14, borderBottomWidth:1, borderBottomColor:LINE },
    portrait: { width:48, height:48, borderRadius:14, backgroundColor:`${ACCENT}0C`, alignItems:'center', justifyContent:'center', overflow:'hidden' },
    image: { width:44, height:44 },
    progressHeading: { flexDirection:'row', alignItems:'center', gap:8 },
    track: { height:4, borderRadius:2, backgroundColor:LINE, overflow:'hidden' },
    trackFill: { height:4, borderRadius:2 },
    recentCard: { backgroundColor: PANEL, borderRadius: 20, borderWidth: 1, borderColor: LINE, paddingHorizontal: 16 },
    recentRow: { minHeight: 76, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
    recentTitle: { color: TEXT, fontSize: 14, lineHeight: 20, fontWeight: '700' },
    description: { color: MUTED, fontSize: 12, lineHeight: 18 },
    continueText: { color: ACCENT, fontSize: 12, fontWeight: '700', flexShrink: 1 },
    searchEmpty: { paddingVertical:16, gap:14 },
    emptyIntro: { flexDirection:'row', alignItems:'center', gap:12 },
    emptySearchIcon: { width:44, height:44, borderRadius:14, backgroundColor:`${ACCENT}0C`, alignItems:'center', justifyContent:'center' },
    emptyActions: { flexDirection:'row', flexWrap:'wrap', gap:8 },
    searchAction: { flexGrow:1, flexBasis:96, minHeight:64, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, paddingVertical:10, paddingHorizontal:8, borderRadius:12, backgroundColor:`${ACCENT}12` },
    emptyActionText: { color:ACCENT, fontSize:12, lineHeight:17, fontWeight:'700', flexShrink:1 },
    emptyState: { paddingVertical: 16, gap: 10, alignItems: 'flex-start' },
    emptyButton: { backgroundColor: `${ACCENT}14`, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, minHeight: 44, justifyContent: 'center' },
    buttonText: { color: ACCENT, fontSize: 13, fontWeight: '700' },
    icon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: `${ACCENT}12` },
    label: { color: TEXT, fontSize: 13, lineHeight: 19, fontWeight: '600', flex: 1 },
    predictions: { marginTop:16, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, borderRadius: 20, paddingHorizontal: 16 },
    predictionRow: { minHeight: 62, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
    divider: { borderTopWidth: 1, borderTopColor: LINE },
    progress: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
    pressed: { opacity: 0.7 },
    retryRow: { minHeight:44, flexDirection:'row', alignItems:'center', justifyContent:'space-between', gap:10 },
    error: { color: MUTED, fontSize: 12, flex:1 },
  });
  return { s, ACCENT, MUTED, FEATURE_COLORS };
});
