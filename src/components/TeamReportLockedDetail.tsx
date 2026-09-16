import React from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {LockKeyhole} from 'lucide-react-native';
import {ACCENT,MUTED} from '@/theme';

type LockedDetailKind='attack'|'defense'|'strengths'|'weaknesses'|'standout'|'momentum'|'teamRisks'|'thirdTeamAnalysis'|'secondStandout';
export default function TeamReportLockedDetail({tr,accent=ACCENT,onOpenPlans,kind}:{tr:boolean;accent?:string;onOpenPlans:()=>void;kind:LockedDetailKind}){
 const titles:Record<LockedDetailKind,{tr:string;en:string}>={
  attack:{tr:'Detaylı Takım Planı',en:'Detailed Team Plan'},defense:{tr:'Detaylı Takım Planı',en:'Detailed Team Plan'},strengths:{tr:'Detaylı Değerlendirme',en:'Detailed Assessment'},weaknesses:{tr:'Detaylı Değerlendirme',en:'Detailed Assessment'},
  standout:{tr:'Oyuncu Açıklamaları',en:'Player Explanations'},momentum:{tr:'Maç Okuması',en:'Match Outlook'},teamRisks:{tr:'Zayıf Yönler & Riskler',en:'Weaknesses & Risks'},
  thirdTeamAnalysis:{tr:'3. Takım Analizi',en:'Third Team Analysis'},secondStandout:{tr:'2. Öne Çıkan Oyuncu',en:'Second Standout Player'},
 };
 const title=titles[kind][tr?'tr':'en'];
 const messages:Record<LockedDetailKind,{tr:string;en:string}>={
  attack:{tr:"Takım hücum planının açıklamalarını görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the explanations for the team attack plan.'},
  defense:{tr:"Takım savunma planının açıklamalarını görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the explanations for the team defense plan.'},
  strengths:{tr:"Güçlü yönlerinin açıklamalarını görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the explanations for the strengths.'},
  weaknesses:{tr:"Zayıf yönlerinin açıklamalarını görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the explanations for the weaknesses.'},
  standout:{tr:"Göze çarpan oyuncuların açıklamalarını görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the standout player explanations.'},
  momentum:{tr:"Maç okumasını görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the match outlook.'},
  teamRisks:{tr:"Takımın zayıf yönlerini ve risklerini görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the team weaknesses and risks.'},
  thirdTeamAnalysis:{tr:"Üçüncü takım analizini görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the third team analysis.'},
  secondStandout:{tr:"İkinci öne çıkan oyuncuyu görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to reveal the second standout player.'},
 };
 const message=messages[kind][tr?'tr':'en'];
 return <View style={[s.card,{borderColor:`${accent}55`,backgroundColor:`${accent}0A`}]}> 
  <View style={s.heading}><View style={[s.icon,{borderColor:`${accent}66`,backgroundColor:`${accent}18`}]}><LockKeyhole size={16} color={accent} strokeWidth={2.3}/></View><Text style={[s.title,{color:accent}]}>{title}</Text></View>
  <Text style={s.message}>{message}</Text>
  <Pressable accessibilityRole="button" onPress={onOpenPlans} style={({pressed})=>[s.button,{borderColor:accent,backgroundColor:`${accent}18`},pressed&&{opacity:.8}]}><Text style={[s.buttonText,{color:accent}]}>{tr?'Plan Yönetimi':'Manage Plan'}</Text></Pressable>
 </View>;
}

const s=StyleSheet.create({card:{gap:9,padding:12,borderRadius:14,borderWidth:1,borderStyle:'dashed'},heading:{flexDirection:'row',alignItems:'center',gap:8},icon:{width:30,height:30,borderRadius:15,borderWidth:1,alignItems:'center',justifyContent:'center'},title:{flex:1,fontSize:13,fontWeight:'900'},message:{color:MUTED,fontSize:12,lineHeight:18,fontWeight:'600'},button:{minHeight:39,borderRadius:11,borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:12},buttonText:{fontSize:11,fontWeight:'900',textTransform:'uppercase'}});
