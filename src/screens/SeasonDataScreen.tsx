import { readSeasonSearch, writeSeasonSearch } from '@/services/seasonDataCache';
import { recordRecentSearch } from '@/services/recentSearches';
import { cleanImageUrl } from '@/utils/sportmonksImages';
import SeasonMetricCategory from '@/components/SeasonMetricCategory';
import { normalizeSearchText, optionMatchesSearch } from '@/utils/searchSuggestions';
import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import ComparisonUnitSwitch from "@/components/ComparisonUnitSwitch";
import PlanDiscoveryNudge from "@/components/PlanDiscoveryNudge";
import { getThemed_poolTableStyles as __getThemed_poolTableStyles } from "@/components/poolTableStyles";
import { TutorialPageGuide } from "@/components/Tutorial";
import { useMatchup } from "@/context/MatchupContext";
import {
aggregateSeasonPlayerRow,
getSeasonPlayerOptions,
getSeasonPlayerRows,
searchSeasonPlayers,
type SeasonAggregate,
type SeasonDataRow,
type SeasonPlayerCandidate,
type SeasonPlayerRows,
} from "@/services/seasonData";
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import type { MetricUnit } from "@/utils/comparisonGroups";
import {
filterSeasonRows,
seasonMatchupRow,
seasonMetricGroups,
} from "@/utils/seasonData";
import {
primarySeasonRole,
shortCompetition,
shortCountry,
shortPlayer,
shortSeason,
shortTeam,
} from "@/utils/seasonTableLabels";
import { useFocusEffect,useNavigation } from "@react-navigation/native";
import {
ChartNoAxesCombined,
Check,
ChevronDown,
GitCompareArrows,
History,
List,
ListFilter,
RotateCcw,
Search,
X,
} from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
ActivityIndicator,
FlatList,
Keyboard,
Image,
Alert,
Modal,
Pressable,
ScrollView,
StyleSheet,
Text,
TextInput,
useWindowDimensions,
View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
incrementSeasonHistoryPlanNudgeCount,
shouldShowSeasonHistoryPlanNudge,
} from "@/ads/adGating";
import { getMe,type Plan } from "@/services/api";

function Frame({
  title,
  Icon,
  action,
  children,
}: {
  title: string;
  Icon: typeof ListFilter;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, FRAME_STRIPE, FRAME_HEADING, ACCENT, FRAME_TITLE} = themed;

  return (
    <View style={styles.panel}>
      <View style={FRAME_STRIPE} />
      <View style={[FRAME_HEADING, { marginBottom: 14 }]}>
        <Icon size={20} color={ACCENT} />
        <Text style={[FRAME_TITLE, { flex: 1 }]}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}
function PlayerHeading({ name, imageUrl }: {name:string;imageUrl?:string|null}) {
  const {styles} = useThemedStyles(getModuleTheme);
  const uri=cleanImageUrl(imageUrl);
  const [failed,setFailed]=React.useState(false);
  React.useEffect(()=>setFailed(false),[uri]);
  return <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
    {uri && !failed && <Image source={{uri}} accessibilityLabel={name} resizeMode="cover" onError={()=>setFailed(true)} style={{width:44,height:44,borderRadius:22}}/>}
    <Text style={[styles.playerName,{flex:1}]}>{name}</Text>
  </View>;
}
function Status({
  message,
  busy,
  error,
  retry,
}: {
  message: string;
  busy?: boolean;
  error?: boolean;
  retry?: () => void;
}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, DANGER} = themed;

  const { i18n } = useTranslation();
  return (
    <View style={styles.status}>
      {busy && <ActivityIndicator color={ACCENT} />}
      <Text style={[styles.muted, error && { color: DANGER }]}>{message}</Text>
      {retry && (
        <Pressable onPress={retry} style={styles.button}>
          <Text style={styles.green}>
            {i18n.language.startsWith("tr") ? "Tekrar dene" : "Retry"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
function Choice({
  label,
  value,
  options,
  onChange,
  playerStyle = false,
}: {
  playerStyle?: boolean;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, MUTED, TEXT, LINE, FRAME_HEADING, FRAME_TITLE, DANGER, ACCENT} = themed;

  const [open, setOpen] = React.useState(false),
    [query, setQuery] = React.useState("");
  const insets = useSafeAreaInsets();
  const {height} = useWindowDimensions();
  const { i18n } = useTranslation();
  const choose = (v: string) => {
    onChange(v);
    setOpen(false);
  };
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => {
          Keyboard.dismiss();
          setQuery("");
          setOpen(true);
        }}
        style={[styles.inputRow,playerStyle && {borderRadius:12,paddingHorizontal:12}]}
      >
        <Text numberOfLines={1} style={[styles.text, { flex: 1 },playerStyle && {fontSize:14,color:value?TEXT:MUTED}]}>
          {value || label}
        </Text>
        <ChevronDown size={16} color={MUTED} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={[
            styles.overlay,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={[styles.modal,playerStyle && {borderColor:LINE,maxHeight:height*.8,gap:0}]} accessibilityViewIsModal>
            <View style={[FRAME_HEADING,playerStyle && {marginBottom:12}]}>
              <Text style={[FRAME_TITLE, { flex: 1 },playerStyle && {color:TEXT,fontSize:16,fontWeight:'800'}]}>{label}</Text>
              <Pressable
                accessibilityLabel={
                  i18n.language.startsWith("tr") ? "Kapat" : "Close"
                }
                onPress={() => setOpen(false)}
                hitSlop={12}
              >
                <X color={playerStyle?ACCENT:DANGER} size={22} />
              </Pressable>
            </View>
            <TextInput
              autoFocus={!playerStyle}
              value={query}
              onChangeText={setQuery}
              placeholder={i18n.language.startsWith("tr") ? "Ara" : "Search"}
              placeholderTextColor={MUTED}
              style={[styles.input,playerStyle && {borderRadius:12,marginVertical:12,fontSize:14,paddingHorizontal:12}]}
            />
            {playerStyle ? <FlatList data={options.filter(v=>optionMatchesSearch(v,normalizeSearchText(query)))} keyExtractor={v=>v} initialNumToRender={15} maxToRenderPerBatch={15} windowSize={5} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}}
              ListHeaderComponent={<Pressable style={[styles.input,{borderRadius:12,paddingHorizontal:12}]} onPress={()=>choose('')}><Text style={{color:ACCENT}}>{i18n.language.startsWith('tr')?'Seçimi temizle':'Clear selection'}</Text></Pressable>}
              ListEmptyComponent={<Text style={[styles.muted,{padding:12}]}>{i18n.language.startsWith('tr')?'Sonuç bulunamadı.':'No results found.'}</Text>}
              renderItem={({item})=><Pressable accessibilityRole="radio" accessibilityState={{selected:value===item}} style={[styles.input,{borderRadius:12,paddingHorizontal:12},value===item && {borderColor:ACCENT}]} onPress={()=>choose(item)}><Text style={{color:TEXT,fontWeight:'700'}}>{item}</Text></Pressable>}/>
              : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Pressable style={styles.option} onPress={() => choose("")}>
                <Text style={styles.green}>
                  {i18n.language.startsWith("tr") ? "Tümü" : "All"}
                </Text>
              </Pressable>
              {options
                .filter((v) =>
                  v.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
                )
                .map((v) => (
                  <Pressable
                    key={v}
                    onPress={() => choose(v)}
                    style={styles.option}
                  >
                    <Text style={[styles.text, { flex: 1 }]}>{v}</Text>
                    {value === v && <Check size={18} color={ACCENT} />}
                  </Pressable>
                ))}
            </ScrollView>
            )}

          </View>
        </View>
      </Modal>
    </View>
  );
}
function Table({
  headers,
  widths,
  children,
  height,
}: {
  headers: string[];
  widths: number[];
  children: React.ReactNode;
  height: number;
}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles} = themed;

  return (
    <View style={styles.table}>
      <View>
        <View style={[styles.tableRow, styles.tableHeader]}>
          {headers.map((v, i) => (
            <View
              key={i}
              style={[
                styles.tableHeaderCell,
                { width: widths[i] },
                i > 0 && styles.tableHeaderSeparator,
              ]}
            >
              <Text numberOfLines={1} style={styles.tableHeaderText}>{v}</Text>
            </View>
          ))}
        </View>
        <ScrollView style={{ maxHeight: height }} nestedScrollEnabled>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}
const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const unique = (
  rows: SeasonDataRow[],
  key: "seasonName" | "teamName" | "leagueName",
) =>
  [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort((a, b) =>
    key === "seasonName" ? b.localeCompare(a) : a.localeCompare(b),
  );

export default function SeasonDataScreen() {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, DANGER, MUTED, ACCENT, themeColor} = themed;

  const ads = useWorkspaceActionAd();
  const { t, i18n } = useTranslation(),
    tr = i18n.language.startsWith("tr");
  const nav = useNavigation<any>();
  const { height, width } = useWindowDimensions();
  const matchup = useMatchup();
  const pageScroll = React.useRef<ScrollView>(null);
  const [query, setQuery] = React.useState(""),
    [country, setCountry] = React.useState(""),
    [countries, setCountries] = React.useState<string[]>([]);
  const [candidates, setCandidates] = React.useState<SeasonPlayerCandidate[]>(
      [],
    ),
    [searched, setSearched] = React.useState(false),
    [searching, setSearching] = React.useState(false),
    [searchError, setSearchError] = React.useState("");
  const [candidate, setCandidate] =
      React.useState<SeasonPlayerCandidate | null>(null),
    [data, setData] = React.useState<SeasonPlayerRows | null>(null),
    [rowsLoading, setRowsLoading] = React.useState(false),
    [rowsError, setRowsError] = React.useState("");
  const [selected, setSelected] = React.useState<SeasonDataRow | null>(null),
    [aggregate, setAggregate] = React.useState<SeasonAggregate | null>(null),
    [aggregateLoading, setAggregateLoading] = React.useState(false),
    [aggregateError, setAggregateError] = React.useState(""),
    [retry, setRetry] = React.useState(0);
  const [plan, setPlan] = React.useState<Plan>("Free");
  const [planResolved, setPlanResolved] = React.useState(false);
  const [showPlanNudge, setShowPlanNudge] = React.useState(false);
  const [season, setSeason] = React.useState(""),
    [team, setTeam] = React.useState(""),
    [competition, setCompetition] = React.useState(""),
    [unit, setUnit] = React.useState<MetricUnit>("perMatch");
  const cacheOwner = React.useRef<number | null>(null);
  const searchVersion = React.useRef(0),
    rowVersion = React.useRef(0);
  const [optionsError, setOptionsError] = React.useState("");
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getMe()
        .then(async (me) => {
          if (!active) return;
          const nextPlan: Plan =
            me.plan === "No Ads Monthly" || me.plan === "Pro Monthly" || me.plan === "Pro Yearly"
              ? me.plan
              : "Free";
          if (cacheOwner.current !== me.id) {
            cacheOwner.current = null;
            const version = ++searchVersion.current;
            rowVersion.current++;
            setQuery('');setCountry('');setCandidates([]);setCandidate(null);setData(null);setSelected(null);setAggregate(null);setSearched(false);
            const cached = await readSeasonSearch(me.id);
            if (!active || searchVersion.current !== version) return;
            if (cached) {
              cacheOwner.current = me.id;
              setQuery(cached.query);setCountry(cached.country);setCandidates(cached.candidates);setCandidate(cached.candidate);setData(cached.data);setSelected(cached.selected);setSearched(true);
            }else{
              setRowsLoading(true);
              try{
                const candidates=await searchSeasonPlayers('Lionel Messi');
                if(!active || searchVersion.current!==version)return;
                const messi=candidates.find(player=>normalizeSearchText(player.displayName)==='lionel messi');
                if(!messi)throw new Error('Default player unavailable');
                const data=await getSeasonPlayerRows(messi.playerId);
                if(!active || searchVersion.current!==version)return;
                const selected=data.rows.find(row=>row.teamName===data.player.latestTeam && row.seasonName===data.player.latestSeason)??data.rows[0]??null;
                cacheOwner.current=me.id;
                setQuery('Lionel Messi');setCandidates(candidates);setCandidate(messi);setData(data);setSelected(selected);setSearched(true);
                void writeSeasonSearch(me.id,{isDefault:true,query:'Lionel Messi',country:'',candidates,candidate:messi,data,selected});
              }catch(error){if(active && searchVersion.current===version)setRowsError(errorText(error));}
              finally{if(active && searchVersion.current===version)setRowsLoading(false);}
            }
          }
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
  React.useEffect(() => {
    let active = true;
    getSeasonPlayerOptions()
      .then((v) => {
        if (active) {
          setCountries(v.nationalities);
          setOptionsError("");
        }
      })
      .catch((e) => active && setOptionsError(errorText(e)));
    return () => {
      active = false;
    };
  }, [retry]);
  React.useEffect(
    () => () => {
      searchVersion.current++;
      rowVersion.current++;
    },
    [],
  );
  async function search() {
    if (searching || ads.busy) return;
    const version = ++searchVersion.current;
    setSearched(true);
    setSearchError("");
    setCandidates([]);
    if (query.trim().length < 2) {
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      await ads.run('seasonSearch', async () => {
      const owner = (await getMe()).id;
      const result = await searchSeasonPlayers(query, country);
      if (version === searchVersion.current) {
        cacheOwner.current = owner;
        setCandidates(result);
        setCandidate(null);setData(null);setSelected(null);setAggregate(null);
        rowVersion.current++;
        void writeSeasonSearch(owner, {query, country, candidates:result, candidate:null, data:null, selected:null})
          .then(() => recordRecentSearch(owner, 'season'));
      }
      });
    } catch (e) {
      if (version === searchVersion.current) setSearchError(errorText(e));
    } finally {
      if (version === searchVersion.current) setSearching(false);
    }
  }
  async function choose(candidate: SeasonPlayerCandidate) {
    const version = ++rowVersion.current;
    setCandidate(candidate);
    setData(null);
    setSelected(null);
    setShowPlanNudge(false);
    setAggregate(null);
    setRowsError("");
    setRowsLoading(true);
    setSeason("");
    setTeam("");
    setCompetition("");
    try {
      const owner = (await getMe()).id;
      const result = await getSeasonPlayerRows(candidate.playerId);
      if (version === rowVersion.current) {
        cacheOwner.current = owner;
        setData(result);
        void writeSeasonSearch(owner, {query, country, candidates, candidate, data:result, selected:null})
          .then(() => recordRecentSearch(owner, 'season'));
      }
    } catch (e) {
      if (version === rowVersion.current) setRowsError(errorText(e));
    } finally {
      if (version === rowVersion.current) setRowsLoading(false);
    }
  }
  const selectCareerRow = async (row: SeasonDataRow) => {
    const willSelect = selected?.key !== row.key;
    setSelected(willSelect ? row : null);
    if (cacheOwner.current !== null) void writeSeasonSearch(cacheOwner.current, {query, country, candidates, candidate, data, selected:willSelect ? row : null});
    setShowPlanNudge(false);
    if (!planResolved || plan !== "Free") return;
    const count = await incrementSeasonHistoryPlanNudgeCount();
    setShowPlanNudge(willSelect && shouldShowSeasonHistoryPlanNudge(count));
  };
  React.useEffect(() => {
    setAggregate(null);
    setAggregateError("");
    setAggregateLoading(false);
    if (!selected || !candidate) return;
    let active = true;
    setAggregateLoading(true);
    aggregateSeasonPlayerRow(candidate.playerId, selected)
      .then((value) => {
        if (active) setAggregate(value);
      })
      .catch((e) => active && setAggregateError(errorText(e)))
      .finally(() => active && setAggregateLoading(false));
    return () => {
      active = false;
    };
  }, [selected, candidate, retry]);
  const visible = filterSeasonRows(data?.rows || [], season, team, competition);
  const groups = aggregate ? seasonMetricGroups(aggregate) : [];
  const entry =
    aggregate &&
    selected &&
    candidate &&
    aggregate.playerId === candidate.playerId &&
    aggregate.selectedRows.some((row) => row.key === selected.key)
      ? seasonMatchupRow(aggregate, selected, data?.player.imageUrl)
      : null;
  const [matchupAdding,setMatchupAdding]=React.useState(false);
  const matchupAddLock=React.useRef(false);
  const alreadyAdded =
    !!entry && matchup.rows.some((row) => row?.id === entry.id);
  const full = matchup.rows.filter(Boolean).length >= 4;
  const listHeight = Math.min(420, Math.max(180, height * 0.32));
  const [tableWidth, setTableWidth] = React.useState(Math.max(240, width - 68));
  const candidateWidths = [0.29, 0.13, 0.2, 0.38].map(
    (part) => part * tableWidth,
  );
  const careerWidths = [0.2, 0.18, 0.22, 0.14, 0.12, 0.14].map(
    (part) => part * tableWidth,
  );
  const reset = () => {
    searchVersion.current++;
    setQuery("");
    setCountry("");
    setCandidates([]);
    setSearchError("");
    setSearched(false);
    setSearching(false);
    setShowPlanNudge(false);
  };
  return (
    <ScrollView
      ref={pageScroll}
      onLayout={(event) =>
        setTableWidth(Math.max(0, event.nativeEvent.layout.width - 68))
      }
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {ads.fallback}
      <Frame
        title={tr ? "Oyuncu Arama Filtreleri" : "Player Search Filters"}
        Icon={ListFilter}
        action={
          <Pressable
            accessibilityLabel={tr ? "Filtreleri temizle" : "Clear filters"}
            hitSlop={12}
            onPress={reset}
          >
            <RotateCcw size={20} color={DANGER} />
          </Pressable>
        }
      >
        <View style={styles.stack}>
          <View style={styles.filterRow}>
            <View style={{flex:1,minWidth:0}}>
          <Text style={styles.label}>{tr ? "İsim" : "Name"}</Text>
          <TextInput
            testID="season-player-query"
            value={query}
            onChangeText={setQuery}
            maxLength={120}
            placeholder={
              tr
                ? "İsim ara"
                : "Search name"
            }
            placeholderTextColor={MUTED}
            style={[styles.input,{height:44,borderRadius:12,fontSize:14,paddingHorizontal:12}]}
            returnKeyType="search"
            onSubmitEditing={search}
          />
            </View>
          <Choice
            playerStyle
            label={tr ? "Uyruk" : "Nationality"}
            value={country}
            options={countries}
            onChange={setCountry}
          />
          </View>
          {!!optionsError && (
            <Status
              message={optionsError}
              error
              retry={() => setRetry((v) => v + 1)}
            />
          )}
          <Pressable
            testID="season-search"
            accessibilityRole="button"
            disabled={searching}
            onPress={search}
            style={styles.button}
          >
            {searching ? (
              <ActivityIndicator color={ACCENT} />
            ) : (
              <Search size={18} color={ACCENT} />
            )}
            <Text style={styles.green}>{tr ? "Ara" : "Search"}</Text>
          </Pressable>
        </View>
      </Frame>
      <TutorialPageGuide page="seasonData" frame={0} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
      <Frame
        title={tr ? "Eşleşen Oyuncular" : "Matching Players"}
        Icon={List}
        action={<Text style={styles.green}>{candidates.length}</Text>}
      >
        <Table
          headers={
            tr
              ? ["İsim", "Ülke", "Son Tak.", "Veri Aralığı"]
              : ["Name", "Ctry", "Lat. Team", "Data Range"]
          }
          widths={candidateWidths}
          height={listHeight}
        >
          {searching ? (
            <Status
              message={tr ? "Oyuncular aranıyor…" : "Searching players…"}
              busy
            />
          ) : searchError ? (
            <Status message={searchError} error retry={search} />
          ) : !searched || query.trim().length < 2 ? (
            <Status
              message={
                tr
                  ? "Arama için en az iki karakter girin."
                  : "Enter at least two characters to search."
              }
            />
          ) : !candidates.length ? (
            <Status
              message={
                tr ? "Eşleşen oyuncu bulunamadı." : "No matching players found."
              }
            />
          ) : (
            candidates.map((item) => (
              <Pressable
                key={item.playerId}
                testID={`season-candidate-${item.playerId}`}
                accessibilityRole="button"
                accessibilityState={{
                  selected: candidate?.playerId === item.playerId,
                }}
                onPress={() => choose(item)}
                style={[
                  styles.tableRow,
                  candidate?.playerId === item.playerId && styles.selected,
                ]}
              >
                {[
                  shortPlayer(item.displayName),
                  shortCountry(item.nationality),
                  shortTeam(item.latestTeam),
                  `${shortSeason(item.firstSeason)} - ${shortSeason(item.latestSeason)}`,
                ].map((v, i) => (
                  <Text
                    numberOfLines={2}
                    key={i}
                    style={[styles.cell, { width: candidateWidths[i] }]}
                  >
                    {v || "—"}
                  </Text>
                ))}
              </Pressable>
            ))
          )}
        </Table>
      </Frame>
      <Frame
        title={tr ? "Kariyer Geçmişi" : "Career History"}
        Icon={History}
        action={
          <Pressable
            accessibilityLabel={tr ? "Seçimi temizle" : "Clear selection"}
            hitSlop={12}
            onPress={() => {
              setSelected(null);
              setShowPlanNudge(false);
            }}
          >
            <RotateCcw size={20} color={DANGER} />
          </Pressable>
        }
      >
        {rowsLoading ? (
          <Status
            message={
              tr ? "Kariyer geçmişi yükleniyor…" : "Loading career history…"
            }
            busy
          />
        ) : rowsError ? (
          <Status
            message={rowsError}
            error
            retry={() => candidate && choose(candidate)}
          />
        ) : !data ? (
          <Status
            message={
              tr
                ? "Kariyer geçmişini görmek için bir oyuncu seçin."
                : "Select a player to view career history."
            }
          />
        ) : (
          <View style={styles.stack}>
            <PlayerHeading name={data.player.displayName} imageUrl={data.player.imageUrl}/>
            <Text style={styles.muted}>
              {[data.player.latestTeam, data.player.nationality]
                .filter(Boolean)
                .join(" · ")}
            </Text>
            <View style={styles.filterRow}>
              <Choice
                label={tr ? "Tüm sezonlar" : "All seasons"}
                value={season}
                options={unique(data.rows, "seasonName")}
                onChange={setSeason}
              />
              <Choice
                label={tr ? "Tüm takımlar" : "All teams"}
                value={team}
                options={unique(data.rows, "teamName")}
                onChange={setTeam}
              />
            </View>
            <Choice
              label={tr ? "Tüm organizasyonlar" : "All competitions"}
              value={competition}
              options={unique(data.rows, "leagueName")}
              onChange={setCompetition}
            />
            <Table
              headers={
                tr
                  ? ["Sezon", "Takım", "Org.", "Ülke", "Maç", "Rol"]
                  : ["Season", "Team", "Comp.", "Ctry", "Cnt", "Role"]
              }
              widths={careerWidths}
              height={listHeight}
            >
              {visible.map((row) => (
                <Pressable
                  key={row.key}
                  testID={`season-row-${row.key}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected?.key === row.key }}
                  accessibilityLabel={`${row.seasonName}, ${row.teamName}, ${row.leagueName}`}
                  onPress={() => void selectCareerRow(row)}
                  style={[
                    styles.tableRow,
                    selected?.key === row.key && styles.selected,
                  ]}
                >
                  {[
                    shortSeason(row.seasonName),
                    shortTeam(row.teamName),
                    shortCompetition(row.leagueName, row.leagueShortCode),
                    shortCountry(row.country),
                    String(row.matchCount),
                    primarySeasonRole(row.positionCounts, row.positionName),
                  ].map((v, i) => (
                    <Text
                      key={i}
                      numberOfLines={2}
                      style={[styles.cell, { width: careerWidths[i] }]}
                    >
                      {v || "—"}
                    </Text>
                  ))}
                </Pressable>
              ))}
            </Table>
            {!visible.length && (
              <Status
                message={
                  tr
                    ? "Bu filtrelerle kayıt bulunamadı."
                    : "No records match these filters."
                }
              />
            )}
          </View>
        )}
      </Frame>
      <TutorialPageGuide page="seasonData" frame={1} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
      <Frame
        title={
          tr ? "Sezon İstatistikleri" : "Season Statistics"
        }
        Icon={ChartNoAxesCombined}
        action={entry && !aggregateLoading && !aggregateError ? (
            <Pressable
              testID="season-add-matchup"
              accessibilityRole="button"
              disabled={matchupAdding || (!full && (alreadyAdded || ads.busy))}
              onPress={async () => {
                if(full){nav.navigate('Matchup');return;}
                if (!entry || alreadyAdded || ads.busy || matchupAddLock.current) return;
                matchupAddLock.current=true;setMatchupAdding(true);
                try {
                  let added=false;
                  await ads.run('seasonMatchupAdd', () => { matchup.add(entry);added=true; });
                  if(added && matchup.rows.filter(Boolean).length===3)nav.navigate('Matchup');
                } catch (error) {
                  Alert.alert(tr ? 'Ekleme hatası' : 'Could not add to matchup', String(error));
                } finally {matchupAddLock.current=false;setMatchupAdding(false);}
              }}
              style={[
                styles.button,
                {flex:0,paddingHorizontal:10},
                (matchupAdding || (!full && (alreadyAdded || ads.busy))) && { opacity: 0.45 },
              ]}
            >
              {matchupAdding?<ActivityIndicator size="small" color={ACCENT}/>:<GitCompareArrows size={18} color={ACCENT} />}
              <Text style={[styles.green,{fontSize:12}]} numberOfLines={1}>
                {matchupAdding?(tr?'Ekleniyor…':'Adding…'):alreadyAdded && !full ? (tr?'Eklendi':'Added') : (tr?'Eşleşme':'Matchup')}
              </Text>
            </Pressable>
        ) : undefined}
      >
        {entry && (matchupAdding || alreadyAdded) && <Text accessibilityLiveRegion="polite" style={{color:ACCENT,fontSize:12,lineHeight:18,marginBottom:12}}>{matchupAdding?(tr?'Eşleşmeye ekleniyor…':'Adding to matchup…'):(tr?'Eşleşmeye eklendi.':'Added to matchup.')}</Text>}
        {!selected ? (
          <Status
            message={
              tr
                ? "İstatistikleri görmek için bir sezon kaydı seçin."
                : "Select one season record to view statistics."
            }
          />
        ) : aggregateLoading ? (
          <Status
            message={
              tr
                ? "Sezon istatistikleri hesaplanıyor…"
                : "Calculating season statistics…"
            }
            busy
          />
        ) : aggregateError ? (
          <Status
            message={aggregateError}
            error
            retry={() => setRetry((v) => v + 1)}
          />
        ) : aggregate && entry ? (
          <View style={styles.stack}>
            <PlayerHeading name={aggregate.displayName} imageUrl={data?.player.imageUrl}/>
            <Text style={styles.text}>
              {[
                selected.seasonName,
                selected.teamName,
                selected.leagueName,
              ].join(" · ")}
            </Text>
            <View style={styles.roles}>
              {Object.entries(aggregate.positionCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([role, count]) => (
                  <Text key={role} style={styles.role}>
                    {role} ·{" "}
                    {Math.round(
                      (count /
                        (Object.values(aggregate.positionCounts).reduce(
                          (a, b) => a + b,
                          0,
                        ) || 1)) *
                        100,
                    )}
                    %
                  </Text>
                ))}
            </View>
            <ComparisonUnitSwitch
              value={unit}
              onChange={setUnit}
              allowTotal
              tr={tr}
            />

            {groups.map(group => <SeasonMetricCategory key={`${selected.key}:${group.key}`} group={group} aggregate={aggregate} player={entry.player} unit={unit}/>)}
            {!groups.length && (
              <Status
                message={
                  tr
                    ? "Bu kayıtta gösterilebilir metrik yok."
                    : "No available metrics for this record."
                }
              />
            )}
          </View>
        ) : null}
      </Frame>
      {showPlanNudge && plan === "Free" && selected ? (
        <PlanDiscoveryNudge
          containerStyle={{ marginTop: 0 }}
          onClose={() => setShowPlanNudge(false)}
          onOpenPlans={() => nav.navigate("ManagePlan")}
        />
      ) : null}
        <TutorialPageGuide page="seasonData" frame={2} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
    </ScrollView>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, BG, PANEL, CARD, TEXT, MUTED, LINE, DANGER, FRAME_TITLE, FRAME_HEADING, FRAME_STRIPE, themeColor} = colors;
  const poolTableStyles = __getThemed_poolTableStyles(colors);
  const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, gap: 18, paddingBottom: 32 },
  panel: {
    backgroundColor: PANEL,
    borderColor: ACCENT,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  stack: { gap: 12 },
  filterRow: { flexDirection: "row", gap: 10 },
  text: { color: TEXT, fontSize: 13 },
  green: { color: ACCENT, fontWeight: "800" },
  muted: { color: MUTED, fontSize: 13 },
  label: { color: MUTED, fontSize: 12, marginBottom: 6 },
  input: {
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: CARD,
    color: TEXT,
    minHeight: 44,
    padding: 10,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: CARD,
    minHeight: 44,
    padding: 10,
  },
  button: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: themeColor("rgba(22,163,74,.1)", 'surface'),
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  status: {
    padding: 18,
    minHeight: 90,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  table: poolTableStyles.table,
  tableRow: poolTableStyles.row,
  tableHeader: poolTableStyles.header,
  tableHeaderCell: {
    minWidth: 0,
    paddingHorizontal: 3,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tableHeaderSeparator: { borderLeftWidth: 1, borderLeftColor: LINE },
  tableHeaderText: { ...poolTableStyles.headerText, fontSize: 10.5, textAlign: "center" },
  cell: poolTableStyles.cell,
  selected: poolTableStyles.selected,
  playerName: { fontSize: 18, fontWeight: "800", color: TEXT },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  role: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    color: ACCENT,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: "700",
  },
  radio: {
    width: 15,
    height: 15,
    borderWidth: 1,
    borderColor: MUTED,
    borderRadius: 9,
  },
  category: {
    padding: 12,
    backgroundColor: themeColor("rgba(22,163,74,.1)", 'surface'),
    color: ACCENT,
    fontSize: 14,
    fontWeight: "800",
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderTopWidth: 1,
    borderColor: LINE,
  },
  overlay: {
    flex: 1,
    backgroundColor: themeColor("rgba(0,0,0,.75)", 'surface'),
    justifyContent: "center",
    padding: 20,
  },
  modal: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 16,
    gap: 12,
    maxHeight: "85%",
  },
  option: {
    minHeight: 44,
    padding: 12,
    flexDirection: "row",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
});
  return {ACCENT, BG, PANEL, CARD, TEXT, MUTED, LINE, DANGER, FRAME_TITLE, FRAME_HEADING, FRAME_STRIPE, poolTableStyles, styles, themeColor};
});
