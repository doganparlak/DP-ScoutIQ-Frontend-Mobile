import { reportScopeMatches } from '@/services/reportAccess';
import {PreMatchReportContext} from './PreMatchReportContext';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, ArrowRightLeft, BadgeInfo, ChartNoAxesCombined, ChevronLeft, ChevronRight, Shield, TrendingUp, Users, UserRound, X } from 'lucide-react-native';
import { ACCENT, DANGER, TEXT } from '@/theme';
import { ensureSavedPreMatchSection, openSavedPreMatchReport, pollSavedPreMatchReport, type SavedPreMatchReport, type MatchFixture, type PostMatchCardData } from '@/services/matchPool';
import {getMe,type Plan} from '@/services/api';
import { MatchCard, reportModalStyles as s } from './PostMatchReportModal';
import PreMatchTeamAnalysis from './PreMatchTeamAnalysis';
import PreMatchTeamComparison from './PreMatchTeamComparison';
import PreMatchScoreFlow from './PreMatchScoreFlow';
import PreMatchMomentum from './PreMatchMomentum';
import PreMatchPlayers from './PreMatchPlayers';
import PreMatchFormResults from './PreMatchFormResults';
import PreMatchLineups from './PreMatchLineups';
import ActionSpinner from './ActionSpinner';
const sections=[
  {tr:'Maç Kartı',en:'Match Card',Icon:BadgeInfo},
  {tr:'Kadro ve Diziliş',en:'Lineup & Formation',Icon:Users},
  {tr:'Form ve Sonuçlar',en:'Form & Results',Icon:TrendingUp},
  {tr:'Göze Çarpan Oyuncular',en:'Standout Players',Icon:UserRound},
  {tr:'Momentum',en:'Momentum',Icon:ChartNoAxesCombined},
  {tr:'Skor Akış Profili',en:'Score Flow Profile',Icon:Activity},
  {tr:'Takım Karşılaştırması',en:'Team Comparison',Icon:ArrowRightLeft},
  {tr:'Takım Analizi',en:'Team Analysis',Icon:Shield},
];
export default function PreMatchReportModal({fixture,tr,onClose,onOpenPlans}:{fixture:MatchFixture;tr:boolean;onClose:()=>void;onOpenPlans:()=>void}) {
  const insets=useSafeAreaInsets();const [page,setPage]=useState(0),[width,setWidth]=useState(0),[data,setData]=useState<PostMatchCardData|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  const [plan,setPlan]=useState<Plan>('Free');
  const [snapshot,setSnapshot]=useState<SavedPreMatchReport|null>(null);
  const pager=useRef<FlatList>(null);
  useEffect(()=>{let active=true;getMe().then(profile=>{if(!active)return;setPlan(profile.plan==='No Ads Monthly'||profile.plan==='Pro Monthly'||profile.plan==='Pro Yearly'?profile.plan:'Free');}).catch(()=>{if(active)setPlan('Free');});return()=>{active=false;};},[]);
  useEffect(()=>{
    let cancelled=false; let timer:ReturnType<typeof setTimeout>;
    setError(false);
    const accept=(value:SavedPreMatchReport)=>{
      if(cancelled)return;
      setSnapshot(value);setData(value.content?.data??null);
      setError(value.status==='failed'&&!value.content?.data);
      const foundationReady=Boolean(value.content?.data&&value.content?.squad&&value.content?.form);
      if(!foundationReady&&value.status!=='failed')timer=setTimeout(poll,2000);
    };
    const poll=()=>{pollSavedPreMatchReport(fixture.fixtureId,tr).then(accept).catch(()=>{if(!cancelled)timer=setTimeout(poll,5000);});};
    openSavedPreMatchReport(fixture.fixtureId,tr).then(accept).catch(()=>{if(!cancelled)setError(true);});
    return()=>{cancelled=true;clearTimeout(timer);};
  },[fixture.fixtureId,tr,retry]);

  const activeAiSection = page===3?'players':page===4?'momentum':page===7?'team_analysis':null;
  useEffect(()=>{
    if(!data||!activeAiSection)return;
    const current=snapshot?.content?.sections?.[activeAiSection]?.status;
    if(current==='ready'&&reportScopeMatches(snapshot?.content?.sections?.[activeAiSection],plan!=='Free'))return;
    let active=true;let timer:ReturnType<typeof setTimeout>|undefined;
    const accept=(next:SavedPreMatchReport)=>{if(!active)return;setSnapshot(next);setData(next.content?.data??data);const state=next.content?.sections?.[activeAiSection]?.status;if(state!=='failed'&&(state!=='ready'||!reportScopeMatches(next.content?.sections?.[activeAiSection],plan!=='Free')))timer=setTimeout(poll,2000);};
    const poll=()=>pollSavedPreMatchReport(fixture.fixtureId,tr).then(accept).catch(()=>{if(active)timer=setTimeout(poll,5000);});
    ensureSavedPreMatchSection(fixture.fixtureId,tr,activeAiSection).then(next=>{accept(next);if(active&&!timer)timer=setTimeout(poll,2000);}).catch(()=>{if(active)timer=setTimeout(poll,5000);});
    return()=>{active=false;if(timer)clearTimeout(timer);};
  },[data,activeAiSection,fixture.fixtureId,tr,retry,plan]);

  useEffect(()=>{if(width)pager.current?.scrollToOffset({offset:page*width,animated:false});},[width]);
  const go=(next:number)=>{const index=Math.max(0,Math.min(sections.length-1,next));setPage(index);pager.current?.scrollToOffset({offset:index*width,animated:true});};
  const openPlans=()=>{onClose();onOpenPlans();};
  return <PreMatchReportContext.Provider value={{snapshot,paid:plan!=='Free',onRetry:()=>setRetry(v=>v+1)}}><Modal transparent animationType="fade" onRequestClose={onClose}><View style={[s.backdrop,{paddingTop:Math.max(14,insets.top),paddingBottom:Math.max(14,insets.bottom)}]}><View style={s.modal}>
    <View style={s.header}><View style={s.headerText}><Text style={s.headerTitle}>{tr?'Maç Önü Raporu':'Pre-Match Report'}</Text><Text style={s.sectionTitle}>{tr?sections[page].tr:sections[page].en}</Text></View><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={tr?'Kapat':'Close'} hitSlop={12}><X size={25} color={DANGER}/></Pressable></View>
    <View style={s.pager} onLayout={e=>setWidth(Math.round(e.nativeEvent.layout.width))}>{width>0&&<FlatList ref={pager} horizontal pagingEnabled data={sections} keyExtractor={item=>item.en} extraData={{width,data,error,tr,page,plan}} showsHorizontalScrollIndicator={false} getItemLayout={(_,index)=>({length:width,offset:width*index,index})} onMomentumScrollEnd={e=>setPage(Math.max(0,Math.min(sections.length-1,Math.round(e.nativeEvent.contentOffset.x/width))))} renderItem={({item,index})=><ScrollView style={{width}} contentContainerStyle={s.pageContent}>{index===0?data?<MatchCard data={data} tr={tr} preMatch/>:error?<View style={s.center}><Text style={s.subtitle}>{tr?'Maç bilgileri yüklenemedi.':'Unable to load match details.'}</Text><Pressable style={s.retry} onPress={()=>setRetry(v=>v+1)}><Text style={s.sectionTitle}>{tr?'Tekrar Dene':'Try Again'}</Text></Pressable></View>:<View style={s.center}><ActionSpinner size={28} color={ACCENT}/><Text style={s.subtitle}>{tr?'Maç bilgileri yükleniyor…':'Loading match details…'}</Text></View>:index===1&&data?<PreMatchLineups data={data} tr={tr} active={page===1}/>:index===2&&data?<PreMatchFormResults data={data} tr={tr} active={page===2}/>:index===3&&data?<PreMatchPlayers data={data} tr={tr} active={page===3} free={plan==='Free'} onOpenPlans={openPlans}/>:index===4&&data?<PreMatchMomentum data={data} tr={tr} active={page===4} free={plan==='Free'} onOpenPlans={openPlans}/>:index===5&&data?<PreMatchScoreFlow data={data} tr={tr} active={page===5}/>:index===6&&data?<PreMatchTeamComparison data={data} tr={tr} active={page===6}/>:index===7&&data?<PreMatchTeamAnalysis data={data} tr={tr} active={page===7} free={plan==='Free'} onOpenPlans={openPlans}/>:<View style={s.placeholder}><View style={s.rule}/><item.Icon size={36} color={ACCENT}/><Text style={s.placeholderTitle}>{tr?item.tr:item.en}</Text><Text style={s.subtitle}>{fixture.name}</Text><Text style={s.soon}>{tr?'Yakında':'Coming soon'}</Text></View>}</ScrollView>}/>}</View>
    <View style={s.footer}><Pressable disabled={page===0} style={[s.nav,page===0&&s.disabled]} onPress={()=>go(page-1)} accessibilityLabel={tr?'Önceki bölüm':'Previous section'}><ChevronLeft size={22} color={TEXT}/></Pressable><View style={s.dots}>{sections.map((item,index)=><Pressable key={item.en} style={s.dotTarget} onPress={()=>go(index)} accessibilityLabel={tr?item.tr:item.en}><View style={[s.dot,index===page&&{backgroundColor:ACCENT}]}/></Pressable>)}</View><Pressable disabled={page===sections.length-1} style={[s.nav,page===sections.length-1&&s.disabled]} onPress={()=>go(page+1)} accessibilityLabel={tr?'Sonraki bölüm':'Next section'}><ChevronRight size={22} color={TEXT}/></Pressable></View>
  </View></View></Modal></PreMatchReportContext.Provider>;
}
