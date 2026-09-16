import TeamReportHeader from './TeamReportHeader';
import React, {useMemo, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {Activity, LayoutGrid, RefreshCw, ShieldCheck, Shirt, Users} from 'lucide-react-native';
import {ACCENT, CARD, DANGER, LINE, MUTED, TEXT} from '@/theme';
import type {Team} from '@/services/teamPool';
import ReportPlayerPortrait from './ReportPlayerPortrait';
type Metric={name:string;value:number|string|null};
type Report={teams:{id:number;formation?:string}[];lineups:{team_id:number;player_id:number;player_name:string;player_image_url?:string|null;position_name?:string;starter?:boolean;categories?:Record<string,Metric[]>;extra_metrics?:Metric[]}[]};
type Player={id:string;name:string;imageUrl?:string|null;position:string;appearances:number;starts:number;bench:number;minutes:number;ratingTotal:number;ratingWeight:number;rating:number|null};
type Perspective={selectionType:string;text?:string;rating?:number};
function position(value:string|undefined,tr:boolean){const p=(value||'').toLowerCase();return !tr?value||'Unknown':p.includes('goalkeeper')?'Kaleci':p.includes('defender')?'Savunma':p.includes('midfielder')?'Orta Saha':p.includes('attacker')||p.includes('forward')?'Hücum':value||'Bilinmiyor';}
export function aggregateSquad(reports:Report[],teamId:string,tr:boolean){
 const players=new Map<string,Player>(),formations=new Map<string,number>();
 for(const report of reports){
  const formation=report.teams?.find(t=>String(t.id)===String(teamId))?.formation;
  if(formation)formations.set(formation,(formations.get(formation)||0)+1);
  for(const row of report.lineups||[]){
   if(String(row.team_id)!==String(teamId))continue;
   const rawMinutes=row.categories?.contribution_impact?.find(m=>m.name==='Minutes Played')?.value;
   const minutes=rawMinutes==null?NaN:Number(rawMinutes),hasMinutes=Number.isFinite(minutes);
   if(!row.starter&&!(hasMinutes&&minutes>0))continue;
   const metrics=[...Object.values(row.categories||{}).flat(),...(row.extra_metrics||[])];
   const rawRating=metrics.find(m=>m.name.toLowerCase().includes('rating'))?.value;
   const rating=rawRating==null?NaN:Number(rawRating),id=String(row.player_id||row.player_name);
   const p=players.get(id)||{id,name:row.player_name,imageUrl:row.player_image_url,position:position(row.position_name,tr),appearances:0,starts:0,bench:0,minutes:0,ratingTotal:0,ratingWeight:0,rating:null};
   if(!p.imageUrl&&row.player_image_url)p.imageUrl=row.player_image_url;
   p.appearances++;if(row.starter)p.starts++;else if(hasMinutes&&minutes>0)p.bench++;
   if(hasMinutes)p.minutes+=minutes;
   if(Number.isFinite(rating)){const weight=hasMinutes&&minutes>0?minutes:1;p.ratingTotal+=rating*weight;p.ratingWeight+=weight;}
   players.set(id,p);
  }
 }
 const ranked=[...players.values()].map(p=>({...p,rating:p.ratingWeight?p.ratingTotal/p.ratingWeight:null})).sort((a,b)=>b.minutes-a.minutes||b.starts-a.starts||b.appearances-a.appearances);
 const positions=new Map<string,number>();for(const p of ranked)positions.set(p.position,(positions.get(p.position)||0)+1);
 const rated=ranked.filter(p=>p.minutes>=90&&p.rating!=null);
 const starters=ranked.filter(p=>p.starts>0).length,subs=ranked.filter(p=>p.bench>0).length;
 return {ranked,formations:[...formations.entries()].sort((a,b)=>b[1]-a[1]),positions:[...positions.entries()].sort((a,b)=>b[1]-a[1]),rating:rated.length?rated.reduce((sum,p)=>sum+p.rating!,0)/rated.length:null,rotation:starters+subs?Math.round(subs/(starters+subs)*100):0};
}
export default function TeamReportSquad({team,reports,matches,tr,playersPage=false,perspectives={}}:{team:Team;reports:Report[];matches:number;tr:boolean;playersPage?:boolean;perspectives?:Record<string,Perspective>}){
 const [mode,setMode]=useState<'featured'|'development'>('featured'),[logoFailed,setLogoFailed]=useState(false);
 const squad=useMemo(()=>aggregateSquad(reports,team.id,tr),[reports,team.id,tr]);
 const accent=playersPage&&mode==='development'?DANGER:ACCENT;
 const distribution=(title:string,rows:[string,number][],total:number,color:string,unit:string)=> <View style={[s.frame,{borderColor:`${color}70`}]}><Text style={s.title}>{title}</Text>{rows.map(([name,count])=><View key={name} style={{gap:8}}><View style={s.row}><Text style={[s.text,{flex:1}]}>{name}</Text><Text style={[s.caption,{color}]}>{count} {unit} · {total?Math.round(count/total*100):0}%</Text></View><View style={s.track}><View style={{height:6,borderRadius:3,backgroundColor:color,width:`${count/(rows[0]?.[1]||1)*100}%`}}/></View></View>)}{!rows.length&&<Text style={s.caption}>{tr?'Veri bulunamadı.':'No data available.'}</Text>}</View>;
 const selected=Object.entries(perspectives).filter(([,p])=>p.selectionType===mode).slice(0,3);
 return <View style={{gap:12}}>
  <TeamReportHeader team={team} matches={matches} tr={tr} accent={accent}/>
  {playersPage?<>
   <View style={s.switch}>{(['featured','development'] as const).map(value=><Pressable key={value} accessibilityRole="tab" accessibilityState={{selected:mode===value}} onPress={()=>setMode(value)} style={[s.option,mode===value&&{backgroundColor:`${value==='featured'?ACCENT:DANGER}25`,borderColor:value==='featured'?ACCENT:DANGER}]}><Text style={[s.optionText,{color:mode===value?accent:MUTED}]}>{value==='featured'?(tr?'Öne Çıkan Oyuncular':'Standout Players'):(tr?'Gelişime Açık Oyuncular':'Development Players')}</Text></Pressable>)}</View>
   <Text style={s.caption}>{tr?'En az 90 dakika oynayan oyuncular · Dakika ağırlıklı puan':'Players with at least 90 minutes · Minute-weighted rating'}</Text>
   {selected.map(([id,p])=>{const player=squad.ranked.find(row=>row.id===id);return <View key={id} style={[s.frame,{borderColor:`${accent}90`,backgroundColor:`${accent}08`}]}><View style={s.row}><ReportPlayerPortrait imageUrl={player?.imageUrl} accent={accent} size={49}/><View style={{flex:1,gap:6}}><Text style={s.name}>{player?.name||'—'}</Text><Text style={s.caption}>{player?.position||'—'} · {Math.round(player?.minutes||0)} {tr?'dk.':'min'}</Text></View><View style={[s.rating,{borderColor:accent}]}><Text style={[s.ratingValue,{color:accent}]}>{(p.rating??player?.rating)?.toFixed(2)??'—'}</Text><Text style={s.caption}>{tr?'Puan':'Rating'}</Text></View></View></View>;})}
   {!selected.length&&<View style={s.frame}><Text style={s.caption}>{tr?'Bu grupta değerlendirmeye uygun oyuncu bulunamadı.':'No eligible players in this group.'}</Text></View>}
  </>:<>
   <View style={s.grid}>{[
    {Icon:Users,label:tr?'Sahaya Çıkan Oyuncu':'Players Appeared',value:squad.ranked.length,color:'#38BDF8'},
    {Icon:Activity,label:tr?'90+ Dk. Oyuncu Puanı':'90+ Min Player Score',value:squad.rating?.toFixed(2)||'—',color:'#F59E0B'},
    {Icon:RefreshCw,label:tr?'Rotasyon Seviyesi':'Rotation Level',value:`${squad.rotation}%`,color:'#F472B6'},
    {Icon:LayoutGrid,label:tr?'En Çok Kullanılan Diziliş':'Most-used Formation',value:squad.formations[0]?.[0]||'—',color:ACCENT},
   ].map(({Icon,label,value,color})=><View key={label} style={[s.stat,{borderColor:`${color}70`}]}><View style={s.row}><Icon size={20} color={color}/><Text style={[s.ratingValue,{color,flex:1,textAlign:'right'}]}>{value}</Text></View><Text style={s.caption}>{label}</Text></View>)}</View>
   {distribution(tr?'Diziliş Tercihleri':'Formation Choices',squad.formations,squad.formations.reduce((sum,r)=>sum+r[1],0),ACCENT,tr?'maç':'matches')}
   {distribution(tr?'Pozisyon Dağılımı':'Position Distribution',squad.positions,squad.ranked.length,'#38BDF8',tr?'oyuncu':'players')}
  </>}
 </View>;
}
const s=StyleSheet.create({frame:{borderWidth:1,borderColor:`${ACCENT}60`,borderRadius:18,backgroundColor:CARD,padding:14,gap:15},row:{flexDirection:'row',alignItems:'center',gap:10},name:{color:TEXT,fontSize:19,fontWeight:'900'},title:{color:TEXT,fontSize:17,fontWeight:'800'},text:{color:TEXT,fontSize:14,fontWeight:'700'},caption:{color:MUTED,fontSize:11,fontWeight:'600',flexShrink:1},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},stat:{flexBasis:'45%',flexGrow:1,borderWidth:1,borderRadius:16,padding:12,gap:12,backgroundColor:CARD},track:{height:6,borderRadius:3,backgroundColor:'#FFFFFF09'},switch:{flexDirection:'row',gap:5,borderWidth:1,borderColor:LINE,borderRadius:18,padding:5},option:{flex:1,borderWidth:1,borderColor:'transparent',borderRadius:13,padding:11,justifyContent:'center'},optionText:{fontSize:12,fontWeight:'800',textAlign:'center'},rating:{padding:10,borderWidth:1,borderRadius:14,alignItems:'center',gap:4},ratingValue:{fontSize:24,fontWeight:'900'},explanation:{color:TEXT,fontSize:14,lineHeight:23}});
