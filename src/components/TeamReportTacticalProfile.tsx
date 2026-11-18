import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useEffect,useState } from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import TeamReportHeader from './TeamReportHeader';

import { matchPoolRequest } from '@/services/api';
import type { PlayedMatch } from '@/services/teamAnalysis';
import type { PostMatchCardData } from '@/services/matchPool';
import { MatchReportSelector } from './MatchReportPlayerAnalysis';
import type { Team } from '@/services/teamPool';
import { hasNonZeroReportValue,matchMetricLabel } from '@/utils/matchReportMetrics';
import { attackingStyleMetricLabel, defensiveStyleMetricLabel } from '@/utils/teamStyleMetricLabels';
import ActionSpinner from './ActionSpinner';
import ReportPlayerPortrait from './ReportPlayerPortrait';
import TeamReportLockedDetail from './TeamReportLockedDetail';
type Item={title?:string;description?:string;name?:string;averageRating?:number|null;imageUrl?:string|null;position?:string;metrics:{label:string;value:string;contributes?:boolean}[]};
type Profile={themes:Item[];players:Item[];hasMoreThemes?:boolean;hasMorePlayers?:boolean};
type TacticalAccess = {tr:boolean;kind:'attack'|'defense';active:boolean;free:boolean;onOpenPlans:()=>void;rewarded:boolean};
export default function TeamReportTacticalProfile({team,matches,tr,kind,active,free,onOpenPlans,reportId,rewarded,fixtureId}:TacticalAccess & {team:Pick<Team,'id'|'name'|'logoUrl'|'leagueId'>;matches:PlayedMatch[];reportId?:string;fixtureId?:number}){
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, defenseAccent, s, MUTED} = themed;

 const [mode,setMode]=useState<'strategy'|'players'>('strategy'),[profile,setProfile]=useState<Profile|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const [requested,setRequested]=useState(false);
 useEffect(()=>{if(active)setRequested(true);},[active]);
 const key=matches.map(m=>m.fixtureId).join(',');
 useEffect(() => {
   if (!requested) return;
   let cancelled = false;
   setProfile(null);
   setError(false);
   const loading = fixtureId === undefined
     ? matchPoolRequest<Profile>(`/team-analysis/report-profile/${kind}?rewarded=${rewarded}`, {
       teamId:Number(team.id), leagueId:team.leagueId, fixtureIds:key.split(',').map(Number), reportId,
     })
     : matchPoolRequest<Profile>(`/match-pool/fixtures/${fixtureId}/saved-report/tactical-profile/${kind}?teamId=${team.id}&language=${tr ? 'tr' : 'en'}&rewarded=${rewarded}`);
   loading.then(value => { if (!cancelled) setProfile(value); })
     .catch(() => { if (!cancelled) setError(true); });
   return () => { cancelled = true; };
 }, [team.id, team.leagueId, key, kind, tr, retry, requested, free, reportId, rewarded, fixtureId]);
 const attack=kind==='attack',accent=attack?ACCENT:defenseAccent;
 const strategy=attack?(tr?'Takım Hücum\nPlanı':'Team Attack Plan'):(tr?'Takım Savunma\nPlanı':'Team Defense Plan');
 const players=attack?(tr?'Kilit Hücum Oyuncuları':'Key Attacking Players'):(tr?'Kilit Savunma Oyuncuları':'Key Defensive Players');
 const isStrategy = mode === 'strategy';
 const locked = free && !rewarded;
 const hasSecondCard = isStrategy ? profile?.hasMoreThemes : profile?.hasMorePlayers;
 const secondCardTitle = isStrategy
   ? (attack ? (tr ? '2. Takım Hücum Planı' : 'Second Team Attack Plan') : (tr ? '2. Takım Savunma Planı' : 'Second Team Defense Plan'))
   : (attack ? (tr ? '2. Kilit Hücum Oyuncusu' : 'Second Key Attacking Player') : (tr ? '2. Kilit Savunma Oyuncusu' : 'Second Key Defensive Player'));
 const locale = tr ? 'tr' : 'en';
 const metricLabel = (label: string) => defensiveStyleMetricLabel(label, tr)
   ?? attackingStyleMetricLabel(label, tr)
   ?? (tr && label.startsWith('Opponent ') ? `Rakip · ${matchMetricLabel(label.slice(9), locale)}` : matchMetricLabel(label, locale));

 return <View style={{gap:13}}>
   <TeamReportHeader team={team} matches={fixtureId === undefined ? matches.length : 1} tr={tr} accent={accent}/>
   <View style={[s.frame, {borderColor:`${accent}80`}]}>
     <Text style={s.caption}>{isStrategy
       ? (tr ? 'Takım adetleri maç başına. Paylar ve oranlar kendi birimleriyle gösterilir.' : 'Team counts are per match. Shares and ratios retain their units.')
       : (tr ? 'Oyuncu adetleri 90 dakika başına. Oranlar yüzde olarak gösterilir.' : 'Player counts are per 90 minutes. Rates retain their percentages.')}</Text>
     <View style={s.switch}>{(['strategy', 'players'] as const).map(value => (
       <Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:mode===value}} onPress={() => setMode(value)}
         style={[s.option, mode===value && {backgroundColor:`${accent}25`,borderColor:accent}]}>
         <Text style={[s.optionText, {color:mode===value ? accent : MUTED}]}>{value==='strategy' ? strategy : players}</Text>
       </Pressable>
     ))}</View>
   </View>
   {!profile ? error
     ? <View style={s.frame}><Text style={s.caption}>{tr ? 'Profil hazırlanamadı.' : 'Unable to prepare profile.'}</Text><Pressable onPress={() => setRetry(r => r + 1)}><Text style={{color:accent}}>{tr ? 'Tekrar Dene' : 'Retry'}</Text></Pressable></View>
     : <View style={s.center}><ActionSpinner color={accent} size={28}/><Text style={s.caption}>{tr ? 'Profil hazırlanıyor…' : 'Preparing profile…'}</Text></View>
     : !(isStrategy ? profile.themes : profile.players).length
       ? <Text style={s.caption}>{tr ? 'Bu bölüm için yeterli maç verisi bulunamadı.' : 'There is not enough match data for this section.'}</Text>
       : (isStrategy ? profile.themes : profile.players).slice(0, locked ? 1 : 2).map((item, index) => (
       <View key={index} style={[s.frame, {borderColor:`${accent}80`, backgroundColor:`${accent}08`}]}>
         {isStrategy ? <>
           <Text style={[s.title, {color:accent}]}>{item.title}</Text>
           {!!item.description && <Text style={s.caption}>{item.description}</Text>}
         </> : <View style={s.playerHeader}>
           <ReportPlayerPortrait imageUrl={item.imageUrl} accent={accent} size={51}/>
           <View style={{flex:1,gap:6}}>
             <Text style={[s.title, {color:accent}]}>{item.name}</Text>
             {!!item.position && <Text style={s.caption}>{tr ? ({goalkeeper:'Kaleci',defender:'Savunma',midfielder:'Orta Saha',attacker:'Hücum',forward:'Hücum'}[item.position.toLowerCase()] || item.position) : item.position}</Text>}
           </View>
           {attack && item.averageRating != null && <View style={[s.rating, {borderColor:accent}]}>
             <Text style={[s.value, {color:accent}]}>{item.averageRating.toFixed(2)}</Text>
             <Text style={s.caption}>{tr ? 'Puan' : 'Rating'}</Text>
           </View>}
         </View>}
         <View style={s.grid}>{item.metrics.filter(metric => metric.contributes || hasNonZeroReportValue(metric.value)).slice(0,4).map(metric => (
           <View key={metric.label} style={[s.metric, {borderColor:`${accent}65`, backgroundColor:`${accent}08`}]}>
             <Text style={s.caption}>{metricLabel(metric.label)}</Text>
             <Text style={[s.value, {color:accent}]}>{metric.value}</Text>
           </View>
         ))}</View>
       </View>
     ))}
   {profile && locked && hasSecondCard && <TeamReportLockedDetail
     tr={tr} accent={accent} kind={kind} onOpenPlans={onOpenPlans}
     titleOverride={secondCardTitle}
     messageOverride={isStrategy
       ? (tr ? 'Diğer takım planını görmek için PLUS veya PRO’ya geç.' : 'Switch to PLUS or PRO to see the second team plan.')
       : (tr ? 'Daha fazla oyuncu görmek için PLUS veya PRO’ya geç.' : 'Switch to PLUS or PRO to see more players.')}
   />}
 </View>;
}


export function PostMatchTacticalProfile({data,...access}:TacticalAccess & {data:PostMatchCardData}) {
  const {s,ACCENT,defenseAccent} = useThemedStyles(getModuleTheme);
  const isDefense = access.kind === 'defense';
  const accent = isDefense ? defenseAccent : ACCENT;
  const [selectedId,setSelectedId] = useState<number>();
  const teams = [...data.teams].sort((a,b) => Number(a.location !== 'home') - Number(b.location !== 'home'));
  const team = teams.find(item => item.id === selectedId) ?? teams[0];
  if (!team) return null;
  return <View style={{gap:13}}>
    <View style={[s.frame, isDefense && {borderColor:`${accent}80`}]}>
      <MatchReportSelector label={access.tr ? 'Takım Seçimi' : 'Select Team'} value={team.name}
        options={teams.map(item => ({id:item.id,name:item.name}))} onSelect={setSelectedId} accent={accent}/>
    </View>
    <TeamReportTacticalProfile key={team.id} {...access} matches={[]} fixtureId={data.fixture.id}
      team={{id:String(team.id),name:team.name,logoUrl:team.image_url}}/>
  </View>;
}

const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, TEXT, themeColor} = colors;

  const s=StyleSheet.create({frame:{borderWidth:1,borderColor:LINE,borderRadius:18,padding:14,gap:14,backgroundColor:CARD},rating:{padding:10,borderWidth:1,borderRadius:14,alignItems:"center",gap:4},playerHeader:{flexDirection:'row',alignItems:'center',gap:11},name:{fontSize:22,color:TEXT,fontWeight:'900'},title:{fontSize:19,fontWeight:'800'},caption:{fontSize:11,lineHeight:17,color:MUTED},switch:{flexDirection:'row',borderWidth:1,borderColor:LINE,borderRadius:16,padding:4,gap:4},option:{flex:1,padding:10,borderWidth:1,borderColor:'transparent',borderRadius:12,justifyContent:'center'},optionText:{fontSize:12,textAlign:'center',fontWeight:'800'},grid:{flexDirection:'row',flexWrap:'wrap',gap:9},metric:{flexBasis:'45%',flexGrow:1,borderWidth:1,borderColor:LINE,borderRadius:12,padding:10,gap:10},value:{fontSize:21,fontWeight:'900'},bullet:{flexDirection:'row',gap:8,borderTopWidth:1,borderColor:LINE,paddingTop:12},explanation:{flex:1,fontSize:14,lineHeight:23,color:TEXT},center:{alignItems:'center',padding:30,gap:12}});
  return {ACCENT, CARD, LINE, MUTED, TEXT, s, defenseAccent: themeColor('#FB923C')};
});
