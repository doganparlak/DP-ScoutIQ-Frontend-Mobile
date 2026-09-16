import React, { useState } from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ArrowRightLeft, Shield } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Line, Rect, Text as SvgText } from 'react-native-svg';
import { ACCENT, LINE, MUTED, TEXT } from '@/theme';
import type { PostMatchCardData, MatchReportTeam } from '@/services/matchPool';
function Team({team,tr}:{team:MatchReportTeam;tr:boolean}) { const [failed,setFailed]=useState(false); const away=team.location==='away',color=away?'#38BDF8':ACCENT;return <View style={s.team}>{team.image_url&&!failed?<Image source={{uri:team.image_url}} resizeMode="contain" style={s.logo} onError={()=>setFailed(true)}/>:<Shield size={28} color={color}/>}<Text style={[s.teamName,{color}]}>{team.name}</Text><Text style={s.caption}>{away?tr?'Deplasman':'Away':tr?'Ev Sahibi':'Home'}</Text></View>; }
export default function MatchReportMomentum({data,tr}:{data:PostMatchCardData;tr:boolean}) {
  const {height}=useWindowDimensions();
  const [width,setWidth]=useState(320);
  const teams=[...data.teams].sort((a,b)=>Number(a.location!=='home')-Number(b.location!=='home')).slice(0,2);
  const home=teams[0],away=teams[1];
  const pressure=(data.pressure||[]).filter(p=>p.minute!=null&&Number.isFinite(Number(p.minute))&&p.value!=null&&p.value!==''&&Number.isFinite(Number(p.value))&&teams.some(t=>t.id===p.team_id));
  const maxMinute=Math.max(90,...pressure.map(p=>Number(p.minute)),...data.events.map(e=>Number(e.minute)||0));
  const maxValue=Math.max(1,...pressure.map(p=>Number(p.value)));
  const chartHeight=Math.max(640,Math.min(940,height*.95));
  const top=24,bottom=chartHeight-25,span=bottom-top,center=width/2,lane=18,reach=Math.max(20,center-lane-38);
  const y=(minute:number)=>top+Math.max(0,minute)/maxMinute*span;
  const barHeight=Math.max(2,span/(maxMinute+1)-1.2);
  const markerMap=new Map<string,{minute:number;side:number;kind:string;count:number}>();
  const add=(minute:number,side:number,kind:string)=>{const key=`${minute}-${side}-${kind}`;const existing=markerMap.get(key);if(existing)existing.count++;else markerMap.set(key,{minute,side,kind,count:1});};
  for(const e of data.events){
    if(e.minute==null||!Number.isFinite(Number(e.minute))||!teams.some(t=>t.id===e.team_id))continue;
    const type=(e.type||'').toLowerCase().replace(/[\s_-]/g,''),minute=Number(e.minute),side=e.team_id===home?.id?0:1;
    if(type==='substitution'||e.type_id===18)add(minute,side,'sub');
    const own=type==='owngoal'||e.type_id===15;
    if((own||type==='goal'||type==='penalty'||type==='penaltygoal'||e.type_id===14||e.type_id===16)&&!/miss|disallow|cancel|shootout/.test(type)){const scorer=own?1-side:side;add(minute,scorer,'scored');}
  }
  const markers=[...markerMap.values()].sort((a,b)=>a.minute-b.minute);
  const previous=[-30,-30];
  const placed=markers.map(m=>{const actual=y(m.minute);const markerY=Math.max(actual,previous[m.side]+25);previous[m.side]=markerY;return {...m,actual,markerY};});
  // Extra space preserves dense late substitutions without moving their time anchors.
  const totalHeight=Math.max(chartHeight,...placed.map(m=>m.markerY+20));
  const ticks=Array.from({length:Math.floor(maxMinute/15)+1},(_,i)=>i*15);
  return <View style={s.frame}><View style={s.rule}/>
    <View style={s.header}>{teams.map(t=><Team key={t.id} team={t} tr={tr}/>)}</View>
    <View style={s.legend}><Text style={s.legendText}>⚽ {tr?'Gol':'Goal'}</Text><View style={s.legendItem}><ArrowRightLeft size={14} color={MUTED}/><Text style={s.legendText}>{tr?'Değişiklik':'Substitution'}</Text></View></View>
    <View onLayout={e=>setWidth(e.nativeEvent.layout.width)} style={[s.chart,{height:totalHeight}]}>
      <Svg width="100%" height={totalHeight} viewBox={`0 0 ${width} ${totalHeight}`}>
        <Defs><LinearGradient id="homePressure" x1="1" y1="0" x2="0" y2="0"><Stop offset="0" stopColor="#16A34A" stopOpacity={.35}/><Stop offset="1" stopColor="#4ADE80"/></LinearGradient><LinearGradient id="awayPressure" x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#0284C7" stopOpacity={.35}/><Stop offset="1" stopColor="#38BDF8"/></LinearGradient></Defs>
        <Rect x={0} y={0} width={center-lane} height={totalHeight} fill="#16A34A" fillOpacity={.035}/><Rect x={center+lane} y={0} width={center-lane} height={totalHeight} fill="#38BDF8" fillOpacity={.035}/>
        {ticks.map(minute=><React.Fragment key={minute}><Line x1={8} x2={width-8} y1={y(minute)} y2={y(minute)} stroke={LINE} strokeDasharray="3 5"/><Rect x={center-17} y={y(minute)-10} width={34} height={20} rx={8} fill="#10191A"/><SvgText x={center} y={y(minute)+4} textAnchor="middle" fill={MUTED} fontSize={11} fontWeight="700">{minute}′</SvgText></React.Fragment>)}
        <Line x1={center-lane} x2={center-lane} y1={top} y2={bottom} stroke={ACCENT} strokeOpacity={.45}/><Line x1={center+lane} x2={center+lane} y1={top} y2={bottom} stroke="#38BDF8" strokeOpacity={.45}/>
        {pressure.map((p,i)=>{const value=Number(p.value);if(value<=0)return null;const length=Math.max(3,Math.sqrt(value/maxValue)*reach),isHome=p.team_id===home?.id;return <Rect key={i} x={isHome?center-lane-length:center+lane} y={y(Number(p.minute))-barHeight/2} width={length} height={barHeight} rx={1.5} fill={isHome?'url(#homePressure)':'url(#awayPressure)'}/>;})}
        {placed.map((m,i)=><Line key={i} x1={m.side===0?center-lane:center+lane} x2={m.side===0?16:width-16} y1={m.actual} y2={m.markerY} stroke={m.side===0?ACCENT:'#38BDF8'} strokeOpacity={.5} strokeDasharray="3 4"/>)}
      </Svg>
      {placed.map((m,i)=>{const color=m.side===0?ACCENT:'#38BDF8';return <View key={i} accessibilityLabel={`${teams[m.side]?.name} ${m.minute}′ ${m.kind} ×${m.count}`} style={[s.marker,{top:m.markerY-11,...(m.side===0?{left:3}:{right:3}),borderColor:color}]}>{m.kind==='sub'?<ArrowRightLeft size={13} color={color}/>:<Text style={s.ball}>⚽</Text>}{m.count>1&&<Text style={[s.count,{color}]}>×{m.count}</Text>}</View>;})}
    </View>
    {!pressure.length&&<Text style={s.empty}>{tr?'Bu maç için baskı verisi bulunmuyor. Maç olayları zaman çizgisinde gösterilir.':'Pressure data is unavailable. Match events are shown on the timeline.'}</Text>}
  </View>;
}
const s=StyleSheet.create({frame:{borderWidth:1,borderColor:`${ACCENT}70`,borderRadius:20,padding:12,gap:14},rule:{height:3,borderRadius:3,backgroundColor:ACCENT},title:{fontSize:21,fontWeight:'800',color:ACCENT},header:{flexDirection:'row',gap:22,paddingVertical:10},team:{flex:1,alignItems:'center',gap:7},logo:{width:40,height:45},teamName:{fontSize:12,fontWeight:'800',textAlign:'center'},caption:{color:MUTED,fontSize:10},legend:{flexDirection:'row',flexWrap:'wrap',gap:10,justifyContent:'center'},legendItem:{flexDirection:'row',alignItems:'center',gap:4},legendText:{color:MUTED,fontSize:10,fontWeight:'600'},chart:{borderWidth:1,borderColor:LINE,borderRadius:15,overflow:'hidden',backgroundColor:'#0B1114'},marker:{position:'absolute',height:22,minWidth:22,paddingHorizontal:2,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:1,borderWidth:1,borderRadius:11,backgroundColor:'#0B1114'},ball:{fontSize:13,lineHeight:18},count:{fontSize:8,fontWeight:'800'},empty:{color:MUTED,fontSize:12,lineHeight:18,textAlign:'center'}});
