import { ReportRewardContext } from '@/ads/useReportReward';
import { useContext, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ActionSpinner from './ActionSpinner';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { CreditCard, LockKeyhole, Play } from 'lucide-react-native';
import { Pressable,StyleSheet,Text,View } from 'react-native';


type LockedDetailKind='attack'|'defense'|'strengths'|'weaknesses'|'standout'|'momentum'|'teamRisks'|'thirdTeamAnalysis'|'secondStandout'|'matchForecast'|'thirdSquadPlayer'|'opponentData';
export default function TeamReportLockedDetail({tr,accent,onOpenPlans,kind,titleOverride,messageOverride}:{tr:boolean;accent?:string;onOpenPlans:()=>void;kind:LockedDetailKind;titleOverride?:string;messageOverride?:string}){
  const reward = useContext(ReportRewardContext);
 const {t} = useTranslation();
 const canWatch = reward?.available && reward.activeSection === kind;
 const loading = reward?.busy === kind;
 useEffect(() => { if (canWatch) reward?.prepare(kind); }, [canWatch, kind, reward]);
 const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, s} = themed;
  accent ??= ACCENT;

 const titles:Record<LockedDetailKind,{tr:string;en:string}>={
  attack:{tr:'Detaylı Takım Planı',en:'Detailed Team Plan'},defense:{tr:'Detaylı Takım Planı',en:'Detailed Team Plan'},strengths:{tr:'Detaylı Değerlendirme',en:'Detailed Assessment'},weaknesses:{tr:'Detaylı Değerlendirme',en:'Detailed Assessment'},
  standout:{tr:'Oyuncu Açıklamaları',en:'Player Explanations'},momentum:{tr:'Maç Okuması',en:'Match Outlook'},teamRisks:{tr:'Zayıf Yönler & Riskler',en:'Weaknesses & Risks'},
  thirdTeamAnalysis:{tr:'3. Takım Analizi',en:'Third Team Analysis'},secondStandout:{tr:'2. Öne Çıkan Oyuncu',en:'Second Standout Player'},
  opponentData:{tr:'Rakip Verileri',en:'Opponent Data'},
  thirdSquadPlayer:{tr:'3. Oyuncu',en:'Third Player'},
  matchForecast:{tr:'Detaylı Maç Öngörüsü',en:'Detailed Match Forecast'},
 };
 const title=titleOverride ?? titles[kind][tr?'tr':'en'];
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
  opponentData:{tr:"Rakip Oyun Profili ve Rakipten Gelen Tehdit bölümlerini görmek için Plus veya Pro’ya geç.",en:"Switch to Plus or Pro to view Opponent Playing Profile and Opponent Threat."},
  thirdSquadPlayer:{tr:"Daha fazla oyuncu görmek için Plus veya Pro'ya geç.",en:'Switch to Plus or Pro to see more players.'},
  matchForecast:{tr:"Skor farkı dağılımı, gol dağılımı, devre bazlı gol ve karşılıklı gol için PLUS veya PRO'ya geç.",en:'Switch to PLUS or PRO to unlock goal margin distribution, goal distribution, goals by half and both teams to score.'},
 };
 const message=messageOverride ?? messages[kind][tr?'tr':'en'];
 return <View style={[s.card,{borderColor:`${accent}55`,backgroundColor:`${accent}0A`}]}>
  <View style={s.heading}><View style={[s.icon,{borderColor:`${accent}66`,backgroundColor:`${accent}18`}]}><LockKeyhole size={16} color={accent} strokeWidth={2.3}/></View><Text style={[s.title,{color:accent}]}>{title}</Text></View>
  <Text style={s.message}>{message.split(/\b(PLUS|PRO)\b/gi).map((part,index)=>part.toUpperCase()==='PLUS'?<Text key={index} style={s.plus}>PLUS</Text>:part.toUpperCase()==='PRO'?<Text key={index} style={s.pro}>PRO</Text>:part)}</Text>
  {canWatch && <Pressable accessibilityRole="button" accessibilityState={{busy: loading, disabled: !!reward.busy}}
   disabled={!!reward.busy} onPress={() => void reward.watch(kind)} style={({pressed}) => [s.button,s.rewardButton,pressed&&{opacity:.82}]}>
   {loading ? <ActionSpinner size={15} color="#FFF"/> : <Play size={16} color="#FFF" strokeWidth={2.4}/>}
   <Text style={[s.buttonText,s.actionText]}>{loading ? t('scoutingRewardLoading') : t('scoutingRewardWatch')}</Text>
  </Pressable>}
  <Pressable accessibilityRole="button" onPress={onOpenPlans} style={({pressed})=>[s.button,{borderColor:accent,backgroundColor:`${accent}18`},canWatch&&s.planButton,pressed&&{opacity:.8}]}>{canWatch&&<CreditCard size={16} color="#FFF" strokeWidth={2.2}/>}<Text style={[s.buttonText,{color:accent},canWatch&&s.actionText]}>{tr?'Plan Yönetimi':'Manage Plan'}</Text></Pressable>
 </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, MUTED, themeColor} = colors;

  const s=StyleSheet.create({card:{gap:9,padding:12,borderRadius:14,borderWidth:1,borderStyle:'dashed'},heading:{flexDirection:'row',alignItems:'center',gap:8},icon:{width:30,height:30,borderRadius:15,borderWidth:1,alignItems:'center',justifyContent:'center'},title:{flex:1,fontSize:13,fontWeight:'900'},message:{color:MUTED,fontSize:12,lineHeight:18,fontWeight:'600'},plus:{color:themeColor('#38BDF8','text'),fontWeight:'900'},pro:{color:ACCENT,fontWeight:'900'},button:{minHeight:39,borderRadius:11,borderWidth:1,alignItems:'center',justifyContent:'center',paddingHorizontal:12},rewardButton:{flexDirection:'row',gap:8,backgroundColor:'#166534',borderColor:'#166534'},planButton:{flexDirection:'row',gap:8,backgroundColor:'#1E40AF',borderColor:'#3B82F6'},actionText:{color:'#FFF',textTransform:'none'},buttonText:{fontSize:11,fontWeight:'900',textTransform:'uppercase'}});
  return {ACCENT, MUTED, s, themeColor};
});
