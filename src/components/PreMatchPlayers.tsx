import {usePreMatchSection} from './PreMatchReportContext';
import React,{useEffect,useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {ACCENT,LINE,MUTED,TEXT} from '@/theme';
import {getPreMatchSquad,type PostMatchCardData,type PreMatchSquadUsage} from '@/services/matchPool';
import {MatchReportSelector} from './MatchReportPlayerAnalysis';
import {matchMetricLabel} from '@/utils/matchReportMetrics';
import ActionSpinner from './ActionSpinner';
import ReportPlayerPortrait from './ReportPlayerPortrait';
import TeamReportLockedDetail from './TeamReportLockedDetail';
export default function PreMatchPlayers({data,tr,active,free,onOpenPlans}:{data:PostMatchCardData;tr:boolean;active:boolean;free:boolean;onOpenPlans:()=>void}){
 const {result,error,loading,onRetry}=usePreMatchSection('players');
 const [teamId,setTeamId]=useState<number>();
 const [portraitTeams,setPortraitTeams]=useState<PreMatchSquadUsage['teams']>();
 const teams=[...data.teams].sort((a,b)=>Number(a.location!=='home')-Number(b.location!=='home')),team=teams.find(t=>t.id===teamId)||teams[0],accent=team?.location==='away'?'#38BDF8':ACCENT;
 const savedUsage=result?.teams.find(t=>t.team_id===team?.id);
 useEffect(()=>{if(!active||!result||result.teams.some(group=>{const summary=group.performance_summary;return [summary?.top_rated,...(summary?.featured_players||[]),summary?.development].some(player=>!!player?.player_image_url);} ))return;let cancelled=false;getPreMatchSquad(data.fixture.id).then(value=>{if(!cancelled)setPortraitTeams(value.teams);}).catch(()=>{});return()=>{cancelled=true;};},[active,data.fixture.id,result]);
 const usage=portraitTeams?.find(t=>t.team_id===team?.id)||savedUsage,summary=usage?.performance_summary;
 const source=summary?.featured_players?.length?summary.featured_players:[summary?.top_rated,...(summary?.top_scorers||[])];
 const featured=source.filter((p,i,arr)=>p&&arr.findIndex(v=>v?.player_id===p.player_id)===i).slice(0,2);
 const cards=[...featured.map(p=>({player:p!,development:false})),...(summary?.development?[{player:summary.development,development:true}]:[])];
 return <View style={{gap:15}}><View style={[s.frame,{borderColor:`${accent}70`}]}><View style={[s.rule,{backgroundColor:accent}]}/><MatchReportSelector label={tr?'Takım Seçimi':'Select Team'} value={team?.name||'—'} options={teams.map(t=>({id:t.id,name:t.name,detail:t.location==='away'?tr?'Deplasman':'Away':tr?'Ev Sahibi':'Home',color:t.location==='away'?'#38BDF8':ACCENT}))} onSelect={setTeamId} accent={accent}/></View>
 <View style={[s.frame,{borderColor:`${accent}70`}]}><View style={s.hero}>{team?.image_url&&<Image source={{uri:team.image_url}} style={s.logo} resizeMode="contain"/>}<View style={{flex:1,gap:7}}><Text style={[s.title,{color:accent}]}>{team?.name}</Text><Text style={s.caption}>{tr?'Son':'Last'} {usage?.sample_size??'—'} {tr?'tamamlanmış maç':'completed matches'}</Text></View></View><Text style={s.unit}>{tr?'Değerler 90 dk. başına':'Values per 90 min'}</Text>
 {loading?<View style={s.feedback}><ActionSpinner size={25} color={accent}/><Text style={s.caption}>{tr?'Oyuncu analizleri hazırlanıyor…':'Preparing player analyses…'}</Text></View>:error?<View style={s.feedback}><Text style={s.caption}>{tr?'Oyuncu analizleri yüklenemedi.':'Unable to load player analyses.'}</Text><Pressable style={s.tile} onPress={onRetry}><Text style={{color:accent}}>{tr?'Tekrar Dene':'Try Again'}</Text></Pressable></View>:<>
 {cards.map(({player,development},index)=>{const color=development?'#F87171':accent;const metrics=(development?player.development_metrics:player.standout_metrics)||[];const position=(player.position_name||'').toLowerCase();const order=player.position_id===24||/goalkeeper|kaleci/.test(position)?0:player.position_id===25||/defender|back|savunma/.test(position)?1:player.position_id===26||/midfielder|orta saha/.test(position)?2:player.position_id===27||/attacker|forward|hücum/.test(position)?3:4;return <View key={`${player.player_id}-${index}`} style={[s.frame,{borderColor:`${color}70`,backgroundColor:`${color}09`}]}><Text style={[s.caption,{color}]}>{development?tr?'Gelişime Açık Oyuncu':'Development Player':tr?`Öne Çıkan Oyuncu ${index+1}`:`Standout Player ${index+1}`}</Text><View style={s.playerHeader}><ReportPlayerPortrait imageUrl={player.player_image_url} accent={color} size={50}/><View style={{flex:1,gap:6}}><Text style={s.title}>{player.player_name}</Text><Text style={s.caption}>{(tr?['Kaleci','Savunma','Orta Saha','Hücum','Oyuncu']:['Goalkeeper','Defender','Midfielder','Attacker','Player'])[order]}</Text></View></View>
 <View style={s.grid}>{[{name:tr?'Ort. Puan':'Avg. Rating',value:player.average_rating.toFixed(2)},...metrics.slice(0,3).map(m=>({name:matchMetricLabel(m.name,tr?'tr':'en'),value:`${m.value.toLocaleString(tr?'tr-TR':'en-US',{maximumFractionDigits:2})}${m.is_percentage?'%':''}`}))].map(m=><View key={m.name} style={[s.tile,{width:'48%',borderColor:`${color}40`}]}><Text style={s.caption}>{m.name}</Text><Text style={[s.value,{color}]}>{m.value}</Text></View>)}</View>
 {!free&&<View style={[s.tile,{borderColor:`${color}40`}]}><Text style={[s.caption,{color}]}>{tr?'ScoutWise Perspektifi':'ScoutWise Perspective'}</Text><Text style={s.body}>{result?.perspectives[String(player.player_id)]?.text||'—'}</Text></View>}
 </View>;})}
 {!cards.length&&<Text style={s.caption}>{tr?'90 dakikayı aşan oyuncu puanı bulunmuyor.':'No rated player exceeded 90 minutes.'}</Text>}
 {free&&!!cards.length&&<TeamReportLockedDetail tr={tr} accent={accent} kind="standout" onOpenPlans={onOpenPlans}/>}
 </>}
 </View></View>;
}
const s=StyleSheet.create({frame:{padding:13,borderWidth:1,borderRadius:19,gap:13},rule:{height:3,borderRadius:3},hero:{flexDirection:'row',alignItems:'center',gap:13,paddingBottom:13,borderBottomWidth:1,borderBottomColor:LINE},playerHeader:{flexDirection:'row',alignItems:'center',gap:11},logo:{width:50,height:57},title:{fontSize:19,fontWeight:'800',color:TEXT},caption:{fontSize:11,lineHeight:16,fontWeight:'600',color:MUTED},unit:{color:'#C4B5FD',borderWidth:1,borderColor:'#A78BFA66',backgroundColor:'#8B5CF615',padding:10,borderRadius:10,fontSize:11,fontWeight:'700',textAlign:'center'},feedback:{paddingVertical:30,alignItems:'center',gap:15},tile:{borderWidth:1,borderColor:LINE,borderRadius:12,padding:10,gap:8,backgroundColor:'rgba(0,0,0,.12)'},grid:{flexDirection:'row',flexWrap:'wrap',gap:8},value:{fontSize:21,fontWeight:'800'},body:{fontSize:13,lineHeight:21,color:TEXT}});
