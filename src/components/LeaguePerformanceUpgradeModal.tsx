import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import type { MainTabsParamList } from '@/types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation,type NavigatorScreenParams } from '@react-navigation/native';
import { BadgeCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal,Pressable,StyleSheet,Text,View } from 'react-native';
import PlanManagementButton from './PlanManagementButton';


export default function LeaguePerformanceUpgradeModal({visible, required, tr, onClose, feature = 'metric', metricLabel}: {visible: boolean; feature?: 'biweekly' | 'metric'; metricLabel?: string; required: 'plus' | 'pro'; tr: boolean; onClose: () => void}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT} = themed;

  const navigation = useNavigation<BottomTabNavigationProp<Omit<MainTabsParamList, 'Profile'> & {Profile: NavigatorScreenParams<{ManagePlan: undefined}>}>>();
  const {t} = useTranslation();
  const plans = required === 'plus' ? <><Text style={styles.plus}>PLUS</Text>{tr ? ' veya ' : ' or '}<Text style={styles.pro}>PRO</Text></> : <Text style={styles.pro}>PRO</Text>;
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.backdrop}><View style={styles.prompt} accessibilityViewIsModal>
      <View style={styles.header}><View style={styles.icon}><BadgeCheck size={20} color={ACCENT} strokeWidth={2.3} /></View><Text style={styles.title}>{feature === 'biweekly' ? (tr ? <>{plans} ile iki haftanın oyuncusu</> : <>Two-week top players with {plans}</>) : (tr ? <>{plans} ile sezon sıralama ölçütleri</> : <>Season ordering metrics with {plans}</>)}</Text></View>
      <Text style={styles.body}>{feature === 'biweekly' ? (tr ? <>Ligin ve her takımın iki haftalık en iyi oyuncularını görmek ve dönem seçmek için {plans}’ya geç.</> : <>Switch to {plans} to view the league’s and each team’s two-week top players and choose a period.</>) : (tr ? <>{metricLabel ? `“${metricLabel}” ölçütüyle takımları sıralamak` : 'Sezon ölçütleriyle takımları sıralamak'} için {plans}’ya geç.</> : <>Switch to {plans} to rank teams by {metricLabel ? `“${metricLabel}”` : 'season metrics'}.</>)}</Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={onClose}><Text style={styles.body}>{t('notNow')}</Text></Pressable>
        <PlanManagementButton onPress={() => {onClose(); setTimeout(() => navigation.navigate('Profile', {screen: 'ManagePlan'}), 350);}} />
      </View>
    </View></View>
  </Modal>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, themeColor} = colors;

  const styles = StyleSheet.create({
  backdrop: {flex: 1, justifyContent: 'center', padding: 24, backgroundColor: themeColor('rgba(0,0,0,0.72)', 'surface')},
  prompt: {width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: PANEL, borderRadius: 22, borderWidth: 1, borderColor: ACCENT, padding: 22, gap: 16},
  icon: {width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: themeColor('rgba(36,245,166,0.42)', 'border'), backgroundColor: themeColor('rgba(22,163,74,0.14)', 'surface'), alignItems: 'center', justifyContent: 'center'},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12},
  title: {flex: 1, color: TEXT, fontSize: 19, lineHeight: 24, fontWeight: '800'},
  body: {color: MUTED, fontSize: 14, lineHeight: 21},
  pro: {color: ACCENT, fontWeight: '900'}, plus: {color: themeColor('#38BDF8', 'text'), fontWeight: '900'},
  actions: {flexDirection: 'row', gap: 10},
  button: {flex: 1, minHeight: 44, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center'},
});
  return {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, styles, themeColor};
});
