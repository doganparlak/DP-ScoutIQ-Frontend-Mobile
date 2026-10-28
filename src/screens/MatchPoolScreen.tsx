import { recordRecentSearch } from '@/services/recentSearches';
import type { MainTabsParamList } from '@/types';
import type { RouteProp } from '@react-navigation/native';
import { readFixtureSearch, writeFixtureSearch, type CachedFixtureSearch } from '@/services/matchPoolCache';
import { getTeamFixtureOptions, searchTeamFixtures, type TeamFixtureOptions } from '@/services/matchPool';
import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import WorkspaceSourceActions from '@/components/WorkspaceSourceActions';
import MatchPortfolioTable from "@/components/MatchPortfolioTable";
import MatchReportActions from "@/components/MatchReportActions";
import PlanDiscoveryNudge from "@/components/PlanDiscoveryNudge";
import TeamSuggestionsOverlay from "@/components/TeamSuggestionsOverlay";
import { TutorialPageGuide } from "@/components/Tutorial";
import { deleteSavedMatch,getMe,type Plan } from "@/services/api";
import { FavoriteMatch } from "@/services/matchPool";
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import {
normalizeSearchText as fold,
optionMatchesSearch,
} from "@/utils/searchSuggestions";
import { useFocusEffect,useNavigation,useRoute } from "@react-navigation/native";
import {
BadgeInfo,
BookMarked,
CalendarSearch,
Goal,
ChevronDown,
ListChecks,
ListFilter,
RotateCcw,
Search,
ShieldCheck,
X,
} from "lucide-react-native";
import React,{ useEffect,useRef,useState } from "react";
import { useTranslation } from "react-i18next";
import {
ActivityIndicator,
Alert,
FlatList,
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
incrementMatchCardPlanNudgeCount,
shouldShowMatchCardPlanNudge,
} from "@/ads/adGating";
import { getThemed_poolTableStyles as __getThemed_table } from "@/components/poolTableStyles";
import {
dateValidation,
effectiveMatchFilters,
EMPTY_MATCH_FILTERS,
fixtureDate,
MatchFilters,
MatchFixture,
MatchOptions,
matchSaveType,
matchScore,
MatchSide,
matchStateLabel,
savedMatches,
saveMatch,
searchMatches,
} from "@/services/matchPool";
import { comparisonSourceShortLabel } from "@/utils/comparisonSourceLabel";
import { shortCountry,shortTeam } from "@/utils/seasonTableLabels";

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
  const themed = useThemedStyles(getModuleTheme);
  const {s, FRAME_STRIPE, FRAME_HEADING, ACCENT, FRAME_TITLE} = themed;

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
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT} = themed;

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
  const themed = useThemedStyles(getModuleTheme);
  const {DANGER, s, ACCENT, BG, MUTED, table, FRAME_TITLE, TEXT} = themed;

  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const ads = useWorkspaceActionAd();
  const nav = useNavigation<any>();
  const route = useRoute<RouteProp<MainTabsParamList, 'MatchPool'>>();
  const { height } = useWindowDimensions();
  const [filters, setFilters] = useState<MatchFilters>(EMPTY_MATCH_FILTERS),
    [options, setOptions] = useState<MatchOptions>({
      countries: [],
      leagues: [],
      teams: [],
    });
  const [retry, setRetry] = useState(0);
  const [teamOptions, setTeamOptions] = useState<TeamFixtureOptions>({leagues: [], teams: []});
  const [leagueId, setLeagueId] = useState<number>();
  const [teamId, setTeamId] = useState<number>();
  const [searchedTeamName, setSearchedTeamName] = useState('');
  const [teamSelector, setTeamSelector] = useState<'league' | 'team' | null>(null);
  const [teamQuery, setTeamQuery] = useState('');
  const [portfolioLeague, setPortfolioLeague] = useState('');
  const [portfolioTeamId, setPortfolioTeamId] = useState<number>();
  const [teamOptionsLoading, setTeamOptionsLoading] = useState(false);
  useEffect(() => {
    if (portfolio) return;
    let active = true;
    setTeamOptionsLoading(true);
    setOptionsError('');
    getTeamFixtureOptions(leagueId).then(value => {
      if (active) setTeamOptions(value);
    }).catch(() => {
      if (active) setOptionsError(tr ? 'Filtreler yüklenemedi. Yeniden deneyin.' : 'Could not load filters. Retry.');
    }).finally(() => { if (active) setTeamOptionsLoading(false); });
    return () => { active = false; };
  }, [leagueId, portfolio, retry]);
  function clearTeamResults() {
    version.current++;
    setLoading(false);
    setError('');
  }
  async function searchTeam(target?: {id:number;name:string;leagueId:number}) {
    const team = target ?? teamOptions.teams.find(t => t.id === teamId);
    const searchedId = target?.id ?? teamId;
    const seasonLeagueId = target?.leagueId ?? leagueId ?? team?.leagueId;
    if (!seasonLeagueId || !searchedId || !team || (!target && (teamOptionsLoading || loading))) return;
    const request = ++version.current;
    setLoading(true);
    setError('');
    try {
      const owner = cacheUser.current ?? (await getMe()).id;
      if (request !== version.current) return;
      cacheUser.current = owner;
      const result = await searchTeamFixtures(seasonLeagueId, searchedId);
      if (request !== version.current) return;
      setRows(result.fixtures);
      setSearchedTeamName(team.name);
      const upcoming = result.fixtures.find(f => new Date(f.startingAt.replace(' ', 'T') + (/Z$|[+-]\d\d:\d\d$/.test(f.startingAt) ? '' : 'Z')).getTime() >= Date.now());
      const matchId = upcoming?.fixtureId ?? result.fixtures[result.fixtures.length - 1]?.fixtureId ?? null;
      setSelectedId(matchId);
      const cached: CachedFixtureSearch = {teamId:searchedId, leagueId:seasonLeagueId, filterLeagueId:target?undefined:leagueId, teamName:team.name, fixtures:result.fixtures, selectedId:matchId};
      lastSearch.current = cached;
      void writeFixtureSearch(owner, cached).then(() => recordRecentSearch(owner, 'fixtures'));
    } catch (e) {
      if (request === version.current) setError(e instanceof Error ? e.message : String(e));
    } finally { if (request === version.current) setLoading(false); }
  }
  const [rows, setRows] = useState<MatchFixture[]>([]),
    [selectedId, setSelectedId] = useState<number | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [optionsError, setOptionsError] = useState("");
  const [saving, setSaving] = useState<number | null>(null),
    [saved, setSaved] = useState<string[]>([]),
    [saveError, setSaveError] = useState("");
  const [selector, setSelector] = useState<"country" | "league" | null>(null),
    [query, setQuery] = useState("");
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
  const cacheUser = useRef<number | null>(null);
  const lastSearch = useRef<CachedFixtureSearch | null>(null);
  const version = useRef(0),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      version.current++;
    };
  }, []);
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
      let restoreVersion = version.current;
      getMe()
        .then(async (me) => {
          if (!active) return;
          if (!portfolio) {
            if (cacheUser.current !== null && cacheUser.current !== me.id) {
              version.current++;restoreVersion=version.current;
              lastSearch.current=null;setRows([]);setSelectedId(null);setSearchedTeamName('');setTeamId(undefined);setLeagueId(undefined);
            }
            cacheUser.current=me.id;
          }
          const nextPlan: Plan =
            me.plan === "No Ads Monthly" || me.plan === "Pro Monthly" || me.plan === "Pro Yearly"
              ? me.plan
              : "Free";
          setPlan(nextPlan);
          setPlanResolved(true);
          if (nextPlan !== "Free") setShowPlanNudge(false);
          if (portfolio) return;
          let defaultFetched=false;
          let cached = lastSearch.current ?? await readFixtureSearch(me.id);
          if (!active || version.current !== restoreVersion || cacheUser.current !== me.id) return;
          if(!cached){
            setLoading(true);
            try{
              const available=await getTeamFixtureOptions();
              if(!active || version.current!==restoreVersion || cacheUser.current!==me.id)return;
              const psg=available.teams.find(team=>fold(team.name).replace(/-/g,' ')==='paris saint germain');
              if(!psg)throw new Error('Default team unavailable');
              const result=await searchTeamFixtures(psg.leagueId,psg.id);
              if(!active || version.current!==restoreVersion || cacheUser.current!==me.id)return;
              const upcoming=result.fixtures.find(f=>new Date(f.startingAt.replace(' ','T')+(/Z$|[+-]\d\d:\d\d$/.test(f.startingAt)?'':'Z')).getTime()>=Date.now());
              cached={isDefault:true,teamId:psg.id,leagueId:psg.leagueId,teamName:psg.name,fixtures:result.fixtures,selectedId:upcoming?.fixtureId??result.fixtures[result.fixtures.length-1]?.fixtureId??null};
              setTeamOptions(available);defaultFetched=true;
              void writeFixtureSearch(me.id,cached);
            }catch(reason){if(active && version.current===restoreVersion)setError(reason instanceof Error?reason.message:String(reason));return;}
            finally{if(active && version.current===restoreVersion)setLoading(false);}
          }
          if (!lastSearch.current) {
            lastSearch.current=cached;
            setRows(cached.fixtures);setSelectedId(cached.selectedId);setSearchedTeamName(cached.teamName);
            setTeamId(cached.teamId);setLeagueId(cached.filterLeagueId);
          }
          if(defaultFetched)return;
          try {
            const fresh=await searchTeamFixtures(cached.leagueId,cached.teamId);
            if (!active || version.current !== restoreVersion || cacheUser.current !== me.id) return;
            const selection=lastSearch.current?.selectedId ?? null;
            const matchId=fresh.fixtures.some(f=>f.fixtureId===selection)?selection:fresh.fixtures[0]?.fixtureId??null;
            const updated={...cached,fixtures:fresh.fixtures,selectedId:matchId};
            lastSearch.current=updated;
            setRows(fresh.fixtures);setSelectedId(matchId);
            void writeFixtureSearch(me.id,updated);
          } catch { /* Keep cached fixtures if background refresh is unavailable. */ }
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
    const target = route.params?.fixtureTeam;
    if (portfolio || !target) return;
    let active = true;
    const request = ++version.current;
    setLoading(true);setError('');
    void (async () => {
      try {
        const available = await getTeamFixtureOptions();
        if (!active || version.current !== request) return;
        const team = available.teams.find(t => t.id === Number(target.id));
        if (!team) throw new Error('This team is unavailable for fixture search.');
        setTeamOptions(available);setTeamId(team.id);setLeagueId(undefined);
        await searchTeam(team);
      } catch (e) {
        if (active && version.current === request) {setError(e instanceof Error?e.message:String(e));setLoading(false);}
      }
    })();
    return () => {active=false;};
  }, [route.params?.fixtureRequest, portfolio]);
  const portfolioFixtures = React.useMemo(
    () =>
      Array.from(
        new Map(
          favorites.map((f) => [f.fixture.fixtureId, f.fixture]),
        ).values(),
      ),
    [favorites],
  );
  const portfolioLeagues = Array.from(new Map(portfolioFixtures.map(f=>[
    JSON.stringify([f.country.name,f.league.name]), {key:JSON.stringify([f.country.name,f.league.name]),name:`${f.country.name || '—'} | ${f.league.name}`},
  ])).values()).sort((a,b)=>a.name.localeCompare(b.name));
  const leagueFixtures = portfolioFixtures.filter(f=>!portfolioLeague || JSON.stringify([f.country.name,f.league.name])===portfolioLeague);
  const portfolioTeams = Array.from(new Map(leagueFixtures.flatMap(f=>[f.homeTeam,f.awayTeam]).map(team=>[team.id,{key:String(team.id),name:team.name}])).values()).sort((a,b)=>a.name.localeCompare(b.name));
  const portfolioChoices = (teamSelector==='league'?portfolioLeagues:portfolioTeams).filter(item=>optionMatchesSearch(item.name,fold(teamQuery)));
  const visibleRows = portfolio
    ? leagueFixtures.filter(f=>!portfolioTeamId || f.homeTeam.id===portfolioTeamId || f.awayTeam.id===portfolioTeamId)
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
    if (!portfolio && lastSearch.current && cacheUser.current !== null) {
      lastSearch.current={...lastSearch.current,selectedId:fixture.fixtureId};
      void writeFixtureSearch(cacheUser.current,lastSearch.current);
    }
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
  const widths = [1.65, 1.3, 1.15, 0.6];
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        ref={pageScroll}
        onScrollBeginDrag={() => setTeamFocus(null)}
        style={{ flex: 1, backgroundColor: BG }}
        contentContainerStyle={s.page}
        keyboardShouldPersistTaps="handled"
      >
        {!portfolio ? <Frame title={tr ? 'Takım Fikstür Filtreleri' : 'Team Fixture Filters'} Icon={ListFilter}
          action={<Pressable accessibilityLabel={tr ? 'Filtreleri temizle' : 'Clear filters'} hitSlop={12} onPress={() => {setLeagueId(undefined);setTeamId(undefined);setRetry(v=>v+1);clearTeamResults();}}><RotateCcw size={20} color={DANGER}/></Pressable>}>
          <View style={s.fields}>
            {(['team', 'league'] as const).map(key => {
              const label = key === 'league' ? (tr ? 'Lig' : 'League') : (tr ? 'Takım' : 'Team');
              const league = teamOptions.leagues.find(l => l.id === leagueId);
              const value = key === 'league' ? (league ? `${league.country || '—'} | ${league.name}` : '') : teamOptions.teams.find(t => t.id === teamId)?.name;
              const disabled = teamOptionsLoading;
              return <View key={key} style={s.field}><Text style={s.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled}} disabled={disabled} style={[s.inputRow,disabled && s.disabled]} onPress={()=>{setTeamQuery('');setTeamSelector(key);}}><Text numberOfLines={1} style={[s.text,{flex:1,padding:10,color:value?TEXT:MUTED}]}>{value || (key === 'league' ? (tr ? 'Tüm ligler' : 'All leagues') : (tr ? 'Takım seçin' : 'Select team'))}</Text><ChevronDown size={16} color={MUTED} style={{marginRight:10}}/></Pressable></View>;
            })}
          </View>
          <Text style={[s.text,{color:MUTED,marginVertical:10}]}>{tr ? 'Tüm organizasyonlardaki maçlar.' : 'Fixtures across all competitions.'}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{disabled:!teamId || loading || teamOptionsLoading}} disabled={!teamId || loading || teamOptionsLoading} style={[s.button,(!teamId || loading || teamOptionsLoading) && s.disabled]} onPress={()=>void searchTeam()}>{loading ? <ActivityIndicator color={ACCENT}/> : <Search size={18} color={ACCENT}/>}<Text style={s.green}>{loading ? (tr?'Aranıyor':'Searching') : (tr?'Fikstürü göster':'Show fixtures')}</Text></Pressable>
          {teamOptionsLoading && <ActivityIndicator color={ACCENT}/>}
          {!!optionsError && <Pressable onPress={()=>setRetry(v=>v+1)}><Text style={s.error}>{optionsError}</Text></Pressable>}
          {!!error && <Text style={s.error}>{error}</Text>}
        </Frame> : (
        <Frame title={tr?'Maç Filtreleri':'Match Filters'} Icon={ListFilter}
          action={<Pressable accessibilityRole="button" accessibilityLabel={tr?'Filtreleri temizle':'Clear filters'} hitSlop={12} onPress={()=>{setPortfolioLeague('');setPortfolioTeamId(undefined);}}><RotateCcw size={20} color={DANGER}/></Pressable>}>
          <View style={s.fields}>
            {(['team','league'] as const).map(key=>{
              const label=key==='team'?(tr?'Takım':'Team'):(tr?'Lig':'League');
              const value=key==='team'?portfolioTeams.find(team=>Number(team.key)===portfolioTeamId)?.name:portfolioLeagues.find(league=>league.key===portfolioLeague)?.name;
              return <View key={key} style={s.field}><Text style={s.label}>{label}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={portfolioLoading} accessibilityState={{disabled:portfolioLoading}} style={[s.inputRow,portfolioLoading&&s.disabled]} onPress={()=>{setTeamQuery('');setTeamSelector(key);}}>
                  <Text numberOfLines={1} style={[s.text,{flex:1,padding:10,color:value?TEXT:MUTED}]}>{value || (key==='team'?(tr?'Takım seçin':'Select team'):(tr?'Tüm ligler':'All leagues'))}</Text><ChevronDown size={16} color={MUTED} style={{marginRight:10}}/>
                </Pressable>
              </View>;
            })}
          </View>
          {!!error && <Pressable onPress={()=>setRetry(n=>n+1)}><Text style={s.error}>{error}</Text><Text style={s.green}>{tr?'Tekrar Dene':'Retry'}</Text></Pressable>}
        </Frame>
        )}
        <TutorialPageGuide page={portfolio ? "matchPortfolio" : "matchPool"} frame={0} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <Frame
          title={
            portfolio
              ? tr
                ? "Maç Portföyü"
                : "Match Portfolio"
              : tr
                ? (searchedTeamName ? `${searchedTeamName} Fikstürü` : "Takım Fikstürü")
                : (searchedTeamName ? `${searchedTeamName} Fixtures` : "Team Fixtures")
          }
          Icon={ListChecks}
          headingGap={portfolio ? 10 : 16}
        >
          {portfolio ? (!portfolioLoading && !portfolioFixtures.length && !error ? <View style={{gap:16}}>
            <Text style={{color:MUTED,fontSize:14,lineHeight:21}}>{tr?'Maçları keşfet, takip etmek istediklerini portföyüne ekle.':'Discover matches and add the ones you want to follow to your portfolio.'}</Text>
            <WorkspaceSourceActions compact sources={[
              {label:tr?'Maç Havuzu':'Match Pool',Icon:CalendarSearch,onPress:()=>nav.navigate('MatchPool')},
              {label:tr?'Skor Tahmin Ligi':'Score Prediction League',Icon:Goal,onPress:()=>nav.navigate('ScorePrediction')},
            ]}/>
          </View> : <MatchPortfolioTable
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
                    ? ["Maç Adı", "Lig", "Zaman", "Skor"]
                    : ["Match Name", "League", "Time", "Score"]
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
                          `${shortCountry(f.country.name)}|${comparisonSourceShortLabel({
                            competition: f.league.name,
                            team: "",
                          })}`,
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
                        : "Select a team and press Search to view its fixtures."}
                    </Text>
                  )}
                </ScrollView>
              </View>
            </>
          )}
        </Frame>
        {!portfolio && <TutorialPageGuide page="matchPool" frame={1} onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />}
        {!portfolio && matchCard}
        {portfolio && teamSelector && <Modal visible transparent animationType="fade" onRequestClose={()=>setTeamSelector(null)}>
          <View style={s.backdrop}><View style={[s.modal,{maxHeight:height*.8}]}>
            <View style={s.cardHeading}><Text style={[FRAME_TITLE,{flex:1}]}>{teamSelector==='team'?(tr?'Takım':'Team'):(tr?'Lig':'League')}</Text><Pressable accessibilityRole="button" accessibilityLabel={tr?'Kapat':'Close'} hitSlop={12} onPress={()=>setTeamSelector(null)}><X size={22} color={DANGER}/></Pressable></View>
            <TextInput value={teamQuery} onChangeText={setTeamQuery} placeholder={tr?'Ara':'Search'} accessibilityLabel={tr?'Seçenek ara':'Search options'} placeholderTextColor={MUTED} style={[s.inputRow,s.inputText,{marginVertical:12,flex:undefined}]}/>
            <FlatList data={portfolioChoices} keyExtractor={item=>item.key} initialNumToRender={15} maxToRenderPerBatch={15} windowSize={5} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}}
              ListHeaderComponent={<Pressable style={s.option} onPress={()=>{if(teamSelector==='league'){setPortfolioLeague('');setPortfolioTeamId(undefined);}else setPortfolioTeamId(undefined);setTeamSelector(null);}}><Text style={s.green}>{teamSelector==='league'?(tr?'Tüm ligler':'All leagues'):(tr?'Tüm takımlar':'All teams')}</Text></Pressable>}
              ListEmptyComponent={<Text style={s.empty}>{tr?'Sonuç bulunamadı.':'No results found.'}</Text>}
              renderItem={({item})=>{const active=item.key===(teamSelector==='league'?portfolioLeague:String(portfolioTeamId));return <Pressable accessibilityRole="radio" accessibilityState={{selected:active}} style={[s.option,active&&s.filterSelected]} onPress={()=>{if(teamSelector==='league'){setPortfolioLeague(item.key);setPortfolioTeamId(undefined);}else setPortfolioTeamId(Number(item.key));setTeamSelector(null);}}><Text style={s.text}>{item.name}</Text></Pressable>;}}/>
          </View></View>
        </Modal>}
        {!portfolio && teamSelector && <Modal visible transparent animationType="fade" onRequestClose={()=>setTeamSelector(null)}><View style={s.backdrop}><View style={[s.modal,{maxHeight:height*.8}]}>
          <View style={s.cardHeading}><Text style={[FRAME_TITLE,{flex:1}]}>{teamSelector === 'league' ? (tr?'Lig':'League') : (tr?'Takım':'Team')}</Text><Pressable hitSlop={12} onPress={()=>setTeamSelector(null)}><X size={22} color={DANGER}/></Pressable></View>
          <TextInput value={teamQuery} onChangeText={setTeamQuery} placeholder={tr?'Ara':'Search'} placeholderTextColor={MUTED} style={[s.inputRow,{padding:12,color:TEXT,marginVertical:12}]}/>
          <FlatList data={(teamSelector === 'league' ? teamOptions.leagues.map(l=>({id:l.id,name:`${l.country || '—'} | ${l.name}`})) : teamOptions.teams).filter(v=>optionMatchesSearch(v.name,fold(teamQuery)))} keyExtractor={v=>String(v.id)} initialNumToRender={15} maxToRenderPerBatch={15} windowSize={5} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}} ListHeaderComponent={teamSelector === 'league' ? <Pressable style={s.option} onPress={()=>{setLeagueId(undefined);clearTeamResults();setTeamSelector(null);}}><Text style={s.green}>{tr?'Tüm ligler':'All leagues'}</Text></Pressable> : null} ListEmptyComponent={<Text style={s.empty}>{tr?'Sonuç bulunamadı.':'No results found.'}</Text>} renderItem={({item})=><Pressable accessibilityRole="radio" accessibilityState={{selected:item.id === (teamSelector==='league'?leagueId:teamId)}} style={[s.option,item.id === (teamSelector==='league'?leagueId:teamId) && s.filterSelected]} onPress={()=>{clearTeamResults();if(teamSelector==='league'){setLeagueId(item.id);setTeamId(undefined);}else {const team=teamOptions.teams.find(t=>t.id===item.id);if(team){setTeamId(team.id);}}setTeamSelector(null);}}><Text style={s.text}>{item.name}</Text></Pressable>}/>
        </View></View></Modal>}
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
                  contentContainerStyle={{gap:8}}
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
                      accessibilityRole="radio"
                      accessibilityState={{selected:filters[selector] === item}}
                      style={[
                        s.option,
                        filters[selector] === item && s.filterSelected,
                      ]}
                      onPress={() => {
                        update(selector, item);
                        setSelector(null);
                      }}
                    >
                      <Text style={[s.text,{fontWeight:"700"}]}>{item}</Text>
                    </Pressable>
                  )}
                />
              </View>
            </View>
          </Modal>
        )}
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


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT, FRAME_STRIPE, FRAME_HEADING, FRAME_TITLE, themeColor} = colors;
  const table = __getThemed_table(colors);
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
    gap: 4,
    alignItems: "center",
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    padding: 7,
    maxWidth: 200,
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
    backgroundColor: themeColor("rgba(22,163,74,.08)", 'surface'),
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
    backgroundColor: themeColor("rgba(0,0,0,.8)", 'surface'),
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
  filterSelected: {borderColor:ACCENT,backgroundColor:themeColor("rgba(22,163,74,0.12)", 'surface')},
  chipText: {color:ACCENT,fontSize:11,fontWeight:"800",flexShrink:1},
  option: {padding:14,minHeight:44,borderRadius:12,borderWidth:1,borderColor:LINE,backgroundColor:CARD},
});
  return {ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT, FRAME_STRIPE, FRAME_HEADING, FRAME_TITLE, table, s, themeColor};
});
