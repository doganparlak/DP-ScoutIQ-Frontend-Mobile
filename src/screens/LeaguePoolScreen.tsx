import { recordRecentSearch } from '@/services/recentSearches';
import { readLeagueSearch, writeLeagueSearch } from '@/services/leaguePoolCache';
import PortfolioRoleFilter from '@/components/PortfolioRoleFilter';
import { normalizeSearchText, optionMatchesSearch } from '@/utils/searchSuggestions';
import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import PlanDiscoveryNudge from "@/components/PlanDiscoveryNudge";
import { getThemed_poolTableStyles as __getThemed_poolTableStyles } from "@/components/poolTableStyles";
import { TutorialPageGuide } from "@/components/Tutorial";
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';

import type { SearchResultRow } from "@/components/CandidatePlayers";
import { useMatchup } from "@/context/MatchupContext";
import {
getLeagueOptions,
searchLeagues,
type LeagueFilters,
type LeagueOptions,
} from "@/services/leaguePool";
import { useFocusEffect,useNavigation } from "@react-navigation/native";
import {
ChevronDown,
Check,
GitCompareArrows,
ListFilter,
RotateCcw,
Search,
Table2,
Trophy,
X,
} from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import {
ActivityIndicator,
FlatList,
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
incrementLeagueCardPlanNudgeCount,
shouldShowLeagueCardPlanNudge,
} from "@/ads/adGating";
import { getMe,type Plan } from "@/services/api";

const EMPTY: LeagueFilters = { countries: [], leagues: [], positions: [] };
const DEFAULT_SEARCH: LeagueFilters = {countries:['England'],leagues:['Premier League'],positions:[]};
export default function LeaguePoolScreen() {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, TEXT, MUTED, ACCENT, FRAME_STRIPE, DANGER, poolTableStyles} = themed;

  const ads = useWorkspaceActionAd();
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const nav = useNavigation<any>();
  const { height } = useWindowDimensions();
  const shared = useMatchup();
  const [filters, setFilters] = React.useState<LeagueFilters>(EMPTY);
  const [options, setOptions] = React.useState<LeagueOptions>({...EMPTY,leagueChoices:[]});
  const [rows, setRows] = React.useState<SearchResultRow[]>([]);
  const [selectedId, setSelectedId] = React.useState("");
  const [plan, setPlan] = React.useState<Plan>("Free");
  const [planResolved, setPlanResolved] = React.useState(false);
  const [showPlanNudge, setShowPlanNudge] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [optionsError, setOptionsError] = React.useState("");
  const [retry, setRetry] = React.useState(0);
  const [selector, setSelector] = React.useState<
    "leagues" | null
  >(null);
  const [roleTarget,setRoleTarget]=React.useState<SearchResultRow|null>(null);
  const [matchupRoles,setMatchupRoles]=React.useState<string[]>([]);
  const [rolesOpen,setRolesOpen]=React.useState(false);
  const [adding,setAdding]=React.useState(false);
  const addLock=React.useRef(false);
  const latestSharedRows=React.useRef(shared.rows);
  latestSharedRows.current=shared.rows;
  const [addNotice,setAddNotice]=React.useState<{leagueId:string;text:string;success?:boolean}|null>(null);
  const [query, setQuery] = React.useState("");
  const searchVersion = React.useRef(0);
  const scroll = React.useRef<ScrollView>(null);
  const cacheUser = React.useRef<number|null>(null);
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
      let restoreVersion = searchVersion.current;
      getMe()
        .then(async (me) => {
          if (!active) return;
          const firstVisit=cacheUser.current!==me.id;
          if(cacheUser.current!==null && cacheUser.current!==me.id){
            searchVersion.current++;restoreVersion=searchVersion.current;
            setRows([]);setSelectedId('');setFilters(EMPTY);
          }
          cacheUser.current=me.id;
          const nextPlan: Plan =
            me.plan === "No Ads Monthly" || me.plan === "Pro Monthly" || me.plan === "Pro Yearly"
              ? me.plan
              : "Free";
          setPlan(nextPlan);
          setPlanResolved(true);
          if (nextPlan !== "Free") setShowPlanNudge(false);
          const cached=await readLeagueSearch(me.id);
          if(!active || searchVersion.current!==restoreVersion || cacheUser.current!==me.id)return;
          const initialFilters={...(cached?.filters ?? DEFAULT_SEARCH),positions:[]};
          if(cached && !cached.filters.positions.length){setRows([cached.row]);setSelectedId(cached.row.id);setHasSearched(true);}
          if(firstVisit)setFilters(initialFilters);
          try {
            const result=await searchLeagues(initialFilters);
            if(!active || searchVersion.current!==restoreVersion || cacheUser.current!==me.id)return;
            if(result[0]){
              setRows([result[0]]);setSelectedId(result[0].id);setHasSearched(true);
              void writeLeagueSearch(me.id,{filters:initialFilters,row:result[0]});
            }
          } catch { /* Preserve the cached card when background refresh fails. */ }
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
    setError('');
    setFilters((previous) => ({ ...previous, [key]: values }));
  };
  const clear = () => {
    searchVersion.current++;
    setLoading(false);
    setFilters(EMPTY);

    setError("");
  };
  const search = async () => {
    if (loading || !filters.leagues.length) return;
    Keyboard.dismiss();
    const version = ++searchVersion.current;
    setLoading(true);
    setError("");
    try {
      const owner=cacheUser.current ?? (await getMe()).id;
      if(version!==searchVersion.current)return;
      cacheUser.current=owner;
      const criteria={...filters,positions:[]};
      const result = await searchLeagues(criteria);
      if (version !== searchVersion.current) return;
      if(!result[0]){setError(tr?'Bu lig için oyuncu verisi bulunamadı.':'No player data found for this league.');return;}
      setRows([result[0]]);setSelectedId(result[0].id);
      void writeLeagueSearch(owner,{filters:criteria,row:result[0]}).then(() => recordRecentSearch(owner, 'league'));
      setHasSearched(true);
      setShowPlanNudge(false);
      if (planResolved && plan === 'Free' && result.length) {
        const count = await incrementLeagueCardPlanNudgeCount();
        if (version !== searchVersion.current) return;
        setShowPlanNudge(shouldShowLeagueCardPlanNudge(count));
      }

    } catch (e: any) {
      if (version === searchVersion.current) {
        setError(String(e?.message || e));

      }
    } finally {
      if (version === searchVersion.current) setLoading(false);
    }
  };
  async function addLeagueWithRoles(){
    const target=roleTarget;
    const version=searchVersion.current;
    if(!target || !matchupRoles.length || addLock.current || ads.busy)return;
    addLock.current=true;setAdding(true);setAddNotice(null);
    const criteria:LeagueFilters={leagues:[target.player.name],countries:target.player.meta?.leagueFilters?.countries??[],positions:[...matchupRoles]};
    try{
      const result=await searchLeagues(criteria);
      if(version!==searchVersion.current)return;
      const entry=result[0];
      if(!entry)throw new Error(tr?'Seçilen roller için oyuncu verisi bulunamadı.':'No player data found for the selected roles.');
      if(latestSharedRows.current.some(row=>row?.id===entry.id)){
        setAddNotice({leagueId:target.id,text:tr?'Bu rol seçimi zaten eşleşmede.':'This role selection is already in your matchup.'});return;
      }
      if(latestSharedRows.current.filter(Boolean).length>=4){nav.navigate('Matchup');return;}
      // Let the native role modal finish closing before an interstitial can open.
      await new Promise<void>(resolve=>setTimeout(resolve,350));
      let didAdd=false,opensCenter=false;
      await ads.run('leagueMatchupAdd',()=>{
        if(version!==searchVersion.current || latestSharedRows.current.some(row=>row?.id===entry.id) || latestSharedRows.current.filter(Boolean).length>=4)return false;
        opensCenter=latestSharedRows.current.filter(Boolean).length===3;
        shared.add(entry);didAdd=true;
      });
      if(didAdd){
        setAddNotice({leagueId:target.id,success:true,text:tr?'Eşleşmeye eklendi.':'Added to matchup.'});
        if(opensCenter)nav.navigate('Matchup');
      }else if(version===searchVersion.current){
        setAddNotice({leagueId:target.id,text:tr?'Eklenmedi. Yeniden deneyebilirsin.':'Not added. Please try again.'});
      }
    }catch(error){if(version===searchVersion.current)setAddNotice({leagueId:target.id,text:error instanceof Error?error.message:String(error)});}
    finally{addLock.current=false;setAdding(false);}
  }
  async function analyzeLeague(row:SearchResultRow){
    const leagueId=row.player.meta?.leagueId || (row.id.startsWith('league:') ? Number(row.id.split(':')[1]) : 0);
    if(!leagueId || ads.busy)return;
    try{await ads.run('leaguePerformanceSearch',()=>{nav.navigate('LeaguePerformance',{leagueCard:row,league:{league_id:leagueId,league_name:row.player.name,country_name:row.player.meta?.nationality??null,image_url:row.player.meta?.imageUrl??null,team_count:row.player.meta?.teamCount??null},analysisRequest:Date.now()});});}
    catch(error){Alert.alert(tr?'Analiz açılamadı':'Could not open analysis',String(error));}
  }
  const selected = rows.find((row) => row.id === selectedId);
  const leagueLabel = filters.leagues[0] ? `${filters.countries[0] || '—'} | ${filters.leagues[0]}` : '';
  const optionsShown = (options.leagueChoices ?? []).filter(option => optionMatchesSearch(`${option.country} ${option.name}`, normalizeSearchText(query)));
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
            <View style={styles.field}>
              <Text style={styles.label}>{tr?'Lig':'League'}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={tr?'Lig':'League'} disabled={optionsLoading} style={styles.input} onPress={()=>{setQuery('');setSelector('leagues');}}><Text numberOfLines={1} style={{flex:1,color:leagueLabel?TEXT:MUTED}}>{leagueLabel || (tr?'Lig seçin':'Select league')}</Text><ChevronDown size={16} color={MUTED}/></Pressable>
            </View>
          </View>
          {optionsLoading && <ActivityIndicator color={ACCENT}/>}
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
            disabled={loading || optionsLoading || !filters.leagues.length}
            onPress={search}
            style={[
              styles.primary,
              (loading || optionsLoading || !filters.leagues.length) && { opacity: 0.5 },
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
        {loading && <ActivityIndicator color={ACCENT}/>}
        {!loading && !selected && filters.leagues.length > 0 && !error && <Text style={styles.empty}>{hasSearched ? (tr?'Bu lig için oyuncu verisi bulunamadı.':'No player data found for this league.') : (tr?'Lig kartını görmek için Ara’ya bas.':'Press Search to view the league card.')}</Text>}
        <LeagueCard
          row={selected}
          tr={tr}
          added={false}
          full={shared.rows.filter(Boolean).length >= 4}
          busy={ads.busy || adding}
          adding={adding}
          feedback={addNotice?.leagueId===selected?.id?addNotice?.text:undefined}
          feedbackSuccess={addNotice?.success??false}
          onAnalyze={()=>{if(selected)void analyzeLeague(selected);}}
          onAdd={()=>{
            if(shared.rows.filter(Boolean).length>=4){nav.navigate('Matchup');return;}
            if(!selected || adding || ads.busy)return;
            setAddNotice(null);setRoleTarget(selected);setMatchupRoles([]);setRolesOpen(true);
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
        <TutorialPageGuide page="leaguePool" frame={1} onShow={y => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />

      </ScrollView>
      <PortfolioRoleFilter minSelections={1} description={tr?"Eşleşmeye eklemek istediğin oyuncu rollerini seç. En az bir rol seçmelisin.":"Choose the player roles to include in the matchup. Select at least one role."} hideField open={rolesOpen} onOpenChange={setRolesOpen} value={matchupRoles} onChange={setMatchupRoles} onDone={()=>void addLeagueWithRoles()}/>
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
                {tr ? 'Lig' : 'League'}
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
            <FlatList data={optionsShown} keyExtractor={v=>`${v.country}|${v.name}`} initialNumToRender={15} maxToRenderPerBatch={15} windowSize={5} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}}
              ListEmptyComponent={<Text style={styles.empty}>{tr?'Sonuç bulunamadı.':'No results found.'}</Text>}
              renderItem={({item})=><Pressable accessibilityRole="radio" accessibilityState={{selected:filters.leagues[0]===item.name && filters.countries[0]===item.country}} style={[styles.option,filters.leagues[0]===item.name && filters.countries[0]===item.country && styles.selected]} onPress={()=>{searchVersion.current++;setLoading(false);setFilters(current=>({...current,leagues:[item.name],countries:[item.country]}));setError('');setSelector(null);}}><Text style={{color:TEXT,fontWeight:'700'}}>{item.country} | {item.name}</Text></Pressable>}/>

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
  onAnalyze,
  adding=false,
  feedback,
  feedbackSuccess=false,
  footer,
  headerAction,
  emptyContent,
  hideActions=false,
}: {
  row?: SearchResultRow;
  tr: boolean;
  added: boolean;
  full: boolean;
  busy?: boolean;
  onAdd: () => void;
  onAnalyze: () => void;
  adding?:boolean;
  feedback?:string;
  feedbackSuccess?:boolean;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
  emptyContent?: React.ReactNode;
  hideActions?: boolean;
}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, FRAME_STRIPE, ACCENT} = themed;

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
        {headerAction}
      </View>
      {row && !hideActions && <View style={styles.cardActions}>
        {row && <Pressable accessibilityRole="button" disabled={busy} onPress={onAnalyze} style={[styles.add,busy&&{opacity:.5}]}><Table2 size={18} color={ACCENT}/><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.cardActionText}>{tr?'Analiz':'Analyze'}</Text></Pressable>}
        {row && (
          <Pressable
            testID="league-add-matchup"
            disabled={!full && (added || busy)}
            accessibilityRole="button"
            onPress={onAdd}
            style={[styles.add, (!full && (added || busy)) && { opacity: 0.5 }]}
          >
            {adding?<ActivityIndicator size="small" color={ACCENT}/>:<GitCompareArrows size={18} color={ACCENT} />}
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.cardActionText}>
              {adding ? (tr?'Ekleniyor…':'Adding…') : added && !full
                ? tr
                  ? "Eşleşmede"
                  : "In matchup"
                : tr
                  ? "Eşleşme"
                  : "Matchup"}
            </Text>
          </Pressable>
        )}
      </View>}
      {adding && <Text accessibilityLiveRegion="polite" style={[styles.hint,{color:ACCENT,marginBottom:12}]}>{tr?'Eşleşmeye ekleniyor…':'Adding to matchup…'}</Text>}
      {!adding && !!feedback && <View accessibilityLiveRegion="polite" style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:12}}>{feedbackSuccess && <Check size={16} color={ACCENT}/>}<Text style={[styles.hint,{color:ACCENT,flex:1}]}>{feedback}</Text></View>}
      {!row ? (emptyContent ??
        <Text style={[styles.empty, { paddingVertical: 65 }]}>
          {tr
            ? "Bir lig seçip Ara’ya bas."
            : "Select a league and press Search."}
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
                  .join("\n") || "—",
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


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {FRAME_TITLE, FRAME_STRIPE, FRAME_HEADING, ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT, themeColor} = colors;
  const poolTableStyles = __getThemed_poolTableStyles(colors);
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
  selected: { borderColor: ACCENT, backgroundColor: themeColor("rgba(22,163,74,0.12)", 'surface') },
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
    backgroundColor: themeColor("rgba(22,163,74,0.12)", 'surface'),
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
  cardActions: {flexDirection:'row',gap:6,marginBottom:14},
  cardActionText: {color:ACCENT,fontWeight:'800',fontSize:13,flexShrink:1,textAlign:'center'},
  add: {
    flex: 1,
    minWidth: 0,
    backgroundColor: themeColor('rgba(22,163,74,0.06)', 'surface'),
    justifyContent: 'center',
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 9,
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
    backgroundColor: themeColor("rgba(0,0,0,0.75)", 'surface'),
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
  return {FRAME_TITLE, FRAME_STRIPE, FRAME_HEADING, ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT, poolTableStyles, styles, themeColor};
});
