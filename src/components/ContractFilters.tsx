import React from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarDays, ChevronDown, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ACCENT, CARD, LINE, MUTED, PANEL, TEXT } from '@/theme';

export type ContractStatus = '' | 'loan' | 'permanent';
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const parseDate = (value: string) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d, 12); };

function AndroidContractDateSelector({ value, onChange, locale }: { value: Date; onChange: (date: Date) => void; locale: string }) {
  const year = value.getFullYear();
  const month = value.getMonth();
  const day = value.getDate();
  const years = React.useMemo(() => Array.from({ length: 101 }, (_, index) => 2000 + index), []);
  const months = React.useMemo(
    () => Array.from({ length: 12 }, (_, index) => new Date(2020, index, 1).toLocaleDateString(locale, { month: 'short' })),
    [locale],
  );
  const dayCount = new Date(year, month + 1, 0).getDate();
  const setPart = (nextYear: number, nextMonth: number, nextDay: number) => {
    const safeDay = Math.min(nextDay, new Date(nextYear, nextMonth + 1, 0).getDate());
    onChange(new Date(nextYear, nextMonth, safeDay, 12));
  };
  const columns = [
    {
      key: 'day',
      label: locale.startsWith('tr') ? 'Gün' : 'Day',
      values: Array.from({ length: dayCount }, (_, index) => index + 1),
      selected: day,
      render: (item: number) => String(item).padStart(2, '0'),
      select: (item: number) => setPart(year, month, item),
    },
    {
      key: 'month',
      label: locale.startsWith('tr') ? 'Ay' : 'Month',
      values: Array.from({ length: 12 }, (_, index) => index),
      selected: month,
      render: (item: number) => months[item],
      select: (item: number) => setPart(year, item, day),
    },
    {
      key: 'year',
      label: locale.startsWith('tr') ? 'Yıl' : 'Year',
      values: years,
      selected: year,
      render: (item: number) => String(item),
      select: (item: number) => setPart(item, month, day),
    },
  ];
  return <View style={styles.dateColumns}>
    {columns.map(column => <View key={column.key} style={styles.dateColumn}>
      <Text style={styles.dateColumnLabel}>{column.label}</Text>
      <ScrollView
        style={styles.dateOptions}
        contentOffset={{ x: 0, y: Math.max(0, column.values.indexOf(column.selected) * 38 - 76) }}
        showsVerticalScrollIndicator={false}
      >
        {column.values.map(item => {
          const selected = item === column.selected;
          return <Pressable
            key={item}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => column.select(item)}
            style={[styles.dateOption, selected && styles.dateOptionSelected]}
          >
            <Text style={[styles.dateOptionText, selected && styles.dateOptionTextSelected]}>{column.render(item)}</Text>
          </Pressable>;
        })}
      </ScrollView>
    </View>)}
  </View>;
}

export function ContractStatusFilter({ value, onChange, disabled }: {
  value: ContractStatus; onChange: (value: ContractStatus) => void; disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const options: { value: ContractStatus; label: string }[] = [
    { value: '', label: t('contractAll', 'All') },
    { value: 'loan', label: t('contractLoan', 'On loan') },
    { value: 'permanent', label: t('contractPermanent', 'Permanent') },
  ];
  return <View style={styles.field}>
    <Text style={styles.label}>{t('contractStatus', 'Contract status')}</Text>
    <Pressable testID="contract-status" accessibilityRole="button" accessibilityLabel={t('contractStatus', 'Contract status')} accessibilityState={{ disabled, expanded: open }} disabled={disabled} onPress={() => setOpen(true)} style={styles.input}>
      <Text style={styles.value}>{options.find(option => option.value === value)?.label}</Text><ChevronDown size={16} color={MUTED} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel={t('close', 'Close')} accessibilityRole="button" />
        <View style={styles.modal} accessibilityViewIsModal>
          <View style={styles.heading}><Text style={styles.title}>{t('contractStatus', 'Contract status')}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('close', 'Close')} onPress={() => setOpen(false)} style={styles.close}><X size={22} color={TEXT} /></Pressable></View>
          {options.map(option => <Pressable key={option.value} testID={`contract-option-${option.value || 'all'}`} accessibilityRole="radio" accessibilityState={{ selected: value === option.value }} onPress={() => { onChange(option.value); setOpen(false); }} style={[styles.option, option.value === value && styles.selected]}><Text style={[styles.value, option.value === value && { color: ACCENT }]}>{option.label}</Text></Pressable>)}
        </View>
      </View>
    </Modal>
  </View>;
}

export function ContractDateFilter({ label, value, onChange, disabled = false, testID }: {
  label: string; value: string; onChange: (value: string) => void; disabled?: boolean; testID: string;
}) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(new Date());
  const locale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-GB';
  const display = value ? parseDate(value).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }) : t('contractSelectDate', 'Select date');
  React.useEffect(() => { if (disabled) setOpen(false); }, [disabled]);
  return <View style={[styles.field, disabled && { opacity: 0.4 }]}>
    <Text style={styles.label}>{label}</Text>
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={`${label}: ${display}`} accessibilityState={{ disabled }} disabled={disabled} style={styles.input} onPress={() => { setDraft(value ? parseDate(value) : new Date()); setOpen(true); }}>
      <Text style={[styles.value, { color: value ? TEXT : MUTED }]}>{display}</Text><CalendarDays size={17} color="#20C997" />
    </Pressable>
    {value && !disabled ? <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${t('contractClearDate', 'Clear date')}`} onPress={() => onChange('')}><Text style={styles.clear}>{t('contractClearDate', 'Clear date')}</Text></Pressable> : null}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel={t('close', 'Close')} accessibilityRole="button" />
        <View style={styles.modal} accessibilityViewIsModal>
          <View style={styles.heading}><Text style={styles.title}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={t('close', 'Close')} onPress={() => setOpen(false)} style={styles.close}><X size={22} color={TEXT} /></Pressable></View>
          <Text style={styles.label}>{t('contractDateHint', 'Expires on or before this date.')}</Text>
          {open && Platform.OS === 'android'
            ? <AndroidContractDateSelector value={draft} onChange={setDraft} locale={locale} />
            : open && <DateTimePicker value={draft} mode="date" display="spinner" themeVariant="dark" locale={locale} onChange={(_, date) => { if (date) setDraft(date); }} style={{ alignSelf: 'center', width: 300, maxWidth: '100%' }} />}
          <Pressable accessibilityRole="button" onPress={() => { onChange(isoDate(draft)); setOpen(false); }} style={[styles.option, styles.selected]}><Text style={[styles.value, { textAlign: 'center', color: ACCENT }]}>{t('contractApplyDate', 'Apply date')}</Text></Pressable>
        </View>
      </View>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  field: { gap: 6 }, label: { color: MUTED, fontSize: 12 },
  input: { minHeight: 43, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 12, borderWidth: 1, borderColor: LINE, backgroundColor: CARD, paddingHorizontal: 12, paddingVertical: 10 },
  value: { flexShrink: 1, flexGrow: 1, color: TEXT, fontSize: 14, fontWeight: '600' },
  clear: { color: '#A4B2A9', fontSize: 11, paddingVertical: 4 },
  backdrop: { flex: 1, justifyContent: 'center', padding: 18, backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: { backgroundColor: PANEL, borderRadius: 24, padding: 18, borderColor: LINE, borderWidth: 1, maxWidth: 420, width: '100%', alignSelf: 'center', gap: 10 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 }, title: { color: TEXT, flex: 1, fontWeight: '800', fontSize: 17 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  option: { borderWidth: 1, borderColor: LINE, backgroundColor: CARD, borderRadius: 14, padding: 16 },
  selected: { borderColor: ACCENT, backgroundColor: 'rgba(22,163,74,0.1)' },
  dateColumns: { flexDirection: 'row', gap: 8 },
  dateColumn: { flex: 1, minWidth: 0, gap: 6 },
  dateColumnLabel: { color: MUTED, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  dateOptions: { height: 190, borderWidth: 1, borderColor: LINE, borderRadius: 12, backgroundColor: CARD },
  dateOption: { height: 38, alignItems: 'center', justifyContent: 'center' },
  dateOptionSelected: { backgroundColor: 'rgba(22,163,74,0.18)', borderColor: ACCENT, borderWidth: 1, borderRadius: 9 },
  dateOptionText: { color: MUTED, fontSize: 14, fontWeight: '600' },
  dateOptionTextSelected: { color: ACCENT, fontWeight: '800' },
});
