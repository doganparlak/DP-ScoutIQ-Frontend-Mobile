import { reportScopeMatches } from '@/services/reportAccess';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, ArrowRightLeft, BadgeInfo, CalendarDays, ChartNoAxesCombined, ChevronLeft, ChevronRight, CloudSun, Globe, Layers, MapPin, Shield, Trophy, UserRound, Users, X } from 'lucide-react-native';
import { ACCENT, CARD, DANGER, LINE, MUTED, TEXT } from '@/theme';
import { ensureSavedPostMatchSection, openSavedPostMatchReport, pollSavedPostMatchReport, type SavedPostMatchReport, type MatchFixture, type PostMatchCardData } from '@/services/matchPool';
import ActionSpinner from './ActionSpinner';
import MatchReportLineups from './MatchReportLineups';
import MatchReportMomentum from './MatchReportMomentum';
import MatchReportTimeline from './MatchReportTimeline';
import MatchReportTeamComparison from './MatchReportTeamComparison';
import MatchReportPlayerPerspectives from './MatchReportPlayerPerspectives';
import MatchReportTeamAnalysis from './MatchReportTeamAnalysis';
import MatchReportPlayerAnalysis from './MatchReportPlayerAnalysis';
import {getMe,type Plan} from '@/services/api';

const reportSections = [
  { tr: 'Maç Kartı', en: 'Match Card', Icon: BadgeInfo },
  { tr: 'Kadro ve Diziliş', en: 'Lineup & Formation', Icon: Users },
  { tr: 'Maç Akışı', en: 'Match Timeline', Icon: Activity },
  { tr: 'Momentum', en: 'Momentum', Icon: ChartNoAxesCombined },
  { tr: 'Takım Karşılaştırması', en: 'Team Comparison', Icon: ArrowRightLeft },
  { tr: 'Takım Analizi', en: 'Team Analysis', Icon: Shield },
  { tr: 'Oyuncu Analizi', en: 'Player Analysis', Icon: UserRound },
  { tr: 'Oyuncu Analizi · Öne Çıkanlar', en: 'Player Analysis · Standouts', Icon: UserRound },
].map((section, id) => ({ ...section, id }));
const WEATHER: Record<string, string> = {
  'clear sky': 'Açık', 'few clouds': 'Az Bulutlu', 'scattered clouds': 'Parçalı Bulutlu',
  'broken clouds': 'Çok Bulutlu', 'overcast clouds': 'Kapalı', 'light rain': 'Hafif Yağmurlu',
  'moderate rain': 'Yağmurlu', 'heavy intensity rain': 'Kuvvetli Yağmurlu', rain: 'Yağmurlu',
  snow: 'Karlı', mist: 'Puslu', fog: 'Sisli', thunderstorm: 'Gök Gürültülü Fırtına',
};
function matchDate(value: string | undefined, tr: boolean) {
  if (!value) return '—';
  const date = new Date(value.replace(' ', 'T') + (/Z$|[+-]\d\d:\d\d$/.test(value) ? '' : 'Z'));
  if (!Number.isFinite(date.getTime())) return '—';
  return date.toLocaleString(tr ? 'tr-TR' : 'en-GB', {
    timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
  }) + ' · UTC+3';
}
function statusLabel(state: PostMatchCardData['state'], tr: boolean) {
  const raw = state?.name || state?.short_name || state?.developer_name || '—';
  if (!tr) return raw;
  const normalized = raw.toLowerCase().replace(/[_-]/g, ' ');
  if (normalized === 'not started' || normalized === 'ns') return 'Başlamadı';
  if (normalized.includes('full time') || normalized === 'ft' || normalized.includes('finished')) return 'Tamamlandı';
  if (normalized.includes('after extra time') || normalized === 'aet') return 'Uzatmalar Sonunda';
  if (normalized.includes('after penalties') || normalized === 'pen') return 'Penaltılar Sonunda';
  return raw;
}
function Team({ team, away }: { team?: PostMatchCardData['teams'][number]; away?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [team?.image_url]);
  return <View style={s.team}>
    <View style={s.crest}>
      {team?.image_url && !failed ? <Image source={{ uri: team.image_url }} resizeMode="contain" style={s.image} onError={() => setFailed(true)} />
        : <Shield size={40} color={away ? '#38BDF8' : ACCENT} />}
    </View>
    <Text style={s.teamName}>{team?.name || '—'}</Text>
    {!!team?.coach_name && <Text style={s.coach}>{team.coach_name}</Text>}
    {!!team?.formation && <Text style={[s.formation, away && { color: '#38BDF8' }]}>{team.formation}</Text>}
  </View>;
}
export function MatchCard({ data, tr, preMatch = false }: { data: PostMatchCardData; tr: boolean; preMatch?: boolean }) {
  const home = data.teams.find(team => team.location === 'home') || data.teams[0];
  const away = data.teams.find(team => team.location === 'away') || data.teams[1];
  const goals = (id?: number) => data.scores.find(score => score.description === 'CURRENT' && Number(score.participant_id) === id)?.score?.goals ?? '—';
  const weather = data.weather?.description || '';
  const facts = preMatch ? [
    { label: tr ? 'Tarih ve Saat' : 'Date & Time', value: matchDate(data.fixture.starting_at, tr).replace(/[, ]+(\d{2}:\d{2}) · UTC\+3$/, '\n$1 UTC +3'), Icon: CalendarDays },
    { label: tr ? 'Sezon' : 'Season', value: data.season?.name, Icon: Layers },
    { label: tr ? 'Ülke' : 'Country', value: data.league?.country?.name, Icon: Globe },
    { label: tr ? 'Lig' : 'League', value: data.league?.name, Icon: Trophy },
    { label: tr ? 'Şehir' : 'City', value: data.venue?.city_name, Icon: MapPin },
    { label: tr ? 'Stadyum' : 'Stadium', value: data.venue?.name, Icon: Shield },
    { label: tr ? 'Maç Durumu' : 'Match Status', value: statusLabel(data.state, tr), Icon: Activity },
    { label: tr ? 'Oyuncu Adedi' : 'Squad Size', value: [home, away].map(team => `${team?.name || '—'}: ${team?.player_count ?? '—'}`).join('\n'), Icon: Users },
  ] : [
    { label: tr ? 'Tarih ve Saat' : 'Date & Time', value: matchDate(data.fixture.starting_at, tr), Icon: CalendarDays, wide: true },
    { label: tr ? 'Ülke' : 'Country', value: data.league?.country?.name, Icon: Globe },
    { label: tr ? 'Lig' : 'League', value: data.league?.name, Icon: Trophy },
    { label: tr ? 'Şehir' : 'City', value: data.venue?.city_name, Icon: MapPin },
    { label: tr ? 'Stadyum' : 'Stadium', value: data.venue?.name, Icon: Shield },
    { label: tr ? 'Hava' : 'Weather', value: tr ? WEATHER[weather.toLowerCase().trim()] || weather : weather, Icon: CloudSun },
    { label: tr ? 'Maç Durumu' : 'Match Status', value: statusLabel(data.state, tr), Icon: Activity },
    ...(!preMatch ? [{ label: tr ? 'Metrik Kaydı' : 'Metric Records', value: `${data.coverage.unique_team_metrics} ${tr ? 'takım' : 'team'} · ${data.coverage.unique_player_metrics} ${tr ? 'oyuncu' : 'player'}`, Icon: Layers },
    { label: tr ? 'Toplam Oyuncu Kaydı' : 'Total Player Records', value: `${data.coverage.players_with_minutes} ${tr ? 'oyuncu' : 'players'}`, Icon: Users }] : [
      { label: tr ? 'Oyuncu Adedi' : 'Squad Size', value: [home, away].map(team => `${team?.name || '—'}: ${team?.player_count ?? '—'}`).join(' · '), Icon: Users, wide: true },
      { label: tr ? 'Sezon' : 'Season', value: data.season?.name, Icon: Layers },
    ]),
  ].filter(fact => !preMatch || fact.Icon !== CloudSun);
  return <View style={s.content}>
    <View style={s.hero}>
      <View style={s.rule} />
      <Text style={s.eyebrow}>{tr ? 'MAÇ KARTI' : 'MATCH CARD'}</Text>
      <Text style={s.subtitle}>{tr ? 'ScoutWise tarafından oluşturuldu' : 'Created by ScoutWise'}</Text>
      <View style={s.matchup}>
        <Team team={home} />
        <View style={s.scoreColumn}>
          <Text style={s.matchday}>MATCHDAY</Text>
          <Text style={s.vs}>VS</Text>
          {!preMatch && <View style={s.scoreBox}><Text adjustsFontSizeToFit numberOfLines={1} style={s.score}>{goals(home?.id)} – {goals(away?.id)}</Text></View>}
          <Text style={s.status}>{statusLabel(data.state, tr)}</Text>
        </View>
        <Team team={away} away />
      </View>
    </View>
    <View style={s.facts}>
      {facts.map(({ label, value, Icon, wide }) => <View key={label} style={[s.fact, wide && s.wideFact]}>
        <View style={s.factHeading}><Icon size={15} color={ACCENT} /><Text style={s.factLabel}>{label}</Text></View>
        <Text style={s.factValue}>{value || '—'}</Text>
      </View>)}
    </View>
    <View style={s.brand}>
      <Text style={s.prepared}>{tr ? 'RAPORU HAZIRLAYAN' : 'REPORT PREPARED BY'}</Text>
      <Text style={s.brandName}>SCOUT<Text style={{ color: ACCENT }}>WISE</Text></Text>
    </View>
  </View>;
}

export default function PostMatchReportModal({ visible, onClose, onOpenPlans, fixture, tr }: { visible: boolean; onClose: () => void; onOpenPlans: () => void; fixture: MatchFixture; tr: boolean }) {
  const insets = useSafeAreaInsets();
  const [plan,setPlan]=useState<Plan>('Free');
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const [data, setData] = useState<PostMatchCardData | null>(null);
  const [savedReport, setSavedReport] = useState<SavedPostMatchReport | null>(null);
  const hasMomentum = Boolean(data?.pressure?.some(point =>
    point.minute != null && Number.isFinite(Number(point.minute)) &&
    point.value != null && point.value !== '' && Number.isFinite(Number(point.value)) &&
    data.teams.some(team => team.id === point.team_id)
  ));
  const sections = useMemo(() => reportSections.filter(section => section.id !== 3 || hasMomentum), [hasMomentum]);
  const previousSections = useRef(sections);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const pager = useRef<FlatList>(null);
  useEffect(()=>{if(!visible)return;let active=true;getMe().then(profile=>{if(!active)return;setPlan(profile.plan==='No Ads Monthly'||profile.plan==='Pro Monthly'||profile.plan==='Pro Yearly'?profile.plan:'Free');}).catch(()=>{if(active)setPlan('Free');});return()=>{active=false;};},[visible]);
  useEffect(() => {
    const previous = previousSections.current;
    if (previous === sections) return;
    previousSections.current = sections;
    const selectedId = previous[page]?.id;
    const matchingIndex = sections.findIndex(section => section.id === selectedId);
    const next = matchingIndex >= 0 ? matchingIndex : Math.min(page, sections.length - 1);
    setPage(next);
    pager.current?.scrollToOffset({ offset: next * width, animated: false });
  }, [sections, page, width]);
  useEffect(() => { if (visible) { setPage(0); pager.current?.scrollToOffset({ offset: 0, animated: false }); } }, [visible, fixture.fixtureId]);
  useEffect(() => {
    if (!visible) return;
    setData(null); setSavedReport(null); setLoading(true); setError(false);
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = (result: SavedPostMatchReport) => {
      if (!active) return;
      setSavedReport(result); setData(result.content?.data || null);
      setLoading(!result.content?.data && result.status !== 'failed');
      setError(!result.content?.data && result.status === 'failed');
      if (!result.content?.data && result.status !== 'failed') timer = setTimeout(poll, 2000);
    };
    const poll = () => {
      pollSavedPostMatchReport(fixture.fixtureId, tr).then(update).catch(() => {
        if (active) timer = setTimeout(poll, 5000);
      });
    };
    openSavedPostMatchReport(fixture.fixtureId, tr).then(update).catch(() => { if (active) { setLoading(false); setError(true); } });
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [visible, fixture.fixtureId, retry, tr]);
  const activeAiSection = sections[page]?.id === 5 ? 'team_analysis' : sections[page]?.id === 7 ? 'player_perspectives' : null;
  useEffect(()=>{
    if(!visible||!data||!activeAiSection)return;
    const current=savedReport?.content?.sections?.[activeAiSection]?.status;
    if(current==='ready'&&reportScopeMatches(savedReport?.content?.sections?.[activeAiSection],plan!=='Free'))return;
    let active=true;let timer:ReturnType<typeof setTimeout>|undefined;
    const accept=(next:SavedPostMatchReport)=>{if(!active)return;setSavedReport(next);setData(next.content?.data||data);const state=next.content?.sections?.[activeAiSection]?.status;if(state!=='failed'&&(state!=='ready'||!reportScopeMatches(next.content?.sections?.[activeAiSection],plan!=='Free')))timer=setTimeout(poll,2000);};
    const poll=()=>pollSavedPostMatchReport(fixture.fixtureId,tr).then(accept).catch(()=>{if(active)timer=setTimeout(poll,5000);});
    ensureSavedPostMatchSection(fixture.fixtureId,tr,activeAiSection).then(next=>{accept(next);if(active&&!timer)timer=setTimeout(poll,2000);}).catch(()=>{if(active)timer=setTimeout(poll,5000);});
    return()=>{active=false;if(timer)clearTimeout(timer);};
  },[visible,data,activeAiSection,fixture.fixtureId,tr,retry,plan]);
  const retrySections = () => setRetry(value => value + 1);
  const openPlans=()=>{onClose();onOpenPlans();};
  useEffect(() => { if (width) pager.current?.scrollToOffset({ offset: width * page, animated: false }); }, [width]);
  const go = (next: number) => {
    const index = Math.max(0, Math.min(sections.length - 1, next));
    setPage(index); pager.current?.scrollToOffset({ offset: index * width, animated: true });
  };
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
    <View style={[s.backdrop, { paddingTop: Math.max(14, insets.top), paddingBottom: Math.max(14, insets.bottom) }]}>
      <View style={s.modal}>
        <View style={s.header}>
          <View style={s.headerText}><Text style={s.headerTitle}>{tr ? 'Maç Sonu Raporu' : 'Post-Match Report'}</Text><Text style={s.sectionTitle}>{tr ? sections[Math.min(page, sections.length - 1)].tr : sections[Math.min(page, sections.length - 1)].en}</Text></View>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel={tr ? 'Raporu kapat' : 'Close report'}><X size={25} color={DANGER} /></Pressable>
        </View>
        <View style={s.pager} onLayout={event => setWidth(Math.round(event.nativeEvent.layout.width))}>
          {width > 0 && <FlatList ref={pager} horizontal pagingEnabled data={sections} keyExtractor={item => item.en}
            showsHorizontalScrollIndicator={false} extraData={{ width, data, loading, error, tr, page, savedReport, plan }}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={event => setPage(Math.max(0, Math.min(sections.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))}
            renderItem={({ item, index }) => <ScrollView style={{ width }} contentContainerStyle={s.pageContent}>
              {(index >= 0) ? loading ? <View style={s.center}><ActionSpinner size={28} color={ACCENT} /><Text style={s.subtitle}>{tr ? 'Maç bilgileri yükleniyor…' : 'Loading match details…'}</Text></View>
                : error ? <View style={s.center}><Text style={s.subtitle}>{tr ? 'Maç bilgileri yüklenemedi.' : 'Unable to load match details.'}</Text><Pressable accessibilityRole="button" style={s.retry} onPress={() => setRetry(value => value + 1)}><Text style={s.sectionTitle}>{tr ? 'Tekrar Dene' : 'Try Again'}</Text></Pressable></View>
                : data ? item.id === 0 ? <MatchCard data={data} tr={tr} /> : item.id === 7 ? <MatchReportPlayerPerspectives data={data} tr={tr} analysis={reportScopeMatches(savedReport?.content?.sections.player_perspectives,plan!=='Free')?savedReport?.content?.player_perspectives:undefined} loading={(!savedReport?.content?.player_perspectives || !reportScopeMatches(savedReport?.content?.sections.player_perspectives,plan!=='Free')) && savedReport?.content?.sections.player_perspectives?.status !== 'failed'} error={savedReport?.content?.sections.player_perspectives?.status === 'failed'} onRetry={retrySections} free={plan==='Free'} onOpenPlans={openPlans} /> : item.id === 6 ? <MatchReportPlayerAnalysis data={data} tr={tr} /> : item.id === 5 ? <MatchReportTeamAnalysis data={data} tr={tr} analysis={reportScopeMatches(savedReport?.content?.sections.team_analysis,plan!=='Free')?savedReport?.content?.team_analysis:undefined} loading={(!savedReport?.content?.team_analysis || !reportScopeMatches(savedReport?.content?.sections.team_analysis,plan!=='Free')) && savedReport?.content?.sections.team_analysis?.status !== 'failed'} error={savedReport?.content?.sections.team_analysis?.status === 'failed'} onRetry={retrySections} free={plan==='Free'} onOpenPlans={openPlans} /> : item.id === 4 ? <MatchReportTeamComparison data={data} tr={tr} /> : item.id === 3 ? <MatchReportMomentum data={data} tr={tr} /> : item.id === 2 ? <MatchReportTimeline data={data} tr={tr} /> : <MatchReportLineups data={data} tr={tr} /> : null
                : <View style={s.placeholder}><View style={s.rule} /><item.Icon size={36} color={ACCENT} /><Text style={s.placeholderTitle}>{tr ? item.tr : item.en}</Text><Text style={s.subtitle}>{fixture.name}</Text><Text style={s.soon}>{tr ? 'Yakında' : 'Coming soon'}</Text></View>}
            </ScrollView>} />}
        </View>
        <View style={s.footer}>
          <Pressable style={[s.nav, page === 0 && s.disabled]} disabled={page === 0} onPress={() => go(page - 1)} accessibilityRole="button" accessibilityLabel={tr ? 'Önceki bölüm' : 'Previous section'}><ChevronLeft size={22} color={TEXT} /></Pressable>
          <View style={s.dots}>{sections.map((item, index) => <Pressable key={item.en} onPress={() => go(index)} accessibilityRole="button" accessibilityLabel={tr ? item.tr : item.en} accessibilityState={{ selected: index === page }} style={s.dotTarget}><View style={[s.dot, index === page && { backgroundColor: ACCENT }]} /></Pressable>)}</View>
          <Pressable style={[s.nav, page === sections.length - 1 && s.disabled]} disabled={page === sections.length - 1} onPress={() => go(page + 1)} accessibilityRole="button" accessibilityLabel={tr ? 'Sonraki bölüm' : 'Next section'}><ChevronRight size={22} color={TEXT} /></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'center', alignItems: 'center', padding: 14 },
  modal: { width: '100%', maxWidth: 620, height: '88%', borderRadius: 18, borderWidth: 1, borderColor: LINE, backgroundColor: CARD, padding: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: LINE },
  headerText: { flex: 1, gap: 4 }, headerTitle: { color: TEXT, fontSize: 16, fontWeight: '800' }, sectionTitle: { color: ACCENT, fontSize: 13, fontWeight: '700' },
  pager: { flex: 1, marginVertical: 12 }, pageContent: { flexGrow: 1, paddingBottom: 4 }, content: { gap: 12 },
  hero: { borderWidth: 1, borderColor: `${ACCENT}90`, borderRadius: 20, backgroundColor: 'rgba(22,163,74,.06)', padding: 13 },
  rule: { height: 3, width: '100%', backgroundColor: ACCENT, borderRadius: 3, marginBottom: 16 },
  eyebrow: { textAlign: 'center', color: ACCENT, fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  subtitle: { color: MUTED, textAlign: 'center', fontSize: 12, lineHeight: 19, marginTop: 6 },
  matchup: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginBottom: 10 },
  team: { flex: 1, minWidth: 0, alignItems: 'center', gap: 7 }, crest: { height: 68, width: '100%', alignItems: 'center', justifyContent: 'center' }, image: { width: '100%', maxWidth: 76, height: 68 },
  teamName: { textAlign: 'center', color: TEXT, fontSize: 14, fontWeight: '800' }, coach: { color: MUTED, fontSize: 10, textAlign: 'center' }, formation: { color: ACCENT, fontWeight: '700', fontSize: 12 },
  scoreColumn: { width: '28%', alignItems: 'center', gap: 8 }, matchday: { color: MUTED, fontSize: 8, fontWeight: '800', letterSpacing: 1 }, vs: { color: ACCENT, fontSize: 19, fontWeight: '900', fontStyle: 'italic' },
  scoreBox: { width: '100%', borderWidth: 1, borderColor: ACCENT, borderRadius: 12, backgroundColor: 'rgba(0,0,0,.22)', paddingVertical: 10, paddingHorizontal: 5 }, score: { color: TEXT, fontSize: 25, fontWeight: '900', textAlign: 'center' }, status: { color: MUTED, fontSize: 10, textAlign: 'center', fontWeight: '700' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, fact: { flexBasis: '45%', flexGrow: 1, minWidth: 0, borderWidth: 1, borderColor: `${ACCENT}40`, borderRadius: 14, padding: 12, gap: 8, backgroundColor: 'rgba(255,255,255,.025)' }, wideFact: { flexBasis: '100%' },
  factHeading: { flexDirection: 'row', gap: 7, alignItems: 'center' }, factLabel: { color: MUTED, fontSize: 11, fontWeight: '600', flex: 1 }, factValue: { color: TEXT, fontSize: 13, fontWeight: '700', lineHeight: 19 },
  brand: { borderWidth: 1, borderColor: `${ACCENT}60`, borderRadius: 18, padding: 20, alignItems: 'center', gap: 8 }, prepared: { color: MUTED, letterSpacing: 2, fontWeight: '700', fontSize: 9 }, brandName: { color: TEXT, fontSize: 25, fontWeight: '900' },
  center: { flex: 1, minHeight: 250, alignItems: 'center', justifyContent: 'center', gap: 14 }, retry: { borderWidth: 1, borderColor: ACCENT, borderRadius: 12, paddingHorizontal: 22, paddingVertical: 12 },
  placeholder: { padding: 24, borderWidth: 1, borderColor: `${ACCENT}70`, borderRadius: 20, alignItems: 'center', gap: 16, marginTop: 4 }, placeholderTitle: { color: TEXT, fontSize: 21, fontWeight: '800', textAlign: 'center' }, soon: { color: ACCENT, fontSize: 12, fontWeight: '700', marginTop: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: LINE, paddingTop: 12 }, nav: { borderWidth: 1, borderColor: LINE, padding: 10, borderRadius: 14 }, disabled: { opacity: .3 }, dots: { flexDirection: 'row', flexShrink: 1 }, dotTarget: { paddingVertical: 14, paddingHorizontal: 5 }, dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: LINE },
});

export const reportModalStyles = s;
