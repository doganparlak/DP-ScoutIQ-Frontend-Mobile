import ScoutWiseBrandMark from '@/components/ScoutWiseBrandMark';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { ArrowUpRight,ChartNoAxesCombined,Compass,UserRoundSearch } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { TutorialPageGuide } from './Tutorial';

export type ProWorkspaceMode='direct'|'discovery'|'forecast';
export const proWorkspaceCopy=(tr:boolean)=>({
  forecast:{title:tr?'Maç Öngörüsü':'Match Forecast',description:tr?'Takımını ve maçını seç; skor, gol ve maç sonucu olasılıklarını incele.':'Choose a team and fixture; explore score, goal and match outcome probabilities.'},
  direct:{title:tr?'Doğrudan Arama':'Direct Search',description:tr?'Oyuncunu bul; analiz et, uyumunu değerlendir, benzerini bul, raporla ve portföye kaydet.':'Find a player; analyze, assess fit, find similar players, create reports and save to your portfolio.',prompt:tr?'Hangi oyuncuyu incelemek istersin? Oyuncunun adını yaz.':'Which player would you like to explore? Enter their name.',placeholder:tr?'Oyuncunun adını yaz…':'Enter a player’s name…'},
  discovery:{title:tr?'Oyuncu Keşfi':'Player Discovery',description:tr?'İhtiyacına uygun oyuncuları keşfet; analiz et, uyumlarını değerlendir, benzerlerini bul, raporla ve kaydet.':'Discover players matching your needs; analyze, assess fit, find similar players, create reports and save.',prompt:tr?'Aradığın oyuncuyu tarif et. Pozisyon, yaş, uyruk, lig ve aradığın özellikleri ekleyebilirsin.':'Describe the player you need. Include position, age, nationality, league and desired qualities.',placeholder:tr?'Aradığın oyuncuyu tarif et…':'Describe your ideal player…'},
});
export default function ProWorkspaceWelcome({onSelect,onResume,disabled=false,consent}:{consent?:React.ReactNode;trial?:boolean;onSelect:(mode:ProWorkspaceMode)=>void;onResume?:()=>void;disabled?:boolean}){
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, s, themeColor} = themed;

 const {i18n}=useTranslation(),tr=i18n.language.startsWith('tr'),copy=proWorkspaceCopy(tr),{width,fontScale}=useWindowDimensions();
 const wide=width/Math.max(1,fontScale)>=840;
 const purple=themeColor('#A78BFA','text');
 const options=[{id:'direct',Icon:UserRoundSearch,color:ACCENT,soft:themeColor('rgba(22,163,74,.10)')},{id:'discovery',Icon:Compass,color:themeColor('#2DD4BF', 'text'),soft:themeColor('rgba(45,212,191,.08)')},{id:'forecast',Icon:ChartNoAxesCombined,color:purple,soft:themeColor('rgba(167,139,250,.08)')}] as const;
 return <View style={s.panel}>
 <View style={s.hero}>
   <View style={s.brandRow}><View style={s.logoSurface}><ScoutWiseBrandMark style={s.logo} accessible={false}/></View><View style={s.brandText}><View style={s.wordmark}><Text style={s.brandName}>Scout<Text style={{color:ACCENT}}>Wise</Text></Text><View style={s.proBadge}><Text style={s.proBadgeText}>PRO</Text></View></View><Text style={s.brandCaption}>{tr?'Analiz, Keşif ve Öngörü':'Analysis, Discovery & Forecasts'}</Text></View></View>
   <View style={s.heroCopy}><Text accessibilityRole="header" style={s.title}>{tr?'ScoutWise Pro’ya Hoş Geldin':'Welcome to ScoutWise Pro'}</Text><Text style={s.subtitle}>{tr?'Oyuncuları keşfet, uyumlarını değerlendir ve maç öngörülerini incele. Başlamak istediğin bölümü seç.':'Discover players, assess their fit and explore match forecasts. Choose where to start.'}</Text></View>
 {onResume&&<Pressable accessibilityRole="button" onPress={onResume} disabled={disabled} style={({pressed})=>[s.resume,pressed&&s.pressed]}><Text style={s.resumeText}>{tr?'Çalışmaya Devam Et':'Continue Workspace'}</Text><ArrowUpRight size={18} color={ACCENT}/></Pressable>}
 </View>
 <TutorialPageGuide page='proWelcome' summaryLines={0}/>
 {consent}
 <View style={s.sectionHeading}><View style={s.headingLine}/><Text style={s.sectionLabel}>{tr?'NEREDEN BAŞLAMAK İSTERSİN?':'WHERE WOULD YOU LIKE TO START?'}</Text></View>
 <View style={{flexDirection:wide?'row':'column',gap:12}}>{options.map(({id,Icon,color,soft},index)=><Pressable key={id} accessibilityRole="button" accessibilityLabel={copy[id].title} accessibilityState={{disabled}} disabled={disabled} onPress={()=>onSelect(id)} style={({pressed})=>[s.option,{borderColor:color+'40'},wide&&{flex:1},pressed&&{borderColor:color,backgroundColor:soft},disabled&&{opacity:.6}]}>
   <View style={s.optionTop}><View style={[s.optionIcon,{backgroundColor:soft,borderColor:color+'40'}]}><Icon color={color} size={22}/></View><Text style={s.optionTitle}>{copy[id].title}</Text><Text style={s.optionNumber}>{String(index+1).padStart(2,'0')}</Text></View>
   <Text style={s.body}>{copy[id].description}</Text>
   <View style={s.optionFooter}><Text style={[s.startLabel,{color}]}>{tr?'Başla':'Get Started'}</Text><ArrowUpRight color={color} size={18}/></View>
 </Pressable>)}</View>
 <Text style={s.hint}>{tr?'Takım stratejini istediğin zaman düzenleyip kaldığın çalışma alanına geri dönebilirsin.':'Edit your team strategy anytime and return to your workspace without losing your progress.'}</Text>
 </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, themeColor} = colors;

  const s=StyleSheet.create({
 panel:{width:'100%',maxWidth:1060,minWidth:0,alignSelf:'center',padding:16,borderWidth:1,borderColor:ACCENT,borderRadius:24,backgroundColor:PANEL,gap:20},
 hero:{minWidth:0,borderRadius:18,borderWidth:1,borderColor:themeColor('rgba(22,163,74,.18)', 'border'),backgroundColor:themeColor('rgba(22,163,74,.035)', 'surface'),padding:16,gap:20},
 brandRow:{flexDirection:'row',alignItems:'center',gap:12},logoSurface:{width:60,height:60,borderRadius:18,borderWidth:1,borderColor:themeColor('rgba(22,163,74,.2)', 'border'),backgroundColor:themeColor('rgba(22,163,74,.08)', 'surface'),alignItems:'center',justifyContent:'center'},logo:{width:48,height:48},
 brandText:{flex:1,minWidth:0,gap:5},wordmark:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:8},brandName:{color:TEXT,fontSize:19,fontWeight:'900',flexShrink:1},proBadge:{paddingHorizontal:7,paddingVertical:3,borderWidth:1,borderColor:themeColor('rgba(22,163,74,.35)', 'border'),borderRadius:6,backgroundColor:themeColor('rgba(22,163,74,.12)', 'surface')},proBadgeText:{color:ACCENT,fontSize:10,fontWeight:'900',letterSpacing:1},brandCaption:{color:MUTED,fontSize:11,lineHeight:16,flexShrink:1},
 heroCopy:{minWidth:0,gap:10},title:{color:TEXT,fontSize:25,lineHeight:33,fontWeight:'800',flexShrink:1},subtitle:{color:themeColor('#B6C5BC', 'text'),fontSize:13,lineHeight:21,flexShrink:1},
 sectionHeading:{flexDirection:'row',alignItems:'center',gap:9},headingLine:{width:3,height:16,borderRadius:2,backgroundColor:ACCENT},sectionLabel:{color:MUTED,fontSize:10,lineHeight:16,fontWeight:'800',letterSpacing:.8,flexShrink:1},
 body:{color:MUTED,fontSize:13,lineHeight:20,flexShrink:1},option:{minWidth:0,borderWidth:1,borderColor:themeColor('rgba(32,201,151,.25)', 'border'),backgroundColor:CARD,borderRadius:18,padding:16,gap:12},optionTop:{flexDirection:'row',alignItems:'center',gap:10},optionIcon:{width:40,height:40,borderRadius:12,borderWidth:1,alignItems:'center',justifyContent:'center'},optionTitle:{flex:1,minWidth:0,color:TEXT,fontSize:16,lineHeight:22,fontWeight:'800'},optionNumber:{color:themeColor('#607469', 'text'),fontSize:11,fontWeight:'700',fontVariant:['tabular-nums']},optionFooter:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:LINE,paddingTop:10},startLabel:{fontSize:12,fontWeight:'800'},
 pressed:{borderColor:ACCENT,backgroundColor:themeColor('rgba(22,163,74,.12)', 'surface')},hint:{color:MUTED,fontSize:12,lineHeight:19,borderTopWidth:1,borderTopColor:LINE,paddingTop:16},resume:{flexDirection:'row',justifyContent:'center',gap:10,minHeight:46,borderWidth:1,borderColor:ACCENT,borderRadius:12,padding:12,alignItems:'center',backgroundColor:themeColor('rgba(22,163,74,.08)', 'surface')},resumeText:{color:ACCENT,fontSize:14,fontWeight:'800',flexShrink:1}
});
  return {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, s, themeColor};
});
