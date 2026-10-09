import ScoutWiseBrandMark from '@/components/ScoutWiseBrandMark';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { ArrowUpRight,BookmarkPlus,Compass,FileText,ScanSearch,Target,UserRoundSearch,UsersRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { TutorialPageGuide } from './Tutorial';

export type ProWorkspaceMode='direct'|'discovery';
export const proWorkspaceCopy=(tr:boolean)=>({
  direct:{title:tr?'Doğrudan Arama':'Direct Search',description:tr?'İsim, ülke ve takım bilgileriyle oyuncunu bul; kartını, metriklerini ve yorumlarını incele.':'Find your player by name, country and team; explore their profile, metrics and insights.',prompt:tr?'Hangi oyuncuyu incelemek istersin? Oyuncunun adını yaz.':'Which player would you like to explore? Enter their name.',placeholder:tr?'Oyuncunun adını yaz…':'Enter a player’s name…'},
  discovery:{title:tr?'Oyuncu Keşfi':'Player Discovery',description:tr?'Pozisyon, arama öncelikleri ve takım stratejinle ihtiyacına uygun oyuncuları keşfet.':'Use positions, quality priorities and your team strategy to discover players suited to your needs.',prompt:tr?'Aradığın oyuncuyu tarif et. Pozisyon, yaş, uyruk, lig ve aradığın özellikleri ekleyebilirsin.':'Describe the player you need. Include position, age, nationality, league and desired qualities.',placeholder:tr?'Aradığın oyuncuyu tarif et…':'Describe your ideal player…'},
});
export default function ProWorkspaceWelcome({onSelect,onResume,disabled=false}:{trial?:boolean;onSelect:(mode:ProWorkspaceMode)=>void;onResume?:()=>void;disabled?:boolean}){
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, s, themeColor} = themed;

 const {i18n}=useTranslation(),tr=i18n.language.startsWith('tr'),copy=proWorkspaceCopy(tr),{width,fontScale}=useWindowDimensions();
 const wide=width/Math.max(1,fontScale)>=840;
 const twoFeatures=width/Math.max(1,fontScale)>=620;
 const [featureWidth,setFeatureWidth]=React.useState(0);
 const [featureMeasurements,setFeatureMeasurements]=React.useState<{layout:string;heights:Record<number,number>}>({layout:'',heights:{}});
 const featureLayout=`${featureWidth}:${fontScale}:${i18n.language}:${twoFeatures}`;
 const measuredHeights=featureMeasurements.layout===featureLayout?Object.values(featureMeasurements.heights):[];
 // Measure natural content, then size every tile to the tallest. Measuring the
 // inner content lets tiles shrink again after rotation or a language change.
 // Remount measurement content when the layout key changes: an unchanged
 // child size otherwise emits no new onLayout after the grid width settles.
 const featureHeight=measuredHeights.length?Math.ceil(Math.max(32,...measuredHeights))+26:undefined;
 function measureFeature(index:number,height:number){
  setFeatureMeasurements(current=>{
   const heights=current.layout===featureLayout?current.heights:{};
   if(heights[index]===height)return current;
   return {layout:featureLayout,heights:{...heights,[index]:height}};
  });
 }
 const options=[{id:'direct',Icon:UserRoundSearch,color:ACCENT,soft:themeColor('rgba(22,163,74,.10)')},{id:'discovery',Icon:Compass,color:themeColor('#2DD4BF', 'text'),soft:themeColor('rgba(45,212,191,.08)')}] as const;
 const features=[
  {Icon:ScanSearch,title:tr?'Oyuncuyu İncele':'Inspect Player',body:tr?'Oyuncu kartını, kategori metriklerini ve ScoutWise yorumlarını incele.':'Explore the player card, category metrics and ScoutWise insights.'},
  {Icon:Target,title:tr?'Uyumu Değerlendir':'Check Fit',body:tr?'Takıma uyum · Lige uyum · Stratejiye uyum':'Team fit · League fit · Strategy fit'},
  {Icon:BookmarkPlus,title:tr?'Portföye Ekle':'Add to Portfolio',body:tr?'Oyuncuyu portföyünde sakla ve analizine daha sonra devam et.':'Keep the player in your portfolio and continue your analysis later.'},
  {Icon:FileText,title:tr?'Rapor Oluştur':'Create a Report',body:tr?'Rapor ile oyuncunun detaylı scout raporunu aç.':'Use Report to open the player’s detailed scouting report.'},
  {Icon:UsersRound,title:tr?'Benzerini Bul':'Find Similar Players',body:tr?'Benzeri ile aynı roldeki en yakın profilleri benzerlik yüzdeleriyle bul.':'Use Similar to find the closest profiles in matching roles, with similarity scores.'},
 ];
 return <View style={s.panel}>
 <View style={s.hero}>
   <View style={s.brandRow}><View style={s.logoSurface}><ScoutWiseBrandMark style={s.logo} accessible={false}/></View><View style={s.brandText}><View style={s.wordmark}><Text style={s.brandName}>Scout<Text style={{color:ACCENT}}>Wise</Text></Text><View style={s.proBadge}><Text style={s.proBadgeText}>PRO</Text></View></View><Text style={s.brandCaption}>{tr?'Oyuncu Analizi ve Keşfi':'Player Analysis and Discovery'}</Text></View></View>
   <View style={s.heroCopy}><Text accessibilityRole="header" style={s.title}>{tr?'ScoutWise Pro’ya Hoş Geldin':'Welcome to ScoutWise Pro'}</Text><Text style={s.subtitle}>{tr?'Oyuncu bul, güçlü yönlerini incele ve uyumunu değerlendir. Başlamak istediğin bölümü seç.':'Find players, explore their strengths and assess their fit. Choose where to start.'}</Text></View>
 </View>
 <TutorialPageGuide page='proWelcome' summaryLines={0}/>
 <View style={s.sectionHeading}><View style={s.headingLine}/><Text style={s.sectionLabel}>{tr?'NEREDEN BAŞLAMAK İSTERSİN?':'WHERE WOULD YOU LIKE TO START?'}</Text></View>
 <View style={{flexDirection:wide?'row':'column',gap:12}}>{options.map(({id,Icon,color,soft},index)=><Pressable key={id} accessibilityRole="button" accessibilityLabel={copy[id].title} accessibilityState={{disabled}} disabled={disabled} onPress={()=>onSelect(id)} style={({pressed})=>[s.option,wide&&{flex:1},pressed&&{borderColor:color,backgroundColor:soft},disabled&&{opacity:.6}]}>
   <View style={s.optionTop}><View style={[s.optionIcon,{backgroundColor:soft,borderColor:color+'40'}]}><Icon color={color} size={22}/></View><Text style={s.optionTitle}>{copy[id].title}</Text><Text style={s.optionNumber}>{String(index+1).padStart(2,'0')}</Text></View>
   <Text style={s.body}>{copy[id].description}</Text>
   <View style={s.optionFooter}><Text style={[s.startLabel,{color}]}>{tr?'Başla':'Get Started'}</Text><ArrowUpRight color={color} size={18}/></View>
 </Pressable>)}</View>
 {onResume&&<Pressable accessibilityRole="button" onPress={onResume} disabled={disabled} style={({pressed})=>[s.resume,pressed&&s.pressed]}><Text style={s.resumeText}>{tr?'Çalışmaya Devam Et':'Continue Workspace'}</Text><ArrowUpRight size={18} color={ACCENT}/></Pressable>}
 <View style={s.details}><Text style={s.detailTitle}>{tr?'Oyuncu Kartından Devam Et':'Continue from a Player Card'}</Text><Text style={s.body}>{tr?'Bir oyuncu bulduktan sonra kartındaki işlemlerle analizini ilerlet.':'Once you find a player, use the actions on their card to continue your analysis.'}</Text><View onLayout={event=>{const next=event.nativeEvent.layout.width;setFeatureWidth(current=>Math.abs(current-next)<.5?current:next);}} style={[s.featureGrid,twoFeatures&&{flexDirection:'row',flexWrap:'wrap'}]}>{features.map(({Icon,title,body},index)=><View key={title} style={[s.feature,{width:twoFeatures?(featureWidth?(featureWidth-10)/2:'48%'):'100%',height:featureHeight}]}><View key={featureLayout} onLayout={event=>measureFeature(index,event.nativeEvent.layout.height)} style={s.featureContent}><View style={s.featureIcon}><Icon size={18} color={ACCENT}/></View><View style={{flex:1,minWidth:0,gap:4}}><Text style={s.featureTitle}>{title}</Text><Text style={s.featureBody}>{body}</Text></View></View></View>)}</View></View>
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
 pressed:{borderColor:ACCENT,backgroundColor:themeColor('rgba(22,163,74,.12)', 'surface')},details:{borderTopWidth:1,borderTopColor:LINE,paddingTop:20,gap:8},detailTitle:{color:TEXT,fontSize:16,lineHeight:23,fontWeight:'800'},featureGrid:{gap:10,marginTop:6},featureContent:{width:'100%',flexShrink:0,flexDirection:'row',alignItems:'flex-start',gap:10},feature:{minWidth:0,justifyContent:'center',borderRadius:12,padding:12,backgroundColor:themeColor('rgba(255,255,255,.025)', 'surface'),borderWidth:1,borderColor:themeColor('rgba(22,163,74,.16)', 'border')},featureIcon:{width:32,height:32,borderRadius:9,backgroundColor:themeColor('rgba(22,163,74,.09)', 'surface'),alignItems:'center',justifyContent:'center'},featureTitle:{color:TEXT,fontSize:12,lineHeight:18,fontWeight:'800'},featureBody:{color:MUTED,fontSize:12,lineHeight:18},hint:{color:MUTED,fontSize:12,lineHeight:19,borderTopWidth:1,borderTopColor:LINE,paddingTop:16},resume:{flexDirection:'row',justifyContent:'center',gap:10,minHeight:46,borderWidth:1,borderColor:ACCENT,borderRadius:12,padding:12,alignItems:'center',backgroundColor:themeColor('rgba(22,163,74,.08)', 'surface')},resumeText:{color:ACCENT,fontSize:14,fontWeight:'800',flexShrink:1}
});
  return {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, s, themeColor};
});
