import { FRAME_TITLE, FRAME_STRIPE } from '@/theme';
import React from 'react';
import { ScrollView, View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { BarChart3, BookMarked, CalendarSearch, Database, Shield, Trophy, GitCompareArrows, ListFilter, RotateCcw } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ContractDateFilter, ContractStatusFilter, type ContractStatus } from '@/components/ContractFilters';
import { getMe, type Plan } from '@/services/api';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import SharedMatchupCenter from '@/components/SharedMatchupCenter';
import FavoritePlayers from '@/components/FavoritePlayers';
import PortfolioRoleFilter from '@/components/PortfolioRoleFilter';
import { ACCENT, BG, PANEL, CARD, TEXT, MUTED, LINE } from '@/theme';
import { TutorialPageGuide } from '@/components/Tutorial';

const MemoizedFavoritePlayers = React.memo(FavoritePlayers);

export function PortfolioWorkspaceScreen() {
  const { t, i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const [plan, setPlan] = React.useState<Plan>('Free');
  useFocusEffect(React.useCallback(() => {
    let active = true;
    getMe().then(me => { const current = me.plan; if (active) setPlan(current === 'No Ads Monthly' || current === 'Pro Monthly' || current === 'Pro Yearly' ? current : 'Free'); }).catch(() => { if (active) setPlan('Free'); });
    return () => { active = false; };
  }, []));
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<ContractStatus>('');
  const [roles, setRoles] = React.useState<string[]>([]);
  const pageScroll = React.useRef<ScrollView>(null);
  const portfolioFilters = React.useMemo(() => ({ values, status, roles }), [values, status, roles]);
  const deferredPortfolioFilters = React.useDeferredValue(portfolioFilters);
  const update = (key: string, value: string) => setValues(previous => ({ ...previous, [key]: value }));
  const fields = [['name', tr ? 'Oyuncu Adı' : 'Player Name'], ['country', tr ? 'Ülke' : 'Country'], ['team', tr ? 'Takım' : 'Team']];
  return <ScrollView ref={pageScroll} style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={[styles.panel, { borderColor: ACCENT }]}>
      <View style={styles.topStripe} />
      <View style={styles.heading}>
        <ListFilter size={20} color={ACCENT} />
        <Text style={[styles.title, FRAME_TITLE]}>{t('portfolioWorkspaceFilters', 'Player Portfolio Filters')}</Text>
        <Pressable testID="portfolio-clear-filters" hitSlop={12} accessibilityRole="button" accessibilityLabel={tr ? 'Filtreleri Temizle' : 'Clear Filters'} onPress={() => { setValues({}); setStatus(''); setRoles([]); }} style={({ pressed }) => [styles.clearButton, pressed && { backgroundColor: 'rgba(248,113,113,0.12)' }]}><RotateCcw size={20} color="#F87171" /></Pressable>
      </View>
      <View style={styles.grid}>
        {fields.map(([key, label]) => <View style={styles.field} key={key}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={values[key] ?? ''} onChangeText={value => update(key, value)} placeholder={label} placeholderTextColor={MUTED} style={styles.input} /></View>)}
        {(['age', 'form', 'potential'] as const).map(key => <View style={styles.field} key={key}><Text style={styles.label}>{t(key, key)}</Text><View style={styles.range}>{['min', 'max'].map(bound => <TextInput key={bound} accessibilityLabel={`${t(key)} ${bound}`} keyboardType="number-pad" value={values[`${key}${bound}`] ?? ''} onChangeText={value => update(`${key}${bound}`, value.replace(/\D/g, '').slice(0, 3))} placeholder={bound === 'min' ? 'Min' : 'Max'} placeholderTextColor={MUTED} style={[styles.input, { flex: 1 }]} />)}</View></View>)}
      </View>
      <View style={styles.range}>
        <View style={{ flex: 1, minWidth: 0 }}><PortfolioRoleFilter value={roles} onChange={setRoles} /></View>
        <View style={{ flex: 1, minWidth: 0 }}><ContractStatusFilter value={status} onChange={value => { setStatus(value); if (value === 'permanent') update('loanEnd', ''); }} /></View>
      </View>
      <View style={styles.range}><View style={{ flex: 1, minWidth: 0 }}><ContractDateFilter testID="portfolio-loan-end" label={t('contractLoanEnd', 'Loan end date')} value={values.loanEnd ?? ''} onChange={value => { update('loanEnd', value); if (value && status !== 'loan') setStatus('loan'); }} disabled={status === 'permanent'} /></View>
      <View style={{ flex: 1, minWidth: 0 }}><ContractDateFilter testID="portfolio-contract-end" label={t('contractPermanentEnd', 'Contract end date')} value={values.contractEnd ?? ''} onChange={value => update('contractEnd', value)} /></View></View>

    </View>
    <TutorialPageGuide page="playerPortfolio" onShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
    <MemoizedFavoritePlayers plan={plan} workspaceFilters={deferredPortfolioFilters} />
  </ScrollView>;
}

export function MatchupWorkspaceScreen() {
  const pageScroll = React.useRef<ScrollView>(null);
  return <ScrollView ref={pageScroll} style={styles.screen} contentContainerStyle={styles.content}><SharedMatchupCenter workspace tutorialOnShow={y => pageScroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} /></ScrollView>;
}

const emptyWorkspaces = {
  MatchPortfolio: { label: 'matchPortfolioWorkspace', Icon: BookMarked },
  TeamAnalysis: { label: 'teamAnalysisWorkspace', Icon: BarChart3 },
  TeamPool: { label: 'teamPoolWorkspace', Icon: Shield },
  LeaguePool: { label: 'leaguePoolWorkspace', Icon: Trophy },
  MatchPool: { label: 'matchPoolWorkspace', Icon: CalendarSearch },
  SeasonData: { label: 'seasonDataWorkspace', Icon: Database },
} as const;

export function EmptyWorkspaceScreen() {
  const route = useRoute();
  const { t, i18n } = useTranslation();
  const { label, Icon } = emptyWorkspaces[route.name as keyof typeof emptyWorkspaces];
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <View style={styles.panel}>
      <View style={styles.heading}><Icon size={20} color={ACCENT} /><Text style={styles.title}>{t(label)}</Text></View>
      <View style={[styles.empty, { minHeight: 280 }]}>
        <Icon size={42} color={ACCENT} />
        <Text style={styles.emptyTitle}>{i18n.language.startsWith('tr') ? 'Henüz veri yok' : 'No data yet'}</Text>
      </View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG }, content: { padding: 16, gap: 18, paddingBottom: 32 },
  panel: { padding: 16, gap: 15, backgroundColor: PANEL, borderWidth: 1, borderColor: LINE, borderRadius: 20 },
  topStripe: { ...FRAME_STRIPE, marginBottom: -5 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 9 }, title: { flex: 1, color: ACCENT, fontWeight: '800', fontSize: 18 },
  clearButton: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, field: { flexGrow: 1, flexBasis: '45%', gap: 7 },
  label: { color: MUTED, fontWeight: '700', fontSize: 12 }, input: { minHeight: 44, borderRadius: 10, padding: 10, backgroundColor: CARD, borderWidth: 1, borderColor: LINE, color: TEXT }, range: { flexDirection: 'row', gap: 6 },
  roles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, role: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE, borderRadius: 10 }, selected: { borderColor: ACCENT, backgroundColor: 'rgba(22,163,74,0.12)' },
  count: { color: ACCENT, fontWeight: '800', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: 'rgba(22,163,74,0.12)' }, tableHeader: { flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderColor: LINE }, column: { width: 115, padding: 12, color: MUTED, fontSize: 12, fontWeight: '700' }, emptyRow: { height: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 28 }, emptyTitle: { color: TEXT, fontSize: 16, fontWeight: '700' }, emptyText: { color: MUTED, textAlign: 'center', fontSize: 13 },
});
