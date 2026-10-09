import { useMatchup } from "@/context/MatchupContext";
import { matchPoolRequest,type Profile } from "@/services/api";
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useFocusEffect,useNavigation,type NavigationProp } from "@react-navigation/native";
import {
ArrowUpRight,
BookMarked,
FileText,
Gem,
GitCompareArrows,
Goal,
ShieldCheck,
Shirt,
} from "lucide-react-native";
import { useCallback,useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable,StyleSheet,Text,useWindowDimensions,View } from "react-native";


import type { MainTabsParamList } from '@/types';

type Summary = {
  portfolioPlayers: number;
  portfolioTeams: number;
  readyTeamReports: number;
  portfolioMatches: number;
  readyPlayerReports: number;
  readyPostMatchReports: number;
  readyPreMatchReports: number;
  weeklyScorePredictions?: number;
};
export default function ProfileSummary({ profile, profileLoading }: { profile: Profile | null; profileLoading: boolean }) {
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, FEATURE_COLORS, s, themeColor} = themed;

  const { i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();
  const tr = i18n.language.startsWith("tr");
  const { rows, mode } = useMatchup();
  const { width, fontScale } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState<number | null>(null);
  const [contentSize, setContentSize] = useState({ key: '', height: 0 });
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setFailed(false);
      matchPoolRequest<Summary>("/me/dashboard-summary")
        .then((value) => {
          if (active) setSummary(value);
        })
        .catch(() => {
          if (active) {
            setSummary(null);
            setFailed(true);
          }
        })
        .finally(() => {
          if (active) setLoading(false);
        });
      return () => {
        active = false;
      };
    }, []),
  );
  const showGettingStarted = !loading && !!summary &&
    summary.portfolioPlayers === 0 && summary.portfolioTeams === 0 && summary.portfolioMatches === 0;
  const count = (key: keyof Summary) =>
    loading
      ? "…"
      : summary && summary[key] != null
        ? String(summary[key])
        : "—";
  const activePro = !!profile && (profile.plan === 'Pro Monthly' || profile.plan === 'Pro Yearly') &&
    !!profile.subscriptionEndAt && new Date(profile.subscriptionEndAt).getTime() > Date.now();
  const proCredits = profileLoading ? '…' : !profile ? '—' : activePro ? '∞' : String(Math.max(0, profile.freeChatMessagesRemaining ?? 0));
  const pills: {label:string;value:string;Icon:typeof Shirt;color:string;route:'Portfolio'|'TeamPortfolio'|'MatchPortfolio'|'Matchup'|'Chat'|'ScorePrediction'}[] = [
    {
      label: tr ? "Portföy\nOyuncuların" : "Portfolio\nPlayers",
      value: count("portfolioPlayers"), route: "Portfolio",
      Icon: Shirt,
      color: ACCENT,
    },
    {
      label: tr ? "Portföy\nMaçların" : "Portfolio\nMatches",
      value: count("portfolioMatches"), route: "MatchPortfolio",
      Icon: BookMarked,
      color: ACCENT,
    },
    {label: tr ? "Portföy\nTakımların" : "Portfolio\nTeams", value: count("portfolioTeams"), route: "TeamPortfolio", Icon: ShieldCheck, color: ACCENT},
    {
      label: tr ? "Eşleşme Merkezi" : "Matchup Center",
      value: `${rows.slice(0, mode).filter(Boolean).length}/${mode}`,
      route: "Matchup",
      Icon: GitCompareArrows,
      color: themeColor("#B4A3D3", 'text'),
    },
    {
      label: tr ? "ScoutWise Pro Kredin" : "ScoutWise Pro Credits",
      value: proCredits, route: "Chat",
      Icon: Gem,
      color: FEATURE_COLORS.pro,
    },
    {
      label: tr ? "Haftalık Skor\nTahminlerin" : "Weekly Score\nPredictions",
      value: `${count("weeklyScorePredictions")}/10`, route: "ScorePrediction",
      Icon: Goal, color: FEATURE_COLORS.scorePrediction,
    },
    {
      label: tr ? "Oyuncu Raporların" : "Your Player Reports",
      value: count("readyPlayerReports"), route: "Portfolio",
      Icon: FileText,
      color: themeColor("#22D3EE", 'text'),
    },
    {
      label: tr ? "Maç\nRaporların" : "Match\nReports",
      value: loading ? "…" : summary ? String(summary.readyPreMatchReports + summary.readyPostMatchReports) : "—",
      route: "MatchPortfolio", Icon: FileText, color: themeColor("#22D3EE", 'text'),
    },
    {label: tr ? "Takım Raporların" : "Your Team Reports", value: count("readyTeamReports"), route: "TeamPortfolio", Icon: FileText, color: themeColor("#22D3EE", 'text')},
  ];
  const availableWidth = gridWidth ?? Math.max(0, width - 32);
  const minimumCellWidth = 104 * Math.max(1, fontScale);
  const columns = availableWidth >= minimumCellWidth * 3 + 20 ? 3 : availableWidth >= minimumCellWidth * 2 + 10 ? 2 : 1;
  const layoutKey = `${availableWidth}:${fontScale}:${i18n.language}:${columns}:${pills.map(pill => pill.label).join("|")}`;
  const cellHeight = Math.max(112, (contentSize.key === layoutKey ? contentSize.height : 0) + 24);
  const displayPills = pills.map(pill => ({
    ...pill,
    showExploreArrow: pill.value === '0' && ['Portfolio', 'TeamPortfolio', 'MatchPortfolio'].includes(pill.route),
  }));
  const pillRows = Array.from({ length: Math.ceil(displayPills.length / columns) }, (_, index) => displayPills.slice(index * columns, (index + 1) * columns));
  return (
    <View style={s.grid} onLayout={event => {
      const nextWidth = event.nativeEvent.layout.width;
      setGridWidth(current => current !== null && Math.abs(current - nextWidth) < .5 ? current : nextWidth);
    }}>
      {showGettingStarted && <Text style={s.gettingStarted}>{tr ? 'Başlamak için bir bölüm seç.' : 'Choose a section to get started.'}</Text>}
      {pillRows.map((row, index) => <View key={index} style={s.pillRow}>
      {row.map(({ label, value, Icon, color, route, showExploreArrow }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          onPress={() => route === 'Chat' ? navigation.navigate('Chat', { screen: 'ProHome' }) : navigation.navigate(route)}
          accessibilityLabel={`${label.replace(/\s+/g, ' ')}: ${showExploreArrow ? (tr ? 'Keşfetmek için aç' : 'Open to explore') : value === '∞' ? (tr ? 'Sınırsız' : 'Unlimited') : value}`}
          style={({pressed}) => [
            s.pill,
            pressed && {opacity:0.75},
            {
              minHeight: cellHeight,
              borderColor: `${color}55`,
            },
          ]}
        >
          <View style={s.pillContent} onLayout={event => {
            const height = Math.ceil(event.nativeEvent.layout.height);
            setContentSize(current => current.key === layoutKey && current.height >= height ? current : {
              key: layoutKey, height: current.key === layoutKey ? Math.max(current.height, height) : height,
            });
          }}>
          <View style={[s.top, { height: Math.ceil(36 * Math.max(1, Math.min(fontScale, 1.5))) }]}>
            <View style={[s.icon, { backgroundColor: `${color}16` }]}>
              <Icon size={19} color={color} />
            </View>
            {showExploreArrow ? (
              <View style={s.exploreArrow}><ArrowUpRight size={24} color={color} strokeWidth={1.75} /></View>
            ) : (
              <Text style={[s.value, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} maxFontSizeMultiplier={1.5}>{value}</Text>
            )}
          </View>
          <Text style={s.label}>{route === 'Chat' ? <>ScoutWise <Text style={{color, fontWeight: '800'}}>Pro</Text>{tr ? ' Kredin' : ' Credits'}</> : label}</Text>
          </View>
        </Pressable>
      ))}
      {Array.from({ length: columns - row.length }, (_, spacer) => <View key={`spacer-${spacer}`} style={{flex: 1}} />)}
      </View>)}
      {failed && (
        <Text style={s.error}>
          {tr
            ? "Özet bilgileri yüklenemedi."
            : "Summary information could not be loaded."}
        </Text>
      )}
    </View>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {PANEL, TEXT, MUTED, ACCENT, FEATURE_COLORS, themeColor} = colors;

  const s = StyleSheet.create({
  grid: {
    marginHorizontal: 16,
    marginTop: 14,
    flexGrow: 1,
    gap: 10,
  },
  pillRow: { flexDirection: "row", flexGrow: 1, gap: 10 },
  pill: {
    flex: 1,
    justifyContent: "space-between",
    backgroundColor: PANEL,
    borderWidth: 1,
    borderRadius: 24,
    padding: 12,
    gap: 9,
  },
  pillContent: { gap: 9, minWidth: 0, width: "100%" },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"], flex: 1, minWidth: 0, textAlign: "right", includeFontPadding: false },
  exploreArrow: { flex: 1, alignItems: "flex-end", justifyContent: "center", opacity: 0.75 },
  gettingStarted: { color: MUTED, fontSize: 12, lineHeight: 18 },
  label: { color: TEXT, fontSize: 12, lineHeight: 18, fontWeight: "600", minHeight: 36 },
  error: { color: themeColor("#AEB7B0", 'text'), fontSize: 12 },
});
  return {PANEL, TEXT, MUTED, ACCENT, FEATURE_COLORS, s, themeColor};
});
