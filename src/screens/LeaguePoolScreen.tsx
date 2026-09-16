import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import { poolTableStyles } from "@/components/poolTableStyles";
import PlanDiscoveryNudge from "@/components/PlanDiscoveryNudge";
import { TutorialPageGuide } from "@/components/Tutorial";
import { shortCountry } from "@/utils/seasonTableLabels";
import { comparisonSourceShortLabel } from "@/utils/comparisonSourceLabel";
import { FRAME_TITLE, FRAME_STRIPE, FRAME_HEADING } from "@/theme";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ChevronDown,
  GitCompareArrows,
  List,
  ListFilter,
  RotateCcw,
  Search,
  Trophy,
  X,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  getLeagueOptions,
  searchLeagues,
  type LeagueFilters,
  type LeagueOptions,
} from "@/services/leaguePool";
import { useMatchup } from "@/context/MatchupContext";
import type { SearchResultRow } from "@/components/CandidatePlayers";
import SharedMatchupCenter from "@/components/SharedMatchupCenter";
import { ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT } from "@/theme";
import { getMe, type Plan } from "@/services/api";
import {
  incrementLeagueCardPlanNudgeCount,
  shouldShowLeagueCardPlanNudge,
} from "@/ads/adGating";

const EMPTY: LeagueFilters = { countries: [], leagues: [], positions: [] };
const POSITION_ORDER = [
  "GK",
  "CB",
  "LB",
  "RB",
  "CDM",
  "CM",
  "CAM",
  "LM",
  "RM",
  "LW",
  "RW",
  "CF",
];
const fold = (value: string) =>
  value
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

export default function LeaguePoolScreen() {
  const ads = useWorkspaceActionAd();
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const nav = useNavigation<any>();
  const { height } = useWindowDimensions();
  const shared = useMatchup();
  const [filters, setFilters] = React.useState<LeagueFilters>(EMPTY);
  const [options, setOptions] = React.useState<LeagueOptions>(EMPTY);
  const [rows, setRows] = React.useState<SearchResultRow[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [plan, setPlan] = React.useState<Plan>("Free");
  const [planResolved, setPlanResolved] = React.useState(false);
  const [showPlanNudge, setShowPlanNudge] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [optionsError, setOptionsError] = React.useState("");
  const [retry, setRetry] = React.useState(0);
  const [selector, setSelector] = React.useState<
    "countries" | "leagues" | null
  >(null);
  const [query, setQuery] = React.useState("");
  const searchVersion = React.useRef(0);
  const scroll = React.useRef<ScrollView>(null);
  const matchupY = React.useRef(0);
  React.useEffect(() => {
    let active = true;
    setOptionsLoading(true);
    setOptionsError("");
    getLeagueOptions(filters)
      .then((next) => {
        if (!active) return;
        setOptions(next);
        setFilters((current) => {
          const countries = current.countries
            .filter((value) => next.countries.includes(value))
            .slice(0, 1);
          const leagues = current.leagues
            .filter((value) => next.leagues.includes(value))
            .slice(0, 1);
          return countries.join() === current.countries.join() &&
            leagues.join() === current.leagues.join()
            ? current
            : { ...current, countries, leagues };
        });
      })
      .catch((e: any) => {
        if (active) setOptionsError(String(e?.message || e));
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters.countries, filters.leagues, retry]);
  useFocusEffect(
    React.useCallback(
      () => () => {
        searchVersion.current++;
        setLoading(false);
      },
      [],
    ),
  );
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
  const update = (key: keyof LeagueFilters, values: string[]) => {
    searchVersion.current++;
    setLoading(false);
    setFilters((previous) => ({ ...previous, [key]: values }));
  };
  const clear = () => {
    searchVersion.current++;
    setLoading(false);
    setFilters(EMPTY);
    setRows([]);
    setSelectedId("");
    setShowPlanNudge(false);
    setError("");
  };
  const selectLeague = async (row: SearchResultRow) => {
    setSelectedId(row.id);
    setShowPlanNudge(false);
    if (!planResolved || plan !== "Free") return;
    const count = await incrementLeagueCardPlanNudgeCount();
    setShowPlanNudge(shouldShowLeagueCardPlanNudge(count));
  };
  const search = async () => {
    if (loading) return;
    Keyboard.dismiss();
    const version = ++searchVersion.current;
    setLoading(true);
    setError("");
    try {
      const result = await searchLeagues(filters);
      if (version !== searchVersion.current) return;
      setRows(result);
      shared.refresh(result);
      setSelectedId((previous) =>
        result.some((row) => row.id === previous)
          ? previous
          : result[0]?.id || "",
      );
    } catch (e: any) {
      if (version === searchVersion.current) {
        setError(String(e?.message || e));
        setRows([]);
        setSelectedId("");
      }
    } finally {
      if (version === searchVersion.current) setLoading(false);
    }
  };
  const selected = rows.find((row) => row.id === selectedId);
  const positions = [
    ...new Set(options.positions.map((role) => role.toUpperCase())),
  ].sort(
    (a, b) =>
      (POSITION_ORDER.indexOf(a) < 0 ? 99 : POSITION_ORDER.indexOf(a)) -
        (POSITION_ORDER.indexOf(b) < 0 ? 99 : POSITION_ORDER.indexOf(b)) ||
      a.localeCompare(b),
  );
  const optionsShown = (selector ? options[selector] : []).filter((value) =>
    fold(value).includes(fold(query)),
  );
  const label = (key: "countries" | "leagues") =>
    key === "countries" ? (tr ? "Ülke" : "Country") : tr ? "Lig" : "League";
  const choice = (key: "countries" | "leagues") => (
    <View style={styles.field} key={key}>
      <Text style={styles.label}>{label(key)}</Text>
      <Pressable
        testID={`league-filter-${key}`}
        accessibilityRole="button"
        accessibilityLabel={label(key)}
        onPress={() => {
          Keyboard.dismiss();
          setQuery("");
          setSelector(key);
        }}
        style={styles.input}
      >
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: filters[key][0] ? TEXT : MUTED }}
        >
          {filters[key][0] ||
            (tr ? `${label(key)} ara` : `Search ${label(key).toLowerCase()}`)}
        </Text>
        <ChevronDown size={16} color={MUTED} />
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, minHeight: 34 }}
      >
        {filters[key][0] ? (
          <Pressable
            onPress={() => update(key, [])}
            accessibilityLabel={
              tr ? `${label(key)} seçimini temizle` : `Clear ${label(key)}`
            }
            style={[styles.chip, styles.selected]}
          >
            <Text style={styles.chipText}>{filters[key][0]}</Text>
            <X size={13} color={ACCENT} />
          </Pressable>
        ) : filters[key === "countries" ? "leagues" : "countries"].length >
          0 ? (
          options[key].map((value) => (
            <Pressable
              key={value}
              onPress={() => update(key, [value])}
              style={styles.chip}
            >
              <Text numberOfLines={1} style={styles.chipText}>
                {value}
              </Text>
            </Pressable>
          ))
        ) : null}
      </ScrollView>
    </View>
  );
  return (
    <>
      {ads.fallback}
      <ScrollView
        ref={scroll}
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.panel}>
          <View style={[FRAME_STRIPE, { marginBottom: -4 }]} />
          <View style={styles.heading}>
            <ListFilter color={ACCENT} size={20} />
            <Text style={styles.title}>
              {tr ? "Lig Arama Filtreleri" : "League Search Filters"}
            </Text>
            <Pressable
              testID="league-clear-filters"
              accessibilityRole="button"
              accessibilityLabel={tr ? "Filtreleri Temizle" : "Clear Filters"}
              onPress={clear}
              hitSlop={12}
              style={styles.resetButton}
            >
              <RotateCcw size={20} color={DANGER} />
            </Pressable>
          </View>
          <View style={styles.fieldRow}>
            {choice("countries")}
            {choice("leagues")}
          </View>
          <Text style={styles.label}>{tr ? "Rol" : "Role"}</Text>
          {optionsLoading && <ActivityIndicator color={ACCENT} />}
          <View style={styles.roles}>
            {positions.map((role) => (
              <Pressable
                key={role}
                testID={`league-role-${role}`}
                accessibilityRole="checkbox"
                accessibilityState={{
                  checked: filters.positions.includes(role),
                }}
                onPress={() =>
                  update(
                    "positions",
                    filters.positions.includes(role)
                      ? filters.positions.filter((value) => value !== role)
                      : [...filters.positions, role],
                  )
                }
                style={[
                  styles.role,
                  filters.positions.includes(role) && styles.selected,
                ]}
              >
                <Text
                  style={[
                    styles.roleText,
                    filters.positions.includes(role) && { color: ACCENT },
                  ]}
                >
                  {role}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>
            {tr
              ? "Seçilen rollerden en az birinde %20 veya üzeri oynayan oyuncuların lig ortalamaları."
              : "League averages for players with at least 20% of appearances in any selected role."}
          </Text>
          {!!optionsError && (
            <Pressable onPress={() => setRetry((value) => value + 1)}>
              <Text style={styles.error}>{optionsError}</Text>
              <Text style={styles.chipText}>
                {tr ? "Tekrar dene" : "Retry"}
              </Text>
            </Pressable>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            testID="league-search"
            accessibilityRole="button"
            disabled={loading || optionsLoading}
            onPress={search}
            style={[
              styles.primary,
              (loading || optionsLoading) && { opacity: 0.5 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={ACCENT} />
            ) : (
              <Search size={18} color={ACCENT} />
            )}
            <Text style={styles.primaryText}>
              {loading
                ? tr
                  ? "Hesaplanıyor"
                  : "Calculating"
                : tr
                  ? "Ara"
                  : "Search"}
            </Text>
          </Pressable>
        </View>
        <TutorialPageGuide page="leaguePool" frame={0} onShow={y => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <View style={styles.panel}>
          <View style={[FRAME_STRIPE, { marginBottom: -4 }]} />
          <View style={styles.heading}>
            <List size={20} color={ACCENT} />
            <Text style={styles.title}>
              {tr ? "Eşleşen Ligler" : "Matching Leagues"}
            </Text>
            <Text style={styles.label}>
              {rows.length} {tr ? "sonuç" : "results"}
            </Text>
          </View>
          <View style={poolTableStyles.table}>
            <View style={[styles.resultRow, styles.resultHeader]}>
              {[
                tr ? "Ülke" : "Ctry",
                tr ? "Lig" : "Leag.",
                tr ? "Rol" : "Role",
                tr ? "Takım" : "Teams",
                tr ? "Oyuncu" : "Players",
              ].map((title, index) => (
                <View
                  key={title}
                  style={[
                    styles.resultHeaderCell,
                    { flex: [0.65, 0.8, 1.8, 0.75, 1.05][index] },
                    index > 0 && styles.resultHeaderSeparator,
                  ]}
                >
                  <Text numberOfLines={1} style={styles.headerText}>{title}</Text>
                </View>
              ))}
            </View>
            <ScrollView
              nestedScrollEnabled
              style={{ maxHeight: Math.min(420, height * 0.42) }}
            >
              {loading ? (
                <ActivityIndicator color={ACCENT} style={styles.empty} />
              ) : rows.length ? (
                rows.map((row) => (
                  <Pressable
                    key={row.id}
                    testID={`league-result-${row.id}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: row.id === selectedId }}
                    accessibilityLabel={`${row.player.meta?.nationality}, ${row.player.name}`}
                    onPress={() => void selectLeague(row)}
                    style={[
                      styles.resultRow,
                      row.id === selectedId && poolTableStyles.selected,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.cell, { flex: 0.65 }]}
                    >
                      {shortCountry(row.player.meta?.nationality || "")}
                    </Text>
                    <Text
                      numberOfLines={3}
                      style={[styles.cell, { flex: 0.8 }]}
                    >
                      {comparisonSourceShortLabel({
                        competition: row.player.name,
                        team: "",
                      })}
                    </Text>
                    <View
                      style={{
                        flex: 1.8,
                        minWidth: 0,
                        gap: 4,
                        paddingVertical: 10,
                        paddingHorizontal: 3,
                      }}
                    >
                      {Array.from(
                        {
                          length: Math.ceil(
                            (row.player.meta?.positionNamesSeen?.length ?? 0) /
                              3,
                          ),
                        },
                        (_, index) => (
                          <View
                            key={index}
                            style={{
                              flexDirection: "row",
                              justifyContent: "center",
                              gap: 4,
                            }}
                          >
                            {row.player.meta?.positionNamesSeen
                              ?.slice(index * 3, index * 3 + 3)
                              .map((role) => (
                                <Text
                                  key={role}
                                  numberOfLines={1}
                                  style={styles.resultRole}
                                >
                                  {role}
                                </Text>
                              ))}
                          </View>
                        ),
                      )}
                    </View>
                    <Text style={[styles.cell, { flex: 0.75 }]}>
                      {row.player.meta?.teamCount || 0}
                    </Text>
                    <Text style={[styles.cell, { flex: 1.05 }]}>
                      {row.player.meta?.playerCount || 0}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <Text style={styles.empty}>
                  {tr
                    ? "Filtreleri seçip ligleri getirin."
                    : "Choose filters to find league candidates."}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
        <TutorialPageGuide page="leaguePool" frame={1} onShow={y => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <LeagueCard
          row={selected}
          tr={tr}
          added={
            !!selected && shared.rows.some((row) => row?.id === selected.id)
          }
          full={shared.rows.slice(0, shared.mode).every(Boolean)}
          busy={ads.busy}
          onAdd={async () => {
            if (!selected || ads.busy || shared.rows.some(row => row?.id === selected.id) || shared.rows.slice(0, shared.mode).every(Boolean)) return;
            try {
              await ads.run('leagueMatchupAdd', () => {
                shared.add(selected);
                requestAnimationFrame(() =>
                  scroll.current?.scrollTo({
                    y: Math.max(0, matchupY.current - 12),
                    animated: true,
                  }),
                );
              });
            } catch (error) {
              Alert.alert(tr ? 'Ekleme hatası' : 'Could not add to matchup', String(error));
            }
          }}
          footer={
            showPlanNudge && plan === "Free" ? (
              <PlanDiscoveryNudge
                onClose={() => setShowPlanNudge(false)}
                onOpenPlans={() => nav.navigate("ManagePlan")}
              />
            ) : null
          }
        />
        <View
          onLayout={(event) => {
            matchupY.current = event.nativeEvent.layout.y;
          }}
        >
          <SharedMatchupCenter />
        </View>
      </ScrollView>
      <Modal
        visible={!!selector}
        transparent
        animationType="fade"
        onRequestClose={() => setSelector(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal} accessibilityViewIsModal>
            <View style={styles.heading}>
              <Text style={styles.title}>
                {selector === "countries"
                  ? tr
                    ? "Ülke Seç"
                    : "Select Country"
                  : tr
                    ? "Lig Seç"
                    : "Select League"}
              </Text>
              <Pressable
                style={styles.iconButton}
                accessibilityRole="button"
                accessibilityLabel={tr ? "Kapat" : "Close"}
                onPress={() => setSelector(null)}
              >
                <X color={DANGER} size={22} />
              </Pressable>
            </View>
            <TextInput
              testID="league-selector-query"
              accessibilityLabel={tr ? "Seçenek ara" : "Search options"}
              value={query}
              onChangeText={setQuery}
              placeholder={tr ? "Ara…" : "Search…"}
              placeholderTextColor={MUTED}
              style={[styles.input, { color: TEXT }]}
            />
            <ScrollView
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 8 }}
            >
              {optionsShown.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: !!selector && filters[selector][0] === option,
                  }}
                  onPress={() => {
                    if (selector) update(selector, [option]);
                    setSelector(null);
                  }}
                  style={[
                    styles.option,
                    selector &&
                      filters[selector][0] === option &&
                      styles.selected,
                  ]}
                >
                  <Text style={{ color: TEXT, fontWeight: "700" }}>
                    {option}
                  </Text>
                </Pressable>
              ))}
              {!optionsShown.length && (
                <Text style={styles.empty}>
                  {tr ? "Sonuç bulunamadı." : "No results found."}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export function LeagueCard({
  row,
  tr,
  added,
  full,
  busy = false,
  onAdd,
  footer,
}: {
  row?: SearchResultRow;
  tr: boolean;
  added: boolean;
  full: boolean;
  busy?: boolean;
  onAdd: () => void;
  footer?: React.ReactNode;
}) {
  const [imageFailed, setImageFailed] = React.useState(false);
  const meta = row?.player.meta;
  React.useEffect(() => setImageFailed(false), [meta?.imageUrl]);
  const roles = Object.entries(meta?.positionCounts || {}).sort(
    (a, b) => b[1] - a[1],
  );
  const total = roles.reduce((sum, [, count]) => sum + count, 0);
  return (
    <View style={styles.panel}>
      <View style={[FRAME_STRIPE, { marginBottom: -4 }]} />
      <View style={styles.heading}>
        <Trophy size={20} color={ACCENT} />
        <Text style={styles.title}>{tr ? "Lig Kartı" : "League Card"}</Text>
        {row && (
          <Pressable
            testID="league-add-matchup"
            disabled={added || full || busy}
            accessibilityRole="button"
            onPress={onAdd}
            style={[styles.add, (added || full || busy) && { opacity: 0.5 }]}
          >
            <GitCompareArrows size={16} color={ACCENT} />
            <Text style={styles.chipText}>
              {added
                ? tr
                  ? "Eşleşmede"
                  : "In matchup"
                : tr
                  ? "Eşleşme"
                  : "Matchup"}
            </Text>
          </Pressable>
        )}
      </View>
      {!row ? (
        <Text style={[styles.empty, { paddingVertical: 65 }]}>
          {tr
            ? "Lig adaylarından bir lig seçin."
            : "Select a league candidate."}
        </Text>
      ) : (
        <>
          <View style={styles.identity}>
            {meta?.imageUrl && !imageFailed ? (
              <Image
                source={{ uri: meta.imageUrl }}
                resizeMode="contain"
                onError={() => setImageFailed(true)}
                style={{ width: 64, height: 64 }}
              />
            ) : (
              <View style={styles.logo}>
                <Trophy size={36} color={ACCENT} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.leagueName}>{row.player.name}</Text>
              <Text style={styles.hint}>
                {meta?.nationality} · {meta?.teamCount || 0}{" "}
                {tr ? "takım" : "teams"} · {meta?.playerCount || 0}{" "}
                {tr ? "oyuncu" : "players"}
              </Text>
            </View>
          </View>
          <View style={styles.roleSection}>
            <Text style={styles.label}>
              {tr ? "ROL DAĞILIMI" : "ROLE DISTRIBUTION"}
            </Text>
            <View style={styles.roles}>
              {roles.map(([role, count]) => {
                const percent = Math.round((count / Math.max(total, 1)) * 100);
                return percent > 0 ? (
                  <View key={role} style={styles.chip}>
                    <Text style={styles.chipText}>
                      {role} · {percent}%
                    </Text>
                  </View>
                ) : null;
              })}
            </View>
          </View>
          <View style={styles.tiles}>
            {[
              [tr ? "Ort. Yaş" : "Avg. Age", meta?.age ?? "—"],
              [tr ? "Ülke" : "Country", meta?.nationality || "—"],
              [
                tr ? "Ort. Fiziksel" : "Avg. Physical",
                [
                  meta?.height ? `${meta.height} cm` : "",
                  meta?.weight ? `${meta.weight} kg` : "",
                ]
                  .filter(Boolean)
                  .join(" · ") || "—",
              ],
            ].map(([label, value]) => (
              <View key={label} style={styles.tile}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.tileValue}>{value}</Text>
              </View>
            ))}
          </View>
        </>
      )}
      {footer}
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  panel: {
    backgroundColor: PANEL,
    borderColor: ACCENT,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 14,
  },
  heading: { ...FRAME_HEADING },
  title: { ...FRAME_TITLE, flex: 1 },
  resetButton: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldRow: { flexDirection: "row", gap: 10 },
  field: { flex: 1, minWidth: 0, gap: 7 },
  label: { color: MUTED, fontSize: 11, fontWeight: "700" },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    padding: 10,
    backgroundColor: CARD,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  role: {
    minWidth: 44,
    minHeight: 44,
    padding: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    backgroundColor: CARD,
  },
  roleText: { color: MUTED, fontWeight: "800", fontSize: 12 },
  selected: { borderColor: ACCENT, backgroundColor: "rgba(22,163,74,0.12)" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 7,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    maxWidth: 200,
  },
  chipText: { color: ACCENT, fontSize: 11, fontWeight: "800", flexShrink: 1 },
  hint: { color: MUTED, fontSize: 12, lineHeight: 18 },
  primary: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: "rgba(22,163,74,0.12)",
  },
  primaryText: { color: ACCENT, fontWeight: "800", fontSize: 14 },
  error: { color: DANGER, fontSize: 12 },
  resultRow: poolTableStyles.row,
  resultHeader: poolTableStyles.header,
  resultHeaderCell: { minWidth: 0, paddingHorizontal: 3, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  resultHeaderSeparator: { borderLeftWidth: 1, borderLeftColor: LINE },
  headerText: { ...poolTableStyles.headerText, fontSize: 10.5, textAlign: "center" },
  cell: poolTableStyles.cell,
  resultRole: {
    color: ACCENT,
    fontSize: 10.5,
    fontWeight: "700",
    lineHeight: 13,
    textAlign: "center",
    flexShrink: 1,
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: LINE,
  },
  empty: { padding: 24, textAlign: "center", color: MUTED, fontSize: 13 },
  add: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 10,
    padding: 10,
    minHeight: 44,
  },
  identity: { flexDirection: "row", gap: 14, alignItems: "center" },
  logo: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
  },
  leagueName: { color: TEXT, fontWeight: "900", fontSize: 23 },
  roleSection: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: LINE,
    paddingVertical: 14,
    gap: 9,
  },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  tile: {
    flexGrow: 1,
    flexBasis: "28%",
    minWidth: 80,
    padding: 10,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    backgroundColor: CARD,
    gap: 6,
  },
  tileValue: { color: TEXT, fontWeight: "800", fontSize: 12 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 18,
  },
  modal: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 460,
    maxHeight: "85%",
    backgroundColor: PANEL,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 16,
    gap: 14,
  },
  option: {
    padding: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
});
