import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { StyleSheet,Text,View } from 'react-native';
import TeamReportHeader from './TeamReportHeader';

import type { Team } from '@/services/teamPool';
type State={key:string;minutes:number;share:number};

export default function TeamReportScoreFlow({team,profile,matches,tr}:{team:Team;profile?:{states:State[]};matches:number;tr:boolean}){
  const themed = useThemedStyles(getModuleTheme);
  const {s, states} = themed;

 return <View style={{gap:12}}><TeamReportHeader team={team} matches={matches} tr={tr}/><View style={s.frame}>{profile?.states?.length?<><View style={s.stacked}>{states.map(state=>{const share=profile.states.find(r=>r.key===state.key)?.share||0;return share>0?<View key={state.key} style={{flex:share,backgroundColor:state.color}}/>:null;})}</View>{states.map(state=>{const row=profile.states.find(r=>r.key===state.key);return <View key={state.key} style={[s.tile,{borderColor:`${state.color}70`,backgroundColor:`${state.color}0B`}]}><View style={s.row}><Text style={[s.title,{color:state.color}]}>{tr?state.tr:state.en}</Text><Text style={[s.percent,{color:state.color}]}>{(row?.share||0).toFixed(1)}%</Text></View><View style={s.track}><View style={{width:`${Math.max(0,Math.min(100,row?.share||0))}%`,height:7,borderRadius:4,backgroundColor:state.color}}/></View><Text style={s.minutes}>{(row?.minutes||0).toLocaleString(tr?'tr-TR':'en-GB',{maximumFractionDigits:1})} {tr?'dakika':'minutes'}</Text></View>;})}</>:<Text style={s.caption}>{tr?'Skor akışı verisi bulunamadı.':'No score-flow data available.'}</Text>}</View></View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, MUTED, TEXT, themeColor} = colors;

  const states=[{key:'ahead',tr:'Öndeyken',en:'Ahead',color:themeColor('#22C55E', 'text')},{key:'level',tr:'Beraberlikte',en:'Level',color:themeColor('#94A3B8', 'text')},{key:'behind',tr:'Gerideyken',en:'Behind',color:themeColor('#F87171', 'text')}];

  const s=StyleSheet.create({frame:{gap:16,borderWidth:1,borderColor:`${ACCENT}70`,borderRadius:18,padding:14,backgroundColor:CARD},rule:{height:4,borderRadius:3,backgroundColor:ACCENT},name:{fontSize:21,color:ACCENT,fontWeight:'900'},caption:{fontSize:12,color:MUTED},stacked:{flexDirection:'row',height:16,borderRadius:8,overflow:'hidden'},tile:{borderWidth:1,borderRadius:16,padding:14,gap:14},row:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:10},title:{fontSize:17,fontWeight:'800',flexShrink:1},percent:{fontSize:24,fontWeight:'900'},track:{height:7,borderRadius:4,backgroundColor:themeColor('#FFFFFF08', 'surface')},minutes:{fontSize:14,color:TEXT,fontWeight:'700'}});
  return {ACCENT, CARD, MUTED, TEXT, states, s, themeColor};
});
