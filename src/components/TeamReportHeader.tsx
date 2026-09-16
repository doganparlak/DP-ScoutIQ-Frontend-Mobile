import React from 'react';
import {Text,View} from 'react-native';
import {ACCENT,CARD,MUTED} from '@/theme';
import type {Team} from '@/services/teamPool';
import TeamReportIdentity from './TeamReportIdentity';
export default function TeamReportHeader({team,matches,tr,accent=ACCENT}:{team:Team;matches:number;tr:boolean;accent?:string}){
 return <View style={{borderWidth:1,borderColor:`${accent}70`,borderRadius:18,padding:14,gap:14,backgroundColor:CARD}}>
  <View style={{height:4,borderRadius:3,backgroundColor:accent}}/>
  <TeamReportIdentity team={team} accent={accent}/>
  <Text style={{color:MUTED,fontSize:12,fontWeight:'600'}}>{matches} {tr?'seçili maç':'selected matches'}</Text>
 </View>;
}
