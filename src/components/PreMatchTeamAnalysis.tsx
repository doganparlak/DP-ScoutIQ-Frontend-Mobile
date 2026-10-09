import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { ShieldAlert,ShieldCheck,Target } from 'lucide-react-native';
import { useState } from 'react';
import { Image,Pressable,StyleSheet,Text,View } from 'react-native';
import { usePreMatchSection } from './PreMatchReportContext';

import { type PostMatchCardData } from '@/services/matchPool';
import ActionSpinner from './ActionSpinner';
import { MatchReportSelector } from './MatchReportPlayerAnalysis';
import TeamReportLockedDetail from './TeamReportLockedDetail';
export default function PreMatchTeamAnalysis({data,tr,active,free,onOpenPlans}:{data:PostMatchCardData;tr:boolean;active:boolean;free:boolean;onOpenPlans:()=>void}){
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, s, themeColor} = themed;

 const {result,error,loading,onRetry}=usePreMatchSection('team_analysis');
 const [teamId,setTeamId]=useState<number>();
 const teams=[...data.teams].sort((a,b)=>Number(a.location!=='home')-Number(b.location!=='home')),team=teams.find(t=>t.id===teamId)||teams[0],accent=team?.location==='away'?themeColor('#38BDF8'):ACCENT;
 const analysis=result?.teams[String(team?.id)];
 const sections=[{key:'positive' as const,title:tr?'Güçlü Yönler':'Strengths',color:accent,Icon:ShieldCheck},{key:'strategy' as const,title:tr?'Rakibe Karşı Plan':'Plan Against the Opponent',color:themeColor('#FCD34D', 'text'),Icon:Target},{key:'weakness' as const,title:tr?'Zayıf Yönler & Riskler':'Weaknesses & Risks',color:themeColor('#F87171', 'text'),Icon:ShieldAlert}];
 return <View style={{gap:15}}><View style={[s.frame,{borderColor:`${accent}70`}]}><View style={[s.rule,{backgroundColor:accent}]}/><MatchReportSelector label={tr?'Takım Seçimi':'Select Team'} value={team?.name||'—'} options={teams.map(t=>({id:t.id,name:t.name,detail:t.location==='away'?tr?'Deplasman':'Away':tr?'Ev Sahibi':'Home',color:t.location==='away'?themeColor('#38BDF8', 'text'):ACCENT}))} onSelect={setTeamId} accent={accent}/></View>
 <View style={[s.hero,{borderColor:`${accent}60`}]}>{team?.image_url&&<Image source={{uri:team.image_url}} style={s.logo} resizeMode="contain"/>}<Text style={[s.teamName,{color:accent}]}>{team?.name}</Text></View>
 {loading?<View style={s.feedback}><ActionSpinner size={25} color={accent}/><Text style={s.caption}>{tr?'Takım analizi hazırlanıyor…':'Preparing team analysis…'}</Text></View>:error?<View style={s.feedback}><Text style={s.caption}>{tr?'Takım analizi yüklenemedi.':'Unable to load team analysis.'}</Text><Pressable style={s.frame} onPress={onRetry}><Text style={{color:accent}}>{tr?'Tekrar Dene':'Try Again'}</Text></Pressable></View>:sections.map(({key,title,color,Icon})=>key==='weakness'&&free?<TeamReportLockedDetail key={key} tr={tr} accent={color} kind="teamRisks" onOpenPlans={onOpenPlans}/>:<View key={key} style={[s.frame,{borderColor:`${color}70`,backgroundColor:`${color}08`}]}><View style={s.row}><Icon size={21} color={color}/><Text style={[s.title,{color}]}>{title}</Text></View><Text style={s.body}>{analysis?.[key]||'—'}</Text></View>)}
 </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, LINE, MUTED, TEXT, themeColor} = colors;

  const s=StyleSheet.create({frame:{padding:14,borderWidth:1,borderColor:LINE,borderRadius:18,gap:13},rule:{height:3,borderRadius:3},hero:{flexDirection:'row',alignItems:'center',gap:13,padding:14,borderWidth:1,borderRadius:18},logo:{width:45,height:53},teamName:{flex:1,fontSize:21,fontWeight:'800'},row:{flexDirection:'row',alignItems:'center',gap:9},title:{flex:1,fontSize:16,fontWeight:'800'},body:{color:TEXT,fontSize:13,lineHeight:22},caption:{color:MUTED,fontSize:12},feedback:{paddingVertical:40,alignItems:'center',gap:15}});
  return {ACCENT, LINE, MUTED, TEXT, s, themeColor};
});
