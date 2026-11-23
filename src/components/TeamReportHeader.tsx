import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Text,View } from 'react-native';

import type { Team } from '@/services/teamPool';
import ReportPlayerPortrait from './ReportPlayerPortrait';
import TeamReportIdentity from './TeamReportIdentity';
export default function TeamReportHeader({team,matches,tr,accent,showCoach}:{team:Pick<Team,'name'|'logoUrl'> & Partial<Pick<Team,'coachName'|'coachImageUrl'>>;matches:number;tr:boolean;accent?:string;showCoach?:boolean}){
  const themed = useThemedStyles(getModuleTheme);
  const {ACCENT, CARD, LINE, MUTED, TEXT} = themed;
  accent ??= ACCENT;

 return <View style={{borderWidth:1,borderColor:`${accent}70`,borderRadius:18,padding:14,gap:14,backgroundColor:CARD}}>
  <View style={{height:4,borderRadius:3,backgroundColor:accent}}/>
  <TeamReportIdentity team={team} accent={accent}/>
  <Text style={{color:MUTED,fontSize:12,fontWeight:'600'}}>{matches} {tr?'seçili maç':'selected matches'}</Text>
  {showCoach && !!team.coachName && <View style={{flexDirection:'row',alignItems:'center',gap:12,paddingTop:11,borderTopWidth:1,borderTopColor:LINE}}>
    <View style={{flex:1,minWidth:0,gap:4}}>
      <Text style={{color:MUTED,fontSize:11,fontWeight:'600'}}>{tr?'Teknik Direktör':'Head Coach'}</Text>
      <Text style={{color:TEXT,fontSize:15,fontWeight:'800'}}>{team.coachName}</Text>
    </View>
    <ReportPlayerPortrait imageUrl={team.coachImageUrl} accent={accent} size={52}/>
  </View>}
 </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, TEXT} = colors;


  return {ACCENT, CARD, LINE, MUTED, TEXT};
});
