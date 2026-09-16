import {TeamReportTeamData,TeamReportPlayerData} from './TeamReportData';
import TeamReportAssessment, {type TeamAssessment} from './TeamReportAssessment';
import {matchPoolRequest, type Plan} from '@/services/api';
import TeamReportTacticalProfile from './TeamReportTacticalProfile';
import TeamReportMomentum from './TeamReportMomentum';
import TeamReportScoreFlow from './TeamReportScoreFlow';
import TeamReportSquad from './TeamReportSquad';
import TeamReportFormResults from './TeamReportFormResults';
import React, { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { ACCENT, BG, CARD, DANGER, TEXT, MUTED } from "@/theme";
import TeamReportCard from "./TeamReportCard";
import ActionSpinner from "./ActionSpinner";
import {reportModalStyles as modal} from "./PostMatchReportModal";
import { Team } from "@/services/teamPool";
import { PlayedMatch } from "@/services/teamAnalysis";
import { matchDateOnly } from "@/services/matchPool";
export default function TeamAnalysisReportModal({
  team,
  matches,
  data,
  loading,
  error,
  tr,
  plan,
  onOpenPlans,
  onClose,
}: {
  team: Team;
  matches: PlayedMatch[];
  data: any;
  loading: boolean;
  error: string;
  tr: boolean;
  plan: Plan;
  onOpenPlans: () => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const [assessment,setAssessment]=useState<TeamAssessment|null>(null),[assessmentError,setAssessmentError]=useState(false),[assessmentRequested,setAssessmentRequested]=useState(false),[assessmentRetry,setAssessmentRetry]=useState(0);
  useEffect(()=>{if(page===8||page===9)setAssessmentRequested(true);},[page]);
  const matchKey=matches.map(m=>m.fixtureId).join(',');
  useEffect(()=>{
    if(!assessmentRequested||!data?.reports?.length)return;
    let cancelled=false;setAssessment(null);setAssessmentError(false);
    matchPoolRequest<TeamAssessment>('/team-analysis/report-profile/assessment',{teamId:Number(team.id),leagueId:team.leagueId,fixtureIds:matches.map(m=>m.fixtureId)}).then(result=>{if(!cancelled)setAssessment(result);}).catch(()=>{if(!cancelled)setAssessmentError(true);});
    return()=>{cancelled=true;};
  },[assessmentRequested,assessmentRetry,team.id,matchKey,tr,data?.reports,plan]);
  const insets=useSafeAreaInsets();
  const [width,setWidth]=useState(0);
  const pager=useRef<FlatList<string>>(null);
  const titles=tr
    ? ['Takım Kartı','Form ve Sonuçlar','Kadro Profili ve Taktik','Kadro Profili ve Taktik','Momentum','Skor Akış Profili','Hücum Profili','Savunma Profili','Güçlü Yönler','Zayıf Yönler','Takım Verileri','Oyuncu Verileri']
    : ['Team Card','Form & Results','Squad Profile & Tactics','Squad Profile & Tactics','Momentum','Score Flow Profile','Attack Profile','Defense Profile','Strengths','Weaknesses','Team Data','Player Data'];
  const go=(index:number)=>{setPage(index);pager.current?.scrollToOffset({offset:index*width,animated:true});};
  useEffect(()=>{if(width)pager.current?.scrollToOffset({offset:page*width,animated:false});},[width]);
  const renderPage=(index:number)=>{
    if(index===0)return <TeamReportCard team={team} matches={matches} tr={tr}/>;
    if(index===1)return <TeamReportFormResults team={team} matches={matches} tr={tr}/>;

    if(index===2&&data?.reports?.length)return <TeamReportSquad team={team} reports={data.reports} matches={matches.length} tr={tr}/>;
    if((index===6||index===7)&&data?.reports?.length)return <TeamReportTacticalProfile team={team} matches={matches} tr={tr} kind={index===6?'attack':'defense'} active={page===index} free={plan==='Free'} onOpenPlans={onOpenPlans}/>;
    if((index===8||index===9)&&data?.reports?.length)return <TeamReportAssessment team={team} matches={matches.length} tr={tr} weak={index===9} profile={assessment?.[index===9?'weaknesses':'strengths']} error={assessmentError} onRetry={()=>setAssessmentRetry(r=>r+1)} free={plan==='Free'} onOpenPlans={onOpenPlans}/>;
    if(loading)return <View style={modal.center}><ActionSpinner color={ACCENT} size={28}/><Text style={modal.subtitle}>{tr?'Seçilen maçlar analiz ediliyor…':'Analyzing selected matches…'}</Text></View>;
    if(error)return <Text style={modal.subtitle}>{error}</Text>;
    if(index===10)return <TeamReportTeamData team={team} matches={matches.length} metrics={data?.teamMetrics??{}} tr={tr}/>;
    if(index===11)return <TeamReportPlayerData team={team} matches={matches.length} reports={data?.reports??[]} tr={tr}/>;
    if(index===4)return <TeamReportMomentum team={team} reports={data?.reports??[]} tr={tr}/>;
    if(index===5)return <TeamReportScoreFlow team={team} profile={data?.scoreFlowProfile} matches={matches.length} tr={tr}/>;
    return <TeamReportSquad team={team} reports={data?.reports??[]} matches={matches.length} tr={tr} playersPage={index===3} perspectives={data?.playerPerspectives??{}}/>;
  };
  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <View style={[modal.backdrop,{paddingTop:Math.max(14,insets.top),paddingBottom:Math.max(14,insets.bottom)}]}><View style={modal.modal}>
      <View style={modal.header}><View style={modal.headerText}><Text style={modal.headerTitle}>{tr?'Takım Analiz Raporu':'Team Analysis Report'}</Text><Text style={[modal.sectionTitle,page===9&&{color:DANGER}]}>{titles[page]}</Text></View><Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr?'Kapat':'Close'}><X size={25} color={DANGER}/></Pressable></View>
      <View style={modal.pager} onLayout={e=>setWidth(Math.round(e.nativeEvent.layout.width))}>{width>0&&<FlatList ref={pager} horizontal pagingEnabled data={titles} keyExtractor={(_,index)=>String(index)} extraData={{width,data,loading,error,tr,team,matches,page,assessment,assessmentError,plan}} showsHorizontalScrollIndicator={false} getItemLayout={(_,index)=>({length:width,offset:width*index,index})} onMomentumScrollEnd={e=>setPage(Math.max(0,Math.min(titles.length-1,Math.round(e.nativeEvent.contentOffset.x/width))))} renderItem={({index})=><ScrollView style={{width}} contentContainerStyle={[modal.pageContent,{gap:12}]}>{renderPage(index)}</ScrollView>}/>}</View>
      <View style={modal.footer}><Pressable disabled={page===0} style={[modal.nav,page===0&&modal.disabled]} onPress={()=>go(page-1)} accessibilityLabel={tr?'Önceki bölüm':'Previous section'}><ChevronLeft size={22} color={TEXT}/></Pressable><View style={modal.dots}>{titles.map((title,index)=><Pressable key={index} style={[modal.dotTarget,{paddingHorizontal:3}]} onPress={()=>go(index)} accessibilityLabel={title}><View style={[modal.dot,index===page&&{backgroundColor:ACCENT}]}/></Pressable>)}</View><Pressable disabled={page===titles.length-1} style={[modal.nav,page===titles.length-1&&modal.disabled]} onPress={()=>go(page+1)} accessibilityLabel={tr?'Sonraki bölüm':'Next section'}><ChevronRight size={22} color={TEXT}/></Pressable></View>
    </View></View>
  </Modal>;
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG, padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 6,
  },
  box: {
    backgroundColor: CARD,
    borderColor: ACCENT,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  title: { color: ACCENT, fontSize: 15, fontWeight: "800" },
  text: { color: TEXT, fontSize: 13, lineHeight: 21 },
  tab: { borderWidth: 1, borderColor: ACCENT, borderRadius: 20, padding: 10 },
});
