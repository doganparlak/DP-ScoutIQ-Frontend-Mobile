import { recordRecentSearch } from '@/services/recentSearches';
import { readLastTeam, writeLastTeam } from '@/services/teamPoolCache';
import { type TeamFixtureOptions } from '@/services/matchPool';
import { getTeamCard, getTeamSelectorOptions } from '@/services/teamPool';
import { normalizeSearchText, optionMatchesSearch } from '@/utils/searchSuggestions';
import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import PlanDiscoveryNudge from "@/components/PlanDiscoveryNudge";
import TeamProfileCard from "@/components/TeamProfileCard";
import { TutorialPageGuide } from "@/components/Tutorial";
import { getThemed_poolTableStyles as __getThemed_poolTableStyles } from "@/components/poolTableStyles";
import { getFavoriteTeams,saveFavoriteTeam } from '@/services/teamPortfolio';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useFocusEffect,useNavigation } from "@react-navigation/native";
import {
ChevronDown,
ListFilter,
RotateCcw,
Search,
ShieldCheck,
X
} from "lucide-react-native";
import React,{ useEffect,useRef,useState } from "react";
import { useTranslation } from "react-i18next";
import {
ActivityIndicator,
FlatList,
Alert,
Modal,
Pressable,
ScrollView,
StyleSheet,
Text,
TextInput,
useWindowDimensions,
View
} from "react-native";

import {
incrementTeamCardPlanNudgeCount,
shouldShowTeamCardPlanNudge,
} from "@/ads/adGating";
import { getMe,type Plan } from "@/services/api";
import {
Team,
} from "@/services/teamPool";
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
  const themed = useThemedStyles(getModuleTheme);
  const {s, FRAME_STRIPE, FRAME_HEADING, ACCENT, FRAME_TITLE} = themed;

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
  const themed = useThemedStyles(getModuleTheme);
  const {BG, s, DANGER, MUTED, TEXT, ACCENT, poolTableStyles, FRAME_TITLE} = themed;

  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const nav = useNavigation<any>();
  const ads = useWorkspaceActionAd();
  const { height, width } = useWindowDimensions();
  const [options, setOptions] = useState<TeamFixtureOptions>({leagues:[],teams:[]});
  const [leagueId, setLeagueId] = useState<number>();
  const [teamId, setTeamId] = useState<number>();
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [savedTeams, setSavedTeams] = useState<Set<string>>(new Set());
  const [savingTeam, setSavingTeam] = useState('');
  const saveLock = useRef(false);
  const saveMounted = useRef(true);
  useEffect(() => {saveMounted.current = true; return () => {saveMounted.current = false;};}, []);
  useFocusEffect(React.useCallback(() => {
    let alive = true;
    getFavoriteTeams().then(favorites => {if (alive) setSavedTeams(new Set(favorites.map(row => row.team.id)));}).catch(() => {});
    return () => {alive = false;};
  }, []));
  async function saveTeam(team: Team) {
    if (saveLock.current || savedTeams.has(team.id)) return;
    saveLock.current = true; setSavingTeam(team.id);
    try {await ads.run('saveTeam', async () => {await saveFavoriteTeam(team); if (saveMounted.current) setSavedTeams(current => new Set([...current, team.id]));});}
    catch (error) {if (saveMounted.current) Alert.alert(tr ? 'Takım kaydedilemedi' : 'Could not save team', error instanceof Error ? error.message : String(error));}
    finally {saveLock.current = false; if (saveMounted.current) setSavingTeam('');}
  }
  const [rows, setRows] = useState<Team[]>([]),
    [selectedId, setSelectedId] = useState(""),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [selector, setSelector] = useState<'team' | 'league' | null>(null);
  const [query, setQuery] = useState('');
  const [retry, setRetry] = useState(0);
  const [plan, setPlan] = useState<Plan>("Free");
  const [planResolved, setPlanResolved] = useState(false);
  const [showPlanNudge, setShowPlanNudge] = useState(false);
  const pageScroll = useRef<ScrollView>(null);
  const version = useRef(0);
  const userId = useRef<number | null>(null);
  const selected = rows.find((r) => r.id === selectedId) || rows[0];
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      let restoreVersion = version.current;
      getMe()
        .then(async (me) => {
          if (!active) return;
          if (userId.current !== null && userId.current !== me.id) {
            version.current++;
            setRows([]);setSelectedId('');setTeamId(undefined);setLeagueId(undefined);
            restoreVersion = version.current;
          }
          userId.current = me.id;
          const nextPlan: Plan =
            me.plan === "No Ads Monthly" || me.plan === "Pro Monthly" || me.plan === "Pro Yearly"
              ? me.plan
              : "Free";
          setPlan(nextPlan);
          setPlanResolved(true);
          if (nextPlan !== "Free") setShowPlanNudge(false);
          const cached = await readLastTeam(me.id);
          if (!active || version.current !== restoreVersion || userId.current !== me.id) return;
          if (!cached) {
            try {
              const available = await getTeamSelectorOptions();
              const madrid = available.teams.find(team => normalizeSearchText(team.name) === 'real madrid');
              if (!active || version.current !== restoreVersion || userId.current !== me.id || !madrid) return;
              const initial = await getTeamCard(madrid.id);
              if (!active || version.current !== restoreVersion || userId.current !== me.id) return;
              setRows([initial]);setSelectedId(initial.id);
              void writeLastTeam(me.id, initial);
            } catch { /* Keep team search usable if the default card cannot load. */ }
            return;
          }
          setRows([cached]);setSelectedId(cached.id);
          try {
            const fresh = await getTeamCard(Number(cached.id));
            if (!active || version.current !== restoreVersion || userId.current !== me.id) return;
            setRows([fresh]);setSelectedId(fresh.id);
            void writeLastTeam(me.id, fresh);
          } catch { /* Keep the last successful card when refresh is unavailable. */ }
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
    let active=true;
    setOptionsLoading(true);setOptionsError('');
    getTeamSelectorOptions(leagueId).then(value=>{if(active)setOptions(value);})
      .catch(()=>{if(active)setOptionsError(tr?'Filtreler yüklenemedi. Yeniden deneyin.':'Could not load filters. Retry.');})
      .finally(()=>{if(active)setOptionsLoading(false);});
    return ()=>{active=false;};
  },[leagueId,retry]);
  useEffect(()=>()=>{version.current++;},[]);
  function clearCard() {
    version.current++;setLoading(false);setError('');
  }
  function clear() {
    clearCard();setTeamId(undefined);setLeagueId(undefined);setOptions(v=>({...v,teams:[]}));setRetry(v=>v+1);
  }
  async function loadTeam(id:number) {
    const request=++version.current;
    setTeamId(id);setError('');setLoading(true);
    try {
      const owner = userId.current ?? (await getMe()).id;
      if(request!==version.current)return;
      userId.current = owner;
      const team=await getTeamCard(id);
      if(request!==version.current)return;
      setRows([team]);setSelectedId(team.id);setShowPlanNudge(false);
      void writeLastTeam(owner, team).then(() => recordRecentSearch(owner, 'team'));
      if(planResolved && plan==='Free') {
        const count=await incrementTeamCardPlanNudgeCount();
        if(request===version.current)setShowPlanNudge(shouldShowTeamCardPlanNudge(count));
      }
    } catch(e) {if(request===version.current)setError(e instanceof Error?e.message:String(e));}
    finally {if(request===version.current)setLoading(false);}
  }
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={pageScroll}
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
          <View style={s.twoCol}>
            {(['team','league'] as const).map(key=>{
              const label=key==='team'?(tr?'Takım':'Team'):(tr?'Lig':'League');
              const league=options.leagues.find(l=>l.id===leagueId);
              const value=key==='team'?options.teams.find(t=>t.id===teamId)?.name:(league?`${league.country || '—'} | ${league.name}`:'');
              return <View key={key} style={{flex:1,minWidth:0}}><Text style={s.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:optionsLoading}} disabled={optionsLoading} style={[s.input,s.selectInput,{opacity:optionsLoading?.5:1}]} onPress={()=>{setQuery('');setSelector(key);}}><Text numberOfLines={1} style={{flex:1,color:value?TEXT:MUTED}}>{value || (key==='team'?(tr?'Takım seçin':'Select team'):(tr?'Tüm ligler':'All leagues'))}</Text><ChevronDown size={16} color={MUTED}/></Pressable></View>;
            })}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={tr ? 'Takım Ara' : 'Search Team'} accessibilityState={{disabled:!teamId || loading || optionsLoading,busy:loading}} disabled={!teamId || loading || optionsLoading} style={[s.button,{opacity:!teamId || loading || optionsLoading ? .5 : 1}]} onPress={()=>{if(teamId)void loadTeam(teamId);}}>
            {loading ? <ActivityIndicator color={ACCENT}/> : <Search size={18} color={ACCENT}/>}
            <Text style={s.green}>{loading ? (tr?'Aranıyor':'Searching') : (tr?'Takım Ara':'Search Team')}</Text>
          </Pressable>
          {!!error && <Pressable onPress={()=>{if(teamId)void loadTeam(teamId);}}><Text style={{color:DANGER,marginTop:12}}>{error}</Text><Text style={s.green}>{tr?'Yeniden dene':'Retry'}</Text></Pressable>}
          {optionsLoading && <ActivityIndicator color={ACCENT}/>}
          {!!optionsError && <Pressable onPress={()=>setRetry(v=>v+1)}><Text style={{color:DANGER}}>{optionsError}</Text></Pressable>}
        </Frame>
        <TutorialPageGuide page="teamPool" frame={0} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <TutorialPageGuide page="teamPool" frame={1} onShow={y=>pageScroll.current?.scrollTo({y:Math.max(0,y-12),animated:true})}/>
        <Frame title={tr ? "Takım Kartı" : "Team Card"} icon={ShieldCheck}>
          {selected ? (
            <>
              <TeamProfileCard
                team={selected}
                tr={tr}
                onSave={() => void saveTeam(selected)}
                saved={savedTeams.has(selected.id)}
                saving={savingTeam === selected.id}
                onFixtures={() => nav.navigate("MatchPool", {fixtureTeam:selected,fixtureRequest:Date.now()})}
                onAnalyze={() => nav.navigate("TeamAnalysis", { team: selected })}
              />
              {showPlanNudge && plan === "Free" ? (
                <PlanDiscoveryNudge
                  onClose={() => setShowPlanNudge(false)}
                  onOpenPlans={() => nav.navigate("ManagePlan")}
                />
              ) : null}
            </>
          ) : loading ? <ActivityIndicator color={ACCENT} style={{padding:24}}/> : (
            <Text style={s.empty}>
              {tr
                ? "Bir takım seçip Takım Ara düğmesine basın."
                : "Select a team and press Search Team to view its card."}
            </Text>
          )}
        </Frame>
        {selector && <Modal visible transparent animationType="fade" onRequestClose={()=>setSelector(null)}><View style={s.backdrop}><View style={[s.modal,{maxHeight:height*.8}]}>
          <View style={s.identity}><Text style={[FRAME_TITLE,{flex:1}]}>{selector==='team'?(tr?'Takım':'Team'):(tr?'Lig':'League')}</Text><Pressable hitSlop={12} onPress={()=>setSelector(null)}><X size={22} color={DANGER}/></Pressable></View>
          <TextInput value={query} onChangeText={setQuery} placeholder={tr?'Ara':'Search'} placeholderTextColor={MUTED} style={[s.input,{marginVertical:12}]}/>
          <FlatList data={(selector==='league'?options.leagues.map(l=>({id:l.id,name:`${l.country || '—'} | ${l.name}`})):options.teams).filter(v=>optionMatchesSearch(v.name,normalizeSearchText(query)))} keyExtractor={v=>String(v.id)} initialNumToRender={15} maxToRenderPerBatch={15} windowSize={5} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}} ListHeaderComponent={selector==='league'?<Pressable style={s.option} onPress={()=>{setLeagueId(undefined);setSelector(null);}}><Text style={s.green}>{tr?'Tüm ligler':'All leagues'}</Text></Pressable>:null} ListEmptyComponent={<Text style={s.empty}>{tr?'Sonuç bulunamadı.':'No results found.'}</Text>} renderItem={({item})=><Pressable accessibilityRole="radio" accessibilityState={{selected:item.id===(selector==='team'?teamId:leagueId)}} style={[s.option,item.id===(selector==='team'?teamId:leagueId)&&s.filterSelected]} onPress={()=>{if(selector==='league'){clearCard();setTeamId(undefined);setLeagueId(item.id);setOptions(v=>({...v,teams:[]}));}else {clearCard();setTeamId(item.id);}setSelector(null);}}><Text style={[s.text,{fontWeight:'700'}]}>{item.name}</Text></Pressable>}/>
        </View></View></Modal>}
      </ScrollView>
      {ads.fallback}
    </View>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT, FRAME_STRIPE, FRAME_TITLE, FRAME_HEADING, themeColor} = colors;
  const poolTableStyles = __getThemed_poolTableStyles(colors);
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
  twoCol: { flexDirection: "row", gap: 10, marginVertical: 14 },
  selectInput: {flexDirection:"row",alignItems:"center",gap:6,padding:10},
  filterSelected: {borderColor:ACCENT,backgroundColor:themeColor("rgba(22,163,74,0.12)", 'surface')},
  chipText: {color:ACCENT,fontSize:11,fontWeight:"800",flexShrink:1},
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    padding: 7,
    maxWidth: 200,
  },
  green: { color: ACCENT, fontWeight: "800", fontSize: 13 },
  button: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 14,
    padding: 12,
    backgroundColor: themeColor("rgba(22,163,74,.08)", 'surface'),
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  option: {padding:14,minHeight:44,borderRadius:12,borderWidth:1,borderColor:LINE,backgroundColor:CARD},
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
    backgroundColor: themeColor("rgba(255,255,255,.025)", 'surface'),
  },
  value: { fontSize: 14, color: TEXT, fontWeight: "800", marginTop: 8 },
  backdrop: {
    flex: 1,
    backgroundColor: themeColor("rgba(0,0,0,.8)", 'surface'),
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
  return {ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT, FRAME_STRIPE, FRAME_TITLE, FRAME_HEADING, poolTableStyles, s, themeColor};
});
