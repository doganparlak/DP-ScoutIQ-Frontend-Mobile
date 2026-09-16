import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BadgeCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ACCENT, CARD, LINE, MUTED, PANEL, TEXT } from '@/theme';

export default function ChatAccessModal({ visible, tutorial, onClose, onAction }: {
  visible: boolean; tutorial: boolean; onClose: () => void; onAction: () => void;
}) {
  const { t, i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={s.backdrop}><View style={s.prompt}>
      <View style={s.header}><View style={s.icon}><BadgeCheck size={20} color={ACCENT} strokeWidth={2.3} /></View>
        <Text style={s.title}>{tutorial ? (tr ? 'ScoutWise PRO’yu keşfet' : 'Explore ScoutWise PRO') : (tr ? 'ScoutWise PRO ile devam et' : 'Continue with ScoutWise PRO')}</Text>
      </View>
      <Text style={s.body}>{tutorial
        ? (tr ? 'Bu ekran eğitim önizlemesidir. Mesaj gönderilmez ve ücretsiz mesaj hakkın kullanılmaz. Eğitimi tamamladıktan sonra Free hesabınla bir defaya mahsus 5 ücretsiz mesaj gönderebilirsin.' : 'This is a tutorial preview. No message is sent and no free message is used. After the tutorial, your Free account can try ScoutWise with a one-time allowance of 5 messages.')
        : (tr ? 'Ücretsiz mesaj hakkın kalmadı. Sohbete devam etmek için PRO’ya geç.' : 'You have no free messages remaining. Upgrade to PRO to continue chatting.')}</Text>
      <View style={s.actions}>
        <Pressable style={s.button} onPress={onClose}><Text style={s.body}>{t('notNow', 'Not now')}</Text></Pressable>
        <Pressable style={[s.button, { borderColor: ACCENT }]} onPress={onAction}><Text style={s.action}>{tutorial ? (tr ? 'Eğitimi tamamla' : 'Finish tutorial') : t('managePlan', 'Manage plan')}</Text></Pressable>
      </View>
    </View></View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.72)' },
  prompt: { backgroundColor: PANEL, borderRadius: 22, borderWidth: 1, borderColor: ACCENT, padding: 22, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(36,245,166,0.42)', backgroundColor: 'rgba(22,163,74,0.14)', alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: TEXT, fontSize: 19, lineHeight: 24, fontWeight: '800' },
  body: { color: MUTED, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, minHeight: 44, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center' },
  action: { color: ACCENT, fontWeight: '800' },
});
