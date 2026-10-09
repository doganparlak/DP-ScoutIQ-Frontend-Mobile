import { getMe,type Plan } from '@/services/api';
import { getSavedTeamReport,type SavedTeamReport } from '@/services/teamPortfolio';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { X } from 'lucide-react-native';
import React from 'react';
import { Modal,Pressable,StyleSheet,Text,View } from 'react-native';

import ActionSpinner from './ActionSpinner';
import TeamAnalysisReportModal from './TeamAnalysisReportModal';
export default function SavedTeamReportModal({reportId, tr, onClose, onOpenPlans}: {reportId: string; tr: boolean; onClose: () => void; onOpenPlans: () => void}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, DANGER, TEXT} = themed;

  const [report, setReport] = React.useState<SavedTeamReport | null>(null);
  const [plan, setPlan] = React.useState<Plan>('Free');
  const [error, setError] = React.useState('');
  React.useEffect(() => {
    let alive = true;
    Promise.all([getSavedTeamReport(reportId), getMe()]).then(([saved, user]) => {if (alive) {setReport(saved); setPlan(user.plan === 'No Ads Monthly' || user.plan === 'Pro Monthly' || user.plan === 'Pro Yearly' ? user.plan : 'Free');}}).catch(reason => {if (alive) setError(reason instanceof Error ? reason.message : String(reason));});
    return () => {alive = false;};
  }, [reportId]);
  if (report) return <TeamAnalysisReportModal team={report.team} matches={report.matches} data={{...report.content, reportId: report.id}} loading={false} error="" tr={report.language === 'tr'} plan={plan} onClose={onClose} onOpenPlans={onOpenPlans} />;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}><View style={styles.backdrop}><View style={styles.panel} accessibilityViewIsModal><View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}><Text style={{flex: 1, color: ACCENT, fontWeight: '800'}}>{tr ? 'Takım Raporu' : 'Team Report'}</Text><Pressable accessibilityRole="button" accessibilityLabel={tr ? 'Kapat' : 'Close'} onPress={onClose} hitSlop={10}><X color={DANGER} size={22}/></Pressable></View>{error ? <Text style={{color: TEXT}}>{error}</Text> : <View style={{alignItems: 'center', gap: 12, padding: 20}}><ActionSpinner color={ACCENT} size={28}/><Text style={{color: TEXT}}>{tr ? 'Rapor yükleniyor…' : 'Loading report…'}</Text></View>}</View></View></Modal>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, DANGER, PANEL, TEXT, themeColor} = colors;

  const styles=StyleSheet.create({backdrop:{flex:1,backgroundColor:themeColor('rgba(0,0,0,.8)', 'surface'),padding:20,justifyContent:'center'},panel:{width:'100%',maxWidth:560,alignSelf:'center',padding:16,gap:16,borderRadius:20,borderWidth:1,borderColor:ACCENT,backgroundColor:PANEL}});
  return {ACCENT, DANGER, PANEL, TEXT, styles, themeColor};
});
