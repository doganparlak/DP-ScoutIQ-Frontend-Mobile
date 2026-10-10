import { TutorialPageGuide } from '@/components/Tutorial';
import WeeklyPopularPlayerCard from '@/components/WeeklyPopularPlayerCard';
import { getWeeklyPopularPlayers } from '@/services/api';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useFocusEffect,useRoute,type RouteProp } from '@react-navigation/native';
import { ArrowUpRight,Flame,Trophy } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator,FlatList,Pressable,StyleSheet,Text,View } from 'react-native';

import type { MainTabsParamList } from '@/types';

type WeeklyRow = Awaited<ReturnType<typeof getWeeklyPopularPlayers>>[number];

export default function WeeklySearchesScreen() {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, themeColor} = themed;

  const { t } = useTranslation();
  const route = useRoute<RouteProp<MainTabsParamList, 'Weekly'>>();
  const [rows, setRows] = React.useState<WeeklyRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const listRef = React.useRef<FlatList<WeeklyRow>>(null);

  useFocusEffect(React.useCallback(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setRows([]);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    const load = async () => {
      try {
        const result = await getWeeklyPopularPlayers(10, false);
        if (active) setRows(result);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [route.params?.visitKey, retry]));

  return <View style={styles.screen}>
    <FlatList
      ref={listRef}
      data={rows}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={<View style={styles.headerGroup}><View style={styles.hero}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}><View style={styles.eyebrow}><Flame size={15} color={themeColor("#4ADE80", 'text')} /><Text style={styles.eyebrowText}>{t('weeklySpotlight', 'WEEKLY SPOTLIGHT')}</Text></View><Trophy size={31} color={themeColor("#D8B86A", 'text')} strokeWidth={1.6} /></View>
        <Text style={styles.title}>{t('weeklySearchesTitle', "This Week’s Most Searches")}</Text>
        <Text style={styles.subtitle}>{t('weeklySearchesSubtitle', 'Discover the players catching everyone’s attention, ranked by this week’s searches.')}</Text>
        <View style={styles.heroBottom}><View style={styles.dot} /><Text style={styles.heroMeta}>{t('weeklySearchesRanking', 'The weekly top 10')}</Text><ArrowUpRight size={18} color={themeColor("#4ADE80", 'text')} /></View>
      </View><TutorialPageGuide page="weekly" onShow={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })} /></View>}
      ListEmptyComponent={<View style={styles.empty}>
        {loading ? <><ActivityIndicator size="large" color={ACCENT} /><Text style={styles.subtitle}>{t('weeklySearchesLoading', 'Preparing this week’s lineup…')}</Text></> : <>
          <Trophy size={34} color={themeColor("#8CA496", 'text')} />
          <Text style={styles.emptyTitle}>{error ? t('weeklyPopularRevealFailed', 'Could not load popular players') : t('weeklySearchesEmptyTitle', 'The next stars are on their way')}</Text>
          <Text style={styles.subtitle}>{error ? t('weeklySearchesError', 'Please check your connection and try again.') : t('weeklyPopularEmpty', 'No popular players have been recorded this week yet.')}</Text>
          {error && <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.retry}><Text style={styles.retryText}>{t('retry', 'Try again')}</Text></Pressable>}
        </>}
      </View>}
      renderItem={({ item, index }) => {
        const rankColor = index === 0 ? themeColor('#D8B86A') : index < 3 ? themeColor('#8DE0B1') : themeColor('#80998B');
        return <View style={[styles.rankedCard, index === 0 && styles.leader]} testID={`weekly-player-${index + 1}`}>
          <View style={styles.rankHeader}>
            <View style={[styles.rankBadge, { borderColor: rankColor }]}><Text style={[styles.rank, { color: rankColor }]}>{String(index + 1).padStart(2, '0')}</Text></View>
            <View style={styles.rankCopy}><Text style={[styles.rankLabel, { color: rankColor }]}>{index === 0 ? t('weeklySearchesLeader', 'MOST SEARCHED') : t('weeklySearchesRank', 'WEEKLY RANKING')}</Text><Text style={styles.rankTeam}>{item.player.meta?.team || t('tabPlayerPool', 'Player Pool')}</Text></View>
            {index < 3 ? <Trophy size={20} color={rankColor} strokeWidth={1.6} /> : <ArrowUpRight size={20} color={rankColor} />}
          </View>
          <WeeklyPopularPlayerCard id={item.id} player={item.player} />
        </View>;
      }}
    />
  </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, BG, PANEL, TEXT, themeColor} = colors;

  const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG }, content: { padding: 18, gap: 18, paddingBottom: 32 },
  headerGroup: { gap: 18 },
  hero: { borderWidth: 1, borderColor: themeColor('rgba(22,163,74,0.4)', 'border'), backgroundColor: themeColor('#11251A', 'surface'), borderRadius: 26, padding: 22, overflow: 'hidden', gap: 14 },
  heroGlow: { position: 'absolute', right: -55, top: -65, width: 210, height: 210, borderRadius: 105, borderWidth: 30, borderColor: themeColor('rgba(22,163,74,0.07)', 'border') },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }, eyebrowText: { flexShrink: 1, color: themeColor('#4ADE80', 'text'), fontWeight: '800', fontSize: 10, letterSpacing: 1.3 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '900', color: TEXT, maxWidth: 300 },
  subtitle: { fontSize: 14, lineHeight: 21, color: themeColor('#A3B7AA', 'text') },
  heroBottom: { flexDirection: 'row', gap: 8, alignItems: 'center', borderTopWidth: 1, borderTopColor: themeColor('rgba(22,163,74,0.22)', 'border'), paddingTop: 16, marginTop: 3 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: themeColor('#4ADE80', 'surface') }, heroMeta: { flex: 1, color: themeColor('#D9E8DE', 'text'), fontSize: 12, fontWeight: '700' },
  rankedCard: { padding: 12, borderRadius: 24, backgroundColor: PANEL, borderWidth: 1, borderColor: themeColor('rgba(22,163,74,0.25)', 'border'), gap: 12 },
  leader: { borderColor: themeColor('rgba(216,184,106,0.6)', 'border'), backgroundColor: themeColor('#20251C', 'surface') },
  rankHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingTop: 2, gap: 12 },
  rankBadge: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, backgroundColor: themeColor('rgba(255,255,255,0.025)', 'surface'), justifyContent: 'center', alignItems: 'center' },
  rank: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] }, rankCopy: { flex: 1, gap: 4 },
  rankLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 }, rankTeam: { color: themeColor('#CFDBD3', 'text'), fontSize: 13, fontWeight: '600' },
  empty: { alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 38, borderRadius: 24, backgroundColor: PANEL },
  emptyTitle: { color: TEXT, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  retry: { borderRadius: 14, borderWidth: 1, borderColor: ACCENT, paddingHorizontal: 24, paddingVertical: 14 }, retryText: { color: themeColor('#4ADE80', 'text'), fontWeight: '800' },
});
  return {ACCENT, BG, PANEL, TEXT, styles, themeColor};
});
