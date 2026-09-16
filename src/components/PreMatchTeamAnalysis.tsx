import {usePreMatchSection} from './PreMatchReportContext';
import React,{useState} from 'react';
import {Image,Pressable,StyleSheet,Text,View} from 'react-native';
import {ShieldCheck,Target,ShieldAlert} from 'lucide-react-native';
import {ACCENT,LINE,MUTED,TEXT} from '@/theme';
import {type PostMatchCardData} from '@/services/matchPool';
import {MatchReportSelector} from './MatchReportPlayerAnalysis';
import ActionSpinner from './ActionSpinner';
import TeamReportLockedDetail from './TeamReportLockedDetail';
export default function PreMatchTeamAnalysis({data,tr,active,free,onOpenPlans}:{data:PostMatchCardData;tr:boolean;active:boolean;free:boolean;onOpenPlans:()=>void}){
 const {result,error,loading,onRetry}=usePreMatchSection('team_analysis');
 const [teamId,setTeamId]=useState<number>();
 const teams=[...data.teams].sort((a,b)=>Number(a.location!=='home')-Number(b.location!=='home')),team=teams.find(t=>t.id===teamId)||teams[0],accent=team?.location==='away'?'#38BDF8':ACCENT;
 const analysis=result?.teams[String(team?.id)];
 const sections=[{key:'positive' as const,title:tr?'Güçlü Yönler':'Strengths',color:accent,Icon:ShieldCheck},{key:'strategy' as const,title:tr?'Rakibe Karşı Plan':'Plan Against the Opponent',color:'#FCD34D',Icon:Target},{key:'weakness' as const,title:tr?'Zayıf Yönler & Riskler':'Weaknesses & Risks',color:'#F87171',Icon:ShieldAlert}];
 return <View style={{gap:15}}><View style={[s.frame,{borderColor:`${accent}70`}]}><View style={[s.rule,{backgroundColor:accent}]}/><MatchReportSelector label={tr?'Takım Seçimi':'Select Team'} value={team?.name||'—'} options={teams.map(t=>({id:t.id,name:t.name,detail:t.location==='away'?tr?'Deplasman':'Away':tr?'Ev Sahibi':'Home',color:t.location==='away'?'#38BDF8':ACCENT}))} onSelect={setTeamId} accent={accent}/></View>
 <View style={[s.hero,{borderColor:`${accent}60`}]}>{team?.image_url&&<Image source={{uri:team.image_url}} style={s.logo} resizeMode="contain"/>}<Text style={[s.teamName,{color:accent}]}>{team?.name}</Text></View>
 {loading?<View style={s.feedback}><ActionSpinner size={25} color={accent}/><Text style={s.caption}>{tr?'Takım analizi hazırlanıyor…':'Preparing team analysis…'}</Text></View>:error?<View style={s.feedback}><Text style={s.caption}>{tr?'Takım analizi yüklenemedi.':'Unable to load team analysis.'}</Text><Pressable style={s.frame} onPress={onRetry}><Text style={{color:accent}}>{tr?'Tekrar Dene':'Try Again'}</Text></Pressable></View>:sections.map(({key,title,color,Icon})=>key==='weakness'&&free?<TeamReportLockedDetail key={key} tr={tr} accent={color} kind="teamRisks" onOpenPlans={onOpenPlans}/>:<View key={key} style={[s.frame,{borderColor:`${color}70`,backgroundColor:`${color}08`}]}><View style={s.row}><Icon size={21} color={color}/><Text style={[s.title,{color}]}>{title}</Text></View><Text style={s.body}>{analysis?.[key]||'—'}</Text></View>)}
 </View>;
}
const s=StyleSheet.create({frame:{padding:14,borderWidth:1,borderColor:LINE,borderRadius:18,gap:13},rule:{height:3,borderRadius:3},hero:{flexDirection:'row',alignItems:'center',gap:13,padding:14,borderWidth:1,borderRadius:18},logo:{width:45,height:53},teamName:{flex:1,fontSize:21,fontWeight:'800'},row:{flexDirection:'row',alignItems:'center',gap:9},title:{flex:1,fontSize:16,fontWeight:'800'},body:{color:TEXT,fontSize:13,lineHeight:22},caption:{color:MUTED,fontSize:12},feedback:{paddingVertical:40,alignItems:'center',gap:15}});
