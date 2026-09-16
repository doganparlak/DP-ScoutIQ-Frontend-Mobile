import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {ACCENT,CARD,DANGER,LINE,MUTED,TEXT} from '@/theme';
import type {Team} from '@/services/teamPool';
import {matchMetricLabel} from '@/utils/matchReportMetrics';
import TeamReportHeader from './TeamReportHeader';
import ActionSpinner from './ActionSpinner';
import TeamReportLockedDetail from './TeamReportLockedDetail';
export type AssessmentProfile={themes:{title:string;metrics:{label:string;value:string}[];analysis:string[]}[]};
export type TeamAssessment={strengths:AssessmentProfile;weaknesses:AssessmentProfile};
export default function TeamReportAssessment({team,matches,tr,weak,profile,error,onRetry,free,onOpenPlans}:{team:Team;matches:number;tr:boolean;weak:boolean;profile?:AssessmentProfile;error:boolean;onRetry:()=>void;free:boolean;onOpenPlans:()=>void}){
 const accent=weak?DANGER:ACCENT;
 return <View style={{gap:12}}><TeamReportHeader team={team} matches={matches} tr={tr} accent={accent}/><Text style={s.caption}>{tr?'Değerler 90 dakika başına; oranlar yüzde olarak gösterilir.':'Values per 90 minutes; rates retain their percentages.'}</Text>
 {!profile?error?<View style={s.frame}><Text style={s.caption}>{tr?'Analiz hazırlanamadı.':'Unable to prepare analysis.'}</Text><Pressable onPress={onRetry}><Text style={{color:accent}}>{tr?'Tekrar Dene':'Retry'}</Text></Pressable></View>:<View style={s.center}><ActionSpinner size={28} color={accent}/><Text style={s.caption}>{tr?'Analiz hazırlanıyor…':'Preparing analysis…'}</Text></View>:profile.themes.slice(0,2).map((topic,i)=><View key={i} style={[s.frame,{borderColor:`${accent}70`,backgroundColor:`${accent}08`}]}><Text style={[s.kicker,{color:accent}]}>{weak?(tr?'Zayıf Yön':'Weakness'):(tr?'Güçlü Yön':'Strength')} {i+1}</Text><Text style={s.title}>{matchMetricLabel(topic.title,tr?'tr':'en')}</Text><View style={s.grid}>{topic.metrics.slice(0,4).map((m,j)=><View key={j} style={[s.metric,{borderColor:`${accent}55`}]}><Text style={s.caption}>{matchMetricLabel(m.label,tr?'tr':'en')}</Text><Text style={[s.value,{color:accent}]}>{m.value}</Text></View>)}</View>{!free&&!!topic.analysis?.[0]&&<View style={[s.bullet,{borderColor:`${accent}40`}]}><Text style={{color:accent}}>•</Text><Text style={s.body}>{topic.analysis[0]}</Text></View>}</View>)}
 {profile&&free&&<TeamReportLockedDetail tr={tr} accent={accent} kind={weak?'weaknesses':'strengths'} onOpenPlans={onOpenPlans}/>} 
 </View>;
}
const s=StyleSheet.create({frame:{borderWidth:1,borderColor:LINE,borderRadius:18,backgroundColor:CARD,padding:14,gap:14},caption:{color:MUTED,fontSize:11,lineHeight:17},center:{padding:30,alignItems:'center',gap:12},kicker:{fontSize:12,fontWeight:'800'},title:{fontSize:19,fontWeight:'900',color:TEXT},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{flexGrow:1,flexBasis:'45%',borderWidth:1,borderRadius:13,padding:11,gap:10,backgroundColor:'#FFFFFF03'},value:{fontSize:22,fontWeight:'900'},bullet:{flexDirection:'row',gap:8,borderTopWidth:1,paddingTop:12},body:{color:TEXT,fontSize:14,lineHeight:23,flex:1}});
