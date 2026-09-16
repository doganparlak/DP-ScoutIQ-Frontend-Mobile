import React,{useMemo,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {ACCENT,CARD,LINE,MUTED,TEXT} from '@/theme';
import type {Team} from '@/services/teamPool';
import type {MatchReportLineup,PostMatchCardData} from '@/services/matchPool';
import {MatchReportSelector,Metrics} from './MatchReportPlayerAnalysis';
import {matchMetricLabel} from '@/utils/matchReportMetrics';
import {playerGroups,setPieceTarget,numeric} from '@/utils/matchReportPlayers';
import TeamReportHeader from './TeamReportHeader';
import ReportPlayerPortrait from './ReportPlayerPortrait';
const groups=[['contribution_impact','Katkı ve Etki','Contribution & Impact'],['shooting','Şut','Shooting'],['passing','Pas','Passing'],['set_pieces','Duran Toplar','Set Pieces'],['defending','Savunma','Defending'],['errors_discipline','Hatalar ve Disiplin','Errors & Discipline'],['expected','Gelişmiş Metrikler','Advanced Metrics']];
type TeamMetric={name:string;perMatch:number;matchesCovered:number;aggregation:string};
export function TeamReportTeamData({team,matches,metrics,tr}:{team:Team;matches:number;metrics:Record<string,TeamMetric[]>;tr:boolean}){
 const [selected,setSelected]=useState(0);
 const available=groups.filter(g=>metrics[g[0]]?.length),group=available[selected]||available[0];
 return <View style={{gap:12}}><TeamReportHeader team={team} matches={matches} tr={tr}/><View style={s.frame}><Text style={s.caption}>{tr?'Tüm istatistikler maç başına gösterilir; oranlar yüzde olarak korunur.':'All statistics are per match; rates retain their percentages.'}</Text><MatchReportSelector label={tr?'Analiz Bölümü':'Analysis Section'} value={group?.[tr?1:2]||'—'} options={available.map((g,id)=>({id,name:g[tr?1:2]}))} onSelect={setSelected} accent={ACCENT}/></View><View style={s.grid}>{(group?metrics[group[0]]:[]).filter(m=>group?.[0]!=='contribution_impact'||!/^Shooting Performance(?: \(SP\))?$/i.test(m.name)).map(m=><View key={m.name} style={s.metric}><Text style={s.caption}>{matchMetricLabel(m.name,tr?'tr':'en')}</Text><Text style={s.value}>{m.perMatch.toLocaleString(tr?'tr-TR':'en-GB',{maximumFractionDigits:2})}{/%|percentage/i.test(m.name)?'%':''}</Text><Text style={s.coverage}>{m.matchesCovered} {tr?'maç':'matches'}</Text></View>)}</View>{!group&&<Text style={s.caption}>{tr?'Takım istatistiği bulunamadı.':'No team statistics available.'}</Text>}</View>;
}
const pairs:Record<string,[string,string]>={'Shots On Target (%)':['Shots On Target','Shots Total'],'Goal Conversion (%)':['Goals','Shots Total'],'On Target Goal Conversion (%)':['Goals','Shots On Target'],'Assist Efficiency (%)':['Assists','Key Passes'],'Dribble Accuracy (%)':['Successful Dribbles','Dribble Attempts'],'Tackles Won (%)':['Tackles Won','Tackles'],'Aerials Won (%)':['Aerials Won','Aerials'],'Duels Won (%)':['Duels Won','Total Duels'],'Long Balls Won (%)':['Long Balls Won','Long Balls'],'Accurate Passes (%)':['Accurate Passes','Passes'],'Accurate Crosses (%)':['Accurate Crosses','Total Crosses']};
export function aggregatePlayerData(reports:PostMatchCardData[],teamId:string){
 const players=new Map<number,{player:MatchReportLineup;minutes:number;starts:number;bench:number;appearances:number;stats:Record<string,Map<string,{sum:number;weighted:number;weight:number;average:boolean}>>}>();
 for(const report of reports)for(const row of report.lineups||[]){
  if(String(row.team_id)!==String(teamId))continue;
  const minutes=numeric(row.categories?.contribution_impact?.find(m=>m.name==='Minutes Played')?.value)||0;
  if(!row.starter&&minutes<=0)continue;
  const p=players.get(row.player_id)||{player:{...row},minutes:0,starts:0,bench:0,appearances:0,stats:{}};
  p.minutes+=minutes;p.appearances++;if(row.starter)p.starts++;else if(minutes>0)p.bench++;
  const sources:Record<string,NonNullable<MatchReportLineup['expected_metrics']>>={};
  for(const [key,rows] of Object.entries(row.categories||{})){if(key==='set_pieces'){for(const m of rows){const target=setPieceTarget(m.name);(sources[target]??=[]).push(m);}}else (sources[key]??=[]).push(...rows);}
  for(const m of row.expected_metrics||[]){const target=setPieceTarget(m.name);(sources[target]??=[]).push(m);}
  for(const [group,metrics] of Object.entries(sources))for(const metric of metrics){
   if(group==='contribution_impact'&&/^Shooting Performance(?: \(SP\))?$/i.test(metric.name))continue;
   const value=numeric(metric.value);if(value==null)continue;
   const map=p.stats[group]??=new Map(),entry=map.get(metric.name)||{sum:0,weighted:0,weight:0,average:/%|percentage|rating|performance|captain/i.test(metric.name)};
   entry.sum+=value;entry.weighted+=value*(minutes||1);entry.weight+=minutes||1;map.set(metric.name,entry);
  }
  players.set(row.player_id,p);
 }
 return [...players.values()].sort((a,b)=>b.minutes-a.minutes||b.starts-a.starts||b.appearances-a.appearances).map(p=>{
  const categories:NonNullable<MatchReportLineup['categories']>={};
  for(const [group,stats] of Object.entries(p.stats))categories[group]=[...stats.entries()].map(([name,v])=>{
   const pair=pairs[name],numerator=pair?stats.get(pair[0]):undefined,denominator=pair?stats.get(pair[1]):undefined;
   const value=numerator&&denominator&&denominator.sum>0?numerator.sum/denominator.sum*100:v.average?v.weighted/v.weight:p.minutes?v.sum/p.minutes*90:0;
   return {name,value};
  }).sort((a,b)=>a.name.localeCompare(b.name));
  const rating=categories.contribution_impact?.find(m=>m.name==='Rating')?.value;
  return {...p,rating:numeric(rating),player:{...p.player,categories,expected_metrics:[]}};
 });
}
export function TeamReportPlayerData({team,matches,reports,tr}:{team:Team;matches:number;reports:PostMatchCardData[];tr:boolean}){
 const players=useMemo(()=>aggregatePlayerData(reports,team.id),[reports,team.id]);
 const [playerId,setPlayerId]=useState<number>(),[show,setShow]=useState(false);
 const current=players.find(p=>p.player.player_id===playerId)||players[0],player=current?.player;
 const position=player?.position_name||'';
 return <View style={{gap:12}}><TeamReportHeader team={team} matches={matches} tr={tr}/><View style={s.frame}><MatchReportSelector label={tr?'Oyuncu Seçimi':'Select Player'} value={player?.player_name||'—'} options={players.map(p=>({id:p.player.player_id,name:p.player.player_name||'—'}))} onSelect={id=>{setPlayerId(id);setShow(false);}} accent={ACCENT}/><Text style={s.caption}>{players.length} {tr?'süre alan oyuncu':'players used'}</Text></View>{current&&player&&<View style={s.frame}><View style={s.playerHeader}><ReportPlayerPortrait imageUrl={player.player_image_url} accent={ACCENT} size={54}/><View style={{flex:1,gap:6}}><Text style={s.title}>{player.player_name}</Text><Text style={s.caption}>{tr?({goalkeeper:'Kaleci',defender:'Savunma',midfielder:'Orta Saha',attacker:'Hücum',forward:'Hücum'}[position.toLowerCase()]||position):position}</Text></View></View><View style={s.grid}>{[[tr?'Maç':'Appearances',current.appearances],[tr?'İlk 11 / Yedekten':'Starts / Substitute',`${current.starts} / ${current.bench}`],[tr?'Oynanan Süre (Maç Başına)':'Minutes (Per Match)',`${(current.appearances?current.minutes/current.appearances:0).toLocaleString(tr?'tr-TR':'en-GB',{maximumFractionDigits:1})} ${tr?'dk.':'min'}`],[tr?'Puan':'Rating',current.minutes>=90?current.rating?.toFixed(2)||'—':'—']].map(([label,value])=><View key={label} style={s.metric}><Text style={s.caption}>{label}</Text><Text style={s.value}>{value}</Text></View>)}</View><Text style={s.caption}>{tr?'Metrikler 90 dakika başına gösterilir; oranlar ve puan dakika ağırlıklıdır.':'Metrics are per 90 minutes; rates and ratings are minute-weighted.'}</Text><Pressable style={s.button} onPress={()=>setShow(true)}><Text style={{color:ACCENT,fontWeight:'800'}}>{tr?'Metrikleri Gör':'View Metrics'}</Text></Pressable></View>}{show&&player&&<Metrics player={player} tr={tr} accent={ACCENT} unit="per90" onClose={()=>setShow(false)}/>}</View>;
}
const s=StyleSheet.create({frame:{padding:14,gap:14,borderWidth:1,borderColor:`${ACCENT}60`,borderRadius:18,backgroundColor:CARD},playerHeader:{flexDirection:'row',alignItems:'center',gap:12},grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',rowGap:10},metric:{width:'48%',padding:12,gap:10,borderWidth:1,borderColor:`${ACCENT}50`,borderRadius:14,backgroundColor:CARD},caption:{color:MUTED,fontSize:11,lineHeight:17},coverage:{color:ACCENT,fontSize:10},value:{color:ACCENT,fontSize:22,fontWeight:'900'},title:{color:TEXT,fontSize:22,fontWeight:'900'},button:{padding:14,borderWidth:1,borderColor:ACCENT,borderRadius:14,alignItems:'center'}});
