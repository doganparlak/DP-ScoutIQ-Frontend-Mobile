import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import type { MainTabsParamList } from '@/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation, type NavigatorScreenParams } from '@react-navigation/native';
import { BadgeCheck } from 'lucide-react-native';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import PlanManagementButton from './PlanManagementButton';

export default function BannerAdFreePrompt({visible, tr, onClose, onOpenPlans}: {
 visible: boolean;
 tr: boolean;
 onClose: () => void;
 onOpenPlans?: () => void;
}) {
 const {s, ACCENT}=useThemedStyles(getTheme);
 const navigation=useNavigation<BottomTabNavigationProp<Omit<MainTabsParamList,'Profile'> & {
  Profile: NavigatorScreenParams<{ManagePlan:undefined}>;
 }>>();
 return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
   <View style={s.backdrop}>
    <View style={s.bannerPrompt} accessibilityViewIsModal>
     <View style={s.bannerPromptHeading}>
      <View style={s.bannerPromptIcon}><BadgeCheck size={20} color={ACCENT} strokeWidth={2.3}/></View>
      <Text style={s.bannerPromptTitle}>{tr ? 'ScoutWise’ı Reklamsız Kullan' : 'Use ScoutWise Ad-Free'}</Text>
     </View>
     <Text style={s.bannerPromptBody}>{tr ? 'Reklamsız kullanım için planını ' : 'For an ad-free experience, upgrade to '}
      <Text style={s.bannerPlus}>PLUS</Text>{tr ? ' veya ' : ' or '}<Text style={s.bannerPro}>PRO</Text>{tr ? '’ya yükselt.' : '.'}
     </Text>
     <View style={s.bannerPromptActions}>
      <Pressable accessibilityRole="button" onPress={onClose} style={s.bannerLater}>
       <Text style={s.bannerPromptBody}>{tr ? 'Şimdi Değil' : 'Not Now'}</Text>
      </Pressable>
      <PlanManagementButton highlighted onPress={()=>{
       onClose();
       setTimeout(()=>{
        if(!navigation.isFocused())return;
        if(onOpenPlans)onOpenPlans();
        else navigation.navigate('Profile',{screen:'ManagePlan'});
       },350);
      }}/>
     </View>
    </View>
   </View>
  </Modal>;
}

const getTheme=createThemedStyles(({ACCENT,TEXT,MUTED,PANEL,CARD,LINE,themeColor}:ThemeColors)=>({
 ACCENT,
 s:StyleSheet.create({
 backdrop:{flex:1,justifyContent:'center',padding:18,backgroundColor:themeColor('rgba(0,0,0,.7)','surface')},
 bannerPrompt:{width:'100%',maxWidth:420,alignSelf:'center',backgroundColor:PANEL,borderRadius:22,borderWidth:1,borderColor:ACCENT,padding:20,gap:16},
 bannerPromptHeading:{flexDirection:'row',alignItems:'center',gap:12},
 bannerPromptIcon:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:20,borderWidth:1,
  borderColor:themeColor('rgba(36,245,166,.42)','border'),backgroundColor:themeColor('rgba(22,163,74,.14)','surface')},
 bannerPromptTitle:{flex:1,color:TEXT,fontSize:18,lineHeight:24,fontWeight:'800'},
 bannerPromptBody:{color:MUTED,fontSize:14,lineHeight:21},
 bannerPlus:{color:themeColor('#38BDF8','text'),fontWeight:'900'},bannerPro:{color:ACCENT,fontWeight:'900'},
 bannerPromptActions:{flexDirection:'row',gap:10},
 bannerLater:{flex:1,minHeight:44,alignItems:'center',justifyContent:'center',padding:10,backgroundColor:CARD,borderWidth:1,borderColor:LINE,borderRadius:12},
 }),
}));
