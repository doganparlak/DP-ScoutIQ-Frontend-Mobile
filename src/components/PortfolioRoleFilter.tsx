import React from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronDown, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ACCENT, CARD, LINE, MUTED, PANEL, TEXT } from '@/theme';

const ROLE_ROWS = [
  ['GK', 'LB', 'RB'],
  ['CB', 'LM', 'RM'],
  ['CDM', 'CM', 'CAM'],
  ['LW', 'RW', 'CF'],
] as const;

export default function PortfolioRoleFilter({ value, onChange }: {
  value: string[];
  onChange: (roles: string[]) => void;
}) {
  const { t, i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const [open, setOpen] = React.useState(false);
  const label = tr ? 'Roller' : 'Roles';
  const selectedLabel = ROLE_ROWS.flat().filter(role => value.includes(role)).join(', ') || t('contractAll', 'All');
  const close = () => setOpen(false);

  return <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <Pressable testID="portfolio-roles" accessibilityRole="button" accessibilityLabel={`${label}: ${selectedLabel}`} accessibilityState={{ expanded: open }} onPress={() => { Keyboard.dismiss(); setOpen(true); }} style={styles.input}>
      <Text numberOfLines={1} style={[styles.value, { flex: 1 }, value.length > 0 && { color: ACCENT }]}>{selectedLabel}</Text>
      <ChevronDown size={16} color={MUTED} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <SafeAreaView style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityRole="button" accessibilityLabel={t('close', 'Close')} />
        <View style={styles.modal} accessibilityViewIsModal>
          <View style={styles.heading}>
            <Text style={styles.title}>{label}</Text>
            <Pressable testID="portfolio-roles-close" onPress={close} accessibilityRole="button" accessibilityLabel={t('close', 'Close')} style={styles.close}><X size={22} color={TEXT} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.grid} bounces={false}>
            {ROLE_ROWS.map((row, index) => <View key={index} style={styles.row}>
              {row.map(role => <Pressable key={role} testID={`portfolio-role-${role}`} accessibilityRole="checkbox" accessibilityLabel={role} accessibilityState={{ checked: value.includes(role) }} onPress={() => onChange(value.includes(role) ? value.filter(item => item !== role) : [...value, role])} style={({ pressed }) => [styles.role, value.includes(role) && styles.selected, pressed && { opacity: 0.75 }]}>
                <Text style={[styles.roleText, value.includes(role) && { color: ACCENT }]}>{role}</Text>
              </Pressable>)}
            </View>)}
          </ScrollView>
          <View style={styles.row}>
            <Pressable testID="portfolio-roles-clear" onPress={() => onChange([])} accessibilityRole="button" style={styles.action}><Text style={styles.value}>{tr ? 'Seçimi Temizle' : 'Clear Selection'}</Text></Pressable>
            <Pressable testID="portfolio-roles-done" onPress={close} accessibilityRole="button" style={[styles.action, styles.selected]}><Text style={[styles.value, { color: ACCENT }]}>{tr ? 'Tamam' : 'Done'}</Text></Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 6 }, label: { color: MUTED, fontSize: 12 },
  input: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: LINE, backgroundColor: CARD, paddingHorizontal: 12, paddingVertical: 10 },
  value: { flexShrink: 1, color: TEXT, fontSize: 14, fontWeight: '600' },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: { width: '100%', maxWidth: 420, maxHeight: '90%', padding: 18, gap: 16, borderWidth: 1, borderColor: ACCENT, borderRadius: 24, backgroundColor: PANEL },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { flex: 1, color: TEXT, fontWeight: '800', fontSize: 18 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  grid: { gap: 10 }, row: { flexDirection: 'row', gap: 10 },
  role: { flex: 1, minWidth: 0, minHeight: 52, padding: 10, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: LINE, backgroundColor: CARD },
  roleText: { color: MUTED, fontWeight: '800', fontSize: 15 },
  selected: { borderColor: ACCENT, backgroundColor: 'rgba(22,163,74,0.12)' },
  action: { flex: 1, minHeight: 44, padding: 10, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, borderColor: LINE },
});
