import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Pressable,StyleSheet,Text,View } from 'react-native';

import type { Team } from '@/services/teamPool';
import { hasNonZeroReportValue,matchMetricLabel } from '@/utils/matchReportMetrics';
import { teamFindingMetricLabel } from '@/utils/teamStyleMetricLabels';
import ActionSpinner from './ActionSpinner';
import TeamReportHeader from './TeamReportHeader';
import TeamReportLockedDetail from './TeamReportLockedDetail';
export type AssessmentProfile={hasMoreThemes?:boolean;themes:{title:string;description?:string;relativeFallback?:boolean;metrics:{label:string;value:string;contributes?:boolean}[]}[]};
export type TeamAssessment={strengths:AssessmentProfile;weaknesses:AssessmentProfile};
export default function TeamReportAssessment({team,matches,tr,weak,profile,error,onRetry,free,onOpenPlans}:{team:Team;matches:number;tr:boolean;weak:boolean;profile?:AssessmentProfile;error:boolean;onRetry:()=>void;free:boolean;onOpenPlans:()=>void}){
  const themed = useThemedStyles(getModuleTheme);
  const {DANGER, ACCENT, s} = themed;

 const accent=weak?DANGER:ACCENT;
 const hasSecondTopic = profile?.hasMoreThemes ?? (profile?.themes.length ?? 0) > 1;
 return <View style={{gap:12}}><TeamReportHeader team={team} matches={matches} tr={tr} accent={accent}/><Text style={s.caption}>{tr?'Takım adetleri maç başına. Paylar ve oranlar kendi birimleriyle gösterilir.':'Team counts are per match. Shares and rates retain their units.'}</Text>
 {!profile?error?<View style={s.frame}><Text style={s.caption}>{tr?'Analiz hazırlanamadı.':'Unable to prepare analysis.'}</Text><Pressable onPress={onRetry}><Text style={{color:accent}}>{tr?'Tekrar Dene':'Retry'}</Text></Pressable></View>:<View style={s.center}><ActionSpinner size={28} color={accent}/><Text style={s.caption}>{tr?'Analiz hazırlanıyor…':'Preparing analysis…'}</Text></View>:!profile.themes.length?<Text style={s.caption}>{weak ? (tr?'Seçili maçlarda kriterleri karşılayan bir zayıf yön belirlenmedi.':'No weakness met the criteria in the selected matches.') : (tr?'Seçili maçlarda kriterleri karşılayan bir güçlü yön belirlenmedi.':'No strength met the criteria in the selected matches.')}</Text>:profile.themes.slice(0,free?1:2).map((topic,i)=><View key={i} style={[s.frame,{borderColor:`${accent}70`,backgroundColor:`${accent}08`}]}><Text style={[s.kicker,{color:accent}]}>{weak?(tr?'Zayıf Yön':'Weakness'):(tr?'Güçlü Yön':'Strength')} {i+1}</Text><Text style={s.title}>{matchMetricLabel(topic.title,tr?'tr':'en')}</Text>{!!topic.description&&<Text style={s.caption}>{topic.description}{topic.relativeFallback && (tr ? ' Seçili maçlardaki göreli sıralamaya göre seçildi.' : ' Selected by relative ranking across the chosen matches.')}</Text>}<View style={s.grid}>{topic.metrics.filter(metric=>metric.contributes||hasNonZeroReportValue(metric.value)).slice(0,4).map((m,j)=><View key={j} style={[s.metric,{borderColor:`${accent}55`}]}><Text style={s.caption}>{teamFindingMetricLabel(m.label,tr) ?? matchMetricLabel(m.label,tr?'tr':'en')}</Text><Text style={[s.value,{color:accent}]}>{m.value}</Text></View>)}</View></View>)}
  {profile && free && hasSecondTopic && <TeamReportLockedDetail
   tr={tr}
   accent={accent}
   kind={weak ? 'weaknesses' : 'strengths'}
   onOpenPlans={onOpenPlans}
   titleOverride={weak ? (tr ? '2. Zayıf Yön' : 'Second Weakness') : (tr ? '2. Güçlü Yön' : 'Second Strength')}
   messageOverride={tr ? 'İkinci değerlendirmeyi görmek için PLUS veya PRO’ya geç.' : 'Switch to PLUS or PRO to see the second finding.'}
 />}
 </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, DANGER, LINE, MUTED, TEXT, themeColor} = colors;

  const s=StyleSheet.create({frame:{borderWidth:1,borderColor:LINE,borderRadius:18,backgroundColor:CARD,padding:14,gap:14},caption:{color:MUTED,fontSize:11,lineHeight:17},center:{padding:30,alignItems:'center',gap:12},kicker:{fontSize:12,fontWeight:'800'},title:{fontSize:19,fontWeight:'900',color:TEXT},grid:{flexDirection:'row',flexWrap:'wrap',gap:10},metric:{flexGrow:1,flexBasis:'45%',borderWidth:1,borderRadius:13,padding:11,gap:10,backgroundColor:themeColor('#FFFFFF03', 'surface')},value:{fontSize:22,fontWeight:'900'},bullet:{flexDirection:'row',gap:8,borderTopWidth:1,paddingTop:12},body:{color:TEXT,fontSize:14,lineHeight:23,flex:1}});
  return {ACCENT, CARD, DANGER, LINE, MUTED, TEXT, s, themeColor};
});
