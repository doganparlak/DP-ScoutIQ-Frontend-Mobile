import TeamReportHeader from './TeamReportHeader';
import React,{useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {ACCENT,CARD,LINE,MUTED,TEXT} from '@/theme';
import type {Team} from '@/services/teamPool';
import type {PlayedMatch} from '@/services/teamAnalysis';
import {matchPoolRequest} from '@/services/api';
import {matchMetricLabel} from '@/utils/matchReportMetrics';
import ActionSpinner from './ActionSpinner';
import ReportPlayerPortrait from './ReportPlayerPortrait';
import TeamReportLockedDetail from './TeamReportLockedDetail';
type Item={title?:string;name?:string;imageUrl?:string|null;position?:string;metrics:{label:string;value:string}[];analysis:string[]};
type Profile={themes:Item[];players:Item[]};
export default function TeamReportTacticalProfile({team,matches,tr,kind,active,free,onOpenPlans}:{team:Team;matches:PlayedMatch[];tr:boolean;kind:'attack'|'defense';active:boolean;free:boolean;onOpenPlans:()=>void}){
 const [mode,setMode]=useState<'strategy'|'players'>('strategy'),[profile,setProfile]=useState<Profile|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const [requested,setRequested]=useState(false);
 useEffect(()=>{if(active)setRequested(true);},[active]);
 const key=matches.map(m=>m.fixtureId).join(',');
 useEffect(()=>{if(!requested)return;let cancelled=false;setProfile(null);setError(false);matchPoolRequest<Profile>(`/team-analysis/report-profile/${kind}`,{teamId:Number(team.id),leagueId:team.leagueId,fixtureIds:matches.map(m=>m.fixtureId)}).then(p=>{if(!cancelled)setProfile(p);}).catch(()=>{if(!cancelled)setError(true);});return()=>{cancelled=true;};},[team.id,key,kind,tr,retry,requested,free]);
 const attack=kind==='attack',accent=attack?ACCENT:'#FB923C';
 const strategy=attack?(tr?'Takım Hücum\nPlanı':'Team Attack Plan'):(tr?'Takım Savunma\nPlanı':'Team Defense Plan');
 const players=attack?(tr?'Kilit Hücum Oyuncuları':'Key Attacking Players'):(tr?'Kilit Savunma Oyuncuları':'Key Defensive Players');
 return <View style={{gap:13}}><TeamReportHeader team={team} matches={matches.length} tr={tr} accent={accent}/><View style={[s.frame,{borderColor:`${accent}80`}]}><Text style={s.caption}>{tr?'Değerler 90 dakika başına; oranlar yüzde olarak gösterilir.':'Values per 90 minutes; rates retain their percentages.'}</Text><View style={s.switch}>{(['strategy','players'] as const).map(v=><Pressable key={v} accessibilityRole="tab" accessibilityState={{selected:mode===v}} onPress={()=>setMode(v)} style={[s.option,mode===v&&{backgroundColor:`${accent}25`,borderColor:accent}]}><Text style={[s.optionText,{color:mode===v?accent:MUTED}]}>{v==='strategy'?strategy:players}</Text></Pressable>)}</View></View>
 {!profile?error?<View style={s.frame}><Text style={s.caption}>{tr?'Profil hazırlanamadı.':'Unable to prepare profile.'}</Text><Pressable onPress={()=>setRetry(r=>r+1)}><Text style={{color:accent}}>{tr?'Tekrar Dene':'Retry'}</Text></Pressable></View>:<View style={s.center}><ActionSpinner color={accent} size={28}/><Text style={s.caption}>{tr?'Profil hazırlanıyor…':'Preparing profile…'}</Text></View>:(mode==='strategy'?profile.themes.slice(0,2):profile.players.slice(0,2)).map((item,i)=><View key={i} style={[s.frame,{borderColor:`${accent}80`,backgroundColor:`${accent}08`}]}>{mode==='players'?<View style={s.playerHeader}><ReportPlayerPortrait imageUrl={item.imageUrl} accent={accent} size={51}/><View style={{flex:1,gap:6}}><Text style={[s.title,{color:accent}]}>{matchMetricLabel(item.title||item.name||'',tr?'tr':'en')}</Text>{!!item.position&&<Text style={s.caption}>{tr?({goalkeeper:'Kaleci',defender:'Savunma',midfielder:'Orta Saha',attacker:'Hücum',forward:'Hücum'}[item.position.toLowerCase()]||item.position):item.position}</Text>}</View></View>:<Text style={[s.title,{color:accent}]}>{matchMetricLabel(item.title||item.name||'',tr?'tr':'en')}</Text>}<View style={s.grid}>{item.metrics.slice(0,4).map((metric,j)=><View key={j} style={[s.metric,{borderColor:`${accent}65`,backgroundColor:`${accent}08`}]}><Text style={s.caption}>{matchMetricLabel(metric.label,tr?'tr':'en')}</Text><Text style={[s.value,{color:accent}]}>{metric.value}</Text></View>)}</View>{mode==='strategy'&&!free&&!!item.analysis?.[0]&&<View style={[s.bullet,{borderColor:`${accent}45`}]}><Text style={{color:accent}}>•</Text><Text style={s.explanation}>{item.analysis[0]}</Text></View>}</View>)}
 {profile&&mode==='strategy'&&free&&<TeamReportLockedDetail tr={tr} accent={accent} kind={attack?'attack':'defense'} onOpenPlans={onOpenPlans}/>} 
 </View>;
}
const s=StyleSheet.create({frame:{borderWidth:1,borderColor:LINE,borderRadius:18,padding:14,gap:14,backgroundColor:CARD},playerHeader:{flexDirection:'row',alignItems:'center',gap:11},name:{fontSize:22,color:TEXT,fontWeight:'900'},title:{fontSize:19,fontWeight:'800'},caption:{fontSize:11,lineHeight:17,color:MUTED},switch:{flexDirection:'row',borderWidth:1,borderColor:LINE,borderRadius:16,padding:4,gap:4},option:{flex:1,padding:10,borderWidth:1,borderColor:'transparent',borderRadius:12,justifyContent:'center'},optionText:{fontSize:12,textAlign:'center',fontWeight:'800'},grid:{flexDirection:'row',flexWrap:'wrap',gap:9},metric:{flexBasis:'45%',flexGrow:1,borderWidth:1,borderColor:LINE,borderRadius:12,padding:10,gap:10},value:{fontSize:21,fontWeight:'900'},bullet:{flexDirection:'row',gap:8,borderTopWidth:1,borderColor:LINE,paddingTop:12},explanation:{flex:1,fontSize:14,lineHeight:23,color:TEXT},center:{alignItems:'center',padding:30,gap:12}});
