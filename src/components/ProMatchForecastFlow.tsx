import React from 'react';
import {ActivityIndicator, FlatList, Image, Modal, Pressable, ScrollView, Text, TextInput, View} from 'react-native';
import {CalendarDays, CalendarSearch, ChartNoAxesCombined, Check, ChevronDown, ChevronRight, RotateCcw, Search, ShieldCheck, Trophy, X} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {createThemedStyles, useThemedStyles, type ThemeColors} from '@/theme';
import {getTeamFixtureOptions, searchTeamFixtures, type MatchFixture, type MatchForecastResponse, type TeamFixtureOptions} from '@/services/matchPool';
import {getProForecastAccess, readProForecastSearch, unlockProForecast, writeProForecastSearch, type ProForecastSearch} from '@/services/proMatchForecast';
import {normalizeSearchText, optionMatchesSearch} from '@/utils/searchSuggestions';
import {predictionDateTime} from '@/utils/predictionPresentation';
import PreMatchForecast from './PreMatchForecast';
import {TutorialPageGuide} from './Tutorial';

const starts = (value: string) => new Date(value.replace(' ', 'T') + (/Z$|[+-]\d\d:\d\d$/.test(value) ? '' : 'Z')).getTime();
const upcoming = (fixture: MatchFixture) => ['NS', 'TBA'].includes(fixture.state?.code?.toUpperCase()) && starts(fixture.startingAt) > Date.now();

export default function ProMatchForecastFlow({userId, disabled=false, preview=false, onOpenPlans, onAccessRequired, onCreditsChanged, onBusyChange}: {
  userId: number; disabled?: boolean; preview?: boolean; onOpenPlans: () => void; onAccessRequired: () => void;
  onCreditsChanged: () => void; onBusyChange: (busy: boolean) => void;
}) {
  const {s, PURPLE, MUTED, TEXT} = useThemedStyles(getTheme);
  const {i18n} = useTranslation(), tr = i18n.language.startsWith('tr');
  const [options, setOptions] = React.useState<TeamFixtureOptions>({teams: [], leagues: []});
  const [leagueId, setLeagueId] = React.useState<number>();
  const [teamId, setTeamId] = React.useState<number>();
  const [teamName, setTeamName] = React.useState('');
  const [fixtures, setFixtures] = React.useState<MatchFixture[]>([]);
  const [selected, setSelected] = React.useState<MatchFixture | null>(null);
  const [forecast, setForecast] = React.useState<MatchForecastResponse>();
  const [selector, setSelector] = React.useState<'league'|'team'|null>(null), [query, setQuery] = React.useState('');
  const [optionsLoading, setOptionsLoading] = React.useState(true), [loading, setLoading] = React.useState(false), [checking, setChecking] = React.useState(false), [opening, setOpening] = React.useState(false);
  const [error, setError] = React.useState(''), [accessError, setAccessError] = React.useState(''), [retry, setRetry] = React.useState(0), [searched, setSearched] = React.useState(false), [hydrated, setHydrated] = React.useState(false), [limit, setLimit] = React.useState(10);
  const mounted = React.useRef(true), generation = React.useRef(0), searchGeneration = React.useRef(0), openingRef = React.useRef(false);
  const callbacks = React.useRef({onBusyChange, onCreditsChanged}); callbacks.current = {onBusyChange, onCreditsChanged};
  const lastSearch = React.useRef<ProForecastSearch | null>(null);
  React.useEffect(() => {mounted.current = true; return () => {mounted.current = false; generation.current++; searchGeneration.current++; callbacks.current.onBusyChange(false);};}, []);
  React.useEffect(() => {
    let alive = true;
    readProForecastSearch(userId).then(saved => {
      if (!alive || !saved || lastSearch.current) return;
      lastSearch.current = saved; setLeagueId(saved.leagueId); setTeamId(saved.teamId); setTeamName(saved.teamName); setFixtures(saved.fixtures); setSearched(true);
      setSelected(saved.fixtures.find(f => f.fixtureId === saved.selectedId) || null);
    }).finally(() => {if (alive) setHydrated(true);});
    return () => {alive = false;};
  }, [userId]);
  React.useEffect(() => {
    let alive = true; setOptionsLoading(true); setError('');
    getTeamFixtureOptions(leagueId).then(value => {if (alive) setOptions(value);}).catch(() => {if (alive) setError(tr ? 'Takım ve ligler yüklenemedi.' : 'Could not load teams and leagues.');}).finally(() => {if (alive) setOptionsLoading(false);});
    return () => {alive = false;};
  }, [leagueId, retry, tr]);
  React.useEffect(() => {
    const token = ++generation.current; setForecast(undefined); setAccessError('');
    if (!selected) {setChecking(false); return;}
    setChecking(true);
    getProForecastAccess(selected.fixtureId).then(result => {
      if (!mounted.current || token !== generation.current) return;
      if (result.status === 'ready' && result.unlocked) setForecast({...result, status: 'ready'});
    }).catch(() => {if (mounted.current && token === generation.current) setAccessError(tr ? 'Öngörü erişimi kontrol edilemedi.' : 'Could not check forecast access.');}).finally(() => {if (mounted.current && token === generation.current) setChecking(false);});
    return () => {generation.current++;};
  }, [selected?.fixtureId, tr]);
  function clearResults() {searchGeneration.current++; setLoading(false); setSelected(null); setFixtures([]); setSearched(false); setError('');}
  function choose(fixture: MatchFixture) {
    if (openingRef.current) return;
    setForecast(undefined); setSelected(fixture);
    if (lastSearch.current) {lastSearch.current = {...lastSearch.current, selectedId: fixture.fixtureId}; void writeProForecastSearch(userId, lastSearch.current);}
  }
  async function search() {
    if (!teamId || openingRef.current) return;
    const team = options.teams.find(t => t.id === teamId);
    if (!team) return;
    const token = ++searchGeneration.current; setLoading(true); setError(''); setSelected(null);
    try {
      const result = await searchTeamFixtures(team.leagueId, team.id);
      if (!mounted.current || token !== searchGeneration.current) return;
      const future = result.fixtures.filter(upcoming).sort((a,b) => starts(a.startingAt)-starts(b.startingAt));
      setFixtures(future); setTeamName(team.name); setSearched(true); setLimit(10);
      lastSearch.current = {leagueId, teamId: team.id, teamName: team.name, fixtures: future, selectedId: null};
      void writeProForecastSearch(userId, lastSearch.current);
    } catch {if (mounted.current && token === searchGeneration.current) setError(tr ? 'Maçlar yüklenemedi. Yeniden dene.' : 'Could not load fixtures. Try again.');}
    finally {if (mounted.current && token === searchGeneration.current) setLoading(false);}
  }
  async function openForecast() {
    if (!selected || openingRef.current) return;
    if (preview) {onAccessRequired(); return;}
    const token = generation.current, fixtureId = selected.fixtureId;
    openingRef.current = true; setOpening(true); setAccessError(''); callbacks.current.onBusyChange(true);
    try {
      const deadline = Date.now()+180000;
      while (mounted.current && token === generation.current) {
        const result = await unlockProForecast(fixtureId);
        if (!mounted.current || token !== generation.current) return;
        if (result.status === 'ready' && result.unlocked) {
          setForecast({...result, status:'ready'}); callbacks.current.onCreditsChanged(); return;
        }
        if (result.status !== 'processing') {
          setAccessError(result.reason === 'model_unavailable' ? (tr ? 'Bu maç için henüz uygun bir öngörü modeli yok. Kredi kullanılmadı.' : 'No suitable forecast model is available yet. No credit was used.') : (tr ? 'Bu maç için yeterli veri bulunmuyor. Kredi kullanılmadı.' : 'There is not enough data for this match. No credit was used.')); return;
        }
        if (Date.now() >= deadline) {setAccessError(tr ? 'Öngörü hazırlanıyor. Biraz sonra yeniden dene.' : 'The forecast is being prepared. Please try again shortly.'); return;}
        await new Promise(resolve => setTimeout(resolve, 2500));
      }
    } catch (reason) {
      if (!mounted.current || token !== generation.current) return;
      if (String(reason).includes('CHAT_TRIAL_EXHAUSTED')) onAccessRequired();
      else setAccessError(String(reason).includes('FORECAST_MATCH_STARTED') ? (tr ? 'Maç başladı. Başka bir maç seç.' : 'The match has started. Choose another fixture.') : (tr ? 'Öngörü açılamadı. Yeniden dene; aynı maç için tekrar kredi alınmaz.' : 'Could not open the forecast. Retry; the same match is never charged twice.'));
    } finally {openingRef.current = false; if (mounted.current) setOpening(false); callbacks.current.onBusyChange(false);}
  }
  const busy = opening || loading, blocked = disabled || busy || !hydrated;
  const visible = fixtures.filter(upcoming);
  const league = options.leagues.find(l => l.id === leagueId);
  const choices = (selector === 'league' ? options.leagues.map(l => ({id:l.id,name:`${l.country || '—'} | ${l.name}`})) : options.teams).filter(item => optionMatchesSearch(item.name, normalizeSearchText(query)));
  return <View style={s.flow}>
    {!forecast && <>
    <View style={s.fields}>{(['league','team'] as const).map(field => <View key={field} style={s.field}>
      <Text style={s.label}>{field==='league'?(tr?'Lig':'League'):(tr?'Takım':'Team')}</Text>
      <Pressable accessibilityRole="button" disabled={blocked || optionsLoading} style={[s.input, (blocked || optionsLoading) && s.disabled]} onPress={() => {setQuery(''); setSelector(field);}}>
        <Text numberOfLines={1} style={[s.inputText, {color: (field==='league'?league:teamId) ? TEXT : MUTED}]}>{field==='league' ? (league?`${league.country || '—'} | ${league.name}`:(tr?'Tüm ligler':'All leagues')) : (options.teams.find(t=>t.id===teamId)?.name || teamName || (tr?'Takım seç':'Select team'))}</Text><ChevronDown size={16} color={PURPLE}/>
      </Pressable>
    </View>)}</View>
    <Text style={s.hint}>{tr?'Takımın tüm organizasyonlardaki yaklaşan maçları.':'Upcoming fixtures across all of the team’s competitions.'}</Text>
    <View style={s.actions}><Pressable accessibilityRole="button" disabled={blocked || !teamId || optionsLoading} onPress={()=>void search()} style={[s.button, (blocked || !teamId || optionsLoading) && s.disabled]}>{loading?<ActivityIndicator color={PURPLE}/>:<Search size={16} color={PURPLE}/>}<Text style={s.buttonText}>{tr?'Maçları Göster':'Show Matches'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={tr?'Filtreleri temizle':'Clear filters'} disabled={blocked} onPress={()=>{setLeagueId(undefined);setTeamId(undefined);setTeamName('');clearResults();}} style={s.reset}><RotateCcw size={18} color={PURPLE}/></Pressable></View>
    {optionsLoading && <ActivityIndicator color={PURPLE}/>}
    {!!error && <View style={{gap:8}}><Text style={s.hint}>{error}</Text><Pressable accessibilityRole="button" onPress={()=>setRetry(n=>n+1)}><Text style={s.buttonText}>{tr?'Yeniden Dene':'Retry'}</Text></Pressable></View>}
    {searched && !loading && <View style={s.fixtures}><Text style={s.label}>{tr?'Maç Seçimi':'Select Match'}</Text>
      {!visible.length ? <Text style={s.hint}>{tr?'Bu takım için yaklaşan maç bulunamadı.':'No upcoming fixtures found for this team.'}</Text> : <ScrollView nestedScrollEnabled style={{maxHeight:320}} contentContainerStyle={{gap:8}}>{visible.slice(0,limit).map(fixture=><Pressable key={fixture.fixtureId} accessibilityRole="radio" accessibilityState={{selected:selected?.fixtureId===fixture.fixtureId}} disabled={blocked} onPress={()=>choose(fixture)} style={[s.fixture, selected?.fixtureId===fixture.fixtureId && s.selected]}><View style={{flex:1,gap:5}}><Text style={s.fixtureName}>{fixture.homeTeam.name} – {fixture.awayTeam.name}</Text><Text style={s.hint}>{fixture.league.name} · {predictionDateTime(fixture.startingAt,tr)}</Text></View>{selected?.fixtureId===fixture.fixtureId?<Check size={18} color={PURPLE}/>:<ChevronRight size={18} color={MUTED}/>}</Pressable>)}{visible.length>limit&&<Pressable accessibilityRole="button" onPress={()=>setLimit(n=>n+10)} style={s.button}><Text style={s.buttonText}>{tr?'Daha Fazla Maç':'More Matches'}</Text></Pressable>}</ScrollView>}
    </View>}
    </>}
    <TutorialPageGuide page="proForecast" frame={1} summaryLines={0}/>
    {selected && <View style={s.match}>
      <View style={s.matchCard}>
        <View style={s.matchHeading}>
          <Text style={s.matchTitle}>{tr?'Seçilen Maç':'Selected Match'}</Text>
          {!!forecast && <Pressable accessibilityRole="button" onPress={()=>{setSelected(null);setForecast(undefined);}} style={s.changeMatch}><CalendarSearch size={16} color={PURPLE}/><Text style={s.buttonText}>{tr?'Maçı Değiştir':'Change Match'}</Text></Pressable>}
        </View>
        {!forecast ? <View style={s.teams}>
          {[selected.homeTeam,selected.awayTeam].map((team,index)=><React.Fragment key={team.id}>
            {index===1&&<View style={s.versus}><Text style={s.versusText}>VS</Text></View>}
            <View style={s.team}><View style={s.crestWrap}>{team.imageUrl?<Image source={{uri:team.imageUrl}} style={s.crest} resizeMode="contain"/>:<ShieldCheck size={38} color={PURPLE}/>}</View><Text style={s.teamName}>{team.name}</Text></View>
          </React.Fragment>)}
        </View> : <Text style={s.selectedMatchName}>{selected.homeTeam.name} – {selected.awayTeam.name}</Text>}
        <View style={s.matchMetadata}>
          <View style={s.leagueBadge}><Trophy size={14} color={PURPLE}/><Text style={s.leagueName}>{selected.league.name}</Text></View>
          <View style={s.kickoff}><CalendarDays size={14} color={MUTED}/><Text style={s.kickoffText}>{predictionDateTime(selected.startingAt,tr)}</Text></View>
        </View>
        {checking?<ActivityIndicator color={PURPLE}/>:!forecast?<>
          <Text style={s.hint}>{tr?'İlk açılışta 1 kredi kullanılır. Bu maçı tekrar açmak ücretsizdir.':'Opening costs 1 credit. Reopening this match is free.'}</Text>
          <Pressable accessibilityRole="button" disabled={blocked || !upcoming(selected)} style={[s.button,(blocked || !upcoming(selected))&&s.disabled]} onPress={()=>void openForecast()}>{opening?<ActivityIndicator color={PURPLE}/>:<ChartNoAxesCombined size={18} color={PURPLE}/>}<Text style={s.buttonText}>{opening?(tr?'Hazırlanıyor…':'Preparing…'):(tr?'Öngörüyü Aç':'Open Forecast')}</Text></Pressable>
          {!upcoming(selected)&&<Text style={s.hint}>{tr?'Bu maç başladı. Yeni bir öngörü için yaklaşan bir maç seç.':'This match has started. Select an upcoming fixture for a new forecast.'}</Text>}
        </>:null}
        {!!accessError&&<Text accessibilityLiveRegion="polite" style={s.hint}>{accessError}</Text>}
      </View>
      {!!forecast&&!checking&&<PreMatchForecast key={selected.fixtureId} fixtureId={selected.fixtureId} active tr={tr} free={false} onOpenPlans={onOpenPlans} providedForecast={forecast}/>}
    </View>}
    <Modal transparent visible={!!selector} animationType="fade" onRequestClose={()=>setSelector(null)}><View style={s.backdrop}><View style={s.modal}>
      <View style={s.modalHeading}><Text style={s.title}>{selector==='league'?(tr?'Lig':'League'):(tr?'Takım':'Team')}</Text><Pressable accessibilityRole="button" accessibilityLabel={tr?'Kapat':'Close'} onPress={()=>setSelector(null)} hitSlop={10}><X size={22} color={MUTED}/></Pressable></View>
      <TextInput value={query} onChangeText={setQuery} placeholder={tr?'Ara…':'Search…'} placeholderTextColor={MUTED} style={[s.input,{color:TEXT}]} autoCorrect={false}/>
      <FlatList keyboardShouldPersistTaps="handled" data={choices} keyExtractor={item=>String(item.id)} initialNumToRender={20} ListHeaderComponent={selector==='league'?<Pressable style={s.option} onPress={()=>{setLeagueId(undefined);clearResults();setSelector(null);}}><Text style={s.buttonText}>{tr?'Tüm ligler':'All leagues'}</Text></Pressable>:null} ListEmptyComponent={<Text style={s.hint}>{tr?'Sonuç bulunamadı.':'No results found.'}</Text>} renderItem={({item})=><Pressable accessibilityRole="radio" accessibilityState={{selected:item.id===(selector==='league'?leagueId:teamId)}} style={s.option} onPress={()=>{clearResults();if(selector==='league'){setLeagueId(item.id);setTeamId(undefined);setTeamName('');}else{setTeamId(item.id);setTeamName(item.name);}setSelector(null);}}><Text style={s.inputText}>{item.name}</Text></Pressable>}/>
    </View></View></Modal>
  </View>;
}

const getTheme=createThemedStyles((c:ThemeColors)=>{
 const {CARD,LINE,TEXT,MUTED,PANEL,themeColor}=c, PURPLE=themeColor('#A78BFA','text');
 const s={flow:{gap:14},fields:{flexDirection:'row' as const,gap:10},field:{flex:1,minWidth:0,gap:6},label:{color:TEXT,fontSize:13,fontWeight:'800' as const},hint:{color:MUTED,fontSize:12,lineHeight:19},input:{borderWidth:1,borderColor:LINE,borderRadius:12,padding:11,minHeight:46,flexDirection:'row' as const,alignItems:'center' as const,gap:6,backgroundColor:CARD},inputText:{flex:1,minWidth:0,color:TEXT,fontSize:13},actions:{flexDirection:'row' as const,gap:10},button:{flex:1,minHeight:46,borderWidth:1,borderColor:PURPLE,borderRadius:12,padding:11,flexDirection:'row' as const,alignItems:'center' as const,justifyContent:'center' as const,gap:8,backgroundColor:themeColor('rgba(167,139,250,.08)','surface')},buttonText:{color:PURPLE,fontSize:12,fontWeight:'800' as const,textAlign:'center' as const,flexShrink:1},reset:{padding:12,justifyContent:'center' as const},disabled:{opacity:.45},fixtures:{gap:10},fixture:{borderWidth:1,borderColor:LINE,borderRadius:12,padding:12,flexDirection:'row' as const,alignItems:'center' as const,gap:8,backgroundColor:CARD},selected:{borderColor:PURPLE,backgroundColor:themeColor('rgba(167,139,250,.08)','surface')},fixtureName:{color:TEXT,fontSize:13,lineHeight:19,fontWeight:'700' as const},match:{gap:16},
 matchCard:{borderWidth:1,borderColor:`${PURPLE}60`,borderRadius:18,padding:14,gap:15,backgroundColor:themeColor('rgba(167,139,250,.04)','surface')},
 matchHeading:{flexDirection:'row' as const,alignItems:'center' as const,justifyContent:'space-between' as const,flexWrap:'wrap' as const,gap:10},matchTitle:{color:PURPLE,fontSize:12,fontWeight:'800' as const},
 changeMatch:{minHeight:38,borderWidth:1,borderColor:`${PURPLE}50`,borderRadius:10,paddingHorizontal:9,paddingVertical:7,flexDirection:'row' as const,alignItems:'center' as const,gap:6},
 teams:{flexDirection:'row' as const,alignItems:'flex-start' as const,gap:10},team:{flex:1,minWidth:0,alignItems:'center' as const,gap:9},crestWrap:{width:60,height:60,borderRadius:17,backgroundColor:CARD,alignItems:'center' as const,justifyContent:'center' as const},crest:{width:48,height:48},teamName:{color:TEXT,fontSize:14,lineHeight:20,fontWeight:'800' as const,textAlign:'center' as const},
 versus:{height:60,justifyContent:'center' as const},versusText:{color:MUTED,fontSize:11,fontWeight:'800' as const},selectedMatchName:{color:TEXT,fontSize:14,lineHeight:21,fontWeight:'800' as const},
 matchMetadata:{borderTopWidth:1,borderTopColor:LINE,paddingTop:12,gap:9},leagueBadge:{alignSelf:'flex-start' as const,flexDirection:'row' as const,alignItems:'center' as const,gap:6,borderRadius:8,paddingVertical:5,paddingHorizontal:8,backgroundColor:themeColor('rgba(167,139,250,.10)','surface')},leagueName:{color:PURPLE,fontSize:11,lineHeight:16,fontWeight:'700' as const,flexShrink:1},kickoff:{flexDirection:'row' as const,alignItems:'center' as const,gap:7},kickoffText:{color:MUTED,fontSize:11,lineHeight:17,flexShrink:1},backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.65)',padding:20,justifyContent:'center' as const},modal:{maxHeight:'80%' as const,borderRadius:20,borderWidth:1,borderColor:PURPLE,backgroundColor:PANEL,padding:16,gap:14},modalHeading:{flexDirection:'row' as const,alignItems:'center' as const,justifyContent:'space-between' as const},title:{fontSize:18,color:TEXT,fontWeight:'800' as const},option:{paddingVertical:13,borderBottomWidth:1,borderBottomColor:LINE}};
 return{s,PURPLE,MUTED,TEXT};
});
