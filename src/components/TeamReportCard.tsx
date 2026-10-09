import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Building2,CalendarDays,Globe2,Layers,MapPin,ShieldCheck,Trophy,UserCog,UsersRound } from 'lucide-react-native';
import { useEffect,useState } from 'react';
import { Image,StyleSheet,Text,View } from 'react-native';
import { getThemed_reportModalStyles as __getThemed_reportStyles } from './PostMatchReportModal';

import { matchDateOnly } from '@/services/matchPool';
import type { PlayedMatch } from '@/services/teamAnalysis';
import type { Team } from '@/services/teamPool';

export default function TeamReportCard({team,matches,tr}:{team:Team;matches:PlayedMatch[];tr:boolean}) {
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT, reportStyles} = themed;

  const [stadiumFailed,setStadiumFailed]=useState(false),[logoFailed,setLogoFailed]=useState(false);
  useEffect(()=>{setStadiumFailed(false);setLogoFailed(false);},[team.id,team.stadiumImageUrl,team.logoUrl]);
  const dates=matches.map(m=>m.startingAt).filter(Boolean).sort();
  const competitions=new Set(matches.map(m=>m.league).filter(Boolean));
  const facts=[
    {Icon:Globe2,label:tr?'Ülke':'Country',value:team.country},
    {Icon:Building2,label:tr?'Şehir':'City',value:team.city},
    {Icon:Trophy,label:tr?'Lig':'League',value:team.league},
    {Icon:UsersRound,label:tr?'Oyuncu Adedi':'Player Count',value:team.playerCount},
    {Icon:UserCog,label:tr?'Teknik Direktör':'Head Coach',value:team.coachName},
    {Icon:MapPin,label:tr?'Stadyum':'Stadium',value:team.stadiumName},
    {Icon:CalendarDays,label:tr?'Analiz Aralığı':'Analysis Range',value:dates.length?`${matchDateOnly(dates[0])} – ${matchDateOnly(dates[dates.length-1])}`:'—'},
    {Icon:Layers,label:tr?'Analiz Kapsamı':'Analysis Scope',value:`${matches.length} ${tr?'maç':'matches'}\n${competitions.size} ${tr?'organizasyon':'competitions'}`},
  ];
  return <View style={s.card}>
    <View style={s.stadium}>
      {!!team.stadiumImageUrl&&!stadiumFailed&&<Image source={{uri:team.stadiumImageUrl}} resizeMode="cover" style={s.photo} onError={()=>setStadiumFailed(true)} accessibilityLabel={team.stadiumName|| (tr?'Stadyum':'Stadium')}/>}
      <View pointerEvents="none" style={s.shade}/>
      <View style={s.identity}>
        {team.logoUrl&&!logoFailed?<Image source={{uri:team.logoUrl}} resizeMode="contain" style={s.logo} onError={()=>setLogoFailed(true)} accessibilityLabel={team.name}/>:<ShieldCheck size={80} color={ACCENT}/>}
        <Text style={s.eyebrow}>{tr?'TAKIM PROFİLİ':'TEAM PROFILE'}</Text>
        <Text style={s.name}>{team.name}</Text>
        {!!team.stadiumName&&<View style={s.caption}><MapPin size={14} color={ACCENT}/><Text style={s.captionText}>{team.stadiumName}</Text></View>}
      </View>
    </View>
    <View style={s.grid}>{facts.map(({Icon,label,value})=><View key={label} style={[reportStyles.fact,{borderColor:`${ACCENT}60`}]}><View style={s.factHeader}><Icon size={16} color={ACCENT}/><Text style={s.label}>{label}</Text></View><Text style={s.value}>{value===null||value===undefined||value===''?'—':value}</Text></View>)}</View>
    <View style={reportStyles.brand}><Text style={reportStyles.prepared}>{tr?'RAPORU HAZIRLAYAN':'REPORT PREPARED BY'}</Text><Text style={reportStyles.brandName}>SCOUT<Text style={{color:ACCENT}}>WISE</Text></Text></View>
  </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, DANGER, LINE, MUTED, TEXT, themeColor} = colors;
  const reportStyles = __getThemed_reportStyles(colors);
  const s=StyleSheet.create({
  card:{gap:12},
  rule:{height:4,borderRadius:3,backgroundColor:ACCENT},
  stadium:{borderWidth:1,borderColor:`${ACCENT}60`,borderRadius:16,overflow:'hidden',backgroundColor:themeColor('#15251B', 'surface')},
  photo:{...StyleSheet.absoluteFillObject,width:'100%',height:'100%'},
  shade:{...StyleSheet.absoluteFillObject,backgroundColor:themeColor('rgba(5,15,9,0.48)', 'surface')},
  identity:{minHeight:250,alignItems:'center',justifyContent:'center',padding:22,gap:10},
  logo:{width:100,height:110},
  eyebrow:{color:themeColor('#C4D5C9', 'text'),fontSize:10,fontWeight:'800',letterSpacing:1.7,marginTop:4},
  name:{color:TEXT,fontSize:27,fontWeight:'900',textAlign:'center',textShadowColor:themeColor('#00000099'),textShadowOffset:{width:0,height:2},textShadowRadius:6},
  caption:{flexDirection:'row',gap:6,alignItems:'center',paddingVertical:6,paddingHorizontal:10,borderRadius:12,backgroundColor:themeColor('#08130BB3', 'surface')},
  captionText:{color:TEXT,fontSize:11,fontWeight:'700',flexShrink:1,textAlign:'center'},
  grid:{flexDirection:'row',flexWrap:'wrap',gap:10},
  fact:{flexGrow:1,flexBasis:'45%',minWidth:110,padding:11,borderWidth:1,borderColor:LINE,borderRadius:14,backgroundColor:themeColor('#FFFFFF04', 'surface'),gap:10},
  factHeader:{flexDirection:'row',gap:6,alignItems:'center'},label:{color:MUTED,fontSize:11,fontWeight:'700',flexShrink:1},
  value:{color:TEXT,fontWeight:'800',fontSize:14,lineHeight:21},
  results:{borderWidth:1,borderColor:`${ACCENT}70`,borderRadius:14,padding:12,gap:12,backgroundColor:`${ACCENT}08`},
  resultRow:{flexDirection:'row',gap:6},result:{flex:1,alignItems:'center',gap:5},count:{fontSize:25,fontWeight:'900'},resultLabel:{color:MUTED,fontSize:10,fontWeight:'700',textAlign:'center'},
  brand:{alignItems:'center',gap:5,paddingVertical:8},prepared:{color:MUTED,fontSize:10,fontWeight:'600'},brandName:{color:TEXT,fontSize:22,fontWeight:'900'},
});
  return {ACCENT, CARD, DANGER, LINE, MUTED, TEXT, reportStyles, s, themeColor};
});
