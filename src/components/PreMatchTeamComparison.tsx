import {usePreMatchSection} from './PreMatchReportContext';
import React,{useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {ACCENT,LINE,MUTED,TEXT} from '@/theme';
import {type PostMatchCardData} from '@/services/matchPool';
import MatchReportTeamComparison from './MatchReportTeamComparison';
import ActionSpinner from './ActionSpinner';
export default function PreMatchTeamComparison({data,tr,active}:{data:PostMatchCardData;tr:boolean;active:boolean}){
 const {result,error,loading,onRetry}=usePreMatchSection('squad');
 if(error)return <View style={s.feedback}><Text style={s.caption}>{tr?'Takım karşılaştırması yüklenemedi.':'Unable to load team comparison.'}</Text><Pressable style={s.frame} onPress={onRetry}><Text style={{color:ACCENT}}>{tr?'Tekrar Dene':'Try Again'}</Text></Pressable></View>;
 if(!result)return <View style={s.feedback}><ActionSpinner size={25} color={ACCENT}/><Text style={s.caption}>{tr?'Takım istatistikleri yükleniyor…':'Loading team statistics…'}</Text></View>;
 const teams=[...data.teams].sort((a,b)=>Number(a.location!=='home')-Number(b.location!=='home'));
 const comparison={...data,teams:teams.map(team=>{const metrics=result.teams.find(t=>t.team_id===team.id)?.team_comparison||{};return {...team,categories:metrics,expected_metrics:metrics.expected||[]};})};
 return <View style={{gap:8}}><MatchReportTeamComparison data={comparison} tr={tr} preMatch/><Text style={{color:MUTED,fontSize:10,lineHeight:15,textAlign:'center',opacity:.75}}>{teams.map(team=>`${team.name} · ${tr?'Son':'Last'} ${result.teams.find(t=>t.team_id===team.id)?.sample_size??0} ${tr?'tamamlanmış maç':'completed matches'}`).join('\n')}</Text></View>;
}
const s=StyleSheet.create({frame:{borderWidth:1,borderColor:`${ACCENT}70`,borderRadius:18,padding:13,gap:12},title:{color:TEXT,fontSize:16,fontWeight:'800'},row:{borderTopWidth:1,borderTopColor:LINE,paddingTop:10,gap:5},name:{fontSize:13,fontWeight:'700'},caption:{color:MUTED,fontSize:11,lineHeight:17},feedback:{paddingVertical:40,alignItems:'center',gap:15}});
