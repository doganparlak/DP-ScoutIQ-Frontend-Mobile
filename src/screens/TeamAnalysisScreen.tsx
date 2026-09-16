import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import { useTeamAnalysisSession } from '@/context/TeamAnalysisContext';
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  CalendarCheck2,
  CalendarDays,
  Check,
  FileText,
  ListFilter,
  RotateCcw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react-native";
import TeamAnalysisReportModal from "@/components/TeamAnalysisReportModal";
import { TutorialPageGuide } from "@/components/Tutorial";
import { getMe, matchPoolRequest, type Plan } from "@/services/api";
import TeamProfileCard from "@/components/TeamProfileCard";
import { Team } from "@/services/teamPool";
import {
  EMPTY_PLAYED_FILTERS,
  MAX_ANALYSIS_MATCHES,
  PlayedFilters,
  PlayedMatch,
  getTeamMatches,
  playedDateBounds,
  playedMatchPasses,
  toggleAnalysisMatch,
} from "@/services/teamAnalysis";
import {
  ACCENT,
  BG,
  CARD,
  DANGER,
  LINE,
  MUTED,
  PANEL,
  TEXT,
  FRAME_HEADING,
  FRAME_STRIPE,
  FRAME_TITLE,
} from "@/theme";
import { poolTableStyles as table } from "@/components/poolTableStyles";
import { shortCountry, shortTeam } from "@/utils/seasonTableLabels";
import { comparisonSourceShortLabel } from "@/utils/comparisonSourceLabel";
import { normalizeSearchText } from "@/utils/searchSuggestions";
import { formatPlayerContractDate } from "@/utils/playerContract";
import { matchDateOnly } from "@/services/matchPool";

const PLAYED_MATCH_FLEXES = [1.3, 0.7, 0.65, 0.9, 0.6] as const;

function Frame({
  title,
  Icon,
  action,
  children,
}: {
  title: string;
  Icon: any;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={s.frame}>
      <View style={FRAME_STRIPE} />
      <View style={[FRAME_HEADING, { marginBottom: 16 }]}>
        <Icon color={ACCENT} size={20} />
        <Text style={[FRAME_TITLE, { flex: 1 }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}
export default function TeamAnalysisScreen() {
  const ads = useWorkspaceActionAd();
  const { i18n } = useTranslation(),
    tr = i18n.language.startsWith("tr"),
    nav = useNavigation<any>(),
    route = useRoute<any>();
  const {team: sessionTeam,setTeam: setSessionTeam} = useTeamAnalysisSession();
  const incomingTeam = route.params?.team as Team | undefined;
  const team = incomingTeam ?? sessionTeam;
  const pageScroll = useRef<ScrollView>(null);
  useEffect(() => {
    if (incomingTeam) setSessionTeam(incomingTeam);
  }, [incomingTeam, setSessionTeam]);
  const { height } = useWindowDimensions();
  const reportRequest = useRef(0);
  const reportKey = useRef("");
  const [report, setReport] = useState<any>(null);
  const [plan,setPlan]=useState<Plan>('Free');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState("");
  const [reportMatches, setReportMatches] = useState<PlayedMatch[]>([]);
  useFocusEffect(useCallback(()=>{
    let active=true;
    getMe().then(profile=>{
      if(!active)return;
      setPlan(profile.plan==='No Ads Monthly'||profile.plan==='Pro Monthly'||profile.plan==='Pro Yearly'?profile.plan:'Free');
    }).catch(()=>{if(active)setPlan('Free');});
    return()=>{active=false;};
  },[]));
  const [matches, setMatches] = useState<PlayedMatch[]>([]),
    [ids, setIds] = useState<number[]>([]),
    [filters, setFilters] = useState<PlayedFilters>(EMPTY_PLAYED_FILTERS),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const [selector, setSelector] = useState<"opponents" | "leagues" | null>(
      null,
    ),
    [query, setQuery] = useState(""),
    [dateField, setDateField] = useState<"startDate" | "endDate" | null>(null),
    [draft, setDraft] = useState(new Date());
  useEffect(() => {
    let active = true;
    setMatches([]);
    setIds([]);
    setError("");
    setFilters(EMPTY_PLAYED_FILTERS);
    setLoading(false);
    if (!team) return;
    setLoading(true);
    getTeamMatches(team)
      .then((rows) => {
        if (!active) return;
        const current = rows.filter((m) => m.thisSeason);
        setMatches(current);
        setIds(current.slice(0, MAX_ANALYSIS_MATCHES).map((m) => m.fixtureId));
        const bounds = playedDateBounds(current);
        setFilters({
          ...EMPTY_PLAYED_FILTERS,
          startDate: bounds.minimum,
          endDate: bounds.maximum,
        });
      })
      .catch(
        (e) => active && setError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [team?.id, team?.leagueId, retry]);
  useEffect(() => {
    reportRequest.current++;
    reportKey.current = "";
    setReportOpen(false);
    setReportLoading(false);
    setReport(null);
    setReportError("");
    setReportMatches([]);
    return () => { reportRequest.current++; };
  }, [team?.id, team?.leagueId]);
  const bounds = playedDateBounds(matches),
    visible = team
      ? matches.filter((m) => playedMatchPasses(m, team, filters))
      : [],
    selected = matches.filter((m) => ids.includes(m.fixtureId));
  const toggle = (id: number) => {
    if (!ids.includes(id) && ids.length >= MAX_ANALYSIS_MATCHES) {
      Alert.alert(
        tr ? "Seçim sınırı" : "Selection limit",
        tr
          ? "En fazla 5 maç seçebilirsiniz."
          : "You can select up to 5 matches.",
      );
      return;
    }
    setIds((v) => toggleAnalysisMatch(v, id));
  };
  const options =
    selector === "opponents"
      ? [
          ...new Set(
            matches.map((m) =>
              m.homeTeamId === Number(team?.id) ? m.awayTeam : m.homeTeam,
            ),
          ),
        ]
      : [...new Set(matches.map((m) => m.league))];
  const reset = () =>
    setFilters({
      ...EMPTY_PLAYED_FILTERS,
      startDate: bounds.minimum,
      endDate: bounds.maximum,
    });
  const date = (v: string) => new Date(`${v}T12:00:00`),
    iso = (v: Date) =>
      `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  const scoreColor = (m: PlayedMatch) =>
    m.homeScore == null || m.awayScore == null || m.homeScore === m.awayScore
      ? TEXT
      : (
            m.homeTeamId === Number(team?.id)
              ? m.homeScore > m.awayScore
              : m.awayScore > m.homeScore
          )
        ? ACCENT
        : DANGER;
  const matchName = (m: PlayedMatch, compact: boolean) => (
    <Text
      numberOfLines={compact ? 1 : 2}
      adjustsFontSizeToFit={compact}
      minimumFontScale={0.72}
      style={[s.text, compact ? s.matchName : s.analysisMatchName]}
    >
      <Text
        style={{ color: m.homeTeamId === Number(team?.id) ? "#C084FC" : TEXT }}
      >
        {compact ? shortTeam(m.homeTeam) : m.homeTeam}
      </Text>{" "}
      –{" "}
      <Text
        style={{ color: m.awayTeamId === Number(team?.id) ? "#C084FC" : TEXT }}
      >
        {compact ? shortTeam(m.awayTeam) : m.awayTeam}
      </Text>
    </Text>
  );
  return (
    <ScrollView
      ref={pageScroll}
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={s.page}
    >
      {ads.fallback}
      <Frame title={tr ? "Takım Kartı" : "Team Card"} Icon={ShieldCheck}>
        {team ? (
          <TeamProfileCard team={team} tr={tr} />
        ) : (
          <Pressable style={s.button} onPress={() => nav.navigate("TeamPool")}>
            <Text style={s.green}>
              {tr
                ? "Takım Havuzu’ndan bir takım seçin"
                : "Select a team from Team Pool"}
            </Text>
          </Pressable>
        )}
      </Frame>
      <TutorialPageGuide page="teamAnalysis" frame={0} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
      {team && (
        <>
          <Frame
            title={tr ? "Maç Filtreleri" : "Match Filters"}
            Icon={ListFilter}
            action={
              <Pressable
                hitSlop={12}
                accessibilityLabel={tr ? "Filtreleri temizle" : "Clear filters"}
                onPress={reset}
              >
                <RotateCcw size={20} color={DANGER} />
              </Pressable>
            }
          >
            <View style={s.fields}>
              {(["opponents", "leagues"] as const).map((key) => (
                <View style={s.field} key={key}>
                  <Text style={s.label}>
                    {key === "opponents"
                      ? tr
                        ? "Rakip Adı"
                        : "Opponent"
                      : tr
                        ? "Lig"
                        : "League"}
                  </Text>
                  <Pressable
                    style={s.input}
                    onPress={() => {
                      setSelector(key);
                      setQuery("");
                    }}
                  >
                    <Text numberOfLines={2} style={s.text}>
                      {filters[key].join(", ") || (tr ? "Seçiniz" : "Select")}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <Text style={s.label}>
              {tr ? "İç Saha / Deplasman" : "Home / Away"}
            </Text>
            <View style={s.switch}>
              {["", "home", "away"].map((v, i) => (
                <Pressable
                  key={v}
                  style={[s.switchOption, filters.location === v && s.active]}
                  onPress={() => setFilters((f) => ({ ...f, location: v }))}
                >
                  <Text
                    style={[
                      s.label,
                      filters.location === v && { color: ACCENT },
                    ]}
                  >
                    {
                      (tr
                        ? ["Tümü", "İç Saha", "Deplasman"]
                        : ["All", "Home", "Away"])[i]
                    }
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={s.fields}>
              {(["startDate", "endDate"] as const).map((key) => (
                <View style={s.field} key={key}>
                  <Text style={s.label}>
                    {key === "startDate"
                      ? tr
                        ? "Başlangıç Tarihi"
                        : "Start Date"
                      : tr
                        ? "Bitiş Tarihi"
                        : "End Date"}
                  </Text>
                  <Pressable
                    style={[
                      s.input,
                      { flexDirection: "row", alignItems: "center", gap: 6 },
                    ]}
                    onPress={() => {
                      setDraft(
                        date(filters[key] || bounds.maximum || iso(new Date())),
                      );
                      setDateField(key);
                    }}
                  >
                    <Text style={[s.text, { flex: 1 }]}>
                      {formatPlayerContractDate(
                        filters[key],
                        tr ? "tr-TR" : "en-GB",
                      ) || (tr ? "Tarih seç" : "Select date")}
                    </Text>
                    <CalendarDays size={17} color={ACCENT} />
                  </Pressable>
                </View>
              ))}
            </View>
          </Frame>
          <Frame
            title={tr ? "Oynanan Maçlar" : "Played Matches"}
            Icon={CalendarCheck2}
            action={<Text style={s.green}>{ids.length}/5</Text>}
          >
            <View style={table.table}>
              <View style={[table.row, table.header]}>
                <View style={s.selectionHeaderCell} />
                {(tr
                  ? ["Maç", "Ülke", "Lig", "Tarih", "Skor"]
                  : ["Match", "Ctry", "Leag.", "Date", "Score"]
                ).map((v, i) => (
                  <View
                    key={v}
                    style={[
                      s.playedHeaderCell,
                      { flex: PLAYED_MATCH_FLEXES[i] },
                      i > 0 && s.playedHeaderSeparator,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={s.playedHeaderText}
                    >
                      {v}
                    </Text>
                  </View>
                ))}
              </View>
              <ScrollView
                nestedScrollEnabled
                style={{ maxHeight: Math.min(420, height * 0.4) }}
                contentContainerStyle={{ minHeight: 160 }}
              >
                {loading ? (
                  <ActivityIndicator color={ACCENT} style={{ margin: 30 }} />
                ) : error ? (
                  <Pressable onPress={() => setRetry((n) => n + 1)}>
                    <Text style={s.error}>{error}</Text>
                    <Text style={s.green}>{tr ? "Yeniden Dene" : "Retry"}</Text>
                  </Pressable>
                ) : visible.length ? (
                  visible.map((m) => (
                    <Pressable
                      key={m.fixtureId}
                      testID={`team-played-${m.fixtureId}`}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: ids.includes(m.fixtureId),
                      }}
                      onPress={() => toggle(m.fixtureId)}
                      style={[
                        table.row,
                        ids.includes(m.fixtureId) && table.selected,
                      ]}
                    >
                      <View
                        style={{
                          width: 26,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <View
                          style={[
                            s.check,
                            ids.includes(m.fixtureId) && s.active,
                          ]}
                        >
                          {ids.includes(m.fixtureId) && (
                            <Check size={14} color={ACCENT} />
                          )}
                        </View>
                      </View>
                      <View style={[table.cell, s.matchNameCell, { flex: PLAYED_MATCH_FLEXES[0] }]}>{matchName(m, true)}</View>
                      {[
                        shortCountry(m.country),
                        comparisonSourceShortLabel({
                          competition: m.league,
                          team: "",
                        }),
                        matchDateOnly(m.startingAt),
                        `${m.homeScore ?? "—"} – ${m.awayScore ?? "—"}`,
                      ].map((v, i) => (
                        <Text
                          key={i}
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.76}
                          style={[
                            table.cell,
                            { flex: PLAYED_MATCH_FLEXES[i + 1] },
                            i === 3 && { color: scoreColor(m) },
                          ]}
                        >
                          {v}
                        </Text>
                      ))}
                    </Pressable>
                  ))
                ) : (
                  <Text style={s.empty}>
                    {tr
                      ? "Filtrelere uyan tamamlanmış maç bulunamadı."
                      : "No completed matches match these filters."}
                  </Text>
                )}
              </ScrollView>
            </View>
          </Frame>
          <TutorialPageGuide page="teamAnalysis" frame={1} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
          <Frame
            title={tr ? "Takım Analiz Merkezi" : "Team Analysis Center"}
            Icon={BarChart3}
          >
            {selected.map((m, i) => (
              <View key={m.fixtureId} style={s.selectedMatch}>
                <Text style={s.green}>{i + 1}</Text>
                <View style={{ flex: 1, gap: 5 }}>
                  {matchName(m, false)}
                  <Text style={s.label}>
                    {m.league} · {matchDateOnly(m.startingAt)}
                  </Text>
                </View>
                <Text style={{ color: scoreColor(m), fontWeight: "800" }}>
                  {m.homeScore ?? "—"} – {m.awayScore ?? "—"}
                </Text>
                <Pressable
                  testID={`team-analysis-remove-${m.fixtureId}`}
                  accessibilityRole="button"
                  accessibilityLabel={
                    tr ? "Maçı analizden çıkar" : "Remove match from analysis"
                  }
                  hitSlop={10}
                  onPress={() =>
                    setIds((current) =>
                      current.filter((fixtureId) => fixtureId !== m.fixtureId),
                    )
                  }
                  style={({ pressed }) => [
                    s.removeMatch,
                    pressed && { opacity: 0.65 },
                  ]}
                >
                  <Trash2 size={18} color={DANGER} strokeWidth={2.2} />
                </Pressable>
              </View>
            ))}
            {!selected.length && (
              <Text style={s.empty}>
                {tr
                  ? "Analiz için Oynanan Maçlar bölümünden maç seçin."
                  : "Select matches from Played Matches for analysis."}
              </Text>
            )}
            <Pressable
              disabled={
                !selected.length || loading || ads.busy || !team?.leagueId
              }
              onPress={async () => {
                if (!team?.leagueId || !selected.length) return;
                try {
                  await ads.run('teamAnalysisReport', async () => {
                const key = `${team.id}:${team.leagueId}:${selected.map(m=>m.fixtureId).sort((a,b)=>a-b).join(",")}:${tr}`;
                if (reportKey.current === key && (reportLoading || (report && !reportError))) {
                  setReportOpen(true);
                  return;
                }
                const request = ++reportRequest.current;
                reportKey.current = key;
                setReportMatches(selected);
                setReport(null);
                setReportError("");
                setReportOpen(true);
                setReportLoading(true);
                try {
                  const payload = {
                    teamId: Number(team.id),
                    leagueId: team.leagueId,
                    fixtureIds: selected.map((m) => m.fixtureId),
                  };
                  const base = await matchPoolRequest("/team-analysis/report-data", payload);
                  if (reportRequest.current !== request) return;
                  setReport(base);

                } catch (e) {
                  if (reportRequest.current === request) setReportError(e instanceof Error ? e.message : String(e));
                } finally {
                  if (reportRequest.current === request) setReportLoading(false);
                }
                  });
                } catch (e) {
                  Alert.alert(tr ? 'Rapor hatası' : 'Report error', String(e));
                }
              }}
              style={[
                s.button,
                (!selected.length || loading || ads.busy || !team?.leagueId) && { opacity: 0.4 },
              ]}
            >
              <FileText size={18} color={ACCENT} />
              <Text style={s.green}>
                {ads.busy ? (tr ? "Hazırlanıyor…" : "Preparing…") : (tr ? "Rapor Oluştur" : "Create Report")}
              </Text>
            </Pressable>
          </Frame>
        </>
      )}
      {selector && (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setSelector(null)}
        >
          <SafeAreaView style={s.backdrop}>
            <View style={[s.modal, { maxHeight: height * 0.8 }]}>
              <View style={FRAME_HEADING}>
                <Text style={[FRAME_TITLE, { flex: 1 }]}>
                  {selector === "opponents"
                    ? tr
                      ? "Rakip Seç"
                      : "Select Opponents"
                    : tr
                      ? "Lig Seç"
                      : "Select Leagues"}
                </Text>
                <Pressable onPress={() => setSelector(null)}>
                  <X size={22} color={DANGER} />
                </Pressable>
              </View>
              <TextInput
                style={s.input}
                value={query}
                onChangeText={setQuery}
                placeholder={tr ? "Ara" : "Search"}
                placeholderTextColor={MUTED}
              />
              <FlatList
                data={options.filter((v) =>
                  normalizeSearchText(v).includes(normalizeSearchText(query)),
                )}
                keyExtractor={(v) => v}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{
                      checked: filters[selector].includes(item),
                    }}
                    style={[
                      s.option,
                      filters[selector].includes(item) && s.active,
                    ]}
                    onPress={() =>
                      setFilters((f) => ({
                        ...f,
                        [selector]: f[selector].includes(item)
                          ? f[selector].filter((v) => v !== item)
                          : [...f[selector], item],
                      }))
                    }
                  >
                    <Text style={[s.text, { flex: 1 }]}>{item}</Text>
                    {filters[selector].includes(item) && (
                      <Check size={18} color={ACCENT} />
                    )}
                  </Pressable>
                )}
              />
              <View style={s.fields}>
                <Pressable
                  onPress={() => setFilters((f) => ({ ...f, [selector]: [] }))}
                >
                  <Text style={s.error}>
                    {tr ? "Seçimleri Temizle" : "Clear selections"}
                  </Text>
                </Pressable>
                <Pressable style={s.button} onPress={() => setSelector(null)}>
                  <Text style={s.green}>{tr ? "Tamam" : "Done"}</Text>
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </Modal>
      )}
      {dateField && (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setDateField(null)}
        >
          <SafeAreaView style={s.backdrop}>
            <View style={s.modal}>
              <Text style={FRAME_TITLE}>
                {dateField === "startDate"
                  ? tr
                    ? "Başlangıç Tarihi"
                    : "Start Date"
                  : tr
                    ? "Bitiş Tarihi"
                    : "End Date"}
              </Text>
              <DateTimePicker
                value={draft}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                themeVariant="dark"
                minimumDate={bounds.minimum ? date(bounds.minimum) : undefined}
                maximumDate={bounds.maximum ? date(bounds.maximum) : undefined}
                onChange={(event, value) => {
                  if (value) setDraft(value);
                  if (Platform.OS === "android") {
                    if (event.type === "set" && value)
                      setFilters((f) => ({ ...f, [dateField]: iso(value) }));
                    setDateField(null);
                  }
                }}
              />
              <View style={s.fields}>
                <Pressable onPress={() => setDateField(null)} style={s.button}>
                  <Text style={s.label}>{tr ? "İptal" : "Cancel"}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setFilters((f) => ({ ...f, [dateField]: iso(draft) }));
                    setDateField(null);
                  }}
                  style={s.button}
                >
                  <Text style={s.green}>{tr ? "Seç" : "Select"}</Text>
                </Pressable>
              </View>
            </View>

          </SafeAreaView>
        </Modal>
      )}

      {reportOpen && team && (
        <TeamAnalysisReportModal
          team={team}
          matches={reportMatches}
          data={report}
          loading={reportLoading}
          error={reportError}
          tr={tr}
          plan={plan}
          onOpenPlans={() => {
            setReportOpen(false);
            requestAnimationFrame(() => nav.navigate('Profile', { screen: 'ManagePlan' }));
          }}
          onClose={() => setReportOpen(false)}
        />
      )}
    </ScrollView>
  );
}
const s = StyleSheet.create({
  page: { padding: 16, gap: 16, paddingBottom: 40 },
  frame: {
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 20,
    padding: 16,
  },
  fields: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginVertical: 10,
  },
  field: { width: "48%" },
  label: { color: MUTED, fontSize: 12, fontWeight: "700", marginBottom: 5 },
  text: { color: TEXT, fontSize: 12.5 },
  matchName: { width: "100%", textAlign: "center" },
  analysisMatchName: { width: "100%", textAlign: "left", fontWeight: "700" },
  matchNameCell: { alignItems: "center", justifyContent: "center" },
  selectionHeaderCell: {
    width: 26,
    alignSelf: "stretch",
    borderRightWidth: 1,
    borderRightColor: LINE,
  },
  playedHeaderCell: {
    minWidth: 0,
    paddingHorizontal: 3,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  playedHeaderText: { ...table.headerText, fontSize: 11.5, textAlign: "center" },
  playedHeaderSeparator: { borderLeftWidth: 1, borderLeftColor: LINE },
  green: { color: ACCENT, fontSize: 13, fontWeight: "800" },
  input: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    padding: 12,
    minHeight: 44,
    color: TEXT,
  },
  button: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 14,
    backgroundColor: "rgba(22,163,74,.08)",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  switch: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 999,
    padding: 4,
  },
  switchOption: {
    flex: 1,
    borderRadius: 999,
    padding: 9,
    alignItems: "center",
  },
  active: { backgroundColor: "rgba(22,163,74,.14)" },
  check: {
    width: 18,
    height: 18,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  error: { color: DANGER, padding: 12, fontSize: 13 },
  empty: { color: MUTED, padding: 24, textAlign: "center" },
  selectedMatch: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 14,
    padding: 12,
    backgroundColor: CARD,
    marginBottom: 10,
  },
  removeMatch: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,.4)",
    backgroundColor: "rgba(239,68,68,.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.8)",
    padding: 20,
    justifyContent: "center",
  },
  modal: {
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 20,
    backgroundColor: PANEL,
  },
  option: {
    flexDirection: "row",
    padding: 12,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
});
