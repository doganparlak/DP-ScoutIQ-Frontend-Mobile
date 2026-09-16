import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { LockKeyhole } from 'lucide-react-native';
import { ACCENT, CARD, MUTED, TEXT } from '../theme';
import { reportPhaseLabels } from '../utils/reportPhaseLabels';

type Phase = {
  phase: string;
  role_views: { role: string; items: { category: string; percentage: number }[] }[];
};

const phaseNames: Record<string, string> = {
  'Build-up': 'Oyun Kurulumu',
  Progression: 'Topu İleri Taşıma',
  'Final Third': 'Hücum Bölgesi',
  'Low Block': 'Derin Blok',
  'Mid Block': 'Orta Blok',
  'High Block': 'İleri Blok',
};

export default function ReportPhaseDistributions({ phases, possession, free = false, primaryRole, onOpenPlans }: { phases: Phase[]; possession: boolean; free?: boolean; primaryRole?: string; onOpenPlans?: () => void }) {
  const { t, i18n } = useTranslation();
  const turkish = i18n.language.startsWith('tr');
  const accent = possession ? ACCENT : '#F59E0B';
  const order = possession ? ['Build-up', 'Progression', 'Final Third'] : ['Low Block', 'Mid Block', 'High Block'];
  const [selectedRole, setSelectedRole] = useState('');
  const visible = order.flatMap(name => phases.filter(phase => phase.phase === name));
  const roles = [...new Set(visible.flatMap(phase => phase.role_views.map(view => view.role)))];
  const normalizeRole = (role?: string) => String(role || '').trim().toUpperCase();
  const resolvedPrimaryRole = roles.find(role => normalizeRole(role) === normalizeRole(primaryRole)) || roles[0];
  const orderedRoles = resolvedPrimaryRole ? [resolvedPrimaryRole, ...roles.filter(role => role !== resolvedPrimaryRole)] : roles;
  const activeRole = roles.includes(selectedRole) ? selectedRole : resolvedPrimaryRole;
  const lockedRole = free && !!activeRole && activeRole !== resolvedPrimaryRole;
  useEffect(() => setSelectedRole(''), [free, possession, primaryRole]);

  return <View style={styles.page}>
    {roles.length > 1 && <View style={[styles.roleSwitch, { borderColor: `${accent}60` }]}>
      {orderedRoles.map(role => <Pressable key={role} accessibilityRole="button" accessibilityState={{ selected: role === activeRole }}
        onPress={() => setSelectedRole(role)} style={[styles.roleOption, role === activeRole && { backgroundColor: `${accent}25` }]}>
        <View style={styles.roleLabelRow}>
          {free && role !== resolvedPrimaryRole ? <LockKeyhole size={12} color={role === activeRole ? accent : MUTED} /> : null}
          <Text style={[styles.roleText, { color: role === activeRole ? accent : MUTED }]}>{role}</Text>
        </View>
      </Pressable>)}
    </View>}
    {lockedRole ? <View style={[styles.lockedRole, {borderColor:`${accent}66`,backgroundColor:`${accent}0A`}]}>
      <View style={styles.lockedHeading}>
        <View style={[styles.lockedIcon,{borderColor:`${accent}66`,backgroundColor:`${accent}18`}]}><LockKeyhole size={18} color={accent}/></View>
        <View style={{flex:1,gap:3}}>
          <Text style={[styles.lockedTitle,{color:accent}]}>{t('lockedOtherRolesTitle', 'Other Role Analyses')}</Text>
          <Text style={styles.lockedRoleName}>{activeRole}</Text>
        </View>
      </View>
      <Text style={styles.lockedText}>{t('lockedOtherRolesBody', 'Switch to Plus or Pro to reveal this player’s other role analyses.')}</Text>
      <Pressable onPress={onOpenPlans} style={({pressed})=>[styles.lockedButton,pressed&&{opacity:.82}]}>
        <Text style={styles.lockedButtonText}>{t('managePlan', 'Manage Plan')}</Text>
      </Pressable>
    </View> : visible.map((phase, index) => {
      const items = [...((phase.role_views.find(view => view.role === activeRole) || phase.role_views[0])?.items || [])]
        .sort((a, b) => b.percentage - a.percentage);
      return <View key={phase.phase} style={[styles.frame, { borderColor: `${accent}80` }]}>
        <View style={[styles.rule, { backgroundColor: accent }]} />
        <View style={styles.heading}>
          <View style={[styles.number, { backgroundColor: `${accent}20` }]}><Text style={[styles.numberText, { color: accent }]}>{index + 1}</Text></View>
          <Text style={styles.title}>{turkish ? phaseNames[phase.phase] : phase.phase}</Text>
        </View>
        {items.map(item => <View key={item.category} style={styles.distribution}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>{turkish ? reportPhaseLabels[item.category] || item.category : item.category}</Text>
            <Text style={[styles.percentage, { color: accent }]}>{item.percentage}%</Text>
          </View>
          <View style={[styles.track, { backgroundColor: `${accent}15` }]}>
            <View style={[styles.fill, { backgroundColor: accent, width: `${Math.max(0, Math.min(100, item.percentage))}%` }]} />
          </View>
        </View>)}
        {!items.length && <Text style={styles.empty}>{turkish ? 'Faz dağılımı mevcut değil.' : 'Phase distribution unavailable.'}</Text>}
      </View>;
    })}
    {!visible.length && <Text style={styles.empty}>{turkish ? 'Faz dağılımı mevcut değil.' : 'Phase distribution unavailable.'}</Text>}
  </View>;
}

const styles = StyleSheet.create({
  page: { gap: 14 },
  roleSwitch: { flexDirection: 'row', borderWidth: 1, borderRadius: 24, padding: 4, gap: 4 },
  roleOption: { flex: 1, alignItems: 'center', borderRadius: 20, paddingVertical: 10 },
  roleLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  roleText: { fontSize: 14, fontWeight: '800' },
  frame: { backgroundColor: CARD, borderWidth: 1, borderRadius: 20, padding: 16, gap: 14 },
  rule: { height: 3, borderRadius: 3, opacity: 0.8 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  number: { width: 30, height: 30, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  numberText: { fontSize: 14, fontWeight: '800' },
  title: { color: TEXT, fontSize: 17, fontWeight: '800', flex: 1 },
  distribution: { gap: 7 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1, color: TEXT, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  percentage: { fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 6, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  empty: { color: MUTED, fontSize: 14 },
  lockedRole: { gap: 11, padding: 15, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed' },
  lockedHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockedIcon: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  lockedTitle: { fontSize: 15, fontWeight: '900' },
  lockedRoleName: { color: TEXT, fontSize: 13, fontWeight: '800' },
  lockedText: { color: MUTED, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  lockedButton: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: ACCENT, backgroundColor: 'rgba(22,163,74,0.14)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  lockedButtonText: { color: ACCENT, fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
});
