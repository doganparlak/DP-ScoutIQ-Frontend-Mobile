import TeamReportHeader from './TeamReportHeader';
import React from 'react';
import {ScrollView,StyleSheet,Text,View} from 'react-native';
import {ACCENT,CARD,DANGER,LINE,MUTED,TEXT} from '@/theme';
import type {Team} from '@/services/teamPool';
type Report={pressure?:{team_id:number;minute:number;value:number}[];events?:{team_id:number;minute:number;type:string}[]};
export function momentumRows(reports:Report[],teamId:string){
 const values=new Map<number,number[]>(),events:{minute:number;kind:string}[]=[];
 for(const report of reports){
  const own=new Map<number,number>(),opponent=new Map<number,number>();
  for(const p of report.pressure||[]){const target=String(p.team_id)===String(teamId)?own:opponent,minute=Number(p.minute);target.set(minute,(target.get(minute)||0)+Number(p.value||0));}
  for(const minute of new Set([...own.keys(),...opponent.keys()]))values.set(minute,[...(values.get(minute)||[]),(own.get(minute)||0)-(opponent.get(minute)||0)]);
  for(const e of report.events||[]){const type=String(e.type||'').toLowerCase(),isOwn=String(e.team_id)===String(teamId);const kind=type.includes('goal')?(isOwn?'for':'against'):type.includes('substitution')&&isOwn?'sub':null;if(kind)events.push({minute:Number(e.minute||0),kind});}
 }
 const points=[...values.entries()].map(([minute,v])=>({minute,value:v.reduce((a,b)=>a+b,0)/v.length}));
 return [[0,10],[11,20],[21,30],[31,40],[41,50],[51,60],[61,70],[71,80],[81,90],[91,Infinity]].map(([start,end])=>{
  const scoped=points.filter(p=>p.minute>=start&&p.minute<=end),ev=events.filter(e=>e.minute>=start&&e.minute<=end);
  return {period:start===91?'90+':`${start}–${end}`,hasData:scoped.length>0,average:scoped.length?scoped.reduce((a,p)=>a+p.value,0)/scoped.length:0,dominant:scoped.length?Math.round(scoped.filter(p=>p.value>0).length/scoped.length*100):0,goalsFor:ev.filter(e=>e.kind==='for').length,goalsAgainst:ev.filter(e=>e.kind==='against').length,substitutions:ev.filter(e=>e.kind==='sub').length};
 });
}
export default function TeamReportMomentum({team,reports,tr}:{team:Team;reports:Report[];tr:boolean}){
 const rows=momentumRows(reports,team.id),magnitudes=rows.map(r=>Math.abs(r.average)).filter(v=>v>Number.EPSILON).sort((a,b)=>a-b);
 const quantile=(r:number)=>magnitudes[Math.floor((magnitudes.length-1)*r)]||Number.EPSILON,balanced=quantile(.25),strong=quantile(.75);
 function trend(v:number){if(Math.abs(v)<balanced)return {text:tr?'Dengeli':'Balanced',color:MUTED};if(v>=strong)return {text:tr?'Belirgin üstünlük':'Clear dominance',color:ACCENT};if(v>0)return {text:tr?'Hafif üstünlük':'Slight dominance',color:'#86EFAC'};if(Math.abs(v)>=strong)return {text:tr?'Baskı kaybı':'Pressure lost',color:DANGER};return {text:tr?'Hafif gerileme':'Slight decline',color:'#FCA5A5'};}
 return <View style={{gap:12}}><TeamReportHeader team={team} matches={reports.length} tr={tr}/><View style={s.frame}><Text style={s.title}>{tr?'10 Dakikalık Baskı Özeti':'10-minute Pressure Summary'}</Text>
 <View style={s.table}>
 <View style={[s.row,s.header]}><Text style={[s.label,s.minute]}>{tr?'Dk.':'Min'}</Text><Text style={[s.label,s.trend]}>{tr?'Baskı Eğilimi':'Pressure Trend'}</Text><View style={s.event}><Text style={[s.label,{color:ACCENT}]}>{tr?'Atılan':'For'}</Text></View><View style={s.event}><Text style={[s.label,{color:DANGER}]}>{tr?'Yenilen':'Against'}</Text></View><View style={s.event}><Text style={s.label}>{tr?'Değ.':'Subs'}</Text></View></View>
 {rows.map((row,i)=>{const t=trend(row.average);return <View key={row.period} style={[s.row,i%2===1&&{backgroundColor:'#FFFFFF03'}]}><Text style={[s.cell,s.minute]}>{row.period}′</Text><Text style={[s.cell,s.trend,{color:row.hasData?t.color:MUTED}]}>{row.hasData?t.text:'—'}</Text><Text style={[s.cell,s.event,{color:ACCENT}]}>{row.goalsFor||'—'}</Text><Text style={[s.cell,s.event,{color:DANGER}]}>{row.goalsAgainst||'—'}</Text><Text style={[s.cell,s.event,{color:'#38BDF8'}]}>{row.substitutions||'—'}</Text></View>;})}</View></View></View>;

}
const s=StyleSheet.create({frame:{padding:12,gap:14,borderWidth:1,borderColor:`${ACCENT}70`,borderRadius:18,backgroundColor:CARD},title:{color:TEXT,fontSize:19,fontWeight:'800'},caption:{color:MUTED,fontSize:13,lineHeight:19},table:{borderWidth:1,borderColor:`${ACCENT}40`,borderRadius:14,overflow:'hidden'},row:{flexDirection:'row',borderBottomWidth:1,borderColor:LINE,alignItems:'center',minHeight:60,paddingHorizontal:4},header:{backgroundColor:`${ACCENT}12`,minHeight:54},cell:{paddingVertical:10,paddingHorizontal:3,fontSize:13,fontWeight:'700',color:TEXT},label:{color:MUTED,fontSize:11,fontWeight:'700',textAlign:'center'},minute:{flex:0.85,textAlign:'center'},trend:{flex:1.85,paddingHorizontal:4},event:{flex:0.73,textAlign:'center',alignItems:'center',justifyContent:'center',gap:4}});
