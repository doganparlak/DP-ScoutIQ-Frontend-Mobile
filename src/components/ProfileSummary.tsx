import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { useNavigation, type NavigationProp, useFocusEffect } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  Shirt,
  ShieldCheck,
  BookMarked,
  GitCompareArrows,
  FileText,
} from "lucide-react-native";
import { useMatchup } from "@/context/MatchupContext";
import { matchPoolRequest } from "@/services/api";
import { PANEL, TEXT, ACCENT } from "@/theme";

import type { MainTabsParamList } from '@/types';

type Summary = {
  portfolioPlayers: number;
  portfolioTeams: number;
  readyTeamReports: number;
  portfolioMatches: number;
  readyPlayerReports: number;
  readyPostMatchReports: number;
  readyPreMatchReports: number;
};
export default function ProfileSummary() {
  const { i18n } = useTranslation();
  const navigation = useNavigation<NavigationProp<MainTabsParamList>>();
  const tr = i18n.language.startsWith("tr");
  const { rows, mode } = useMatchup();
  const { width, fontScale } = useWindowDimensions();
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
  const count = (key: keyof Summary) =>
    loading
      ? "…"
      : summary && summary[key] != null
        ? String(summary[key])
        : "—";
  const pills: {label:string;value:string;Icon:typeof Shirt;color:string;route:'Portfolio'|'TeamPortfolio'|'MatchPortfolio'|'Matchup'}[] = [
    {
      label: tr ? "Portföy Oyuncuları" : "Portfolio Players",
      value: count("portfolioPlayers"), route: "Portfolio",
      Icon: Shirt,
      color: ACCENT,
    },
    {label: tr ? "Portföy Takımları" : "Portfolio Teams", value: count("portfolioTeams"), route: "TeamPortfolio", Icon: ShieldCheck, color: ACCENT},
    {
      label: tr ? "Portföy Maçları" : "Portfolio Matches",
      value: count("portfolioMatches"), route: "MatchPortfolio",
      Icon: BookMarked,
      color: ACCENT,
    },
    {
      label: tr ? "Eşleşme Merkezi" : "Matchup Center",
      value: `${rows.slice(0, mode).filter(Boolean).length}/${mode}`,
      route: "Matchup",
      Icon: GitCompareArrows,
      color: "#C084FC",
    },
    {
      label: tr ? "Oyuncu Raporların" : "Your Player Reports",
      value: count("readyPlayerReports"), route: "Portfolio",
      Icon: FileText,
      color: "#38BDF8",
    },
    {label: tr ? "Takım Raporların" : "Your Team Reports", value: count("readyTeamReports"), route: "TeamPortfolio", Icon: FileText, color: "#38BDF8"},
    {
      label: tr ? "Maç Önü Raporların" : "Your Pre-Match Reports",
      value: count("readyPreMatchReports"), route: "MatchPortfolio",
      Icon: FileText,
      color: "#38BDF8",
    },
    {
      label: tr ? "Maç Sonu Raporların" : "Your Post-Match Reports",
      value: count("readyPostMatchReports"), route: "MatchPortfolio",
      Icon: FileText,
      color: "#38BDF8",
    },
  ];
  const singleColumn = width < 350 || fontScale > 1.3;
  const columns = singleColumn ? 1 : width >= 750 ? 3 : 2;
  const pillRows = Array.from({ length: Math.ceil(pills.length / columns) }, (_, index) => pills.slice(index * columns, (index + 1) * columns));
  return (
    <View style={s.grid}>
      {pillRows.map((row, index) => <View key={index} style={s.pillRow}>
      {row.map(({ label, value, Icon, color, route }) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          onPress={() => navigation.navigate(route)}
          accessibilityLabel={`${label}: ${value}`}
          style={({pressed}) => [
            s.pill,
            pressed && {opacity:0.75},
            {
              minHeight: singleColumn ? 100 : 112,
              borderColor: `${color}55`,
            },
          ]}
        >
          <View style={s.top}>
            <View style={[s.icon, { backgroundColor: `${color}16` }]}>
              <Icon size={19} color={color} />
            </View>
            <Text style={[s.value, { color }]}>{value}</Text>
          </View>
          <Text style={s.label}>{label}</Text>
        </Pressable>
      ))}</View>)}
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
    padding: 14,
    gap: 9,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 24, fontWeight: "800", fontVariant: ["tabular-nums"] },
  label: { color: TEXT, fontSize: 12, lineHeight: 18, fontWeight: "600" },
  error: { color: "#AEB7B0", fontSize: 12 },
});
