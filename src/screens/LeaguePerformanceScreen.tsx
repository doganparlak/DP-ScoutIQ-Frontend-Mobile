import { LeagueCard } from './LeaguePoolScreen';
import { searchLeagues } from '@/services/leaguePool';
import type { SearchResultRow } from '@/components/CandidatePlayers';
import { getMe } from '@/services/api';
import { readLeaguePerformance, writeLeaguePerformance, type CachedLeaguePerformance } from '@/services/leaguePerformanceCache';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Table2,Trophy } from 'lucide-react-native';
import React from 'react';
import { useFocusEffect,useNavigation,useRoute,type RouteProp } from '@react-navigation/native';
import type { MainTabsParamList } from '@/types';
import { useTranslation } from 'react-i18next';
import { Pressable,ScrollView,StyleSheet,Text,useWindowDimensions,View } from 'react-native';
import { getThemed_styles as __getThemed_shared,Action,SelectField,Selector,Status } from '@/components/LeaguePerformanceControls';
import LeagueKnockoutRounds from '@/components/LeagueKnockoutRounds';
import LeaguePerformanceStandings from '@/components/LeaguePerformanceStandings';
import WorkspaceSourceActions from '@/components/WorkspaceSourceActions';
import { TutorialPageGuide } from '@/components/Tutorial';
import { getLeagueStandings,searchLeaguePerformance,type LeagueResult,type LeagueStandings,type LeagueScope } from '@/services/leaguePerformance';

function Section({title,children,action,Icon=Table2}: {title:string;children:React.ReactNode;action?:React.ReactNode;Icon?:typeof Table2}) {
  const {styles,FRAME_STRIPE,FRAME_HEADING,ACCENT,FRAME_TITLE}=useThemedStyles(getModuleTheme);
  return <View style={styles.panel}><View style={FRAME_STRIPE}/><View style={[FRAME_HEADING,{marginBottom:14}]}><Icon size={20} color={ACCENT}/><Text style={[FRAME_TITLE,{flex:1}]}>{title}</Text>{action}</View>{children}</View>;
}
export default function LeaguePerformanceScreen() {
  const {BG,styles,shared,ACCENT,MUTED}=useThemedStyles(getModuleTheme);
  const {i18n}=useTranslation(),tr=i18n.language.startsWith('tr');
  const nav=useNavigation<any>();
  const route=useRoute<RouteProp<MainTabsParamList,'LeaguePerformance'>>();
  const {width}=useWindowDimensions();
  const pageScroll=React.useRef<ScrollView>(null);
  const showGuide=(y:number)=>pageScroll.current?.scrollTo({y:Math.max(0,y-12),animated:true});
  const pagePadding=width<360?10:width>=768?24:14;
  const [leagueCard,setLeagueCard]=React.useState<SearchResultRow>();
  const [cardError,setCardError]=React.useState(false);
  const [cardRetry,setCardRetry]=React.useState(0);
  const [rows,setRows]=React.useState<LeagueResult[]>([]);
  const selectedId=rows[0]?.league_id??null;
  const [scope,setScope]=React.useState<LeagueScope>('league');
  const [scopeSelector,setScopeSelector]=React.useState(false);
  const [standings,setStandings]=React.useState<LeagueStandings|null>(null);
  const [tableKey,setTableKey]=React.useState('');
  const [standingsLoading,setStandingsLoading]=React.useState(false);
  const [standingsError,setStandingsError]=React.useState(false);
  const [standingsRetry,setStandingsRetry]=React.useState(0);
  const [restoring,setRestoring]=React.useState(true);
  const [restoreError,setRestoreError]=React.useState(false);
  const [restoreRetry,setRestoreRetry]=React.useState(0);
  const cacheUser=React.useRef<number|null>(null);
  const lastSearch=React.useRef<CachedLeaguePerformance|null>(null);
  const handledRequest=React.useRef<number|undefined>(undefined);
  useFocusEffect(React.useCallback(()=>{
    let active=true;
    setRestoring(true);setRestoreError(false);
    void (async()=>{
      try {
        const me=await getMe();
        if(!active)return;
        if(cacheUser.current!==me.id){lastSearch.current=null;setLeagueCard(undefined);setRows([]);setStandings(null);setScopeSelector(false);}
        cacheUser.current=me.id;
        const incoming=route.params?.analysisRequest!==handledRequest.current?route.params?.league:undefined;
        let cached:CachedLeaguePerformance|null=incoming
          ? {filters:{countries:[incoming.country_name||''],leagues:[incoming.league_name]},row:incoming,card:route.params?.leagueCard}
          : lastSearch.current??await readLeaguePerformance(me.id);
        if(!active)return;
        if(!cached){
          const filters={countries:['Turkey'],leagues:['Super Lig']};
          const result=await searchLeaguePerformance(filters);
          if(!active)return;
          if(!result[0])throw new Error('Default league unavailable');
          cached={filters,row:result[0]};
          void writeLeaguePerformance(me.id,cached);
        }
        if(incoming){handledRequest.current=route.params?.analysisRequest;void writeLeaguePerformance(me.id,cached!);}
        lastSearch.current=cached;
        setLeagueCard(cached?.card);
        setRows(cached?[cached.row]:[]);setStandings(cached?.standings??null);setTableKey(cached?.standings?.tables[0]?.key||'');
        setStandingsRetry(value=>value+1);
      }catch{if(active)setRestoreError(true);}
      finally{if(active)setRestoring(false);}
    })();
    return()=>{active=false;};
  },[route.params?.analysisRequest,route.params?.league,restoreRetry]));
  React.useEffect(()=>{
    let active=true;
    const owner=cacheUser.current;
    const cached=lastSearch.current?.row.league_id===selectedId?lastSearch.current.standings:undefined;
    setStandings(cached??null);setTableKey(cached?.tables[0]?.key||'');setScope('league');setStandingsError(false);
    if(!selectedId){setStandingsLoading(false);return;}
    setStandingsLoading(!cached);
    getLeagueStandings(selectedId).then(value=>{
      if(!active || owner!==cacheUser.current)return;
      setStandings(value);setTableKey(value.tables[0]?.key||'');
      if(owner!==null && lastSearch.current?.row.league_id===selectedId){
        const fresh={...lastSearch.current,standings:value};lastSearch.current=fresh;void writeLeaguePerformance(owner,fresh);
      }
    }).catch(()=>{if(active && !cached)setStandingsError(true);}).finally(()=>{if(active)setStandingsLoading(false);});
    return()=>{active=false;};
  },[selectedId,standingsRetry]);
  React.useEffect(()=>{
    let active=true;
    const selected=rows[0],owner=cacheUser.current;
    setCardError(false);
    if(!selected || leagueCard?.player.meta?.leagueId===selected.league_id)return;
    setLeagueCard(undefined);
    searchLeagues({countries:selected.country_name?[selected.country_name]:[],leagues:[selected.league_name],positions:[]}).then(cards=>{
      if(!active || owner!==cacheUser.current)return;
      const card=cards.find(item=>item.player.meta?.leagueId===selected.league_id);
      if(!card)throw new Error('League card unavailable');
      setLeagueCard(card);
      if(owner!==null && lastSearch.current?.row.league_id===selected.league_id){
        const cached={...lastSearch.current,card};lastSearch.current=cached;void writeLeaguePerformance(owner,cached);
      }
    }).catch(()=>{if(active)setCardError(true);});
    return()=>{active=false;};
  },[selectedId,restoring,cardRetry]);
  const scopeOptions:{key:LeagueScope;label:string}[]=[
    {key:'qualifying',label:tr?'Ön Elemeler':'Qualifiers'},
    {key:'league',label:tr?'Lig Aşaması':'League Phase'},
    {key:'knockout',label:tr?'Eleme Aşaması':'Knockout Phase'},
    {key:'overall',label:tr?'Genel':'Overall'},
  ];
  const selected=rows[0];
  const table=standings?.tables.find(item=>item.key===tableKey);
  const currentStandings=standings?.leagueId===selectedId?standings:null;
  return <ScrollView ref={pageScroll} style={{flex:1,backgroundColor:BG}} contentContainerStyle={[styles.page,{paddingHorizontal:pagePadding}]}>
    <TutorialPageGuide page="leaguePerformance" frame={0} summaryLines={0} onShow={showGuide}/>
    <LeagueCard row={leagueCard} tr={tr} added={false} full={false} hideActions onAdd={()=>{}} onAnalyze={()=>{}} headerAction={<WorkspaceSourceActions header sources={[{label:tr?'Lig Havuzu':'League Pool',Icon:Trophy,onPress:()=>nav.navigate('LeaguePool')}]}/>} emptyContent={!leagueCard?<View style={{gap:10}}><Status busy={!cardError&&!restoreError} error={cardError||restoreError} text={cardError||restoreError?(tr?'Lig kartı yüklenemedi.':'Could not load league card.'):(tr?'Lig kartı yükleniyor…':'Loading league card…')}/>{(cardError||restoreError)&&<Action label={tr?'Tekrar Dene':'Retry'} onPress={()=>{setCardRetry(v=>v+1);if(restoreError)setRestoreRetry(v=>v+1);}}/>}</View>:undefined}/>
    <TutorialPageGuide page="leaguePerformance" frame={1} summaryLines={0} onShow={showGuide}/>
    <Section title={tr ? 'Lig Analiz Merkezi' : 'League Analysis Center'}>
        {currentStandings?.stageScoped && <View style={{marginBottom: 14}}><SelectField label={tr ? 'Aşama' : 'Stage'} value={scopeOptions.find(option => option.key === scope)!.label} onPress={() => setScopeSelector(true)} /></View>}
        {(!currentStandings?.stageScoped || scope === 'league') && (currentStandings?.tables.length || 0) > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={[shared.row, {gap: 8}]}>{currentStandings!.tables.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{selected: item.key === tableKey}} onPress={() => setTableKey(item.key)} style={[styles.tableTab, item.key === tableKey && {borderColor: ACCENT}]}><Text style={{color: item.key === tableKey ? ACCENT : MUTED, fontSize: 12, fontWeight: '700'}}>{item.label}</Text></Pressable>)}</View></ScrollView>}
      {restoring ? <Status busy text={tr?'Lig yükleniyor…':'Loading league…'}/> : restoreError ? <View style={{gap:10}}><Status error text={tr?'Lig yüklenemedi.':'Could not load league.'}/><Action label={tr?'Tekrar Dene':'Retry'} onPress={()=>setRestoreRetry(value=>value+1)}/></View> : standingsLoading || (selectedId && !currentStandings && !standingsError) ? <Status busy text={tr ? 'Lig sıralaması yükleniyor…' : 'Loading standings…'} /> : standingsError ? <View style={{gap: 10}}><Status error text={tr ? 'Lig sıralaması yüklenemedi.' : 'League standings could not be loaded.'} /><Action label={tr ? 'Tekrar dene' : 'Retry'} onPress={() => setStandingsRetry(value => value + 1)} /></View> : currentStandings && (table?.rows.length || currentStandings.stageScoped) ? <View style={{gap: 14}}>

        {currentStandings.stageScoped && scope === 'qualifying' && <LeagueKnockoutRounds rounds={currentStandings.qualifyingRounds || []} tr={tr} qualifying />}
        {currentStandings.stageScoped && scope === 'knockout' && <LeagueKnockoutRounds rounds={currentStandings.knockoutRounds || []} tr={tr} />}
        <LeaguePerformanceStandings key={`${selectedId}:${currentStandings.seasonId}:${currentStandings.stageScoped ? scope : 'overall'}`} leagueId={selectedId!} seasonId={currentStandings.seasonId} rows={table?.rows || []} tr={tr} scope={currentStandings.stageScoped ? scope : undefined} official={!currentStandings.stageScoped || scope === 'league'} />
      </View> : selected ? <Status text={tr?'Bu lig için sıralama bulunamadı.':'No standings found for this league.'}/> : <View style={{gap:16}}>
        <Text style={{color:MUTED,fontSize:14,lineHeight:21}}>{tr?'Lig Havuzu’ndan bir lig seç ve kartındaki Analiz ile sıralamasını ve öne çıkan oyuncularını incele.':'Choose a league in League Pool and use Analyze on its card to explore standings and standout players.'}</Text>
        <WorkspaceSourceActions compact sources={[{label:tr?'Lig Havuzu':'League Pool',Icon:Trophy,onPress:()=>nav.navigate('LeaguePool')}]}/>
      </View>}
    </Section>
    {scopeSelector && <Selector title={tr ? 'Aşama Seç' : 'Select Stage'} tr={tr} showSearch={false} options={scopeOptions} selected={scope} onClose={() => setScopeSelector(false)} onSelect={key => {const option = scopeOptions.find(item => item.key === key); if (option) setScope(option.key); setScopeSelector(false);}} />}
  </ScrollView>;
}

const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, DANGER, BG, CARD, FRAME_HEADING, FRAME_STRIPE, FRAME_TITLE, LINE, MUTED, PANEL, TEXT, themeColor} = colors;
  const shared = __getThemed_shared(colors);
  const styles = StyleSheet.create({
  page: {padding: 14, paddingBottom: 32, gap: 16}, panel: {backgroundColor: PANEL, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: ACCENT},
  title: {fontSize: 21, fontWeight: '900', color: TEXT},
  resultRow: {flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: LINE, minHeight: 54, paddingVertical: 10},
  country: {flex: .8, minWidth: 0, color: MUTED, paddingHorizontal: 6, fontSize: 11, fontWeight: '700'},
  league: {flex: 1.6, minWidth: 0, paddingHorizontal: 6}, count: {width: 46, flexShrink: 0, textAlign: 'center', color: ACCENT, fontSize: 12, fontWeight: '800'},
  headerText: {color: MUTED, fontSize: 10, fontWeight: '800'},
  leagueBadge: {width: 64, height: 64, backgroundColor: colors.mode === 'light' ? CARD : 'rgba(255,255,255,.9)', borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  tableTab: {padding: 12, borderWidth: 1, borderColor: LINE, borderRadius: 12, backgroundColor: CARD},
});
  return {ACCENT, DANGER, BG, CARD, FRAME_HEADING, FRAME_STRIPE, FRAME_TITLE, LINE, MUTED, PANEL, TEXT, shared, styles, themeColor};
});
