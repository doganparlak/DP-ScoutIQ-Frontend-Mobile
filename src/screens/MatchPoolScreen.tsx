import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import MatchPortfolioTable from "@/components/MatchPortfolioTable";
import MatchReportActions from "@/components/MatchReportActions";
import PlanDiscoveryNudge from "@/components/PlanDiscoveryNudge";
import { TutorialPageGuide } from "@/components/Tutorial";
import { deleteSavedMatch, getMe, type Plan } from "@/services/api";
import { FavoriteMatch, filterSavedMatches } from "@/services/matchPool";
import { formatPlayerContractDate } from "@/utils/playerContract";
import TeamSuggestionsOverlay from "@/components/TeamSuggestionsOverlay";
import {
  normalizeSearchText as fold,
  optionMatchesSearch,
} from "@/utils/searchSuggestions";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTranslation } from "react-i18next";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  BadgeInfo,
  BookMarked,
  CalendarDays,
  CalendarX2,
  ChevronDown,
  ListChecks,
  ListFilter,
  RotateCcw,
  Search,
  ShieldCheck,
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
  FRAME_HEADING,
  FRAME_TITLE,
} from "@/theme";
import { poolTableStyles as table } from "@/components/poolTableStyles";
import {
  EMPTY_MATCH_FILTERS,
  MatchFilters,
  MatchFixture,
  MatchOptions,
  MatchSide,
  matchOptions,
  searchMatches,
  savedMatches,
  saveMatch,
  matchSaveType,
  matchScore,
  matchStateLabel,
  dateValidation,
  effectiveMatchFilters,
  fixtureDate,
} from "@/services/matchPool";
import { shortCountry, shortTeam } from "@/utils/seasonTableLabels";
import { comparisonSourceShortLabel } from "@/utils/comparisonSourceLabel";
import {
  incrementMatchCardPlanNudgeCount,
  shouldShowMatchCardPlanNudge,
} from "@/ads/adGating";
const iso = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
function Frame({
  title,
  Icon,
  children,
  action,
  headingGap = 16,
}: {
  title: string;
  Icon: any;
  children: React.ReactNode;
  action?: React.ReactNode;
  headingGap?: number;
}) {
  return (
    <View style={s.frame}>
      <View style={FRAME_STRIPE} />
      <View style={[FRAME_HEADING, { marginBottom: headingGap }]}>
        <Icon size={20} color={ACCENT} />
        <Text style={[FRAME_TITLE, { flex: 1 }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}
function Side({ team }: { team: MatchSide }) {
  return (
    <View style={s.side}>
      {team.imageUrl ? (
        <Image
          source={{ uri: team.imageUrl }}
          style={{ width: 60, height: 60 }}
          resizeMode="contain"
        />
      ) : (
        <ShieldCheck size={54} color={ACCENT} />
      )}
      <Text style={[s.text, { textAlign: "center", fontWeight: "800" }]}>
        {team.name}
      </Text>
    </View>
  );
}
export default function MatchPoolScreen({
  portfolio = false,
}: {
  portfolio?: boolean;
}) {
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const ads = useWorkspaceActionAd();
  const nav = useNavigation<any>();
  const { height } = useWindowDimensions();
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_MATCH_FILTERS),
    [options, setOptions] = useState<MatchOptions>({
      countries: [],
      leagues: [],
      teams: [],
    });
  const [rows, setRows] = useState<MatchFixture[]>([]),
    [selectedId, setSelectedId] = useState<number | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [optionsError, setOptionsError] = useState("");
  const [saving, setSaving] = useState<number | null>(null),
    [saved, setSaved] = useState<string[]>([]),
    [saveError, setSaveError] = useState("");
  const [selector, setSelector] = useState<"country" | "league" | null>(null),
    [query, setQuery] = useState(""),
    [dateField, setDateField] = useState<"startDate" | "endDate" | null>(null),
    [dateDraft, setDateDraft] = useState(new Date()),
    [retry, setRetry] = useState(0);
  const [teamFocus, setTeamFocus] = useState<"homeTeam" | "awayTeam" | null>(
    null,
  );
  const homeAnchor = useRef<View>(null);
  const awayAnchor = useRef<View>(null);
  const pageScroll = useRef<ScrollView>(null);
  const teamSuggestions =
    teamFocus && fold(filters[teamFocus])
      ? options.teams
          .filter((v) => optionMatchesSearch(v, fold(filters[teamFocus])))
          .slice(0, 6)
      : [];
  const showTeamSuggestions =
    teamFocus &&
    teamSuggestions.length > 0 &&
    !teamSuggestions.some((v) => fold(v) === fold(filters[teamFocus]));
  const [cardOpen, setCardOpen] = useState(false);
  const [plan, setPlan] = useState<Plan>("Free");
  const [planResolved, setPlanResolved] = useState(false);
  const [showPlanNudge, setShowPlanNudge] = useState(false);
  const [favorites, setFavorites] = useState<FavoriteMatch[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const favoritesVersion = useRef(0);
  const version = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current++;
    };
  }, []);
  useEffect(() => {
    let active = true;
    setOptionsError("");
    matchOptions(filters)
      .then((value) => {
        if (!active) return;
        setOptions(value);
        setFilters((f) => ({
          ...f,
          country:
            f.country && !value.countries.includes(f.country) ? "" : f.country,
          league: f.league && !value.leagues.includes(f.league) ? "" : f.league,
        }));
      })
      .catch(
        () =>
          active &&
          setOptionsError(
            tr
              ? "Filtreler yüklenemedi. Yeniden deneyin."
              : "Could not load filters. Retry.",
          ),
      );
    return () => {
      active = false;
    };
  }, [filters.country, filters.league, retry]);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const request = ++favoritesVersion.current;
      if (portfolio) setPortfolioLoading(true);
      savedMatches()
        .then((data) => {
          if (!active || request !== favoritesVersion.current) return;
          setFavorites(data);
          setSaved(data.map((r) => `${r.fixture.fixtureId}:${r.reportType}`));
        })
        .catch((e) => {
          if (active && portfolio)
            setError(e instanceof Error ? e.message : String(e));
        })
        .finally(() => {
          if (active) setPortfolioLoading(false);
        });
      return () => {
        active = false;
      };
    }, [portfolio, retry]),
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
  const portfolioFixtures = React.useMemo(
    () =>
      Array.from(
        new Map(
          favorites.map((f) => [f.fixture.fixtureId, f.fixture]),
        ).values(),
      ),
    [favorites],
  );
  const visibleRows = portfolio
    ? filterSavedMatches(portfolioFixtures, filters)
    : rows;
  const remove = (fixture: MatchFixture) =>
    Alert.alert(
      tr ? "Portföyden kaldır" : "Remove from portfolio",
      fixture.name,
      [
        { text: tr ? "İptal" : "Cancel", style: "cancel" },
        {
          text: tr ? "Kaldır" : "Remove",
          style: "destructive",
          onPress: async () => {
            if (deletingId !== null) return;
            setDeletingId(fixture.fixtureId);
            favoritesVersion.current++;
            try {
              await deleteSavedMatch(fixture.fixtureId);
              setFavorites((v) =>
                v.filter((f) => f.fixture.fixtureId !== fixture.fixtureId),
              );
              setSaved((v) =>
                v.filter((key) => !key.startsWith(`${fixture.fixtureId}:`)),
              );
            } catch (e) {
              Alert.alert(
                tr ? "Silinemedi" : "Delete failed",
                e instanceof Error ? e.message : String(e),
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  const update = (key: keyof MatchFilters, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));
  const selected =
    visibleRows.find((f) => f.fixtureId === selectedId) || visibleRows[0];
  const saveType = selected ? matchSaveType(selected) : null;
  const isSaved =
    !!selected && saved.includes(`${selected.fixtureId}:${saveType}`);
  async function search() {
    setTeamFocus(null);
    const invalid = dateValidation(filters, tr);
    if (invalid) {
      setError(invalid);
      return;
    }
    const current = effectiveMatchFilters(filters);
    setFilters(current);
    const token = ++version.current;
    setLoading(true);
    setError("");
    try {
      const result = await searchMatches(current);
      if (token !== version.current) return;
      setRows(result.fixtures);
      setSelectedId(result.fixtures[0]?.fixtureId ?? null);
    } catch (e) {
      if (token === version.current) {
        setError(e instanceof Error ? e.message : String(e));
        setRows([]);
        setSelectedId(null);
      }
    } finally {
      if (token === version.current) setLoading(false);
    }
  }
  async function save() {
    if (!selected || !saveType || saving !== null) return;
    const id = selected.fixtureId;
    setSaving(id);
    setSaveError("");
    try {
      await ads.run('saveMatch', async () => {
      const result = await saveMatch(id);
      if (alive.current) setSaved((v) => [...v, `${id}:${result.reportType}`]);
      });
    } catch (e) {
      if (alive.current)
        setSaveError(e instanceof Error ? e.message : String(e));
    } finally {
      if (alive.current) setSaving(null);
    }
  }
  const reset = () => {
    setCardOpen(false);
    setTeamFocus(null);
    version.current++;
    setLoading(false);
    setFilters(EMPTY_MATCH_FILTERS);
    setRows([]);
    setSelectedId(null);
    setShowPlanNudge(false);
    setError("");
    setSaveError("");
    setRetry((n) => n + 1);
  };
  const selectMatch = async (fixture: MatchFixture) => {
    setSelectedId(fixture.fixtureId);
    setSaveError("");
    setShowPlanNudge(false);
    if (!planResolved || plan !== "Free") return;
    const count = await incrementMatchCardPlanNudgeCount();
    setShowPlanNudge(shouldShowMatchCardPlanNudge(count));
  };
  const labels: Record<keyof MatchFilters, string> = {
    country: tr ? "Ülke" : "Country",
    league: tr ? "Lig" : "League",
    homeTeam: tr ? "Ev Sahibi Takım" : "Home Team",
    awayTeam: tr ? "Deplasman Takımı" : "Away Team",
    startDate: tr ? "Başlangıç Tarihi" : "Start Date",
    endDate: tr ? "Bitiş Tarihi" : "End Date",
  };
  const choices =
    selector === "country"
      ? options.countries
      : selector === "league"
        ? options.leagues
        : [];
  const openPlans = () => {
    // The report can be nested inside the portfolio match-card modal.
    setCardOpen(false);
    requestAnimationFrame(() => nav.navigate("ManagePlan"));
  };

  const matchCard = (
    <Frame
      title={tr ? "Maç Kartı" : "Match Card"}
      Icon={BadgeInfo}
      action={
        portfolio ? (
          <Pressable
            accessibilityLabel={tr ? "Maç kartını kapat" : "Close match card"}
            hitSlop={12}
            onPress={() => setCardOpen(false)}
          >
            <X size={22} color={DANGER} />
          </Pressable>
        ) : undefined
      }
    >
      {selected ? (
        <View>
          <View style={s.cardHeading}>
            <View style={{ flex: 1 }}>
              <Text style={s.green}>
                {selected.country.name} · {selected.league.name}
              </Text>
              <Text style={[s.label, { marginTop: 6 }]}>
                {fixtureDate(selected.startingAt, tr)} ·{" "}
                {matchStateLabel(selected, tr)}
              </Text>
            </View>
            <Text style={s.state}>{selected.state.code || "—"}</Text>
          </View>
          <View style={s.teams}>
            <Side team={selected.homeTeam} />
            <View>
              <Text style={s.score}>{matchScore(selected)}</Text>
              <Text style={[s.label, { textAlign: "center" }]}>VS</Text>
            </View>
            <Side team={selected.awayTeam} />
          </View>
          {!portfolio && (
            <Pressable
              accessibilityLabel={tr ? "Maçı kaydet" : "Save match"}
              disabled={saving !== null || isSaved || !saveType}
              style={[
                s.button,
                (saving !== null || isSaved || !saveType) && s.disabled,
              ]}
              onPress={save}
            >
              {saving === selected.fixtureId ? (
                <ActivityIndicator color={ACCENT} />
              ) : (
                <BookMarked size={18} color={ACCENT} />
              )}
              <Text style={s.green}>
                {saving === selected.fixtureId
                  ? tr
                    ? "Kaydediliyor"
                    : "Saving"
                  : isSaved
                    ? tr
                      ? "Kaydedildi"
                      : "Saved"
                    : tr
                      ? "Kaydet"
                      : "Save"}
              </Text>
            </Pressable>
          )}
          <MatchReportActions
            key={selected.fixtureId}
            fixture={selected}
            favorites={favorites}
            tr={tr}
            onOpenPlans={openPlans}
          />
          {ads.fallback}
          {!portfolio && !saveType && (
            <Text style={s.empty}>
              {tr
                ? "Bu maç durumunda portföye kaydedilemez."
                : "Saving is unavailable for this match status."}
            </Text>
          )}
          {!!saveError && <Text style={s.error}>{saveError}</Text>}
          {!portfolio && showPlanNudge && plan === "Free" ? (
            <PlanDiscoveryNudge
              onClose={() => setShowPlanNudge(false)}
              onOpenPlans={openPlans}
            />
          ) : null}
        </View>
      ) : (
        <Text style={s.empty}>
          {tr
            ? "Detaylarını görmek için bir maç seçin."
            : "Select a match to view its details."}
        </Text>
      )}
    </Frame>
  );
  const widths = [1.65, 0.6, 0.7, 1.15, 0.6];
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={pageScroll}
        onScrollBeginDrag={() => setTeamFocus(null)}
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        <Frame
          title={
            portfolio
              ? tr
                ? "Maç Filtreleri"
                : "Match Filters"
              : tr
                ? "Fikstür Arama Filtreleri"
                : "Fixture Search Filters"
          }
          Icon={ListFilter}
          action={
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 20 }}
            >
              <Pressable
                hitSlop={8}
                accessibilityLabel={tr ? "Tarihleri temizle" : "Clear dates"}
                disabled={!filters.startDate && !filters.endDate}
                style={
                  !filters.startDate && !filters.endDate
                    ? s.disabled
                    : undefined
                }
                onPress={() => {
                  setFilters((f) => ({ ...f, startDate: "", endDate: "" }));
                  setError("");
                }}
              >
                <CalendarX2 size={20} color={ACCENT} />
              </Pressable>
              <Pressable
                hitSlop={12}
                accessibilityLabel={tr ? "Filtreleri temizle" : "Clear filters"}
                onPress={reset}
              >
                <RotateCcw size={20} color={DANGER} />
              </Pressable>
            </View>
          }
        >
          <View style={{ position: "relative" }}>
            <View style={s.fields}>
              {(["country", "league"] as const).map((key) => (
                <View key={key} style={s.field}>
                  <Text style={s.label}>{labels[key]}</Text>
                  <Pressable
                    style={s.inputRow}
                    onPress={() => {
                      setTeamFocus(null);
                      setQuery("");
                      setSelector(key);
                    }}
                  >
                    <Text
                      numberOfLines={1}
                      style={[s.text, { flex: 1, padding: 12 }]}
                    >
                      {filters[key] || (tr ? "Seçiniz" : "Select")}
                    </Text>
                    <ChevronDown
                      size={18}
                      color={ACCENT}
                      style={{ marginRight: 10 }}
                    />
                  </Pressable>
                  {!!filters[key] && (
                    <Pressable style={s.chip} onPress={() => update(key, "")}>
                      <Text
                        numberOfLines={1}
                        style={[s.green, { flexShrink: 1 }]}
                      >
                        {filters[key]}
                      </Text>
                      <X size={12} color={ACCENT} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
            <View style={s.fields}>
              {(["homeTeam", "awayTeam"] as const).map((key) => (
                <View
                  key={key}
                  style={s.field}
                  ref={key === "homeTeam" ? homeAnchor : awayAnchor}
                  collapsable={false}
                >
                  <Text style={s.label}>{labels[key]}</Text>
                  <TextInput
                    value={filters[key]}
                    onChangeText={(v) => {
                      update(key, v);
                      setTeamFocus(key);
                    }}
                    onFocus={() => setTeamFocus(key)}
                    onBlur={() => setTeamFocus(null)}
                    placeholder={tr ? "Takım ara" : "Search team"}
                    placeholderTextColor={MUTED}
                    style={[s.inputRow, s.inputText, { flex: undefined }]}
                  />
                </View>
              ))}
            </View>
            <View style={s.fields}>
              {(["startDate", "endDate"] as const).map((key) => (
                <View key={key} style={s.field}>
                  <Text style={s.label}>{labels[key]}</Text>
                  <Pressable
                    style={s.inputRow}
                    onPress={() => {
                      setTeamFocus(null);
                      setDateDraft(
                        filters[key]
                          ? new Date(`${filters[key]}T12:00:00`)
                          : new Date(),
                      );
                      setDateField(key);
                    }}
                  >
                    <CalendarDays
                      size={18}
                      color={ACCENT}
                      style={{ marginLeft: 10 }}
                    />
                    <Text style={[s.text, { padding: 12, flex: 1 }]}>
                      {formatPlayerContractDate(
                        filters[key],
                        tr ? "tr-TR" : "en-GB",
                      ) || (tr ? "Tarih seç" : "Select date")}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
            {!portfolio && (
              <Pressable
                disabled={loading}
                style={[s.button, loading && s.disabled]}
                onPress={() => search()}
              >
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
            )}
            {!!optionsError && (
              <Pressable onPress={() => setRetry((n) => n + 1)}>
                <Text style={s.error}>{optionsError}</Text>
              </Pressable>
            )}
            {!!error && <Text style={s.error}>{error}</Text>}
          </View>
        </Frame>
        <TutorialPageGuide page={portfolio ? "matchPortfolio" : "matchPool"} frame={0} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <Frame
          title={
            portfolio
              ? tr
                ? "Maç Portföyü"
                : "Match Portfolio"
              : tr
                ? "Eşleşen Maçlar"
                : "Matching Fixtures"
          }
          Icon={ListChecks}
          headingGap={portfolio ? 10 : 16}
        >
          {portfolio ? (
            <MatchPortfolioTable
              rows={visibleRows}
              selectedId={selected?.fixtureId}
              tr={tr}
              loading={portfolioLoading}
              deletingId={deletingId}
              onSelect={(id) => {
                setSelectedId(id);
                setCardOpen(true);
              }}
              onDelete={remove}
            />
          ) : (
            <>
              <View style={table.table}>
                <View style={[table.row, table.header]}>
                  {(tr
                    ? ["Maç Adı", "Ülke", "Lig", "Zaman", "Skor"]
                    : ["Match Name", "Ctry", "League", "Time", "Score"]
                  ).map((label, i) => (
                    <View
                      key={label}
                      style={[
                        s.matchHeaderCell,
                        { flex: widths[i] },
                        i > 0 && s.matchHeaderSeparator,
                      ]}
                    >
                      <Text numberOfLines={1} style={s.matchHeaderText}>{label}</Text>
                    </View>
                  ))}
                </View>
                <ScrollView
                  nestedScrollEnabled
                  style={{ maxHeight: Math.min(360, height * 0.38) }}
                  contentContainerStyle={{ minHeight: 144 }}
                >
                  {loading && !rows.length ? (
                    <ActivityIndicator color={ACCENT} style={s.empty} />
                  ) : rows.length ? (
                    rows.map((f) => (
                      <Pressable
                        key={f.fixtureId}
                        testID={`match-result-${f.fixtureId}`}
                        accessibilityRole="button"
                        accessibilityLabel={f.name}
                        accessibilityState={{
                          selected: selected?.fixtureId === f.fixtureId,
                        }}
                        onPress={() => void selectMatch(f)}
                        style={[
                          table.row,
                          selected?.fixtureId === f.fixtureId && table.selected,
                        ]}
                      >
                        {[
                          `${shortTeam(f.homeTeam.name)} – ${shortTeam(f.awayTeam.name)}`,
                          shortCountry(f.country.name),
                          comparisonSourceShortLabel({
                            competition: f.league.name,
                            team: "",
                          }),
                          fixtureDate(f.startingAt, tr),
                          matchScore(f),
                        ].map((v, i) => (
                          <Text
                            key={i}
                            style={[table.cell, { flex: widths[i] }]}
                          >
                            {v}
                          </Text>
                        ))}
                      </Pressable>
                    ))
                  ) : (
                    <Text style={s.empty}>
                      {tr
                        ? "Filtrelerle arama yaparak maçları listeleyin."
                        : "Search with filters to list matches."}
                    </Text>
                  )}
                </ScrollView>
              </View>
            </>
          )}
        </Frame>
        {!portfolio && <TutorialPageGuide page="matchPool" frame={1} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />}
        {!portfolio && matchCard}
        {selector !== null && (
          <Modal
            visible
            transparent
            animationType="fade"
            onRequestClose={() => setSelector(null)}
          >
            <View style={s.backdrop}>
              <View style={[s.modal, { maxHeight: height * 0.8 }]}>
                <View style={s.cardHeading}>
                  <Text style={[FRAME_TITLE, { flex: 1 }]}>
                    {selector ? labels[selector] : ""}
                  </Text>
                  <Pressable hitSlop={12} onPress={() => setSelector(null)}>
                    <X size={22} color={DANGER} />
                  </Pressable>
                </View>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  style={[
                    s.inputRow,
                    { padding: 12, color: TEXT, marginVertical: 12 },
                  ]}
                  placeholder={tr ? "Ara" : "Search"}
                  placeholderTextColor={MUTED}
                />
                <FlatList
                  data={choices.filter((v) => fold(v).includes(fold(query)))}
                  keyExtractor={(v) => v}
                  keyboardShouldPersistTaps="handled"
                  initialNumToRender={12}
                  maxToRenderPerBatch={12}
                  windowSize={5}
                  ListHeaderComponent={
                    <Pressable
                      style={s.option}
                      onPress={() => {
                        update(selector, "");
                        setSelector(null);
                      }}
                    >
                      <Text style={s.green}>{tr ? "Tümü" : "All"}</Text>
                    </Pressable>
                  }
                  ListEmptyComponent={
                    <Text style={s.empty}>
                      {tr ? "Sonuç bulunamadı." : "No results found."}
                    </Text>
                  }
                  renderItem={({ item }) => (
                    <Pressable
                      style={[
                        s.option,
                        filters[selector] === item && table.selected,
                      ]}
                      onPress={() => {
                        update(selector, item);
                        setSelector(null);
                      }}
                    >
                      <Text style={s.text}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>
            </View>
          </Modal>
        )}
        {dateField !== null && Platform.OS === "android" && (
          <DateTimePicker
            value={dateDraft}
            mode="date"
            display="default"
            maximumDate={new Date(new Date().getFullYear() + 1, 11, 31)}
            onChange={(event, date) => {
              if (event.type === "set" && date && dateField)
                update(dateField, iso(date));
              setDateField(null);
            }}
          />
        )}
        <Modal
          visible={dateField !== null && Platform.OS === "ios"}
          transparent
          animationType="fade"
          onRequestClose={() => setDateField(null)}
        >
          <View style={s.backdrop}>
            <View style={s.modal}>
              <Text style={FRAME_TITLE}>
                {dateField ? labels[dateField] : ""}
              </Text>
              <DateTimePicker
                value={dateDraft}
                mode="date"
                display="spinner"
                themeVariant="dark"
                maximumDate={new Date(new Date().getFullYear() + 1, 11, 31)}
                onChange={(_, date) => {
                  if (date) setDateDraft(date);
                }}
              />
              <View style={s.fields}>
                <Pressable
                  style={[s.button, { flex: 1 }]}
                  onPress={() => setDateField(null)}
                >
                  <Text style={s.label}>{tr ? "İptal" : "Cancel"}</Text>
                </Pressable>
                <Pressable
                  style={[s.button, { flex: 1 }]}
                  onPress={() => {
                    if (dateField) update(dateField, iso(dateDraft));
                    setDateField(null);
                  }}
                >
                  <Text style={s.green}>{tr ? "Seç" : "Select"}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
      {portfolio && cardOpen && selected && (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setCardOpen(false)}
        >
          <View style={s.backdrop}>
            <View
              style={{
                width: "100%",
                maxWidth: 560,
                maxHeight: "90%",
                alignSelf: "center",
              }}
            >
              <ScrollView bounces={false}>{matchCard}</ScrollView>
            </View>
          </View>
        </Modal>
      )}
      <TeamSuggestionsOverlay
        anchor={teamFocus === "awayTeam" ? awayAnchor : homeAnchor}
        visible={!!showTeamSuggestions}
        options={teamSuggestions}
        onSelect={(name) => {
          if (teamFocus) update(teamFocus, name);
          setTeamFocus(null);
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
  fields: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  field: { width: "48%", marginBottom: 12 },
  label: { fontSize: 12, fontWeight: "700", color: MUTED, marginBottom: 6 },
  text: { fontSize: 13, color: TEXT },
  green: { fontSize: 13, fontWeight: "800", color: ACCENT },
  matchHeaderCell: {
    minWidth: 0,
    paddingHorizontal: 3,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  matchHeaderSeparator: { borderLeftWidth: 1, borderLeftColor: LINE },
  matchHeaderText: { ...table.headerText, fontSize: 10.5, textAlign: "center" },
  inputRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
  },
  inputText: { flex: 1, minWidth: 0, color: TEXT, padding: 12, fontSize: 13 },
  chip: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    padding: 5,
    marginTop: 6,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(22,163,74,.08)",
  },
  disabled: { opacity: 0.4 },
  error: { color: DANGER, fontSize: 13, marginTop: 12 },
  empty: { padding: 24, textAlign: "center", color: MUTED, fontSize: 13 },
  cardHeading: { flexDirection: "row", alignItems: "center", gap: 10 },
  teams: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 28,
  },
  side: { flex: 1, alignItems: "center", gap: 10 },
  score: { fontSize: 23, color: TEXT, fontWeight: "900" },
  state: {
    color: ACCENT,
    fontWeight: "800",
    fontSize: 11,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 14,
    padding: 8,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.8)",
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 20,
    padding: 16,
  },
  option: { padding: 12, borderBottomWidth: 1, borderColor: LINE },
});
