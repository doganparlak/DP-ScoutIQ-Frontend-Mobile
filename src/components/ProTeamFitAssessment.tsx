import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { CheckCircle2,Compass,Target,Users } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet,Text,View } from 'react-native';

import { type Team } from '@/services/teamPool';
import { fitMetricLabel,fitMetricWinner,localizeFitNarrative } from '@/utils/proFitMetrics';
import { canonicalizeEnterpriseMetricLabel } from '@/utils/proSpiderRanges';
import { Badge } from './LeaguePerformanceControls';
import { getThemed_proStyles as __getThemed_proStyles,type ProPlayerEntry } from './ProWorkspaceControls';
type Evidence={metric:string;value:number;subject?:string;unit?:string};
type Section={text:string;evidence?:Evidence[];teamEvidence?:Evidence[]};
type Insights={overall:string;peers:(Section&{name:string;playerId:number;imageUrl?:string;roles?:string[]})[];fit:Section;recommendation:Section};

export function FitStatsTable({evidence=[],subjects,tr}:{evidence?:Evidence[];subjects:string[];tr:boolean}){
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT, BLUE, themeColor} = themed;

 const {t}=useTranslation();const rows=new Map<string,Map<string,Evidence>>();
 evidence.forEach(item=>{const metric=canonicalizeEnterpriseMetricLabel(item.metric);if(!rows.has(metric))rows.set(metric,new Map());rows.get(metric)!.set(item.subject||subjects[0],item);});
 if(!rows.size)return null;
 return <View style={s.table}><Text style={s.caption}>{tr?'Değerlendirmede Kullanılan İstatistikler':'Supporting Statistics'}</Text><View style={s.tableRow}><Text style={[s.cell,s.metric,s.label]}>{tr?'Metrik':'Metric'}</Text>{subjects.map((name,i)=><View key={name} style={s.cell}><Text style={[s.label,{color:i===0?ACCENT:BLUE}]}>{name}</Text>{name.includes('Rol ortalaması')||name.includes('Role average')?<Text style={s.note}>{tr?'Son 5 maç · 90 dk başına':'Last 5 matches · Per 90'}</Text>:null}</View>)}</View>{Array.from(rows,([metric,values])=>{const items=subjects.map(name=>values.get(name));const compatible=items.every(item=>item&&item.unit===items[0]?.unit&&item.unit!=='perMatch');const winner=compatible?fitMetricWinner(metric,items.map(item=>item?.value)):-1;return <View key={metric} style={s.tableRow}><View style={[s.cell,s.metric]}><Text style={s.label}>{fitMetricLabel(metric,tr?'tr':'en',String(t('metric.'+metric,{defaultValue:metric})))}</Text><Text style={s.note}>{items[0]?.unit==='per90'?(tr?'90 dk başına':'Per 90'):items[0]?.unit==='percent'?'%':''}</Text></View>{items.map((item,i)=><View key={subjects[i]} style={[s.cell,winner===i&&{backgroundColor:i===0?themeColor('rgba(52,211,153,0.12)', 'surface'):themeColor('rgba(96,165,250,0.12)', 'surface')}]}><Text style={[s.value,winner===i&&{color:i===0?ACCENT:BLUE}]}>{item&&Number.isFinite(item.value)?`${Number(item.value.toFixed(2))}${item.unit==='percent'?'%':''}`:'—'}</Text></View>)}</View>;})}</View>;
}
export function TeamContextStats({playerName,teamName,playerEvidence=[],teamEvidence=[],tr}:{playerName:string;teamName:string;playerEvidence?:Evidence[];teamEvidence?:Evidence[];tr:boolean}){
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT, BLUE, themeColor} = themed;

 const {t,i18n}=useTranslation();
 const column=(name:string,items:Evidence[],color:string)=><View style={{flex:1,minWidth:0}}><Text style={[s.label,{color,padding:10,fontWeight:'700'}]}>{name}</Text>{items.map((item,index)=><View key={item.metric+index} style={{borderTopWidth:1,borderTopColor:themeColor('rgba(255,255,255,0.08)', 'border'),padding:10,gap:6}}><Text style={s.label}>{fitMetricLabel(canonicalizeEnterpriseMetricLabel(item.metric),tr?'tr':'en',String(t('metric.'+item.metric,{defaultValue:item.metric})))}</Text><Text style={[s.value,{textAlign:'left'}]}>{Number.isFinite(item.value)?new Intl.NumberFormat(i18n.language,{maximumFractionDigits:2}).format(item.value)+(item.unit==='percent'?'%':''):'—'}</Text></View>)}</View>;
 if(!playerEvidence.length&&!teamEvidence.length)return null;
 return <View style={s.table}><Text style={s.caption}>{tr?'Değerlendirmede Kullanılan İstatistikler':'Supporting Statistics'}</Text><View style={{flexDirection:'row',alignItems:'flex-start'}}>{column(playerName,playerEvidence,ACCENT)}<View style={{width:1,alignSelf:'stretch',backgroundColor:themeColor('rgba(255,255,255,0.08)', 'surface')}}/>{column(teamName,teamEvidence,BLUE)}</View></View>;
}
export default function ProTeamFitAssessment({player,team,insights}:{player:ProPlayerEntry['player'];team:Team;insights:Insights}){
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT, BLUE, FRAME_TITLE, proStyles} = themed;

 const {i18n}=useTranslation(),tr=i18n.language.startsWith('tr');
 const identity=(name:string,url:string|undefined,color:string,person:boolean,roles?:string[]) => <View style={s.identity}><Badge url={url} player={person} size={42}/><View style={{flex:1,minWidth:0}}><Text style={[s.name,{color}]}>{name}</Text>{!!roles?.length&&<Text style={s.note}>{roles.join(' · ')}</Text>}</View></View>;
 const pair=(name:string,url?:string,person=false,roles?:string[]) => <View style={s.pair}>{identity(player.name,player.meta?.imageUrl,ACCENT,true)}{identity(name,url,BLUE,person,roles)}</View>;
 const perspective=(text:string)=><View style={s.perspective}><Text style={s.perspectiveTitle}>ScoutWise {tr?'Perspektifi':'Perspective'}</Text><Text style={s.paragraph}>{localizeFitNarrative(text,tr)}</Text></View>;
 const heading=(title:string,Icon:typeof Target)=><View style={s.heading}><Icon size={22} color={ACCENT}/><Text style={[FRAME_TITLE,{flex:1,minWidth:0}]}>{title}</Text></View>;
 const section=(title:string,Icon:typeof Target,data:Section)=><View style={proStyles.frame}>{heading(title,Icon)}{pair(team.name,team.logoUrl||undefined)}{perspective(data.text)}<TeamContextStats tr={tr} playerName={player.name} teamName={team.name} playerEvidence={data.evidence} teamEvidence={data.teamEvidence}/></View>;
 return <View style={{gap:16,minWidth:0}}><View style={proStyles.frame}>{heading(tr?'Genel Değerlendirme':'Overall Assessment',CheckCircle2)}{pair(team.name,team.logoUrl||undefined)}{perspective(insights.overall)}</View>{!!insights.peers.length&&<View style={proStyles.frame}>{heading(tr?'Aynı Roldeki Oyuncular':'Players in the Same Role',Users)}{insights.peers.map(peer=><View key={peer.playerId} style={s.peer}>{pair(peer.name,peer.imageUrl,true,peer.roles)}{perspective(peer.text)}<FitStatsTable tr={tr} evidence={peer.evidence} subjects={[player.name,peer.name]}/></View>)}</View>}{section(tr?'Takıma Uyum':'Team Fit',Target,insights.fit)}{section(tr?'Kullanım Önerisi':'Usage Recommendation',Compass,insights.recommendation)}</View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, FRAME_TITLE, MUTED, TEXT, themeColor} = colors;
  const proStyles = __getThemed_proStyles(colors);
  const BLUE=themeColor('#60a5fa');

  const s=StyleSheet.create({heading:{flexDirection:'row',alignItems:'center',gap:9},pair:{flexDirection:'row',gap:12,marginTop:14},identity:{flex:1,minWidth:0,flexDirection:'row',alignItems:'center',gap:8},name:{fontSize:13,fontWeight:'700',flexShrink:1},peer:{borderWidth:1,borderColor:themeColor('rgba(52,211,153,0.22)', 'border'),borderRadius:16,padding:12,marginTop:14},perspective:{gap:7,marginTop:16,minWidth:0},perspectiveTitle:{color:ACCENT,fontSize:13,fontWeight:'700'},paragraph:{color:TEXT,fontSize:14,lineHeight:22,flexShrink:1,width:'100%'},table:{marginTop:16,borderWidth:1,borderColor:themeColor('rgba(52,211,153,0.22)', 'border'),borderRadius:12,overflow:'hidden'},caption:{color:MUTED,fontSize:11,padding:10},tableRow:{flexDirection:'row',borderTopWidth:1,borderTopColor:themeColor('rgba(255,255,255,0.08)', 'border')},cell:{flex:1,minWidth:0,paddingHorizontal:7,paddingVertical:11,justifyContent:'center'},metric:{flex:1.2},label:{color:MUTED,fontSize:11,fontWeight:'600',flexShrink:1},note:{color:MUTED,fontSize:9,marginTop:4,flexShrink:1},value:{color:TEXT,fontSize:13,fontWeight:'700',textAlign:'center'}});
  return {ACCENT, FRAME_TITLE, MUTED, TEXT, proStyles, BLUE, s, themeColor};
});
