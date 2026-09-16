import TeamProfileCard from "@/components/TeamProfileCard";
import PlanDiscoveryNudge from "@/components/PlanDiscoveryNudge";
import TeamSuggestionsOverlay from "@/components/TeamSuggestionsOverlay";
import { TutorialPageGuide } from "@/components/Tutorial";
import { poolTableStyles } from "@/components/poolTableStyles";
import {
  ROW_HEIGHT,
  CANDIDATE_TABLE_VISIBLE_ROWS,
} from "@/components/CandidatePlayers";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  BarChart3,
  Building2,
  Globe2,
  ListChecks,
  ListFilter,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  Trophy,
  UserCog,
  UsersRound,
  X,
} from "lucide-react-native";
import {
  ACCENT,
  BG,
  CARD,
  DANGER,
  LINE,
  MUTED,
  PANEL,
  TEXT,
  FRAME_STRIPE,
  FRAME_TITLE,
  FRAME_HEADING,
} from "@/theme";
import {
  getTeamOptions,
  searchTeams,
  Team,
  TeamFilters,
  TeamOptions,
} from "@/services/teamPool";
import { getMe, type Plan } from "@/services/api";
import {
  incrementTeamCardPlanNudgeCount,
  shouldShowTeamCardPlanNudge,
} from "@/ads/adGating";
import { shortCountry, shortPlayer } from "@/utils/seasonTableLabels";
import { comparisonSourceShortLabel } from "@/utils/comparisonSourceLabel";
const EMPTY: TeamFilters = { team: "", country: "", league: "" };
const fold = (s: string) =>
  s
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
function Frame({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: any;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={s.frame}>
      <View style={FRAME_STRIPE} />
      <View style={[FRAME_HEADING, { marginBottom: 16 }]}>
        <Icon size={20} color={ACCENT} />
        <Text style={[FRAME_TITLE, { flex: 1 }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}
export default function TeamPoolScreen() {
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const nav = useNavigation<any>();
  const { height, width } = useWindowDimensions();
  const [filters, setFilters] = useState(EMPTY),
    [options, setOptions] = useState<TeamOptions>({
      countries: [],
      leagues: [],
      teams: [],
    });
  const [rows, setRows] = useState<Team[]>([]),
    [selectedId, setSelectedId] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [selector, setSelector] = useState<"country" | "league" | null>(null),
    [query, setQuery] = useState(""),
    [retry, setRetry] = useState(0),
    [focused, setFocused] = useState(false);
  const [plan, setPlan] = useState<Plan>("Free");
  const [planResolved, setPlanResolved] = useState(false);
  const [showPlanNudge, setShowPlanNudge] = useState(false);
  const teamAnchor = useRef<View>(null);
  const pageScroll = useRef<ScrollView>(null);
  const version = useRef(0);
  const selected = rows.find((r) => r.id === selectedId) || rows[0];
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getMe()
        .then((me) => {
          if (!active) return;
          const nextPlan: Plan =
            me.plan === "No Ads Monthly" || me.plan === "Pro Monthly" || me.plan === "Pro Yearly"
              ? me.plan
              : "Free";
          setPlan(nextPlan);
          setPlanResolved(true);
          if (nextPlan !== "Free") setShowPlanNudge(false);
        })
        .catch(() => {
          if (!active) return;
          setPlan("Free");
          setPlanResolved(true);
        });
      return () => {
        active = false;
      };
    }, []),
  );
  useEffect(() => {
    let active = true;
    getTeamOptions(filters)
      .then((value) => {
        if (!active) return;
        setOptions(value);
        setError("");
        setFilters((current) => ({
          ...current,
          country:
            current.country && !value.countries.includes(current.country)
              ? ""
              : current.country,
          league:
            current.league && !value.leagues.includes(current.league)
              ? ""
              : current.league,
          team:
            current.team && !value.teams.includes(current.team)
              ? ""
              : current.team,
        }));
      })
      .catch(
        () =>
          active &&
          setError(
            tr
              ? "Filtreler yüklenemedi. Yeniden deneyin."
              : "Could not load filters. Retry.",
          ),
      );
    return () => {
      active = false;
    };
  }, [filters.country, filters.league, retry]);
  useEffect(
    () => () => {
      version.current++;
    },
    [],
  );
  const update = (key: keyof TeamFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const search = async () => {
    const token = ++version.current;
    setLoading(true);
    setError("");
    setFocused(false);
    try {
      const result = await searchTeams(filters);
      if (token !== version.current) return;
      setRows(result);
      setSelectedId((id) =>
        result.some((r) => r.id === id) ? id : result[0]?.id || "",
      );
    } catch (e) {
      if (token !== version.current) return;
      setRows([]);
      setSelectedId("");
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (token === version.current) setLoading(false);
    }
  };
  const clear = () => {
    version.current++;
    setLoading(false);
    setFilters(EMPTY);
    setRows([]);
    setSelectedId("");
    setError("");
    setShowPlanNudge(false);
    setRetry((n) => n + 1);
  };
  const selectTeam = async (team: Team) => {
    setSelectedId(team.id);
    setShowPlanNudge(false);
    if (!planResolved || plan !== "Free") return;
    const count = await incrementTeamCardPlanNudgeCount();
    setShowPlanNudge(shouldShowTeamCardPlanNudge(count));
  };
  const suggestions = filters.team
    ? options.teams
        .filter((t) => fold(t).includes(fold(filters.team)))
        .slice(0, 6)
    : [];
  const labels = tr
    ? ["Takım Adı", "Ülke", "Lig", "Teknik D."]
    : ["Team Name", "Country", "League", "Coach"];
  const resultsHeight =
    rows.length === 0
      ? ROW_HEIGHT * 3
      : ROW_HEIGHT * (Math.min(rows.length, CANDIDATE_TABLE_VISIBLE_ROWS) + 1) +
        2;
  const flexes = [2, 0.9, 0.8, 1.3];
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={pageScroll}
        onScrollBeginDrag={() => setFocused(false)}
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <Frame
          title={tr ? "Takım Arama Filtreleri" : "Team Search Filters"}
          icon={ListFilter}
          action={
            <Pressable
              accessibilityLabel={tr ? "Filtreleri temizle" : "Clear filters"}
              hitSlop={12}
              onPress={clear}
            >
              <RotateCcw size={20} color={DANGER} />
            </Pressable>
          }
        >
          <View style={{ position: "relative" }}>
            <View ref={teamAnchor} collapsable={false}>
              <Text style={s.label}>{tr ? "Takım" : "Team"}</Text>
              <TextInput
                style={s.input}
                value={filters.team}
                onChangeText={(v) => update("team", v)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder={tr ? "Takım ara" : "Search team"}
                placeholderTextColor={MUTED}
                returnKeyType="search"
                onSubmitEditing={search}
              />
            </View>
            <View style={s.twoCol}>
              {(["country", "league"] as const).map((key) => (
                <View key={key} style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.label}>
                    {key === "country"
                      ? tr
                        ? "Ülke"
                        : "Country"
                      : tr
                        ? "Lig"
                        : "League"}
                  </Text>
                  <Pressable
                    style={s.input}
                    onPress={() => {
                      setQuery("");
                      setSelector(key);
                      setFocused(false);
                    }}
                  >
                    <Text numberOfLines={1} style={s.text}>
                      {filters[key] || (tr ? "Seçiniz" : "Select")}
                    </Text>
                  </Pressable>
                  <ScrollView
                    horizontal
                    contentContainerStyle={{ gap: 6, paddingTop: 6 }}
                  >
                    {filters[key] ? (
                      <Pressable style={s.chip} onPress={() => update(key, "")}>
                        <Text style={s.green}>{filters[key]}</Text>
                        <X size={12} color={ACCENT} />
                      </Pressable>
                    ) : (
                      (key === "country"
                        ? filters.league
                          ? options.countries
                          : []
                        : filters.country
                          ? options.leagues
                          : []
                      ).map((v: string) => (
                        <Pressable
                          key={v}
                          style={s.chip}
                          onPress={() => update(key, v)}
                        >
                          <Text style={s.green}>{v}</Text>
                        </Pressable>
                      ))
                    )}
                  </ScrollView>
                </View>
              ))}
            </View>
            <Pressable disabled={loading} style={s.button} onPress={search}>
              {loading ? (
                <ActivityIndicator color={ACCENT} />
              ) : (
                <Search size={18} color={ACCENT} />
              )}
              <Text style={s.green}>
                {loading
                  ? tr
                    ? "Aranıyor"
                    : "Searching"
                  : tr
                    ? "Ara"
                    : "Search"}
              </Text>
            </Pressable>
            {!!error && (
              <Pressable onPress={() => setRetry((n) => n + 1)}>
                <Text style={{ color: DANGER, marginTop: 12 }}>{error}</Text>
              </Pressable>
            )}
          </View>
        </Frame>
        <TutorialPageGuide page="teamPool" frame={0} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <Frame
          title={tr ? "Eşleşen Takımlar" : "Matching Teams"}
          icon={ListChecks}
        >
          <View style={[s.table, { marginTop: 10 }]}>
            <View style={[s.row, poolTableStyles.header]}>
              {labels.map((label, i) => (
                <View
                  key={label}
                  style={[
                    s.headerCell,
                    { flex: flexes[i] },
                    i > 0 && s.headerSeparator,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={s.tableHeader}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ height: resultsHeight }}>
              {loading ? (
                <ActivityIndicator style={{ flex: 1 }} color={ACCENT} />
              ) : rows.length ? (
                <ScrollView nestedScrollEnabled>
                  {rows.map((team) => (
                    <Pressable
                      key={team.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${team.name}, ${team.country}, ${team.league}, ${team.coachName}`}
                      accessibilityState={{
                        selected: team.id === selected?.id,
                      }}
                      onPress={() => void selectTeam(team)}
                      style={[s.row, team.id === selected?.id && s.active]}
                    >
                      {[
                        team.name,
                        shortCountry(team.country),
                        comparisonSourceShortLabel({
                          competition: team.league,
                          team: "",
                        }),
                        shortPlayer(team.coachName) || "—",
                      ].map((v, i) => (
                        <Text
                          key={i}
                          numberOfLines={i === 0 ? undefined : 2}
                          style={[s.cell, { flex: flexes[i] }]}
                        >
                          {v}
                        </Text>
                      ))}
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={s.empty}>
                  {tr
                    ? "Takımları görmek için arama filtrelerini kullanın."
                    : "Use the search filters to find teams."}
                </Text>
              )}
            </View>
          </View>
        </Frame>
        <TutorialPageGuide page="teamPool" frame={1} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <Frame title={tr ? "Takım Kartı" : "Team Card"} icon={ShieldCheck}>
          {selected ? (
            <>
              <TeamProfileCard
                team={selected}
                tr={tr}
                onAnalyze={() => nav.navigate("TeamAnalysis", { team: selected })}
              />
              {showPlanNudge && plan === "Free" ? (
                <PlanDiscoveryNudge
                  onClose={() => setShowPlanNudge(false)}
                  onOpenPlans={() => nav.navigate("ManagePlan")}
                />
              ) : null}
            </>
          ) : (
            <Text style={s.empty}>
              {tr
                ? "Takım kartını görüntülemek için bir takım seçin."
                : "Select a team to view its card."}
            </Text>
          )}
        </Frame>
        <Modal
          visible={selector !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelector(null)}
        >
          <View style={s.backdrop}>
            <View style={[s.modal, { maxHeight: height * 0.8 }]}>
              <View style={s.identity}>
                <Text style={[FRAME_TITLE, { flex: 1 }]}>
                  {selector === "country"
                    ? tr
                      ? "Ülke Seç"
                      : "Select Country"
                    : tr
                      ? "Lig Seç"
                      : "Select League"}
                </Text>
                <Pressable hitSlop={12} onPress={() => setSelector(null)}>
                  <X size={22} color={DANGER} />
                </Pressable>
              </View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={tr ? "Ara" : "Search"}
                placeholderTextColor={MUTED}
                style={[s.input, { marginVertical: 12 }]}
              />
              <ScrollView keyboardShouldPersistTaps="handled">
                {(selector === "country" ? options.countries : options.leagues)
                  .filter((v) => fold(v).includes(fold(query)))
                  .map((v) => (
                    <Pressable
                      key={v}
                      style={[
                        s.option,
                        selector && filters[selector] === v ? s.active : null,
                      ]}
                      onPress={() => {
                        if (selector) update(selector, v);
                        setSelector(null);
                      }}
                    >
                      <Text style={s.text}>{v}</Text>
                    </Pressable>
                  ))}
                {!(
                  selector === "country" ? options.countries : options.leagues
                ).some((v) => fold(v).includes(fold(query))) && (
                  <Text style={s.empty}>
                    {tr ? "Sonuç bulunamadı." : "No results found."}
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
      <TeamSuggestionsOverlay
        anchor={teamAnchor}
        visible={
          focused &&
          suggestions.length > 0 &&
          !suggestions.some((t) => fold(t) === fold(filters.team))
        }
        options={suggestions}
        onSelect={(name) => {
          update("team", name);
          setFocused(false);
        }}
      />
    </View>
  );
}
const s = StyleSheet.create({
  page: { padding: 16, gap: 16, paddingBottom: 40 },
  frame: {
    padding: 16,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 20,
    backgroundColor: PANEL,
  },
  label: { fontSize: 12, color: MUTED, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    backgroundColor: CARD,
    padding: 12,
    minHeight: 44,
    color: TEXT,
    fontSize: 14,
    justifyContent: "center",
  },
  text: { color: TEXT, fontSize: 13 },
  twoCol: { flexDirection: "row", gap: 12, marginVertical: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    padding: 6,
  },
  green: { color: ACCENT, fontWeight: "800", fontSize: 13 },
  button: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(22,163,74,.08)",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  option: { padding: 12, borderBottomWidth: 1, borderColor: LINE },
  table: poolTableStyles.table,
  row: poolTableStyles.row,
  cell: poolTableStyles.cell,
  tableHeader: { ...poolTableStyles.headerText, fontSize: 11.5, textAlign: "center" },
  headerCell: {
    minWidth: 0,
    paddingHorizontal: 3,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSeparator: { borderLeftWidth: 1, borderLeftColor: LINE },
  active: poolTableStyles.selected,
  empty: {
    color: MUTED,
    textAlign: "center",
    fontSize: 13,
    paddingVertical: 32,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 18,
    padding: 12,
    gap: 16,
  },
  identity: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: {
    width: 76,
    height: 76,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontSize: 23, fontWeight: "900", color: TEXT, marginBottom: 6 },
  tiles: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  tile: {
    padding: 10,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,.025)",
  },
  value: { fontSize: 14, color: TEXT, fontWeight: "800", marginTop: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.8)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    padding: 16,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 20,
  },
});
