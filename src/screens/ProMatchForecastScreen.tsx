import React from 'react';
import {ActivityIndicator, Pressable, Text, View} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {ChartNoAxesCombined, LayoutGrid} from 'lucide-react-native';
import Header from '@/components/Header';
import ChatAccessModal from '@/components/ChatAccessModal';
import ProAIConsentCard from '@/components/ProAIConsentCard';
import ProMatchForecastFlow from '@/components/ProMatchForecastFlow';
import {ProGuidedScrollView, TutorialPageGuide, useProPageGuide, useTutorial} from '@/components/Tutorial';
import {getMe, updateConsent, type Profile} from '@/services/api';
import {createThemedStyles, useThemedStyles, type ThemeColors} from '@/theme';

export default function ProMatchForecastScreen() {
  const {s, ACCENT, PURPLE} = useThemedStyles(getTheme);
  const navigation = useNavigation<any>();
  const {i18n} = useTranslation(), tr = i18n.language.startsWith('tr');
  const tutorial = useTutorial();
  useProPageGuide('proForecast');
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true), [failed, setFailed] = React.useState(false);
  const [busy, setBusy] = React.useState(false), [savingConsent, setSavingConsent] = React.useState(false);
  const [accessModal, setAccessModal] = React.useState(false), [retry, setRetry] = React.useState(0);
  const alive = React.useRef(true);
  React.useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  useFocusEffect(React.useCallback(()=>{
    let active=true;setLoading(true);setFailed(false);
    getMe().then(value=>{if(active)setProfile(value);}).catch(()=>{if(active)setFailed(true);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[retry]));
  const refreshCredits = React.useCallback(()=>{void getMe().then(value=>{if(alive.current)setProfile(value);}).catch(()=>{});},[]);
  const unlimited = !!profile && ['Pro Monthly','Pro Yearly'].includes(profile.plan) && !!profile.subscriptionEndAt && new Date(profile.subscriptionEndAt).getTime()>Date.now();
  function menu(){if(navigation.canGoBack())navigation.goBack();else navigation.navigate('ProHome');}
  function plans(){navigation.getParent()?.navigate('Profile',{screen:'ManagePlan'});}
  async function acceptConsent(){
    if(savingConsent)return;
    setSavingConsent(true);
    try{const updated=await updateConsent(true);if(alive.current){setProfile(updated);setFailed(false);}}
    catch{if(alive.current)setFailed(true);}
    finally{if(alive.current)setSavingConsent(false);}
  }
  return <View style={s.page}>
    <Header/>
    <View style={s.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel={tr?'ScoutWise Pro menüsüne dön':'Back to ScoutWise Pro menu'} disabled={busy} onPress={menu} style={[s.menu,busy&&s.disabled]}><LayoutGrid size={17} color={ACCENT}/><Text style={s.menuText}>{tr?'Menü':'Menu'}</Text></Pressable>
      {!!profile&&!tutorial.active&&<View style={s.balance}><Text style={s.menuText}>{tr?'Pro Kredin':'Pro Credits'}: {unlimited?'∞':Math.max(0,profile.freeChatMessagesRemaining??0)}</Text></View>}
    </View>
    <ProGuidedScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
      <View style={s.panel}>
        <View style={s.heading}><View style={s.icon}><ChartNoAxesCombined size={23} color={PURPLE}/></View><View style={{flex:1,gap:5}}><Text accessibilityRole="header" style={s.title}>{tr?'Maç Öngörüsü':'Match Forecast'}</Text><Text style={s.body}>{tr?'Takımını ve maçını seç; ScoutWise öngörüsünü incele.':'Choose a team and fixture to explore ScoutWise’s forecast.'}</Text></View></View>
        <TutorialPageGuide page="proForecast" frame={0} summaryLines={0}/>
        {loading&&!profile?<ActivityIndicator color={PURPLE}/>:failed?<View style={{gap:10}}><Text style={s.body}>{tr?'Hesap bilgileri yüklenemedi. Yeniden dene.':'Could not load your account. Please try again.'}</Text><Pressable accessibilityRole="button" onPress={()=>setRetry(n=>n+1)} style={s.menu}><Text style={s.menuText}>{tr?'Yeniden Dene':'Retry'}</Text></Pressable></View>:profile?<>
          {!tutorial.active&&!profile.consent&&<ProAIConsentCard saving={savingConsent} onAccept={()=>void acceptConsent()}/>}
          <ProMatchForecastFlow key={profile.id} userId={profile.id} preview={tutorial.active} disabled={savingConsent||(!tutorial.active&&!profile.consent)} onOpenPlans={plans} onAccessRequired={()=>setAccessModal(true)} onCreditsChanged={refreshCredits} onBusyChange={setBusy}/>
        </>:null}
      </View>
    </ProGuidedScrollView>
    <ChatAccessModal visible={accessModal} tutorial={tutorial.active} onClose={()=>setAccessModal(false)} onAction={()=>{setAccessModal(false);if(tutorial.active){tutorial.completeTutorial();menu();}else plans();}}/>
  </View>;
}

const getTheme=createThemedStyles((c:ThemeColors)=>{
 const {BG,CARD,LINE,MUTED,TEXT,ACCENT,themeColor}=c,PURPLE=themeColor('#A78BFA','text');
 const s={page:{flex:1,backgroundColor:BG},toolbar:{flexDirection:'row' as const,alignItems:'center' as const,gap:10,paddingHorizontal:16,paddingBottom:12},menu:{minHeight:44,borderWidth:1,borderColor:ACCENT,borderRadius:12,paddingVertical:10,paddingHorizontal:13,flexDirection:'row' as const,alignItems:'center' as const,justifyContent:'center' as const,gap:7},menuText:{color:ACCENT,fontSize:12,fontWeight:'800' as const},balance:{marginLeft:'auto' as const,minHeight:44,paddingHorizontal:12,justifyContent:'center' as const,borderRadius:12,borderWidth:1,borderColor:LINE,backgroundColor:CARD},content:{padding:16,paddingBottom:36},panel:{width:'100%' as const,maxWidth:1060,alignSelf:'center' as const,minWidth:0,borderWidth:1,borderColor:`${PURPLE}60`,borderRadius:22,padding:16,gap:20,backgroundColor:CARD},heading:{flexDirection:'row' as const,alignItems:'center' as const,gap:12},icon:{width:43,height:43,borderRadius:13,backgroundColor:themeColor('rgba(167,139,250,.12)','surface'),alignItems:'center' as const,justifyContent:'center' as const},title:{color:TEXT,fontSize:21,lineHeight:29,fontWeight:'800' as const},body:{color:MUTED,fontSize:13,lineHeight:20},disabled:{opacity:.45}};
 return{s,ACCENT,PURPLE};
});
