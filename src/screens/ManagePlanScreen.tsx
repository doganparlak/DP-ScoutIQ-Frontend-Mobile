import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import type { Plan } from '@/services/api';
import { setPlan, getMe } from '@/services/api';

const PLANS: Array<{ name: Plan; questions: number; price: string }> = [
  { name: 'Free',  questions: 10,  price: 'FREE' },
  { name: 'Pro',   questions: 50,  price: '$2.99' },
  { name: 'Elite', questions: 100, price: '$4.99' },
];

export default function ManagePlan() {
  const nav = useNavigation();
  const { t } = useTranslation();

  const [currentPlan, setCurrentPlan] = React.useState<Plan>('Free');
  const [selected, setSelected] = React.useState<Plan>('Free');
  const [saving, setSaving] = React.useState(false);

  // Load current plan from backend
  React.useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        const cp = (me?.plan as Plan) || 'Free';
        setCurrentPlan(cp);
        setSelected(cp);
      } catch {
        // ignore
      }
    })();
  }, []);

  const onSave = async () => {
    try {
      setSaving(true);
      const res = await setPlan(selected);
      if (res?.ok) {
        Alert.alert(t('planUpdated', 'Plan updated'), t('planNow', 'Your plan is now {{plan}}.', { plan: res.plan }));
        // go back to My Profile (Profile reads /me)
        // @ts-ignore
        nav.goBack();
      } else {
        Alert.alert(t('error', 'Error'), t('couldNotUpdatePlan', 'Could not update plan. Please try again.'));
      }
    } catch (e: any) {
      Alert.alert(t('error', 'Error'), e?.message || t('couldNotUpdatePlan', 'Could not update plan. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ p }: { p: (typeof PLANS)[number] }) => {
    const active = selected === p.name;
    return (
      <Pressable
        onPress={() => setSelected(p.name)}
        style={({ pressed }) => [
          styles.row,
          { backgroundColor: CARD },
          active && styles.rowActive,
          pressed && { opacity: 0.9 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${p.name} plan row`}
      >
        <Text style={[styles.cell, styles.name, active && styles.cellActive]}>{p.name}</Text>
        <Text style={[styles.cell, active && styles.cellActive]}>{p.questions}</Text>
        <Text style={[styles.cell, active && styles.cellActive]}>{p.price}</Text>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header (title below back control, matching your pattern) */}
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityLabel={t('backToProfile', 'Back to Profile')}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>{t('myProfile', 'My Profile')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('managePlan', 'Manage Plan')}</Text>
      </View>

      <View style={styles.card}>
        {/* ===== 1) Plans table ===== */}
        <Text style={styles.sectionTitle}>{t('planOptions', 'Plan options')}</Text>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.headerCell, styles.name]}>{t('plan', 'Plan')}</Text>
            <Text style={[styles.cell, styles.headerCell]}>{t('questionsQuota', 'Questions')}</Text>
            <Text style={[styles.cell, styles.headerCell]}>{t('price', 'Price')}</Text>
          </View>
          {PLANS.map(p => <Row key={p.name} p={p} />)}
        </View>

        {/* ===== 2) Current plan ===== */}
        <View style={styles.currentWrap}>
          <Text style={styles.currentLabel}>{t('currentPlan', 'Current plan')}</Text>
          <View style={styles.currentPillRow}>
            <View style={styles.currentPillBox}>
              <View style={styles.currentPill}>
                <Text style={styles.currentPillText}>{currentPlan}</Text>
              </View>
            </View>
          </View>

        </View>


        {/* ===== 3) Select plan (segmented) ===== */}
        <View style={{ marginTop: 8 }}>
          <Text style={styles.label}>{t('selectPlan', 'Select plan')}</Text>
          <View style={styles.options}>
            {PLANS.map(p => {
              const active = selected === p.name;
              return (
                <Pressable
                  key={p.name}
                  onPress={() => setSelected(p.name)}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('choose', 'Choose')} ${p.name}`}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Save */}
        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          accessibilityRole="button"
          style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
        >
          <Text style={styles.primaryBtnText}>{saving ? t('saving', 'Saving...') : t('setPlan', 'Set plan')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // header (title below back)
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { color: TEXT, fontSize: 18, fontWeight: '800', marginRight: 2 },
  backText: { color: TEXT, fontWeight: '700' },
  // requested title style:
  title: { color: TEXT, fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center' },

  // card
  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },

  // subtitle (for the table)
  sectionTitle: { color: MUTED, fontWeight: '600', marginBottom: 10},

  // table
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 12, overflow: 'hidden' },
  row: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: LINE },
  headerRow: { backgroundColor: '#151716', borderTopWidth: 0 },
  rowActive: { backgroundColor: '#18221B', borderLeftWidth: 3, borderLeftColor: ACCENT },
  cell: { flex: 1, color: TEXT, fontSize: 14, textAlign: 'center' },
  cellActive: { color: ACCENT },
  headerCell: { color: MUTED, fontWeight: '700' },
  name: { flex: 1.2, textAlign: 'left' },

  // current plan pill
  currentWrap: { marginTop: 14 },
  currentLabel: { color: MUTED, fontWeight: '600', marginBottom: 6, textAlign: 'left' },
  currentPillRow: { alignItems: 'center' },
  currentPillBox: { width: '33%' }, 
  // your requested pill style (radius 12) + centering
  currentPill: {
    backgroundColor: '#18221B',  // keep your green-tinted pill
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,            // same shape as option
    paddingVertical: 10,         // same vertical size as option
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ensure text is centered
  currentPillText: { color: ACCENT, fontWeight: '800', textAlign: 'center' },

  // segmented options
  label: { color: MUTED, marginBottom: 6, marginTop: 12 },
  options: { flexDirection: 'row', gap: 8 },
  option: {
    flex: 1,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  optionActive: { borderColor: ACCENT, backgroundColor: '#18221B' },
  optionText: { color: TEXT, fontWeight: '600' },
  optionTextActive: { color: ACCENT },

  // CTA
  primaryBtn: {
    marginTop: 16,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: ACCENT,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
