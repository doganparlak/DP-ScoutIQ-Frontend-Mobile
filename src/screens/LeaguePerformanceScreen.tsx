import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { List, ListFilter, Table2 } from 'lucide-react-native';
import { ACCENT, BG, CARD, FRAME_HEADING, FRAME_STRIPE, FRAME_TITLE, LINE, MUTED, PANEL, TEXT } from '@/theme';
import { getLeaguePerformanceOptions, getLeagueStandings, searchLeaguePerformance, type LeagueFilters, type LeagueResult, type LeagueStandings } from '@/services/leaguePerformance';
import { Action, Badge, SelectField, Selector, Status, styles as shared } from '@/components/LeaguePerformanceControls';
import LeaguePerformanceStandings from '@/components/LeaguePerformanceStandings';
import { TutorialPageGuide } from '@/components/Tutorial';
const EMPTY: LeagueFilters = {countries: [], leagues: []};
const DEFAULT: LeagueFilters = {countries: ['Turkey'], leagues: ['Super Lig']};

function Section({title, Icon, children}: {title: string; Icon: typeof List; children: React.ReactNode}) {
  return <View style={styles.panel}><View style={FRAME_STRIPE} /><View style={[FRAME_HEADING, {marginBottom: 14}]}><Icon size={20} color={ACCENT} /><Text style={FRAME_TITLE}>{title}</Text></View>{children}</View>;
}
export default function LeaguePerformanceScreen() {
  const ads = useWorkspaceActionAd();
  const {i18n} = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const {width} = useWindowDimensions();
  const pageScroll = React.useRef<ScrollView>(null);
  const showGuide = (y: number) => pageScroll.current?.scrollTo({y: Math.max(0, y - 12), animated: true});
  const pagePadding = width < 360 ? 10 : width >= 768 ? 24 : 14;
  const [filters, setFilters] = React.useState<LeagueFilters>(DEFAULT);
  const [options, setOptions] = React.useState<LeagueFilters>(EMPTY);
  const [rows, setRows] = React.useState<LeagueResult[]>([]);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [standings, setStandings] = React.useState<LeagueStandings | null>(null);
  const [tableKey, setTableKey] = React.useState('');
  const [selector, setSelector] = React.useState<'countries' | 'leagues' | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [optionsLoading, setOptionsLoading] = React.useState(false);
  const [standingsLoading, setStandingsLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState(false);
  const [optionsError, setOptionsError] = React.useState(false);
  const [standingsError, setStandingsError] = React.useState(false);
  const [optionsRetry, setOptionsRetry] = React.useState(0);
  const [standingsRetry, setStandingsRetry] = React.useState(0);
  const searchVersion = React.useRef(0);
  const mounted = React.useRef(true);
  const search = React.useCallback(async (criteria: LeagueFilters) => {
    const version = ++searchVersion.current;
    setLoading(true); setSearchError(false);
    try {
      const result = await searchLeaguePerformance(criteria);
      if (!mounted.current || version !== searchVersion.current) return;
      setRows(result); setSelectedId(result[0]?.league_id ?? null);
    } catch {
      if (!mounted.current || version !== searchVersion.current) return;
      setRows([]); setSelectedId(null); setSearchError(true);
    } finally {if (mounted.current && version === searchVersion.current) setLoading(false);}
  }, []);
  React.useEffect(() => {
    mounted.current = true;
    void search(DEFAULT);
    return () => {mounted.current = false; searchVersion.current++;};
  }, [search]);
  React.useEffect(() => {
    let alive = true;
    setOptionsLoading(true); setOptionsError(false);
    getLeaguePerformanceOptions(filters).then(next => {
      if (!alive) return;
      setOptions(next);
      setFilters(current => {
        const countries = current.countries.filter(value => next.countries.includes(value)).slice(0, 1);
        const leagues = current.leagues.filter(value => next.leagues.includes(value)).slice(0, 1);
        return countries.join() === current.countries.join() && leagues.join() === current.leagues.join() ? current : {countries, leagues};
      });
    }).catch(() => {if (alive) setOptionsError(true);}).finally(() => {if (alive) setOptionsLoading(false);});
    return () => {alive = false;};
  }, [filters, optionsRetry]);
  React.useEffect(() => {
    let alive = true;
    setStandings(null); setTableKey(''); setStandingsError(false);
    if (!selectedId) {setStandingsLoading(false); return;}
    setStandingsLoading(true);
    getLeagueStandings(selectedId).then(value => {
      if (!alive) return;
      setStandings(value); setTableKey(value.tables[0]?.key || '');
    }).catch(() => {if (alive) setStandingsError(true);}).finally(() => {if (alive) setStandingsLoading(false);});
    return () => {alive = false;};
  }, [selectedId, standingsRetry]);
  async function manualSearch() {
    try {await ads.run('leaguePerformanceSearch', () => search(filters));}
    catch {if (mounted.current) setSearchError(true);}
  }
  function clear() {
    searchVersion.current++; setFilters(EMPTY); setRows([]); setSelectedId(null); setLoading(false); setSearchError(false);
  }
  const selected = rows.find(row => row.league_id === selectedId);
  const table = standings?.tables.find(item => item.key === tableKey);
  // Do not show the previous league while the effect for the new selection starts.
  const currentStandings = standings?.leagueId === selectedId ? standings : null;
  return <ScrollView ref={pageScroll} style={{flex: 1, backgroundColor: BG}} contentContainerStyle={[styles.page, {paddingHorizontal: pagePadding}]} keyboardShouldPersistTaps="handled">
    <Section title={tr ? 'Lig Havuzu Filtreleri' : 'League Pool Filters'} Icon={ListFilter}><View style={{gap: 14}}>
      <SelectField label={tr ? 'Ülke' : 'Country'} value={filters.countries[0] || (tr ? 'Ülke seç' : 'Select country')} onPress={() => setSelector('countries')} />
      <SelectField label={tr ? 'Lig' : 'League'} value={filters.leagues[0] || (tr ? 'Lig seç' : 'Select league')} onPress={() => setSelector('leagues')} />
      {optionsLoading && <Status busy text={tr ? 'Filtreler yükleniyor…' : 'Loading filters…'} />}
      {optionsError && <><Status error text={tr ? 'Filtre seçenekleri yüklenemedi.' : 'Filter options could not be loaded.'} /><Action label={tr ? 'Tekrar dene' : 'Retry'} onPress={() => setOptionsRetry(value => value + 1)} /></>}
      <View style={[shared.row, {flexWrap: 'wrap', justifyContent: 'flex-start'}]}><Action label={loading || ads.busy ? (tr ? 'Aranıyor…' : 'Searching…') : (tr ? 'Ara' : 'Search')} onPress={() => void manualSearch()} disabled={loading || ads.busy} /><Action label={tr ? 'Filtreleri Temizle' : 'Clear Filters'} danger onPress={clear} /></View>
      {searchError && <Status error text={tr ? 'Ligler yüklenemedi. Tekrar aramayı deneyin.' : 'Leagues could not be loaded. Try searching again.'} />}
    </View></Section>
    <TutorialPageGuide page="leaguePerformance" frame={0} summaryLines={0} onShow={showGuide} />
    <Section title={tr ? 'Lig Sonuçları' : 'League Results'} Icon={List}>
      <Text style={[shared.hint, {marginBottom: 10}]}>{rows.length} {tr ? 'sonuç' : 'results'}</Text>
      {loading ? <Status busy text={tr ? 'Ligler aranıyor…' : 'Searching leagues…'} /> : rows.length ? <View><View style={[styles.resultRow, {backgroundColor: CARD}]}><Text style={[styles.country, styles.headerText]}>{tr ? 'ÜLKE' : 'COUNTRY'}</Text><Text style={[styles.league, styles.headerText]}>{tr ? 'LİG' : 'LEAGUE'}</Text><Text style={[styles.count, styles.headerText]}>{tr ? 'TAKIM' : 'TEAMS'}</Text></View><ScrollView style={{maxHeight: 360}} nestedScrollEnabled>{rows.map(row => <Pressable key={row.league_id} accessibilityRole="button" accessibilityState={{selected: row.league_id === selectedId}} accessibilityLabel={`${row.country_name}, ${row.league_name}, ${row.team_count}`} onPress={() => setSelectedId(row.league_id)} style={[styles.resultRow, row.league_id === selectedId && {backgroundColor: 'rgba(22,163,74,.12)'}]}><Text style={styles.country}>{row.country_name || '—'}</Text><View style={[styles.league, shared.row, {justifyContent: 'flex-start', gap: 6}]}><Badge url={row.image_url} size={24} /><Text style={[shared.text, {flex: 1}]}>{row.league_name}</Text></View><Text style={styles.count}>{row.team_count}</Text></Pressable>)}</ScrollView></View> : <Status text={tr ? 'Filtreleri seçip ligleri getirin.' : 'Choose filters to find leagues.'} />}
    </Section>
    <TutorialPageGuide page="leaguePerformance" frame={1} summaryLines={0} onShow={showGuide} />
    <Section title={tr ? 'Lig Sıralaması' : 'League Standings'} Icon={Table2}>
      {selected && <View style={[shared.row, {justifyContent: 'flex-start', marginBottom: 16}]}><View style={styles.leagueBadge}><Badge url={selected.image_url} size={48} /></View><View style={{flex: 1, gap: 5}}><Text style={{color: '#7DD3FC', fontSize: 12}}>{selected.country_name}</Text><Text style={styles.title}>{selected.league_name}</Text>{currentStandings?.seasonName && <Text style={{color: ACCENT, fontSize: 12, fontWeight: '800'}}>{currentStandings.seasonName}</Text>}</View></View>}
        {(currentStandings?.tables.length || 0) > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={[shared.row, {gap: 8}]}>{currentStandings!.tables.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{selected: item.key === tableKey}} onPress={() => setTableKey(item.key)} style={[styles.tableTab, item.key === tableKey && {borderColor: ACCENT}]}><Text style={{color: item.key === tableKey ? ACCENT : MUTED, fontSize: 12, fontWeight: '700'}}>{item.label}</Text></Pressable>)}</View></ScrollView>}
      {standingsLoading || (selectedId && !currentStandings && !standingsError) ? <Status busy text={tr ? 'Lig sıralaması yükleniyor…' : 'Loading standings…'} /> : standingsError ? <View style={{gap: 10}}><Status error text={tr ? 'Lig sıralaması yüklenemedi.' : 'League standings could not be loaded.'} /><Action label={tr ? 'Tekrar dene' : 'Retry'} onPress={() => setStandingsRetry(value => value + 1)} /></View> : currentStandings && table?.rows.length ? <View style={{gap: 14}}>

        <LeaguePerformanceStandings key={`${selectedId}:${currentStandings.seasonId}`} leagueId={selectedId!} seasonId={currentStandings.seasonId} rows={table.rows} tr={tr} />
      </View> : <Status text={selected ? (tr ? 'Bu lig için sıralama bulunamadı.' : 'No standings found for this league.') : (tr ? 'Lig sonuçlarından bir lig seçin.' : 'Select a league result.')} />}
    </Section>
    {ads.fallback}
    {selector && <Selector key={selector} title={selector === 'countries' ? (tr ? 'Ülke Seç' : 'Select Country') : (tr ? 'Lig Seç' : 'Select League')} tr={tr} options={[{key: '', label: tr ? 'Seçimi temizle' : 'Clear selection'}, ...options[selector].map(value => ({key: value, label: value}))]} selected={filters[selector][0] || ''} onClose={() => setSelector(null)} onSelect={value => {setFilters(current => ({...current, [selector]: value ? [value] : []})); setSelector(null);}} />}
  </ScrollView>;
}
const styles = StyleSheet.create({
  page: {padding: 14, paddingBottom: 32, gap: 16}, panel: {backgroundColor: PANEL, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: ACCENT},
  title: {fontSize: 21, fontWeight: '900', color: TEXT},
  resultRow: {flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: LINE, minHeight: 54, paddingVertical: 10},
  country: {flex: .8, minWidth: 0, color: MUTED, paddingHorizontal: 6, fontSize: 11, fontWeight: '700'},
  league: {flex: 1.6, minWidth: 0, paddingHorizontal: 6}, count: {width: 46, flexShrink: 0, textAlign: 'center', color: ACCENT, fontSize: 12, fontWeight: '800'},
  headerText: {color: MUTED, fontSize: 10, fontWeight: '800'},
  leagueBadge: {width: 64, height: 64, backgroundColor: 'rgba(255,255,255,.9)', borderRadius: 14, alignItems: 'center', justifyContent: 'center'},
  tableTab: {padding: 12, borderWidth: 1, borderColor: LINE, borderRadius: 12, backgroundColor: CARD},
});
