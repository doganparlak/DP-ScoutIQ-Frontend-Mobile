import React from 'react';
import {ProGuidedScrollView,TutorialPageGuide} from './Tutorial';
import {Pressable, ScrollView, Text, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ClipboardPenLine, Shield, Trophy, Target, ArrowLeft, UserRound, RotateCcw} from 'lucide-react-native';
import {ACCENT, DANGER, FRAME_TITLE} from '@/theme';
import {getTeamOptions, searchTeams, type Team} from '@/services/teamPool';
import {getLeagueOptions, type RawLeague} from '@/services/leaguePool';
import {leaguePoolRequest, proWorkspaceRequest} from '@/services/api';
import ProTeamFitAssessment from './ProTeamFitAssessment';
import ProLeagueFitAssessment from './ProLeagueFitAssessment';
import ProStrategyFitAssessment from './ProStrategyFitAssessment';
import ProTeamSearchFilters from './ProTeamSearchFilters';
import TeamProfileCard from './TeamProfileCard';
import LeaguePlayerCardModal from './LeaguePlayerCardModal';
import {Badge, Status} from './LeaguePerformanceControls';
import {ProButton, ProTrialHint, proStyles, workspaceRequestId, type ProPlayerEntry} from './ProWorkspaceControls';

type Evidence = {metric: string; value: number; subject?: string; unit?: string; referenceValue?: number; referenceSubject?: string};
type Section = {text: string; evidence?: Evidence[]; teamEvidence?: Evidence[]};
type FitResult = {insights?: {overall: string; peers: (Section & {name: string; playerId: number; imageUrl?: string;roles?:string[]})[]; fit: Section; recommendation: Section}; summary?: string; overall?: string; recommendation?: string; requirements?: {title: string; category?: string; text: string; limitation: string; metrics: Evidence[]}[]; categories?: {key: string; text: string; metrics: {metric: string; values: number[]}[]}[]; roles?: string[]; league?: RawLeague};
type TargetKind = 'team' | 'league' | 'strategy';
export default function ProPlayerFit({guideActive=true,onGuidePageChange,trial=false, entry, sessionId, strategy, onEditStrategy, onAccessRequired, onCreditsChanged, onBusyChange, onFindSimilar, cache}: {guideActive?:boolean;onGuidePageChange?:(page:string)=>void;trial?:boolean;entry: ProPlayerEntry; sessionId: string; strategy: string; onEditStrategy: () => void; onAccessRequired: () => void; onCreditsChanged: () => void; onBusyChange: (busy: boolean) => void; onFindSimilar: () => void; cache: Map<string, FitResult>}) {
  const {i18n} = useTranslation(), tr = i18n.language.startsWith('tr');
  const [kind, setKind] = React.useState<TargetKind | null>(null), [filters, setFilters] = React.useState({country: '', league: '', team: ''});
  const [options, setOptions] = React.useState<{countries: string[]; leagues: string[]; teams?: string[]}>({countries: [], leagues: []});
  const [teams, setTeams] = React.useState<Team[]>([]), [leagues, setLeagues] = React.useState<RawLeague[]>([]), [searched, setSearched] = React.useState(false);
  const [busy, setBusy] = React.useState(false), [error, setError] = React.useState(''), [result, setResult] = React.useState<FitResult | null>(null), [targetName, setTargetName] = React.useState('');
  const [selectedTeam,setSelectedTeam]=React.useState<Team|null>(null);
  const optionCache=React.useRef(new Map<string,{at:number;value:{countries:string[];leagues:string[];teams?:string[]}}>());
  const version = React.useRef(0), mounted = React.useRef(true), lock = React.useRef(false), pending = React.useRef<{key: string; id: string} | null>(null), last = React.useRef<{kind: TargetKind; identity: {teamId?: number; leagueId?: number}; name: string} | null>(null);
  const guidePage=kind==='team'?'proTeamFit':kind==='league'?'proLeagueFit':kind==='strategy'?'proStrategyFit':'proFit';
  React.useEffect(()=>{if(guideActive)onGuidePageChange?.(guidePage);},[guideActive,guidePage,onGuidePageChange]);
  const callbacks = React.useRef({onBusyChange, onAccessRequired, onCreditsChanged}); callbacks.current = {onBusyChange, onAccessRequired, onCreditsChanged};
  React.useEffect(() => {callbacks.current.onBusyChange(busy);}, [busy]);
  React.useEffect(() => {mounted.current = true; return () => {mounted.current = false; version.current++; callbacks.current.onBusyChange(false);};}, []);
  React.useEffect(() => {
    if(kind!=='team'&&kind!=='league')return;
    let active=true;const key=JSON.stringify([kind,filters.country,filters.league]);
    const cached=optionCache.current.get(key);
    if(cached&&Date.now()-cached.at<300000){setOptions(cached.value);validateTeamFilters(cached.value);return;}
    const timer=setTimeout(()=>{
      const leagueFilters={countries:filters.country?[filters.country]:[],leagues:filters.league?[filters.league]:[],positions:[]};
      const task=kind==='team'?getTeamOptions(filters):getLeagueOptions(leagueFilters);
      task.then(value=>{if(active){optionCache.current.set(key,{at:Date.now(),value});if(optionCache.current.size>30)optionCache.current.delete(optionCache.current.keys().next().value!);setOptions(value);validateTeamFilters(value);}}).catch(()=>{if(active)setOptions({countries:[],leagues:[]});});
    },250);
    return()=>{active=false;clearTimeout(timer);};
  },[kind,filters.country,filters.league]);
  React.useEffect(() => {
    if (kind === 'strategy') {setResult(null); setTargetName(''); setError('');}
  }, [strategy]);
  function validateTeamFilters(value:{countries:string[];leagues:string[];teams?:string[]}){setFilters(current=>({...current,country:current.country&&!value.countries.includes(current.country)?'':current.country,league:current.league&&!value.leagues.includes(current.league)?'':current.league,team:kind==='team'&&current.team&&!value.teams?.includes(current.team)?'':current.team}));}
  function update(key: keyof typeof filters, value: string) {version.current++; setFilters(current => ({...current,[key]:value}));setSelectedTeam(null);setTargetName('');setResult(null);last.current=null;setTeams([]);setLeagues([]);setSearched(false);setError('');setBusy(false);}
  async function search() {
    if (busy) return; const current = ++version.current; setBusy(true); setError('');
    try {if (kind === 'team') {const value = await searchTeams(filters, 15); if (current === version.current) setTeams(value);} else {const value = await leaguePoolRequest<RawLeague[]>('search', {countries: filters.country ? [filters.country] : [], leagues: filters.league ? [filters.league] : [], positions: [], limit: 100}); if (current === version.current) setLeagues(value);} if (current === version.current) setSearched(true);}
    catch {if (current === version.current) setError(tr ? 'Hedefler yüklenemedi. Yeniden dene.' : 'Targets could not be loaded. Please retry.');}
    finally {if (current === version.current) setBusy(false);}
  }
  async function assess(selectedKind: TargetKind, identity: {teamId?: number; leagueId?: number}, name: string) {
    if (lock.current) return;
    const key = JSON.stringify([selectedKind==='league'?'league-fit-25-words-v9':selectedKind==='team'?'team-fit-25-words-v8':'strategy-fit-25-words-v4',entry.id, selectedKind, identity, i18n.language, selectedKind === 'strategy' ? strategy : '',entry.discoveryContext||null]);
    last.current = {kind: selectedKind, identity, name}; setTargetName(name); setError('');
    const saved = cache.get(key); if (saved) {setResult(saved); return;}
    setResult(null); lock.current = true; setBusy(true);
    if (pending.current?.key !== key) pending.current = {key, id: workspaceRequestId()};
    try {const value = await proWorkspaceRequest<FitResult>(`${selectedKind}-fit`, {playerId: Number(entry.id), ...identity, ...(selectedKind === 'strategy' ? {strategy} : {}), sessionId, requestId: pending.current.id,discoveryContext:entry.discoveryContext}); if (mounted.current) {cache.set(key, value); setResult(value); pending.current = null; callbacks.current.onCreditsChanged();}}
    catch (err) {if (mounted.current) {if (String(err).includes('CHAT_TRIAL_EXHAUSTED')) callbacks.current.onAccessRequired(); else {const message=String(err);setError(message.includes('Role benchmark performance data is unavailable')?(tr?'Hedef takımda oyuncunun rolüyle eşleşen yeterli performans verisi bulunmuyor. Rol ortalaması oluşturulamadığı için bu takıma uyum değerlendirilemiyor. Başka bir takım seçebilirsin.':'The target team has insufficient performance data matching this player’s role. A role average cannot be calculated, so this team fit cannot be assessed. You can select another team.'):message.includes('Not enough team performance data')?(tr?'Takımın bu sezon tamamlanmış en az 3 maçına ihtiyaç var.':'At least 3 completed team matches are required this season.'):message.includes('Player performance data')?(tr?'Oyuncunun performans verisi bu değerlendirme için yeterli değil.':'Insufficient player performance data for this assessment.'):message.includes('Team performance data is incomplete')?(tr?'Takımın son maçlarına ait veri eksik. Lütfen yeniden dene.':'Recent team match data is incomplete. Please retry.'):message.includes('insights could not be generated')?(tr?'Değerlendirme yanıtı hazırlanamadı. Lütfen yeniden dene.':'The assessment response could not be generated. Please retry.'):(tr?'Uyum değerlendirmesi tamamlanamadı. Lütfen yeniden dene.':'The fit assessment could not be completed. Please retry.'));}}}
    finally {lock.current = false; if (mounted.current) setBusy(false);}
  }
  function changeTarget(){version.current++;setSelectedTeam(null);setResult(null);setTargetName('');setError('');last.current=null;pending.current=null;}
  function clearFilters(){changeTarget();setFilters({country:'',league:'',team:''});setTeams([]);setLeagues([]);setSearched(false);}
  function reset() {version.current++; setKind(null);setSelectedTeam(null); setResult(null); setTargetName(''); setError(''); setTeams([]); setLeagues([]); setSearched(false); last.current = null;}
  return <ProGuidedScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={proStyles.content}>
    {!kind&&<TutorialPageGuide page='proFit' frame={0} enabled={guideActive} summaryLines={0}/>}
    <View style={proStyles.frame}><View style={proStyles.heading}><UserRound size={21} color={ACCENT}/><Text style={FRAME_TITLE}>{tr?'Oyuncu Kartı':'Player Card'}</Text></View><LeaguePlayerCardModal inline proMode onFindSimilar={onFindSimilar} initialEntry={entry} actionsDisabled={busy} onClose={() => {}}/></View>
    {!!kind&&<>
      <TutorialPageGuide page={guidePage} frame={0} enabled={guideActive} summaryLines={0}/>
      <TutorialPageGuide page={guidePage} frame={1} enabled={guideActive} summaryLines={0}/>
    </>}
    <View style={proStyles.frame}><View style={[proStyles.heading,{alignItems:"center"}]}><Text style={[FRAME_TITLE,{flexShrink:1}]}>{kind==='team'?(tr?'Takıma Uyum':'Team Fit'):kind==='league'?(tr?'Lige Uyum':'League Fit'):kind==='strategy'?(tr?'Stratejiye Uyum':'Strategy Fit'):(tr?'Uyumu Değerlendir':'Assess Fit')}</Text>{(kind==='team'||kind==='league')&&!targetName&&<Pressable disabled={busy} onPress={clearFilters} accessibilityRole='button' accessibilityLabel={tr?'Filtreleri temizle':'Clear filters'} style={{marginLeft:'auto',padding:6,opacity:busy?.4:1}}><RotateCcw color={DANGER} size={22}/></Pressable>}</View><Text style={proStyles.hint}>{kind==='team'?(tr?'Oyuncunun seçtiğin takıma uyumunu değerlendir.':'Assess this player’s fit to your selected team.'):kind==='league'?(tr?'Oyuncunun seçtiğin lige uyumunu değerlendir.':'Assess this player’s fit to your selected league.'):kind==='strategy'?(tr?'Oyuncunun mevcut takım stratejine uyumunu değerlendir.':'Assess this player’s fit to your current team strategy.'):(tr?'Oyuncunun bir takıma, lige veya mevcut takım stratejine uyumunu değerlendir.':'Assess this player against a team, league or your current team strategy.')}</Text>
      {!kind ? <><ProButton Icon={Shield} label={tr ? 'Takıma Uyum' : 'Team Fit'} onPress={() => setKind('team')}/><ProButton Icon={Trophy} label={tr ? 'Lige Uyum' : 'League Fit'} onPress={() => setKind('league')}/><ProButton Icon={ClipboardPenLine} label={tr ? 'Stratejiye Uyum' : 'Strategy Fit'} onPress={() => setKind('strategy')}/></> : <ProButton Icon={ArrowLeft} label={tr ? 'Uyum Seçeneklerine Dön' : 'Back to Fit Options'} onPress={reset} disabled={busy}/>}
      {kind === 'strategy' && <>{!strategy.trim()&&<Text style={proStyles.hint}>{tr?'Değerlendirme için önce takım stratejini belirle.':'Set your team strategy before assessing fit.'}</Text>}<ProButton Icon={ClipboardPenLine} label={tr ? 'Takım Stratejisini Düzenle' : 'Edit Team Strategy'} onPress={onEditStrategy} disabled={busy}/><ProTrialHint trial={trial}/><ProButton primary Icon={Target} label={tr ? 'Stratejiye Uyumu Değerlendir' : 'Assess Strategy Fit'} onPress={() => void assess('strategy', {}, tr ? 'Hedef Strateji' : 'Target Strategy')} disabled={busy || !strategy.trim()}/></>}
      {(kind==='team'||kind==='league')&&!targetName&&<><ProTeamSearchFilters filters={filters} options={{...options,teams:options.teams||[]}} onChange={update} disabled={busy} tr={tr} showTeam={kind==='team'}/><ProButton primary label={kind==='team'?(tr?'Takım Ara':'Search Teams'):(tr?'Lig Ara':'Search Leagues')} onPress={()=>void search()} disabled={busy}/></>}
    </View>
    {selectedTeam&&<View style={proStyles.frame}><View style={{flexDirection:'row',alignItems:'center',gap:10,flexWrap:'wrap'}}><Text style={[FRAME_TITLE,{flexGrow:1}]}>{tr?'Hedef Takım':'Target Team'}</Text><Pressable accessibilityRole='link' disabled={busy} onPress={changeTarget} style={{paddingVertical:8,opacity:busy?.4:1}}><Text style={{color:ACCENT,fontSize:12,textDecorationLine:'underline'}}>{tr?'Hedefi Değiştir':'Change Target'}</Text></Pressable></View><TeamProfileCard team={selectedTeam} tr={tr}/>{result?.roles&&<Text style={proStyles.hint}>{tr?'Karşılaştırılan roller':'Compared roles'}: {result.roles.join(' · ')}</Text>}</View>}
    {busy && <Status busy text={targetName ? (tr ? 'Uyum değerlendiriliyor…' : 'Assessing fit…') : (tr ? 'Hedefler aranıyor…' : 'Searching targets…')}/>}
    {!!error && <><Status error text={error}/>{last.current && <ProButton label={tr ? 'Yeniden Dene' : 'Try Again'} onPress={() => {const previous = last.current!; void assess(previous.kind, previous.identity, previous.name);}} disabled={busy}/>}</>}
    {searched && !targetName && !busy && !teams.length && !leagues.length && <Status text={tr ? 'Hedef bulunamadı. Filtrelerini değiştir.' : 'No targets found. Adjust your filters.'}/>}
    {!targetName&&!!(teams.length||leagues.length)&&<ProTrialHint trial={trial}/>}
    {!targetName && teams.map(team => <View key={`${team.id}:${team.leagueId||team.league}`} style={proStyles.frame}><View style={proStyles.heading}><Badge url={team.logoUrl}/><View style={{flex: 1}}><Text style={FRAME_TITLE}>{team.name}</Text><Text style={proStyles.hint}>{team.league} | {team.country}</Text></View></View><ProButton Icon={Target} label={tr ? 'Bu Takıma Uyumu Değerlendir' : 'Assess Fit to This Team'} disabled={busy || !team.leagueId} onPress={() => {setSelectedTeam(team);void assess('team',{teamId:Number(team.id),leagueId:team.leagueId!},team.name);}}/>{!team.leagueId&&<Text style={proStyles.hint}>{tr?'Bu takım için lig bilgisi bulunmuyor. Lig filtresinden bir lig seçip yeniden ara.':'League information is missing for this team. Select a league filter and search again.'}</Text>}</View>)}
    {!targetName && leagues.map(league => <View key={league.id} style={proStyles.frame}><View style={proStyles.heading}><Badge url={league.content.image_url || league.content.league_image_path}/><View style={{flex: 1}}><Text style={FRAME_TITLE}>{String(league.content.league_name)}</Text><Text style={proStyles.hint}>{String(league.content.league_country_name || '')}</Text></View></View><ProButton Icon={Target} label={tr ? 'Bu Lige Uyumu Değerlendir' : 'Assess Fit to This League'} disabled={busy} onPress={() => void assess('league', {leagueId: Number(league.id.split(':')[1])}, String(league.content.league_name))}/></View>)}
    {!!targetName && kind!=='strategy' && !selectedTeam && !(kind==='league'&&result) && <View style={proStyles.frame}><Text style={FRAME_TITLE}>{targetName}</Text>{result?.roles && <Text style={proStyles.hint}>{tr ? 'Karşılaştırılan roller' : 'Compared roles'}: {result.roles.join(' · ')}</Text>}</View>}
    {result?.insights&&selectedTeam&&<ProTeamFitAssessment player={entry.player} team={selectedTeam} insights={result.insights}/>}
    {kind==='league'&&result&&<ProLeagueFitAssessment onChangeTarget={changeTarget} player={entry.player} result={result} targetName={targetName}/>}
    {kind==='strategy'&&result&&<ProStrategyFitAssessment player={entry.player} result={result}/>}
  </ProGuidedScrollView>;
}
