import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import { BadgeCheck } from 'lucide-react-native';
import { Modal,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import type { useReportReward } from '@/ads/useReportReward';
import ReportRewardProvider from './ReportRewardProvider';
import RewardUnlockButton from './RewardUnlockButton';
import PlanManagementButton from './PlanManagementButton';

export default function SimilarPlayersUpgradeModal({required,tr,onClose,reward,onWatch,currentLimit,onDismissUnavailable}:{required:'plus'|'pro'|'done';tr:boolean;onClose:()=>void;reward?:ReturnType<typeof useReportReward>;onWatch?:()=>void;currentLimit?:number;onDismissUnavailable?:()=>void}){
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT} = themed;

  const nav=useNavigation<any>();
  const openPlans = () => {onClose(); setTimeout(() => nav.navigate('Profile', {screen:'ManagePlan'}), 350);};
  const content = <View style={s.backdrop}><View style={s.panel} accessibilityViewIsModal><ScrollView contentContainerStyle={{gap:16}}><View style={s.header}><BadgeCheck size={24} color={ACCENT}/><Text style={s.title}>{required==='done'?(tr?'Tüm Profiller Gösterildi':'All Profiles Shown'):required==='pro'?<>{tr?'':'More Similar Players with '}<Text style={s.pro}>PRO</Text>{tr?' ile Daha Fazla Benzer Oyuncu':''}</>:(tr?'Daha Fazla Benzer Oyuncu':'More Similar Players')}</Text></View><Text style={s.body}>{onWatch ? (tr?'Bu aramada üç oyuncu daha görmek için reklam izle veya planını yükselt.':'Watch an ad to reveal three more players in this search, or upgrade your plan.') : required==='done'?(tr?'Bu aramada gösterilebilecek profilleri gördün. Daha fazla sonuç için kriterlerini genişletebilirsin.':'You have seen all available profiles for this search. Broaden your criteria to find more results.'):required==='pro'?<>{tr?'':'You have reached the '}<Text style={s.plus}>PLUS</Text>{tr ? ` planındaki ${currentLimit ?? 6} oyuncu sınırına ulaştın.` : ` limit of ${currentLimit ?? 6} players.`}</>:<>{tr?'':'Upgrade to '}<Text style={s.plus}>PLUS</Text>{tr?' veya ':' or '}<Text style={s.pro}>Pro</Text>{tr?'’ya yükselterek daha fazla benzer oyuncuyu inceleyebilirsin.':' to explore more similar players.'}</>}</Text>{required!=='done'&&<View style={{gap:8}}>{required==='plus'&&<View style={s.planRow}><Text style={s.plus}>PLUS</Text><Text style={s.body}>{tr?'En fazla 6 oyuncu':'Up to 6 players'}</Text></View>}<View style={s.planRow}><Text style={s.pro}>PRO</Text><Text style={s.body}>{tr?'En fazla 15 oyuncu':'Up to 15 players'}</Text></View></View>}{onWatch && reward && <RewardUnlockButton label={tr?'Reklam İzle, 3 Oyuncu Daha Göster':'Watch Ad to Show 3 More Players'}
    loading={!!reward.busy} disabled={!!reward.busy} onPress={onWatch}/>}<View style={s.actions}>{required==='done'?<PlanManagementButton label={tr?'Tamam':'OK'} onPress={onClose}/>:<Pressable accessibilityRole="button" onPress={onClose} style={s.later}><Text style={s.body}>{tr?'Şimdi Değil':'Not Now'}</Text></Pressable>}{required!=='done'&&<PlanManagementButton highlighted={!!onWatch} onPress={openPlans}/>}</View></ScrollView></View></View>;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    {reward ? <ReportRewardProvider reward={reward} onOpenPlans={openPlans} onDismissUnavailable={onDismissUnavailable}
      unavailableSubtitle={tr ? 'Şu anda reklam yok. Bu sayfayı kapatıp sonraki oyuncuları görebilirsin.' : 'No ad is available right now. Close this page to see the next players.'}>{content}</ReportRewardProvider> : content}
  </Modal>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, themeColor} = colors;

  const s=StyleSheet.create({backdrop:{flex:1,justifyContent:'center',padding:24,backgroundColor:themeColor('rgba(0,0,0,.72)', 'surface')},panel:{width:'100%',maxWidth:560,maxHeight:'90%',alignSelf:'center',backgroundColor:PANEL,borderRadius:22,borderWidth:1,borderColor:ACCENT,padding:22,gap:16},header:{flexDirection:'row',alignItems:'center',gap:12},title:{flex:1,color:TEXT,fontSize:19,lineHeight:25,fontWeight:'800'},body:{color:MUTED,fontSize:14,lineHeight:21},planRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,borderWidth:1,borderColor:LINE,borderRadius:12,padding:12},plus:{color:themeColor('#38BDF8', 'text'),fontWeight:'900'},pro:{color:ACCENT,fontWeight:'900'},actions:{flexDirection:'row',flexWrap:'wrap',gap:10},later:{flex:1,minHeight:44,borderWidth:1,borderColor:LINE,borderRadius:12,padding:10,alignItems:'center',justifyContent:'center',backgroundColor:CARD}});
  return {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, s, themeColor};
});
