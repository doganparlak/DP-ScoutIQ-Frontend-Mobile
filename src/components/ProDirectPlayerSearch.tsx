import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft,RotateCcw,SlidersHorizontal,Target,UserRoundSearch,UsersRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard,Pressable,ScrollView,Text,View,useWindowDimensions } from 'react-native';
import { ProGuidedScrollView,TutorialPageGuide } from './Tutorial';

import { getPlayerPoolOptions,normalizeProPlayer,proWorkspaceRequest,searchPlayerPool,type PlayerPoolFilterOptions } from '@/services/api';
import { resolveSimilarReference } from '@/services/similarPlayers';
import { PLAYER_CARD_PROFILE_GAP,getThemed_PLAYER_ACTION_TONES as __getThemed_PLAYER_ACTION_TONES } from '@/utils/playerCardActions';
import { Status } from './LeaguePerformanceControls';
import PlayerCard from './PlayerCard';
import ProPlayerDiscovery from './ProPlayerDiscovery';
import ProPlayerFit from './ProPlayerFit';
import ProPlayerInspection from './ProPlayerInspection';
import ProSimilarPlayerFlow from './ProSimilarPlayerFlow';

import { ProButton,ProFilterInput,ProTrialHint,getThemed_proStyles as __getThemed_styles,workspaceRequestId,type ProInspection,type ProPlayerEntry } from './ProWorkspaceControls';

const DIRECT_PLAYER_RESULT_LIMIT = 15;
type ProView={kind:'inspect'|'fit'|'similar';entry:ProPlayerEntry};
const viewKey=(value:ProView|null)=>value?JSON.stringify([value.kind,value.entry.id,value.entry.discoveryContext||null]):'direct';

export default function ProDirectPlayerSearch({onGuidePageChange, trial=false, mode='direct', sessionId, strategy, onEditStrategy, onAccessRequired, onCreditsChanged, onBusyChange}: {onGuidePageChange?:(page:string)=>void;trial?:boolean;mode?:'direct'|'discovery'; sessionId: string; strategy: string; onEditStrategy: () => void; onAccessRequired: () => void; onCreditsChanged: () => void; onBusyChange: (busy: boolean) => void}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, FRAME_TITLE, DANGER, PLAYER_ACTION_TONES} = themed;

  const {i18n, t} = useTranslation(), tr = i18n.language.startsWith('tr'), navigation = useNavigation<any>(), {width, fontScale} = useWindowDimensions();
  const [filters, setFilters] = React.useState({name: '', nationality: '', team: ''});
  const [options, setOptions] = React.useState<PlayerPoolFilterOptions | null>(null), [optionsFailed, setOptionsFailed] = React.useState(false);
  const [rows, setRows] = React.useState<ProPlayerEntry[]>([]), [searched, setSearched] = React.useState(false), [loading, setLoading] = React.useState(false), [busy, setBusy] = React.useState(false), [error, setError] = React.useState('');
  const [view, setView] = React.useState<ProView|null>(null), [inspection, setInspection] = React.useState<ProInspection | null>(null);
  const [history,setHistory]=React.useState<(ProView|null)[]>([]),[visited,setVisited]=React.useState<ProView[]>([]),[childBusy,setChildBusy]=React.useState(false);
  const request = React.useRef(0), mounted = React.useRef(true), actionLock = React.useRef(false), cache = React.useRef(new Map<string, ProInspection>()), pending = React.useRef<{key: string; id: string} | null>(null);
  const similarCache=React.useRef(new Map());
  const fitCache = React.useRef(new Map());
  const [fitGuidePage,setFitGuidePage]=React.useState('proFit');
  React.useEffect(()=>{onGuidePageChange?.(view?.kind==='inspect'?'proInspect':view?.kind==='similar'?'proSimilar':view?.kind==='fit'?fitGuidePage:mode==='discovery'?'proDiscovery':'proDirect');},[view?.kind,mode,fitGuidePage,onGuidePageChange]);
  const scroll = React.useRef<ScrollView>(null), searchOffset = React.useRef(0), restore = React.useRef(false);
  const callbacks = React.useRef({onBusyChange, onAccessRequired, onCreditsChanged}); callbacks.current = {onBusyChange, onAccessRequired, onCreditsChanged};
  React.useEffect(() => {callbacks.current.onBusyChange(loading || busy || childBusy);}, [loading, busy, childBusy]);
  React.useEffect(() => {
    mounted.current = true;
    getPlayerPoolOptions(false).then(value => {if (mounted.current) setOptions(value);}).catch(() => {if (mounted.current) setOptionsFailed(true);});
    return () => {mounted.current = false; request.current++; callbacks.current.onBusyChange(false);};
  }, []);
  React.useEffect(()=>{setView(null);setHistory([]);setError('');},[mode]);
  function navigateView(next:ProView|null){
    if(viewKey(next)===viewKey(view))return;
    setHistory(previous=>[...previous,view]);
    if(next)setVisited(previous=>previous.some(item=>viewKey(item)===viewKey(next))?previous:[...previous,next]);
    setView(next);setError('');
    if(!next)restore.current=true;
  }
  function inspectionKey(entry:ProPlayerEntry){return JSON.stringify([entry.id,i18n.language,'pro-v4',entry.discoveryContext||null]);}
  function checkFit(entry:ProPlayerEntry){navigateView({kind:'fit',entry});}
  function change(key: keyof typeof filters, value: string) {request.current++; setFilters(current => ({...current, [key]: value})); setRows([]); setSearched(false); setLoading(false); setError('');}
  async function search() {
    if (loading || busy || !Object.values(filters).some(value => value.trim())) return;
    Keyboard.dismiss(); const version = ++request.current; setLoading(true); setError('');
    try {const values = await searchPlayerPool({name: filters.name.trim() || undefined, nationality: filters.nationality.trim() || undefined, team: filters.team.trim() || undefined, limit: DIRECT_PLAYER_RESULT_LIMIT}); if (version !== request.current) return; setRows(values.slice(0, DIRECT_PLAYER_RESULT_LIMIT)); setSearched(true);}
    catch {if (version === request.current) {setRows([]); setError(tr ? 'Oyuncular yüklenemedi. Lütfen tekrar dene.' : 'Could not load players. Please try again.');}}
    finally {if (version === request.current) setLoading(false);}
  }
  async function inspect(entry: ProPlayerEntry) {
    if (actionLock.current) return;
    const key = inspectionKey(entry);
    navigateView({kind:'inspect',entry}); setError(''); Keyboard.dismiss();
    const saved = cache.current.get(key); if (saved) {setInspection(saved); return;}
    setInspection(null); actionLock.current = true; setBusy(true);
    if (pending.current?.key !== key) pending.current = {key, id: workspaceRequestId()};
    try {
      const response = await proWorkspaceRequest<{row: {id: number; content: Record<string, unknown>}; stats: {metric: string; value: number}[]; insights: Record<string, string>; categories: ProInspection['categories']}>('inspect', {playerId: Number(entry.id), sessionId, requestId: pending.current.id, strategy, discoveryContext:entry.discoveryContext});
      if (!mounted.current) return;
      const normalized = normalizeProPlayer(response.row);
      const value = {entry: {...normalized, discoveryContext:entry.discoveryContext, player: {...normalized.player, stats: response.stats}}, sourceStats: normalized.player.stats, matchCount: Number(response.row.content.match_count) || undefined, insights: response.insights, categories: response.categories};
      cache.current.set(key, value); pending.current = null; setInspection(value); callbacks.current.onCreditsChanged();
    } catch (err) {
      if (mounted.current) {if (String(err).includes('CHAT_TRIAL_EXHAUSTED')) callbacks.current.onAccessRequired(); else setError(tr ? 'Profil açılamadı. Yeniden dene.' : 'Could not open this profile. Please retry.');}
    } finally {actionLock.current = false; if (mounted.current) setBusy(false);}
  }
  async function similar(entry: ProPlayerEntry) {
    if (actionLock.current) return; actionLock.current = true; setBusy(true);
    try {const reference = await resolveSimilarReference(entry.player, entry.id); if (mounted.current) navigateView({kind:'similar',entry:{...reference,discoveryContext:entry.discoveryContext}});}
    catch {if (mounted.current) setError(tr ? 'Bu oyuncu için benzer profiller yüklenemedi.' : 'Similar profiles could not be opened.');}
    finally {actionLock.current = false; if (mounted.current) setBusy(false);}
  }
  function back(){if(busy||childBusy||!history.length)return;const previous=history[history.length-1];setHistory(items=>items.slice(0,-1));setView(previous);setError('');if(!previous)restore.current=true;}
  const previous=history[history.length-1];
  const previousTitle=previous?.kind==='inspect'?(tr?'Oyuncuyu İncele':'Player Inspection'):previous?.kind==='fit'?(tr?'Uyum':'Player Fit'):previous?.kind==='similar'?(tr?'Benzer Oyuncular':'Similar Players'):(mode==='discovery'?(tr?'Oyuncu Keşfi':'Player Discovery'):(tr?'Doğrudan Arama':'Direct Search'));
  const split = width / fontScale >= 360;
  return <View style={{flex: 1}}>
    {!!history.length && <View style={{paddingHorizontal: 16, paddingTop: 12}}><ProButton label={`${tr?'Geri:':'Back:'} ${previousTitle}`} onPress={back} disabled={busy||childBusy} Icon={ArrowLeft}/></View>}
    {/* Keep the search scroll view mounted while inspecting a player. */}
    <ProGuidedScrollView ref={scroll} style={{flex: view ? 0 : 1, display: view ? 'none' : 'flex'}} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onScroll={event => {searchOffset.current = event.nativeEvent.contentOffset.y;}} scrollEventThrottle={16} onContentSizeChange={() => {if (restore.current) {restore.current = false; scroll.current?.scrollTo({y: searchOffset.current, animated: false});}}}>
      <View style={{display:mode==='direct'?'flex':'none',gap:16}}>
      <TutorialPageGuide page='proDirect' frame={0} summaryLines={0}/>
      <View style={styles.frame}><View style={styles.heading}><UserRoundSearch color={ACCENT} size={26}/><Text style={[FRAME_TITLE, {flex: 1}]}>{tr ? 'Aradığın Oyuncuyu Bul' : 'Find Your Player'}</Text></View><Text style={styles.hint}>{tr ? 'İsim, ülke veya takıma göre ara; sonuç kartından yapmak istediğin işlemi seç.' : 'Search by name, country or team, then choose an action on the player’s card.'}</Text>
        <View style={styles.heading}><SlidersHorizontal color={ACCENT} size={18}/><Text style={{color: ACCENT, fontWeight: '800', fontSize: 14}}>{tr ? 'Arama Kriterleri' : 'Search Criteria'}</Text><Pressable disabled={busy} onPress={() => {request.current++; setFilters({name: '', nationality: '', team: ''}); setRows([]); setSearched(false); setLoading(false); setError('');}} accessibilityRole="button" accessibilityLabel={tr ? 'Filtreleri sıfırla' : 'Reset filters'} style={{marginLeft: 'auto', padding: 6}}><RotateCcw color={DANGER} size={22}/></Pressable></View>
        <ProFilterInput label={tr ? 'Oyuncu adı' : 'Player name'} value={filters.name} onChange={value => change('name', value)} placeholder={tr ? 'İsim ara' : 'Search name'} disabled={busy}/>
        <View style={{flexDirection: split ? 'row' : 'column', gap: 12}}><ProFilterInput label={tr ? 'Ülke / Uyruk' : 'Country / Nationality'} value={filters.nationality} onChange={value => change('nationality', value)} placeholder={tr ? 'Ülke ara' : 'Search country'} options={options?.nationalities} disabled={busy}/><ProFilterInput label={tr ? 'Mevcut takım' : 'Current team'} value={filters.team} onChange={value => change('team', value)} placeholder={tr ? 'Takım ara' : 'Search team'} options={options?.teams} disabled={busy}/></View>
        {optionsFailed && <Text style={styles.hint}>{tr ? 'Filtre önerileri yüklenemedi. Alanlara yazarak aramaya devam edebilirsin.' : 'Suggestions are unavailable. You can still type your filters.'}</Text>}
        <ProButton primary label={loading ? (tr ? 'Aranıyor…' : 'Searching…') : (tr ? 'Oyuncu Ara' : 'Search Players')} onPress={() => void search()} disabled={loading || busy || !Object.values(filters).some(value => value.trim())}/>
      </View>
      <TutorialPageGuide page='proDirect' frame={1} summaryLines={0}/>
      {!!error && <Status error text={error}/>}{loading && <Status busy text={tr ? 'Oyuncular aranıyor…' : 'Searching players…'}/>}
      {!searched && !loading && !error && <Status text={tr ? 'Başlamak için bir isim yaz veya ülke ya da takım seç.' : 'Enter a name or choose a country or team to begin.'}/>}
      {searched && <View style={styles.heading}><Text style={[FRAME_TITLE, {flex: 1}]}>{tr ? 'Arama Sonuçları' : 'Search Results'}</Text><Text style={{color: ACCENT, fontWeight: '900'}}>{Math.min(rows.length, DIRECT_PLAYER_RESULT_LIMIT)}</Text></View>}
      {searched && !rows.length && <Status text={tr ? 'Oyuncu bulunamadı. Farklı bir isim dene veya filtrelerini değiştir.' : 'No players found. Try a different name or adjust your filters.'}/>}
      {!!rows.length&&<ProTrialHint trial={trial} action={tr?'İncele':'Inspect'}/>}
      {rows.slice(0, DIRECT_PLAYER_RESULT_LIMIT).map((entry, index) => <View key={entry.id} style={[styles.frame, {gap: PLAYER_CARD_PROFILE_GAP}]}>
        <View style={styles.heading}><Text style={{color: ACCENT, fontWeight: '900'}}>{String(index + 1).padStart(2, '0')}</Text><Text style={[FRAME_TITLE, {fontSize: 16}]}>{t('playerCard', 'Player Card')}</Text></View>
        <View style={{flexDirection: 'row', alignItems: 'stretch', gap: 6}}>
          <View style={{flex: 1, minWidth: 0}}><ProButton toolbar label={tr ? 'İncele' : 'Inspect'} color={PLAYER_ACTION_TONES.portfolio} Icon={UserRoundSearch} onPress={() => void inspect(entry)} disabled={busy}/></View>
          <View style={{flex: 1, minWidth: 0}}><ProButton toolbar label={tr ? 'Uyum' : 'Fit'} Icon={Target} onPress={()=>checkFit(entry)} disabled={busy} color={PLAYER_ACTION_TONES.similar}/></View>
          <View style={{flex: 1, minWidth: 0}}><ProButton toolbar label={tr ? 'Benzeri' : 'Similar'} Icon={UsersRound} onPress={() => void similar(entry)} disabled={busy} color={PLAYER_ACTION_TONES.matchup}/></View>
        </View>
        <PlayerCard player={entry.player} actionsInside={false} hideActions hideScores/>
      </View>)}
      {rows.length >= DIRECT_PLAYER_RESULT_LIMIT && <Text style={styles.hint}>{tr ? 'İlk 15 sonuç gösteriliyor. Aramanı daraltmak için filtreleri düzenle.' : 'Showing the first 15 matches. Refine your filters to narrow the results.'}</Text>}
      </View><View style={{display:mode==='discovery'?'flex':'none'}}><ProPlayerDiscovery trial={trial} sessionId={sessionId} strategy={strategy} onEditStrategy={onEditStrategy} onAccessRequired={onAccessRequired} onCreditsChanged={onCreditsChanged} onBusyChange={setChildBusy} onInspect={entry=>void inspect(entry)} onSimilar={entry=>void similar(entry)} onResultsShown={y=>scroll.current?.scrollTo({y,animated:true})}/></View>
    </ProGuidedScrollView>
    {visited.map(item=>{const active=viewKey(view)===viewKey(item);const saved=cache.current.get(inspectionKey(item.entry));return <View key={viewKey(item)} style={{flex:active?1:0,display:active?'flex':'none'}}>
      {item.kind==='inspect'&&<ProGuidedScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{active&&busy?<Status busy text={tr?'Profil açılıyor…':'Opening profile…'}/>:saved?<ProPlayerInspection guideActive={active} value={saved} onFindSimilar={()=>void similar(saved.entry)} onCheckFit={()=>checkFit(saved.entry)}/>:<><Status error text={active?error:(tr?'Profil açılamadı.':'Profile unavailable.')}/><ProButton label={tr?'Yeniden Dene':'Try Again'} onPress={()=>void inspect(item.entry)}/></>}</ProGuidedScrollView>}
      {item.kind==='similar'&&<ProSimilarPlayerFlow guideActive={active} trial={trial} reference={item.entry} cache={similarCache.current} onInspect={entry=>void inspect(entry)} onCheckFit={checkFit} onSimilar={entry=>void similar(entry)} onDirectSearch={()=>navigateView(null)} onBusyChange={setChildBusy}/>}
      {item.kind==='fit'&&<ProPlayerFit guideActive={active} onGuidePageChange={setFitGuidePage} trial={trial} onFindSimilar={()=>void similar(item.entry)} cache={fitCache.current} entry={item.entry} sessionId={sessionId} strategy={strategy} onEditStrategy={onEditStrategy} onAccessRequired={onAccessRequired} onCreditsChanged={onCreditsChanged} onBusyChange={setChildBusy}/>}
    </View>;})}
  </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, DANGER, FRAME_TITLE, themeColor} = colors;
  const PLAYER_ACTION_TONES = __getThemed_PLAYER_ACTION_TONES(colors);
  const styles = __getThemed_styles(colors);

  return {ACCENT, DANGER, FRAME_TITLE, PLAYER_ACTION_TONES, styles, themeColor};
});
