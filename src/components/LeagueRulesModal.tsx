import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import { Info, X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

export default function LeagueRulesModal({ visible, onClose, lines }: {
  visible: boolean;
  onClose: () => void;
  lines: string[];
}) {
  const { s, c } = useThemedStyles(theme);
  const { height } = useWindowDimensions();
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  return <Modal visible={visible} transparent animationType='fade' onRequestClose={onClose}>
    <View style={s.backdrop}><View style={s.modal} accessibilityViewIsModal>
      <View style={s.header}>
        <View style={s.icon}><Info size={21} color={c.ACCENT}/></View>
        <Text style={s.title}>{tr ? 'Nasıl Puanlanır?' : 'How Scoring Works'}</Text>
        <Pressable accessibilityRole='button' accessibilityLabel={tr ? 'Kapat' : 'Close'} hitSlop={10} style={s.close} onPress={onClose}><X size={20} color={c.MUTED}/></Pressable>
      </View>
      <ScrollView style={{ maxHeight: height * .6 }} contentContainerStyle={s.content}>
        {lines.map((line, i) => <View key={line} style={s.row}><Text style={s.number}>{String(i + 1).padStart(2, '0')}</Text><Text style={s.rule}>{line}</Text></View>)}
      </ScrollView>
      <View style={s.footer}><Pressable accessibilityRole='button' style={s.primary} onPress={onClose}><Text style={s.action}>{tr ? 'Tamam' : 'OK'}</Text></Pressable></View>
    </View></View>
  </Modal>;
}

const theme = createThemedStyles((c: ThemeColors) => ({ c, s: StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: c.themeColor('rgba(0,0,0,.78)', 'surface'), padding: 18, justifyContent: 'center' },
  modal: { width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', borderRadius: 24, borderWidth: 1, borderColor: c.themeColor('rgba(22,163,74,.6)', 'border'), backgroundColor: c.PANEL, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: c.themeColor('rgba(126,148,135,.15)', 'border') },
  icon: { width: 42, height: 42, borderRadius: 13, backgroundColor: c.themeColor('rgba(22,163,74,.12)', 'surface'), alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, color: c.TEXT, fontSize: 18, fontWeight: '800', lineHeight: 25 },
  close: { width: 34, height: 34, borderRadius: 11, backgroundColor: c.themeColor('rgba(255,255,255,.04)', 'surface'), alignItems: 'center', justifyContent: 'center' },
  content: { gap: 16, padding: 18 }, row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  number: { color: c.ACCENT, fontSize: 12, fontWeight: '800', paddingTop: 3 },
  rule: { flex: 1, color: c.TEXT, fontSize: 13, lineHeight: 22 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: c.themeColor('rgba(126,148,135,.15)', 'border') },
  primary: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: c.ACCENT, padding: 12 },
  action: { color: c.ACCENT, fontSize: 13, fontWeight: '800', textAlign: 'center', flexShrink: 1 },
}) }));
