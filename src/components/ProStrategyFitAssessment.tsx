import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Activity,CheckCircle2,ClipboardPenLine,Crosshair,Flag,Goal,Hand,Shield,ShieldAlert,Target } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Text,View } from 'react-native';

import { fitMetricLabel,localizeFitNarrative } from '@/utils/proFitMetrics';
import { canonicalizeEnterpriseMetricLabel } from '@/utils/proSpiderRanges';
import { Badge } from './LeaguePerformanceControls';
import { getThemed_proStyles as __getThemed_proStyles,type ProPlayerEntry } from './ProWorkspaceControls';
type Evidence={metric:string;value:number;unit?:string};
export type ProStrategyFitResult={summary?:string;overall?:string;recommendation?:string;requirements?:{title:string;category?:string;text:string;metrics:Evidence[]}[]};
const icons:Record<string,typeof Target>={contribution_impact:Activity,passing:Crosshair,shooting:Goal,defending:Shield,goalkeeping:Hand,errors_discipline:ShieldAlert,set_pieces:Flag};

export function StrategyMetricsTable({playerName,metrics,tr}:{playerName:string;metrics:Evidence[];tr:boolean}){
  const themed = useThemedStyles(getModuleTheme);
  const {border, MUTED, ACCENT, TEXT, themeColor} = themed;

 const {t,i18n}=useTranslation();if(!metrics.length)return null;
 return <View style={{borderWidth:1,borderColor:border,borderRadius:12,overflow:'hidden'}}><View style={{flexDirection:'row',padding:10,gap:8,backgroundColor:themeColor('rgba(22,163,74,.04)', 'surface')}}><Text style={{flex:2,minWidth:0,color:MUTED,fontSize:11,fontWeight:'600'}}>{tr?'Değerlendirmede Kullanılan Metrik':'Supporting Metric'}</Text><Text style={{flex:1,minWidth:0,color:ACCENT,fontSize:11,fontWeight:'700',textAlign:'right'}}>{playerName}</Text></View>{metrics.map((row,index)=><View key={row.metric+index} style={{flexDirection:'row',padding:10,gap:8,borderTopWidth:1,borderTopColor:border,alignItems:'center',backgroundColor:index%2?themeColor('rgba(255,255,255,.02)', 'surface'):'transparent'}}><View style={{flex:2,minWidth:0,gap:4}}><Text style={{color:MUTED,fontSize:12}}>{fitMetricLabel(canonicalizeEnterpriseMetricLabel(row.metric),tr?'tr':'en',String(t('metric.'+row.metric,{defaultValue:row.metric})))}</Text>{row.unit==='per90'&&<Text style={{color:MUTED,fontSize:9}}>{tr?'90 dk başına':'Per 90'}</Text>}</View><Text style={{flex:1,minWidth:0,color:TEXT,fontSize:13,fontWeight:'700',textAlign:'right'}}>{Number.isFinite(row.value)?new Intl.NumberFormat(i18n.language,{maximumFractionDigits:2}).format(row.value)+(row.unit==='percent'?'%':''):'—'}</Text></View>)}</View>;
}
export default function ProStrategyFitAssessment({player,result}:{player:ProPlayerEntry['player'];result:ProStrategyFitResult}){
  const themed = useThemedStyles(getModuleTheme);
  const {proStyles, ACCENT, FRAME_TITLE, TEXT} = themed;

 const {i18n}=useTranslation(),tr=i18n.language.startsWith('tr');
 const heading=(title:string,Icon:typeof Target)=><View style={proStyles.heading}><Icon color={ACCENT} size={22}/><Text style={[FRAME_TITLE,{flex:1,minWidth:0}]}>{localizeFitNarrative(title,tr)}</Text></View>;
 const identity=()=> <View style={{flexDirection:'row',alignItems:'center',gap:10}}><Badge player url={player.meta?.imageUrl} size={42}/><Text style={{flex:1,minWidth:0,color:ACCENT,fontSize:13,fontWeight:'700'}}>{player.name}</Text></View>;
 const perspective=(text:string,Icon:typeof Target)=><View style={{gap:8,minWidth:0}}><View style={{flexDirection:'row',alignItems:'center',gap:7}}><Icon size={14} color={ACCENT}/><Text style={{color:ACCENT,fontSize:13,fontWeight:'700'}}>ScoutWise {tr?'Perspektifi':'Perspective'}</Text></View><Text style={{color:TEXT,fontSize:14,lineHeight:22,width:'100%',flexShrink:1}}>{localizeFitNarrative(text,tr)}</Text></View>;
 return <View style={{gap:16,minWidth:0}}>{!!result.summary&&<View style={proStyles.frame}>{heading(tr?'Hedef Strateji':'Target Strategy',ClipboardPenLine)}{perspective(result.summary,ClipboardPenLine)}</View>}{!!result.overall&&<View style={proStyles.frame}>{heading(tr?'Genel Değerlendirme':'Overall Assessment',CheckCircle2)}{identity()}{perspective(result.overall,CheckCircle2)}</View>}{!!result.requirements?.length&&<Text style={FRAME_TITLE}>{tr?'Stratejinin Gerekliliklerine Uyum':'Fit to Strategy Requirements'}</Text>}{result.requirements?.map(requirement=>{const Icon=icons[requirement.category||'']||Target;return <View key={requirement.title} style={proStyles.frame}>{heading(requirement.title,Icon)}{perspective(requirement.text,Icon)}<StrategyMetricsTable playerName={player.name} metrics={requirement.metrics} tr={tr}/></View>;})}{!!result.recommendation&&<View style={proStyles.frame}>{heading(tr?'Kullanım Önerisi':'Usage Recommendation',Target)}{identity()}{perspective(result.recommendation,Target)}</View>}</View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, FRAME_TITLE, MUTED, TEXT, themeColor} = colors;
  const proStyles = __getThemed_proStyles(colors);
  const border=themeColor('rgba(22,163,74,.22)');
  return {ACCENT, FRAME_TITLE, MUTED, TEXT, proStyles, border, themeColor};
});
