import React, {useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import {Activity, CalendarCheck2, Home, Plane, ShieldCheck, ShieldX, Target} from 'lucide-react-native';
import {ACCENT, CARD, DANGER, LINE, MUTED, TEXT} from '@/theme';
import type {Team} from '@/services/teamPool';
import type {PlayedMatch} from '@/services/teamAnalysis';
import {matchDateOnly} from '@/services/matchPool';
const AWAY='#38BDF8';
function isHome(m:PlayedMatch,team:Team){return m.homeTeamId!=null?String(m.homeTeamId)===String(team.id):m.homeTeam===team.name;}
function result(m:PlayedMatch,team:Team){
  const home=isHome(m,team), scored=home?m.homeScore:m.awayScore, conceded=home?m.awayScore:m.homeScore;
  if(scored==null||conceded==null)return '—';
  return scored===conceded?'B':scored>conceded?'G':'M';
}
function summary(matches:PlayedMatch[],team:Team){
  return matches.reduce((s,m)=>{
    const home=isHome(m,team), r=result(m,team);
    s.matches++;s.goalsFor+=(home?m.homeScore:m.awayScore)??0;s.goalsAgainst+=(home?m.awayScore:m.homeScore)??0;
    if(r==='G')s.wins++;else if(r==='B')s.draws++;else if(r==='M')s.losses++;
    return s;
  },{matches:0,wins:0,draws:0,losses:0,goalsFor:0,goalsAgainst:0});
}
const color=(r:string)=>r==='G'?ACCENT:r==='M'?DANGER:TEXT;
const label=(r:string,tr:boolean)=>tr?r:({G:'W',B:'D',M:'L'}[r]??r);
export default function TeamReportFormResults({team,matches,tr}:{team:Team;matches:PlayedMatch[];tr:boolean}){
  const [logoFailed,setLogoFailed]=useState(false);
  const chronological=[...matches].sort((a,b)=>a.startingAt.localeCompare(b.startingAt)),total=summary(matches,team);
  const breakdown=(home:boolean)=>{
    const stats=summary(matches.filter(m=>isHome(m,team)===home),team),accent=home?ACCENT:AWAY,Icon=home?Home:Plane;
    return <View style={[s.frame,{borderColor:`${accent}80`}]}><View style={s.row}><Icon color={accent} size={21}/><View style={{flex:1}}><Text style={s.title}>{home?(tr?'İç Saha Performansı':'Home Performance'):(tr?'Deplasman Performansı':'Away Performance')}</Text><Text style={s.caption}>{stats.matches} {tr?'maç':'matches'}</Text></View></View><View style={s.row}>{[
      {label:tr?'Galibiyet':'Wins',value:stats.wins,color:ACCENT},{label:tr?'Beraberlik':'Draws',value:stats.draws,color:TEXT},{label:tr?'Mağlubiyet':'Losses',value:stats.losses,color:DANGER},
    ].map(item=><View style={s.mini} key={item.label}><Text style={[s.number,{color:item.color}]}>{item.value}</Text><Text style={s.miniLabel}>{item.label}</Text></View>)}</View><Text style={s.goals}>{tr?'Gol':'Goals'}: <Text style={{color:TEXT}}>{stats.goalsFor} – {stats.goalsAgainst}</Text></Text></View>;
  };
  return <View style={s.page}>
    <View style={[s.frame,{backgroundColor:`${ACCENT}0C`}]}><View style={s.row}>{team.logoUrl&&!logoFailed?<Image source={{uri:team.logoUrl}} style={s.logo} resizeMode="contain" onError={()=>setLogoFailed(true)}/>:<ShieldCheck size={45} color={ACCENT}/>}<View style={{flex:1}}><Text style={s.kicker}>{tr?'FORM VE SONUÇLAR':'FORM & RESULTS'}</Text><Text style={s.name}>{team.name}</Text></View></View>
      <View style={[s.row,{justifyContent:'space-between'}]}><Text style={s.caption}>{tr?'En Eski':'Oldest'}</Text><Text style={s.caption}>{tr?'En Yeni':'Newest'}</Text></View>
      <View style={s.row}>{chronological.map((m,i)=>{const r=result(m,team);return <View key={m.fixtureId} style={s.sequence}><View style={[s.badge,{borderColor:color(r),backgroundColor:`${color(r)}15`}]}><Text style={[s.badgeText,{color:color(r)}]}>{label(r,tr)}</Text></View><Text style={s.caption}>{i+1}</Text></View>;})}</View>
    </View>
    <View style={s.grid}>{[
      {Icon:CalendarCheck2,label:tr?'Maç':'Matches',value:total.matches,color:AWAY},
      {Icon:Activity,label:tr?'Galibiyet Oranı':'Win Rate',value:`${total.matches?Math.round(total.wins/total.matches*100):0}%`,color:ACCENT},
      {Icon:Target,label:tr?'Atılan Gol':'Goals For',value:total.goalsFor,color:ACCENT},
      {Icon:ShieldX,label:tr?'Yenilen Gol':'Goals Against',value:total.goalsAgainst,color:DANGER},
    ].map(({Icon,label,value,color})=><View key={label} style={[s.stat,{borderColor:`${color}60`}]}><View style={s.row}><Icon size={18} color={color}/><Text style={s.caption}>{label}</Text></View><Text style={[s.number,{color}]}>{value}</Text></View>)}</View>
    {breakdown(true)}{breakdown(false)}
    <View style={s.frame}><View style={[s.row,{justifyContent:'space-between'}]}><Text style={s.title}>{tr?'Maç Sonuçları':'Match Results'}</Text><Text style={s.caption}>{tr?'Eski → Yeni':'Old → New'}</Text></View>
      {chronological.map((m,i)=>{const home=isHome(m,team),Icon=home?Home:Plane,r=result(m,team),accent=home?ACCENT:AWAY;return <View key={m.fixtureId} style={s.match}>
        <View style={s.row}><Text style={s.caption}>{String(i+1).padStart(2,'0')}</Text><Icon size={17} color={accent}/><Text style={[s.caption,{color:accent,flex:1}]}>{home?(tr?'İç Saha':'Home'):(tr?'Deplasman':'Away')}</Text><Text style={[s.result,{color:color(r)}]}>{label(r,tr)} · {m.homeScore??'—'} – {m.awayScore??'—'}</Text></View>
        <Text style={s.opponent}>{home?m.awayTeam:m.homeTeam}</Text><Text style={s.caption}>{m.league} · {matchDateOnly(m.startingAt)}</Text>
      </View>;})}
      {!matches.length&&<Text style={s.caption}>{tr?'Analiz için maç seçilmedi.':'No matches selected for analysis.'}</Text>}
    </View>
  </View>;
}
const s=StyleSheet.create({
 page:{gap:12},frame:{borderWidth:1,borderColor:`${ACCENT}70`,backgroundColor:CARD,borderRadius:18,padding:14,gap:13},
 row:{flexDirection:'row',alignItems:'center',gap:8},logo:{width:56,height:64},kicker:{color:ACCENT,fontSize:10,fontWeight:'800',letterSpacing:1},name:{color:TEXT,fontSize:23,fontWeight:'900',marginTop:5},
 caption:{color:MUTED,fontSize:11,fontWeight:'600',flexShrink:1},sequence:{flex:1,alignItems:'center',gap:5},badge:{width:36,minHeight:36,borderWidth:1,borderRadius:18,alignItems:'center',justifyContent:'center'},badgeText:{fontSize:13,fontWeight:'900'},
 grid:{flexDirection:'row',flexWrap:'wrap',gap:10},stat:{flexGrow:1,flexBasis:'45%',minWidth:110,borderWidth:1,borderRadius:16,padding:13,gap:12,backgroundColor:CARD},number:{fontSize:25,fontWeight:'900'},
 title:{color:TEXT,fontSize:15,fontWeight:'800',flexShrink:1},mini:{flex:1,borderWidth:1,borderColor:LINE,borderRadius:12,paddingVertical:10,paddingHorizontal:3,alignItems:'center',gap:5},miniLabel:{color:MUTED,fontSize:9,fontWeight:'700',textAlign:'center'},goals:{color:MUTED,fontSize:12,fontWeight:'700',textAlign:'center'},
 match:{borderWidth:1,borderColor:LINE,borderRadius:14,padding:11,gap:9,backgroundColor:'#FFFFFF03'},result:{fontSize:14,fontWeight:'900'},opponent:{color:TEXT,fontSize:15,fontWeight:'800'},
});
