import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { BadgeCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Modal,Pressable,StyleSheet,Text,View } from 'react-native';


export default function ChatAccessModal({ visible, tutorial, onClose, onAction }: {
  visible: boolean; tutorial: boolean; onClose: () => void; onAction: () => void;
}) {
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT} = themed;

  const { t, i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.backdrop}><View style={s.prompt}>
      <View style={s.header}><View style={s.icon}><BadgeCheck size={20} color={ACCENT} strokeWidth={2.3} /></View>
        <Text style={s.title}>{tutorial ? (tr ? 'ScoutWise PRO’yu keşfet' : 'Explore ScoutWise PRO') : tr ? <><Text style={{color:ACCENT}}>PRO</Text> ile Devam Et</> : <>Continue with <Text style={{color:ACCENT}}>PRO</Text></>}</Text>
      </View>
      <Text style={s.body}>{tutorial
        ? (tr ? 'Bu ekran eğitim önizlemesidir; Pro deneme hakkın kullanılmaz. Free ve Plus hesapları ScoutWise Pro analizlerini bir defaya mahsus 5 deneme hakkıyla deneyebilir.' : 'This is a tutorial preview; no Pro trial credit is used. Free and Plus accounts can try ScoutWise Pro analyses with a one-time allowance of 5 trial credits.')
        : (tr ? <>Yeni analizler oluşturmak için şimdi <Text style={{color:ACCENT,fontWeight:'800'}}>PRO</Text>’ya geç.</> : <>Upgrade to <Text style={{color:ACCENT,fontWeight:'800'}}>PRO</Text> now to generate new analyses.</>)}</Text>
      <View style={s.actions}>
        <Pressable style={s.button} onPress={onClose}><Text style={s.body}>{t('notNow', 'Not now')}</Text></Pressable>
        <Pressable style={[s.button, { borderColor: ACCENT }]} onPress={onAction}><Text style={s.action}>{tutorial ? (tr ? 'Eğitimi tamamla' : 'Finish tutorial') : t('managePlan', 'Manage plan')}</Text></Pressable>
      </View>
    </View></View>
  </Modal>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, themeColor} = colors;

  const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: themeColor('rgba(0,0,0,0.72)', 'surface') },
  prompt: { backgroundColor: PANEL, borderRadius: 22, borderWidth: 1, borderColor: ACCENT, padding: 22, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: themeColor('rgba(36,245,166,0.42)', 'border'), backgroundColor: themeColor('rgba(22,163,74,0.14)', 'surface'), alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: TEXT, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  body: { color: MUTED, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, minHeight: 44, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' },
  action: { color: ACCENT, fontWeight: '800' },
});
  return {ACCENT, CARD, LINE, MUTED, PANEL, TEXT, s, themeColor};
});
