import LeagueRulesModal from '@/components/LeagueRulesModal';
import MatchReportActions from '@/components/MatchReportActions';
import PredictionHonorsBadge from '@/components/PredictionHonorsBadge';
import { TutorialPageGuide } from '@/components/Tutorial';
import { matchScore,matchStateLabel,type MatchFixture } from '@/services/matchPool';
import { getAllTimePredictionRankings,getPredictionState,savePredictionEntry,savePredictionNickname,type AllTimePredictionRank,type PredictionFixture,type PredictionPicks,type PredictionState } from '@/services/scorePrediction';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { predictionDateTime,predictionWeekLabel } from '@/utils/predictionPresentation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect,useNavigation } from '@react-navigation/native';
import { BadgeInfo,CalendarDays,Check,ChevronRight,Clock3,Goal,Info,ListOrdered,Send,ShieldCheck,Trophy,UserRound,X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator,AppState,Image,InputAccessoryView,Keyboard,KeyboardAvoidingView,Modal,Platform,Pressable,ScrollView,StyleSheet,Text,TextInput,View,useWindowDimensions } from 'react-native';


type Draft = Record<string, { home: string; away: string }>;
const asDraft = (picks: PredictionPicks): Draft => Object.fromEntries(Object.entries(picks).map(([id, p]) => [id, { home: String(p.home), away: String(p.away) }]));
const draftKey = (state: PredictionState) => `score-prediction.draft.${state.viewerId}.${state.round?.weekStart}`;
const number = (value: number) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
const averageNumber = (value: number, tr: boolean) => Number(value).toLocaleString(tr ? 'tr-TR' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const validScore = (value?: string) => typeof value === 'string' && /^\d{1,2}$/.test(value);
const weekLabel = predictionWeekLabel;


function Frame({ title, Icon, action, children }: { title: string; Icon: typeof Goal; action?: React.ReactNode; children: React.ReactNode }) {
  const themed = useThemedStyles(getModuleTheme);
  const {s, FRAME_STRIPE, FRAME_HEADING, ACCENT, FRAME_TITLE} = themed;

  return <View style={s.frame}>
    <View style={FRAME_STRIPE} />
    <View style={[FRAME_HEADING, { marginBottom: 16 }]}><Icon size={21} color={ACCENT} /><Text style={[FRAME_TITLE, { flex: 1, minWidth: 0 }]}>{title}</Text>{action}</View>
    {children}
  </View>;
}
function Team({ team }: { team: MatchFixture['homeTeam'] }) {
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT} = themed;

  return <View style={s.team}>
    {team.imageUrl ? <Image source={{ uri: team.imageUrl }} resizeMode='contain' style={s.teamLogo} /> : <ShieldCheck size={54} color={ACCENT} />}
    <Text style={s.teamName}>{team.name}</Text>
  </View>;
}

export default function ScorePredictionScreen() {
  const themed = useThemedStyles(getModuleTheme);
  const {s, ACCENT, MUTED, FRAME_STRIPE, FEATURE_COLORS, FRAME_HEADING, FRAME_TITLE, TEXT, tierLabelColor, tierColor, themeColor} = themed;

  const { i18n, t } = useTranslation(), tr = i18n.language.startsWith('tr'), nav = useNavigation<any>();
  const { height, width } = useWindowDimensions();
  const scroll = React.useRef<ScrollView>(null), alive = React.useRef(false), request = React.useRef(0);
  const dirtyIds = React.useRef(new Set<string>()), loadedKey = React.useRef(''), saveLock = React.useRef(false);
  const [data, setData] = React.useState<PredictionState | null>(null);
  const [draft, setDraft] = React.useState<Draft>({});
  const [sent, setSent] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    const expires = Object.values(sent);
    if (!expires.length) return;
    const timer = setTimeout(() => setSent(current => Object.fromEntries(Object.entries(current).filter(([, expiry]) => expiry > Date.now()))), Math.max(0, Math.min(...expires) - Date.now()));
    return () => clearTimeout(timer);
  }, [sent]);
  const [predictionErrors, setPredictionErrors] = React.useState<Record<string, string>>({});
  const [loading, setLoading] = React.useState(true), [error, setError] = React.useState('');
  const [week, setWeek] = React.useState<string>(), [nickname, setNickname] = React.useState('');
  const [registering, setRegistering] = React.useState(false), [savingPrediction, setSavingPrediction] = React.useState<number | null>(null);
  const [rules, setRules] = React.useState(false), [ranking, setRanking] = React.useState(false);
  const [rankingTab, setRankingTab] = React.useState<'weekly' | 'allTime'>('weekly');
  const [allTimeSort, setAllTimeSort] = React.useState<'total' | 'average'>('total');
  const [allTimeRows, setAllTimeRows] = React.useState<AllTimePredictionRank[]>([]);
  const [allTimeLoading, setAllTimeLoading] = React.useState(false), [allTimeError, setAllTimeError] = React.useState(false);
  const [allTimeRetry, setAllTimeRetry] = React.useState(0);
  React.useEffect(() => {
    if (!ranking || rankingTab !== 'allTime') return;
    let active = true;
    setAllTimeLoading(true); setAllTimeError(false);
    getAllTimePredictionRankings(allTimeSort).then(rows => { if (active) setAllTimeRows(rows); })
      .catch(() => { if (active) setAllTimeError(true); })
      .finally(() => { if (active) setAllTimeLoading(false); });
    return () => { active = false; };
  }, [ranking, rankingTab, allTimeSort, data?.viewerId, allTimeRetry]);
  const allTimeLeaderboard = allTimeRows;

  const [now, setNow] = React.useState(Date.now()), [offset, setOffset] = React.useState(0);

  const load = React.useCallback(async () => {
    if (saveLock.current) return;
    const version = ++request.current;
    try {
      const next = await getPredictionState(week);
      const key = draftKey(next), changed = key !== loadedKey.current;
      const restored: Draft = {};
      if (changed) {
        try {
          const raw = await AsyncStorage.getItem(key), parsed = raw ? JSON.parse(raw) : null;
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            const ids = new Set(next.round?.fixtures.map(f => String(f.fixtureId)));
            for (const [id, pick] of Object.entries(parsed)) {
              const p = pick as { home?: unknown; away?: unknown };
              if (ids.has(id) && p && typeof p.home === 'string' && typeof p.away === 'string' && /^\d{0,2}$/.test(p.home) && /^\d{0,2}$/.test(p.away)) restored[id] = { home: p.home, away: p.away };
            }
          }
        } catch { /* The server copy still works when local storage is unavailable. */ }
      }
      if (!alive.current || version !== request.current || saveLock.current) return;
      if (changed) {
        dirtyIds.current = new Set(Object.keys(restored));
        setDraft({ ...asDraft(next.entry?.picks ?? {}), ...restored });
        setPredictionErrors({});
        setSent({});
      } else {
        setDraft(current => {
          const merged = asDraft(next.entry?.picks ?? {});
          for (const id of dirtyIds.current) if (current[id]) merged[id] = current[id];
          return merged;
        });
      }
      loadedKey.current = key;
      setData(next); setOffset(Date.parse(next.serverNow) - Date.now()); setError('');
    } catch {
      if (alive.current && version === request.current) setError(tr ? 'Bilgiler yüklenemedi. Lütfen yeniden dene.' : 'Could not load the competition. Please retry.');
    } finally {
      if (alive.current && version === request.current) setLoading(false);
    }
  }, [week, tr]);

  useFocusEffect(React.useCallback(() => {
    alive.current = true; void load();
    const poll = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 60000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void load(); });
    return () => { alive.current = false; request.current++; clearInterval(poll); clearInterval(clock); listener.remove(); setRules(false); setRanking(false); };
  }, [load]));

  React.useEffect(() => {
    if (!data?.round || loadedKey.current !== draftKey(data)) return;
    const pending = Object.fromEntries(Object.entries(draft).filter(([id]) => dirtyIds.current.has(id)));
    void AsyncStorage.setItem(draftKey(data), JSON.stringify(pending)).catch(() => {});
  }, [draft, data?.round?.id, data?.viewerId]);

  const round = data?.round, entry = data?.entry, fixtures = round?.fixtures ?? [];
  const viewerTier = entry?.tier ?? data?.tier ?? 'free';
  const startingPoints = viewerTier === 'pro' ? 4 : viewerTier === 'plus' ? 2 : 0;
  const eligible = fixtures.filter(f => f.predictionStatus !== 'excluded');
  const savedCount = eligible.filter(f => entry?.picks[String(f.fixtureId)]).length;
  const remaining = round?.deadline ? Math.max(0, Date.parse(round.deadline) - (now + offset)) : 0;
  const locked = loading || !round?.deadline || remaining <= 0 || round.status !== 'open';
  const mine = data?.leaderboard.find(row => row.isYou);
  const secondsLeft = Math.floor(remaining / 1000);
  const clockParts = [
    { label: tr ? 'Gün' : 'Days', value: Math.floor(secondsLeft / 86400) },
    { label: tr ? 'Saat' : 'Hours', value: Math.floor(secondsLeft % 86400 / 3600) },
    { label: tr ? 'Dakika' : 'Minutes', value: Math.floor(secondsLeft % 3600 / 60) },
    { label: tr ? 'Saniye' : 'Seconds', value: secondsLeft % 60 },
  ];

  function edit(id: string, side: 'home' | 'away', value: string) {
    dirtyIds.current.add(id);
    setSent(current => { const next = { ...current }; delete next[id]; return next; });
    setPredictionErrors(current => ({ ...current, [id]: '' }));
    setDraft(current => ({ ...current, [id]: { home: current[id]?.home ?? '', away: current[id]?.away ?? '', [side]: value.replace(/\D/g, '').slice(0, 2) } }));
  }
  async function register() {
    if (registering || nickname.trim().length < 2) return;
    setRegistering(true);
    try { await savePredictionNickname(nickname.trim()); if (alive.current) await load(); }
    catch (reason) {
      if (alive.current) setError(String(reason).toLowerCase().includes('already taken') ? (tr ? 'Bu takma ad kullanılıyor. Başka bir ad seç.' : 'This nickname is taken. Choose another.') : (tr ? 'Takma ad kaydedilemedi. 2–24 karakter kullan.' : 'Could not save nickname. Use 2–24 characters.'));
    } finally { if (alive.current) setRegistering(false); }
  }
  async function submitPrediction(fixture: PredictionFixture) {
    const id = String(fixture.fixtureId), value = draft[id];
    if (!round || locked || saveLock.current || !data?.nickname || !validScore(value?.home) || !validScore(value?.away)) return;
    let succeeded = false;
    Keyboard.dismiss();
    saveLock.current = true; request.current++; setSavingPrediction(fixture.fixtureId); setPredictionErrors(current => ({ ...current, [id]: '' }));
    try {
      const result = await savePredictionEntry(round.id, { [id]: { home: Number(value.home), away: Number(value.away) } }, true);
      if (!alive.current) return;
      succeeded = true;
      dirtyIds.current.delete(id);
      setData(current => current ? { ...current, entry: result } : current);
      setDraft(current => ({ ...current, [id]: { home: String(result.picks[id].home), away: String(result.picks[id].away) } }));
      setSent(current => ({ ...current, [id]: Date.now() + 2400 }));
    } catch (reason) {
      if (alive.current) setPredictionErrors(current => ({ ...current, [id]: String(reason).includes('PREDICTIONS_CLOSED') ? (tr ? 'Tahmin süresi sona erdi. Kayıtlı tahminlerin korunuyor.' : 'Predictions are closed. Your saved scores are kept.') : (tr ? 'Tahmin kaydedilemedi. Lütfen yeniden dene.' : 'Could not save your prediction. Please retry.') }));
    } finally {
      saveLock.current = false;
      if (alive.current) { setSavingPrediction(null); if (succeeded) void load(); }
    }
  }
  function openPlans() { nav.navigate('ManagePlan'); }
  function matchActions(fixture: PredictionFixture) {
    return <MatchReportActions fixture={fixture} favorites={data?.favorites ?? []} tr={tr} onOpenPlans={openPlans} strictPhase topSpacing={width < 380 ? 8 : 10} />;
  }
  function predictionForm(fixture: PredictionFixture) {
    const id = String(fixture.fixtureId), saved = entry?.picks[id];
    const value = locked && saved ? { home: String(saved.home), away: String(saved.away) } : draft[id] ?? { home: '', away: '' };
    const isSaving = savingPrediction === fixture.fixtureId;
    const disabled = locked || savingPrediction !== null || !data?.nickname || !validScore(value.home) || !validScore(value.away);
    if (fixture.predictionStatus === 'excluded') return <View style={s.prediction}><Text style={s.caption}>{tr ? 'Bu maç haftanın puanlamasından çıkarıldı.' : 'This match is excluded from this week’s scoring.'}</Text></View>;
    return <View style={s.prediction}>
      <View style={s.row}>
        <Goal size={18} color={ACCENT} />
        <Text style={[s.predictionLabel, { flex: 1 }]}>{saved ? (tr ? 'Güncel Tahminin' : 'Your Current Prediction') : (tr ? 'Skor Tahminin' : 'Your Score Prediction')}</Text>
      </View>
      {(saved || !locked) && <>
        <View style={s.scoreEditor}>
          <View style={s.scoreSide}><TextInput accessibilityLabel={`${fixture.homeTeam.name} ${tr ? 'gol tahmini' : 'predicted goals'}`} keyboardType='number-pad' inputMode='numeric' returnKeyType='done' onSubmitEditing={Keyboard.dismiss} inputAccessoryViewID={Platform.OS === 'ios' ? 'prediction-score-keyboard' : undefined} maxLength={2} editable={!locked && !isSaving} placeholder='–' placeholderTextColor={MUTED} value={value.home} onChangeText={v => edit(id, 'home', v)} style={s.scoreInput} selectTextOnFocus /></View>
          <Text style={s.editorDash}>–</Text>
          <View style={s.scoreSide}><TextInput accessibilityLabel={`${fixture.awayTeam.name} ${tr ? 'gol tahmini' : 'predicted goals'}`} keyboardType='number-pad' inputMode='numeric' returnKeyType='done' onSubmitEditing={Keyboard.dismiss} inputAccessoryViewID={Platform.OS === 'ios' ? 'prediction-score-keyboard' : undefined} maxLength={2} editable={!locked && !isSaving} placeholder='–' placeholderTextColor={MUTED} value={value.away} onChangeText={v => edit(id, 'away', v)} style={s.scoreInput} selectTextOnFocus /></View>
        </View>
        {!locked && <Pressable accessibilityRole='button' disabled={disabled} onPress={() => void submitPrediction(fixture)} style={[s.primary, s.submitButton, disabled && s.disabled]}>
          {isSaving ? <ActivityIndicator color={ACCENT} /> : sent[id] ? <Check size={17} color={ACCENT} /> : <Send size={17} color={ACCENT} />}
          <Text accessibilityLiveRegion='polite' style={s.actionText}>{sent[id] ? (tr ? 'Gönderildi' : 'Submitted') : (tr ? 'Tahmin Gönder' : 'Submit Prediction')}</Text>
        </Pressable>}
        {!!predictionErrors[id] && <Text style={s.error}>{predictionErrors[id]}</Text>}
        {!data?.nickname && <Text style={s.caption}>{tr ? 'Tahmin göndermek için önce takma adını belirle.' : 'Choose your nickname before submitting a prediction.'}</Text>}
      </>}
      {!saved && locked && <Text style={s.caption}>{tr ? 'Bu maç için kayıtlı tahminin yok.' : 'You have no saved prediction for this match.'}</Text>}
      {fixture.predictionStatus === 'finished' && <View style={s.matchPointsRow}><View style={{ flex: 1, gap: 4 }}><Text style={s.predictionLabel}>{tr ? 'Bu Maçtan Kazandığın Puan' : 'Points Earned From This Match'}</Text>{!saved && <Text style={s.caption}>{tr ? 'Bu maça tahmin göndermedin.' : 'You did not submit a prediction for this match.'}</Text>}</View><Text style={[s.matchPoints, { color: ACCENT }]}>{saved && entry?.matchPoints[id] === undefined ? '…' : entry?.matchPoints[id] ?? 0}</Text></View>}
    </View>;
  }
  const ruleLines = tr ? [
    "Çekim salı günü yapılır; cuma–pazartesi maçları seçilir. Toplam 10 maç yoksa yarışma açılmaz.",
    "Tam skor 5 puan kazandırır. Tam skor tutmazsa doğru sonuç 2, doğru gol farkı 1 ve doğru tahmin edilen her takımın gol sayısı 1 puan kazandırır. Gol farkının yönü de doğru olmalı.",
    "Maç 3–1 biterse tahmin örnekleri:\n• 3–1 → 5 puan: tam skor.\n• 2–0 → 3 puan: doğru sonuç (2) + doğru gol farkı (1).\n• 3–0 → 3 puan: doğru sonuç (2) + ev sahibi golü (1).\n• 2–1 → 3 puan: doğru sonuç (2) + deplasman golü (1).\n• 1–0 → 2 puan: yalnızca doğru sonuç.\n• 3–3 → 1 puan: yalnızca ev sahibi golü.\n• 0–1 → 1 puan: yalnızca deplasman golü.\n• 0–2 → 0 puan: hiçbir koşul tutmadı.",
    "Plus haftaya +2, Pro +4 sabit puanla başlar. Bu puanlar maç puanlarına eklenir.",
    "İstediğin maçlara ayrı ayrı tahmin gönderebilir, ilk maçın başlama saatine kadar düzenleyip yeniden gönderebilirsin. Son gönderdiğin skor geçerlidir.",
    "Ertelenen, iptal edilen, oynanmayan veya yarıda kalan maçlar puanlamadan çıkarılır. Yerlerine yeni maç eklenmez.",
    "Toplam puan eşitse önce Pro, sonra Plus öne geçer. Aynı üyelikte son tahmin gönderimini daha erken yapan kazanır.",
  ] : [
    "The draw opens on Tuesday for Friday–Monday matches. A competition opens only when 10 matches are available.",
    "An exact score earns 5 points. Otherwise, the correct result earns 2, the correct goal difference earns 1, and each correctly predicted team goal total earns 1 point. The goal difference must have the correct direction.",
    "If the match ends 3–1, example predictions are:\n• 3–1 → 5 points: exact score.\n• 2–0 → 3 points: correct result (2) + goal difference (1).\n• 3–0 → 3 points: correct result (2) + home team goals (1).\n• 2–1 → 3 points: correct result (2) + away team goals (1).\n• 1–0 → 2 points: correct result only.\n• 3–3 → 1 point: home team goals only.\n• 0–1 → 1 point: away team goals only.\n• 0–2 → 0 points: no scoring condition matched.",
    "Plus starts each week with +2 fixed points and Pro with +4. These are added to match points.",
    "Submit predictions for any matches individually. Edit and resubmit until the earliest kickoff. Your latest submitted score counts.",
    "Postponed, cancelled, unplayed or abandoned matches are excluded from scoring and are not replaced.",
    "At equal total points, Pro ranks first, followed by Plus. Within the same tier, the earlier last prediction submission wins.",
  ];

  return <>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView ref={scroll} style={s.page} contentContainerStyle={s.pageContent} keyboardShouldPersistTaps='handled' keyboardDismissMode='on-drag'>
      <View style={s.content}>
        <TutorialPageGuide page='scorePrediction' frame={0} onShow={y => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <View style={s.hero}>
          <View style={FRAME_STRIPE} />
          <View style={[s.row, { alignItems: 'flex-start' }]}>
            <View style={s.heroIcon}><Goal size={25} color={FEATURE_COLORS.scorePrediction} strokeWidth={1.8} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><Text style={s.eyebrow}>{tr ? 'HAFTALIK SKOR YARIŞI' : 'WEEKLY SCORE CHALLENGE'}</Text><Text style={s.heroTitle}>{t('scorePredictionTitle')}</Text></View>
            <Pressable accessibilityRole='button' accessibilityLabel={tr ? 'Kuralları aç' : 'Open rules'} onPress={() => setRules(true)} style={s.iconButton}><Info size={20} color={MUTED} /></Pressable>
          </View>
          <Text style={s.heroDescription}>{tr ? 'Skoru sen yaz. Haftanın zirvesine oyna.' : 'Make your score count. Compete for the top spot.'}</Text>
          <View style={s.identityRow}>
            <View style={[s.row, { maxWidth: '100%', minWidth: 0 }]}><View style={[s.identityChip, { flexShrink: 1 }]}><UserRound size={15} color={ACCENT} /><Text style={s.identityText}>{data?.nickname || (tr ? 'Takma adını belirle' : 'Choose your nickname')}</Text></View><View style={[s.identityChip, { borderColor: tierLabelColor(viewerTier) }]}><Text style={[s.identityText, { color: tierLabelColor(viewerTier) }]}>{viewerTier.toUpperCase()}</Text></View></View>
            {round && <View style={s.identityChip}><CalendarDays size={15} color={MUTED} /><Text style={s.caption}>{weekLabel(round.weekStart, tr)} {tr ? 'Haftası' : 'Week'}</Text></View>}
          </View>
          <PredictionHonorsBadge wins={data?.championships ?? 0} secondPlaces={data?.secondPlaces ?? 0} thirdPlaces={data?.thirdPlaces ?? 0} />
          {round?.deadline && <View style={s.clockPanel}>
            <View style={s.row}><Clock3 size={16} color={ACCENT} /><Text style={s.clockHeading}>{remaining > 0 ? (tr ? 'TAHMİN İÇİN KALAN SÜRE' : 'TIME LEFT TO PREDICT') : (tr ? 'TAHMİNLER KAPANDI' : 'PREDICTIONS CLOSED')}</Text></View>
            {remaining > 0 && <View style={s.clockGrid}>{clockParts.map(part => <View key={part.label} style={s.clockCell}><Text style={[s.clockValue, { fontSize: width < 360 ? 23 : 28 }]} maxFontSizeMultiplier={1.4}>{String(part.value).padStart(2, '0')}</Text><Text style={s.clockLabel}>{part.label}</Text></View>)}</View>}
            <View style={[s.row, { flexWrap: 'wrap' }]}><Text style={s.caption}>{tr ? 'Son Tarih · Yerel Saat' : 'Deadline · Local Time'}</Text><Text style={s.deadline}>{predictionDateTime(round.deadline, tr)}</Text></View>
          </View>}
          <View style={s.heroStats}>
            <View style={s.heroStat}><Text style={s.statValue}>{savedCount}<Text style={s.statDenominator}>/{eligible.length}</Text></Text><Text style={s.caption}>{tr ? 'Tahminlerin' : 'Predictions'}</Text></View>
            <View style={[s.heroStat, s.statDivider]}><Text style={[s.statValue, { color: tierColor(viewerTier) }]}>{number(entry?.totalPoints ?? startingPoints)}</Text><Text style={s.caption}>{tr ? 'Puanın' : 'Your Points'}</Text></View>
            <View style={s.heroStat}><Text style={s.statValue}>{mine ? `#${mine.rank}` : '—'}</Text><Text style={s.caption}>{tr ? 'Sıralaman' : 'Your Rank'}</Text></View>
          </View>
          {!!eligible.length && <View style={s.progressTrack}><View style={[s.progressFill, { width: `${savedCount / eligible.length * 100}%` }]} /></View>}
          <Pressable accessibilityRole='button' onPress={() => { setRankingTab('weekly'); setAllTimeSort('total'); setRanking(true); void load(); }} style={[s.rankingButton, { minHeight: 48 }]}><ListOrdered size={19} color={ACCENT} /><Text style={[s.actionText, s.heroActionText]} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={.85} maxFontSizeMultiplier={1.3}>{tr ? 'Sıralamaları Gör' : 'View Rankings'}</Text><ChevronRight size={18} color={ACCENT} /></Pressable>
          {!!data?.weeks.length && data.weeks.length > 1 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 14 }}>{data.weeks.map(value => <Pressable key={value} accessibilityRole='button' accessibilityState={{ selected: round?.weekStart === value }} disabled={savingPrediction !== null} onPress={() => { if (value === round?.weekStart) return; setLoading(true); setWeek(value); }} style={[s.weekChip, round?.weekStart === value && { borderColor: ACCENT }]}><Text style={[s.caption, round?.weekStart === value && { color: ACCENT }]}>{weekLabel(value, tr)}</Text></Pressable>)}</ScrollView>}
        </View>
        <TutorialPageGuide page='scorePrediction' frame={1} onShow={y => scroll.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        {loading && !data && <ActivityIndicator color={ACCENT} style={{ padding: 24 }} />}
        {!!error && <View style={s.notice}><Text style={s.error}>{error}</Text><Pressable onPress={() => void load()} accessibilityRole='button'><Text style={s.actionText}>{tr ? 'Yeniden Dene' : 'Retry'}</Text></Pressable></View>}
        {data && !data.nickname && <Frame title={tr ? 'Takma Adını Belirle' : 'Choose Your Nickname'} Icon={UserRound}>
          <Text style={s.description}>{tr ? 'Sıralamada seni bu adla tanıyalım.' : 'Make your name on the leaderboard.'}</Text>
          <Text style={s.caption}>{tr ? 'Bir kez seç; Günün Oyuncu Keşfi Sorusu ve Skor Tahmin Ligi’nde aynı adı kullan.' : 'Choose once. Use the same name in Daily Scout Challenge and Score Prediction League.'}</Text>
          <TextInput accessibilityLabel={tr ? 'Takma ad' : 'Nickname'} autoCapitalize='none' value={nickname} onChangeText={setNickname} maxLength={24} placeholder={tr ? 'Takma adın' : 'Your nickname'} placeholderTextColor={MUTED} style={s.nicknameInput} />
          <Pressable accessibilityRole='button' disabled={registering || nickname.trim().length < 2} onPress={() => void register()} style={[s.primary, (registering || nickname.trim().length < 2) && s.disabled]}>{registering ? <ActivityIndicator color={ACCENT} /> : <Check size={18} color={ACCENT} />}<Text style={s.actionText}>{tr ? 'Takma Adı Kaydet' : 'Save Nickname'}</Text></Pressable>
        </Frame>}
        <View style={[FRAME_HEADING, { marginTop: 4 }]}><CalendarDays size={21} color={ACCENT} /><Text style={[FRAME_TITLE, { flex: 1 }]}>{tr ? 'Haftanın Maçları' : 'This Week’s Matches'}</Text><Text style={s.matchCount}>{fixtures.length}</Text></View>
        {!fixtures.length && <View style={s.emptyCard}><Goal size={30} color={ACCENT} /><Text style={s.emptyText}>{round?.status === 'unavailable' ? (tr ? 'Bu hafta yeterli maç bulunamadığı için yarışma açılmadı. Yeni çekim salı günü hazırlanır.' : 'This week’s competition did not open because there were not enough eligible matches. The next draw is prepared on Tuesday.') : (tr ? 'Cuma–pazartesi fikstürü hazırlanıyor. Uygun 10 maç bulunduğunda yarışma açılır.' : 'The Friday–Monday fixture pool is being prepared. The competition opens when 10 eligible matches are available.')}</Text></View>}
        {fixtures.map((fixture, index) => <Frame key={fixture.fixtureId} title={tr ? 'Maç Kartı' : 'Match Card'} Icon={BadgeInfo} action={<Text style={s.matchIndex}>{String(index + 1).padStart(2, '0')}</Text>}>
          <View style={s.matchHeading}>
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}><Text style={s.league}>{fixture.country.name} · {fixture.league.name}</Text><Text style={s.caption}>{predictionDateTime(fixture.startingAt, tr)} · {matchStateLabel(fixture, tr)}</Text></View>
            <View style={s.stateBadge}><Text style={s.stateText}>{fixture.state.code || '—'}</Text></View>
          </View>
          <View style={s.teams}><Team team={fixture.homeTeam} /><View style={s.actualScore}><Text style={s.matchScore} numberOfLines={1} adjustsFontSizeToFit>{matchScore(fixture)}</Text><Text style={s.vs}>VS</Text></View><Team team={fixture.awayTeam} /></View>
          {predictionForm(fixture)}
          {matchActions(fixture)}
        </Frame>)}
        {!!entry?.submittedAt && <View style={s.savedFooter}><Check size={16} color={ACCENT} /><View style={{ flex: 1, gap: 4 }}><Text style={s.footerTitle}>{tr ? 'Tahminlerin Güvende' : 'Your Predictions Are Saved'}</Text><Text style={s.caption}>{locked ? (tr ? 'Kayıtlı skorlarınla haftanın sonuçlarını takip et.' : 'Follow this week’s results with your saved scores.') : (tr ? 'Son tarihe kadar düzenleyip yeniden gönderebilirsin.' : 'Edit and resubmit until the deadline.')}</Text></View></View>}
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
    {Platform.OS === 'ios' && <InputAccessoryView nativeID='prediction-score-keyboard'><View style={s.keyboardBar}><Pressable accessibilityRole='button' onPress={Keyboard.dismiss} style={s.keyboardDone}><Text style={s.actionText}>{tr ? 'Tamam' : 'Done'}</Text></Pressable></View></InputAccessoryView>}
    <Modal visible={ranking} transparent animationType='fade' onRequestClose={() => setRanking(false)}>
      <View style={s.backdrop}><View style={[s.modal, { height: Math.min(760, height * .86) }]} accessibilityViewIsModal>
        <View style={s.modalHeader}><View style={s.modalIcon}><ListOrdered size={21} color={ACCENT} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={s.modalTitle}>{rankingTab === 'weekly' ? (tr ? 'Haftalık Sıralama' : 'Weekly Rankings') : (tr ? 'Tüm Zamanlar' : 'All Time')}</Text><Text style={s.caption}>{rankingTab === 'allTime' ? (tr ? 'Genel Başarı Sıralaması' : 'Overall Achievement Rankings') : round ? weekLabel(round.weekStart, tr) + (tr ? ' Haftası' : ' Week') : '—'}</Text></View><Pressable accessibilityRole='button' accessibilityLabel={tr ? 'Kapat' : 'Close'} hitSlop={10} style={s.iconButton} onPress={() => setRanking(false)}><X size={20} color={MUTED} /></Pressable></View>
        <View style={s.rankingSwitch}>{(['weekly', 'allTime'] as const).map(tab => <Pressable key={tab} accessibilityRole='tab' accessibilityState={{ selected: rankingTab === tab }} onPress={() => setRankingTab(tab)} style={[s.rankingSwitchButton, rankingTab === tab && s.rankingSwitchSelected]}><Text style={[s.actionText, { color: rankingTab === tab ? ACCENT : MUTED }]}>{tab === 'weekly' ? (tr ? 'Haftalık' : 'Weekly') : (tr ? 'Tüm Zamanlar' : 'All Time')}</Text></Pressable>)}</View>
        <Text style={[s.caption, { paddingHorizontal: 18, paddingTop: 14 }]}>{rankingTab === 'allTime' ? (tr ? 'Birincilik 3, ikincilik 2, üçüncülük 1 puan.' : 'First place 3, second place 2, third place 1 point.') : round?.status === 'settled' ? (tr ? 'Haftanın sıralaması kesinleşti.' : 'This week’s rankings are final.') : (tr ? 'Tamamlanan maçlarla puanlar güncellenir.' : 'Points update as matches finish.')}</Text>
        {rankingTab === 'allTime' && <View style={[s.rankingSwitch, { marginTop: 12 }]}>{(['total', 'average'] as const).map(sort => <Pressable key={sort} accessibilityRole='tab' accessibilityState={{ selected: allTimeSort === sort }} onPress={() => setAllTimeSort(sort)} style={[s.rankingSwitchButton, allTimeSort === sort && s.rankingSwitchSelected]}><Text style={[s.actionText, { color: allTimeSort === sort ? ACCENT : MUTED }]}>{sort === 'total' ? (tr ? 'Toplam Puan' : 'Total Points') : (tr ? 'Haftalık Ortalama' : 'Weekly Average')}</Text></Pressable>)}</View>}
        <ScrollView style={{ flex: 1, minHeight: 0 }} contentContainerStyle={s.rankContent}>
          {rankingTab === 'allTime' ? (
            allTimeLoading ? <ActivityIndicator color={ACCENT} style={{ padding: 24 }} /> : allTimeError ? <View style={s.emptyRank}><Text style={s.error}>{tr ? 'Sıralama yüklenemedi.' : 'Could not load rankings.'}</Text><Pressable accessibilityRole='button' style={s.primary} onPress={() => setAllTimeRetry(value => value + 1)}><Text style={s.actionText}>{tr ? 'Yeniden Dene' : 'Retry'}</Text></Pressable></View> : !allTimeLeaderboard.length ? <View style={s.emptyRank}><Trophy size={34} color={MUTED} /><Text style={s.emptyText}>{tr ? 'Kesinleşmiş derece henüz yok.' : 'No finalized podium finishes yet.'}</Text></View> : allTimeLeaderboard.map(row => <View key={row.rank} style={[s.rankRow, row.isYou && s.ownRank]}>
              <View style={s.rankNumber}>{row.rank <= 3 && <Trophy size={18} color={row.rank === 1 ? themeColor('#CDB57A', 'text') : row.rank === 2 ? themeColor('#B5C0CD', 'text') : themeColor('#C09578', 'text')} />}<Text style={s.rank}>{row.rank}</Text></View>
              <View style={{ flex: 1, minWidth: 0, gap: 8 }}><Text style={s.rankName}>{row.nickname}{row.isYou ? (tr ? ' · Sen' : ' · You') : ''}</Text><View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>{[
                { count: row.championships, label: tr ? 'Birincilik' : 'First Place', color: themeColor('#CDB57A', 'text') },
                { count: row.secondPlaces, label: tr ? 'İkincilik' : 'Second Place', color: themeColor('#B5C0CD', 'text') },
                { count: row.thirdPlaces, label: tr ? 'Üçüncülük' : 'Third Place', color: themeColor('#C09578', 'text') },
              ].map(award => <View key={award.label} style={s.placementCount} accessibilityLabel={`${award.label}: ${award.count}`}><Trophy size={12} color={award.color} /><Text style={[s.caption, { color: award.color }]}>{award.count}</Text></View>)}</View></View>
              <View style={{ alignItems: 'flex-end', gap: 3, maxWidth: '45%', flexShrink: 1 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'baseline', gap: 6 }}><Text style={s.caption}>{row.weeksParticipated} {tr ? 'Hafta' : 'Weeks'}</Text><Text style={[s.rankPoints, { color: TEXT }]} numberOfLines={1}>{allTimeSort === 'average' ? averageNumber(row.averagePoints, tr) : number(row.totalPoints)}</Text></View><Text style={s.caption}>{allTimeSort === 'average' ? (tr ? 'puan/hafta' : 'pts/week') : (tr ? 'puan' : 'pts')}</Text></View>
            </View>)
          ) : !data?.leaderboard.length ? <View style={s.emptyRank}><Trophy size={34} color={MUTED} /><Text style={s.emptyText}>{tr ? 'Henüz gönderilmiş tahmin yok.' : 'No predictions have been submitted yet.'}</Text></View> : data.leaderboard.map(row => <View key={row.rank} style={[s.rankRow, row.isYou && s.ownRank, row.tier !== 'free' && { borderColor: tierColor(row.tier), backgroundColor: themeColor(row.tier === 'pro' ? 'rgba(22,163,74,.08)' : 'rgba(56,189,248,.08)', 'surface') }]}>
            <View style={s.rankNumber}>{row.rank <= 3 ? <Trophy size={18} color={row.rank === 1 ? themeColor('#FBBF24', 'text') : row.rank === 2 ? themeColor('#CBD5E1', 'text') : themeColor('#D6A779', 'text')} /> : null}<Text style={s.rank}>{row.rank}</Text></View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}><Text style={s.rankName}>{row.nickname}{row.isYou ? (tr ? ' · Sen' : ' · You') : ''}</Text><Text style={[s.caption, { color: tierLabelColor(row.tier) }]}>{row.tier.toUpperCase()}</Text></View>
            <View style={{ alignItems: 'flex-end', gap: 3, maxWidth: '48%', flexShrink: 1 }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'baseline', columnGap: 6, rowGap: 2 }}>
                {row.bonusPoints > 0 && <Text style={[s.caption, { color: tierColor(row.tier), fontSize: 11 }]}>{number(row.basePoints)} + {number(row.bonusPoints)}</Text>}
                <Text style={[s.rankPoints, { color: tierColor(row.tier) }]} numberOfLines={1}>{number(row.totalPoints)}</Text>
              </View>
              <Text style={s.caption}>{tr ? 'puan' : 'pts'}</Text>
            </View>
          </View>)}
        </ScrollView>
        <View style={s.modalFooter}>{rankingTab === 'weekly' && !!entry?.submittedAt && <View style={s.scoreSummary}>{[{ label: tr ? 'Maç Puanı' : 'Match Points', value: entry.basePoints }, { label: tr ? 'Üyelik Puanı' : 'Membership Points', value: entry.bonusPoints }, { label: tr ? 'Toplam' : 'Total', value: entry.totalPoints }].map(item => <View key={item.label} style={s.summaryCell}><Text style={s.caption}>{item.label}</Text><Text style={[s.summaryValue, { color: ACCENT }]}>{number(item.value)}</Text></View>)}</View>}<Pressable accessibilityRole='button' style={s.primary} onPress={() => setRanking(false)}><Text style={s.actionText}>{tr ? 'Tamam' : 'OK'}</Text></Pressable></View>
      </View></View>
    </Modal>
    <LeagueRulesModal visible={rules} onClose={() => setRules(false)} lines={ruleLines}/>
  </>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, BG, CARD, DANGER, FEATURE_COLORS, FRAME_HEADING, FRAME_STRIPE, FRAME_TITLE, LINE, MUTED, PANEL, TEXT, themeColor} = colors;

  const tierColor = (tier: string) => tier === 'pro' ? ACCENT : tier === 'plus' ? themeColor('#38BDF8') : TEXT;

  const tierLabelColor = (tier: string) => tier === 'free' ? themeColor('#94A3B8') : tierColor(tier);

  const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: BG }, pageContent: { padding: 16, paddingBottom: 40 }, content: { width: '100%', maxWidth: 720, alignSelf: 'center', gap: 18 },
  frame: { padding: 16, borderWidth: 1, borderColor: ACCENT, borderRadius: 22, backgroundColor: PANEL },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 }, caption: { color: MUTED, fontSize: 12, lineHeight: 18, flexShrink: 1 }, description: { color: TEXT, fontSize: 14, lineHeight: 22, marginBottom: 8 },
  hero: { backgroundColor: PANEL, borderRadius: 24, borderWidth: 1, borderColor: ACCENT, padding: 18 }, heroIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD, borderWidth: 1, borderColor: themeColor('rgba(126,148,135,.18)', 'border') },
  eyebrow: { color: themeColor('#95AA9C', 'text'), fontSize: 9, fontWeight: '800', letterSpacing: 1.3, marginBottom: 5 }, heroTitle: { color: TEXT, fontSize: 21, fontWeight: '900', lineHeight: 28, flexShrink: 1 }, heroDescription: { color: themeColor('#B6C4BB', 'text'), fontSize: 13, lineHeight: 21, marginTop: 14 },
  iconButton: { width: 34, height: 34, borderRadius: 11, backgroundColor: themeColor('rgba(255,255,255,.04)', 'surface'), alignItems: 'center', justifyContent: 'center' },
  identityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 16 }, identityChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: themeColor('rgba(126,148,135,.18)', 'border'), paddingHorizontal: 10, paddingVertical: 8, borderRadius: 11, maxWidth: '100%' }, identityText: { color: TEXT, fontSize: 12, fontWeight: '700', flexShrink: 1 },
  clockPanel: { padding: 14, borderRadius: 17, backgroundColor: BG, borderWidth: 1, borderColor: themeColor('rgba(126,148,135,.14)', 'border'), gap: 14 }, clockHeading: { color: themeColor('#A4B8AA', 'text'), fontSize: 10, fontWeight: '800', letterSpacing: .7, flexShrink: 1 },
  clockGrid: { flexDirection: 'row', gap: 6 }, clockCell: { flex: 1, minWidth: 0, borderRadius: 12, backgroundColor: CARD, paddingVertical: 12, alignItems: 'center', gap: 6 }, clockValue: { color: TEXT, fontWeight: '900', fontVariant: ['tabular-nums'] }, clockLabel: { color: themeColor('#8EA496', 'text'), fontSize: 10, fontWeight: '600' }, deadline: { color: themeColor('#C7D4CC', 'text'), fontSize: 12, fontWeight: '700', lineHeight: 18, flexShrink: 1 },
  keyboardBar: { backgroundColor: PANEL, borderTopWidth: 1, borderTopColor: LINE, alignItems: 'flex-end', paddingHorizontal: 12 }, keyboardDone: { minHeight: 44, minWidth: 72, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  matchPointsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, backgroundColor: CARD }, matchPoints: { color: ACCENT, fontSize: 24, fontWeight: '900' },
  heroStats: { flexDirection: 'row', marginVertical: 18 }, heroStat: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 }, statDivider: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: themeColor('rgba(126,148,135,.18)', 'border') }, statValue: { color: TEXT, fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] }, statDenominator: { color: MUTED, fontSize: 13, fontWeight: '600' },
  heroActionText: { flex: 1, minWidth: 0, textAlign: 'left', lineHeight: 18 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: themeColor('#303931', 'surface'), overflow: 'hidden', marginBottom: 18 }, progressFill: { height: '100%', backgroundColor: ACCENT }, rankingButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, borderRadius: 13, borderWidth: 1, borderColor: themeColor('rgba(22,163,74,.5)', 'border'), backgroundColor: themeColor('rgba(22,163,74,.07)', 'surface') },
  notice: { padding: 14, borderWidth: 1, borderColor: LINE, borderRadius: 14, backgroundColor: CARD, gap: 8 }, error: { color: DANGER, fontSize: 13, lineHeight: 20 },
  nicknameInput: { marginVertical: 14, minHeight: 48, borderWidth: 1, borderColor: LINE, borderRadius: 12, padding: 12, color: TEXT, backgroundColor: CARD }, weekChip: { borderRadius: 11, borderWidth: 1, borderColor: LINE, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: CARD },
  primary: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: ACCENT, padding: 12 }, actionText: { color: ACCENT, fontSize: 13, fontWeight: '800', textAlign: 'center', flexShrink: 1 }, disabled: { opacity: .4 },
  matchCount: { color: themeColor('#A4B8AA', 'text'), fontSize: 13, fontWeight: '800' }, matchIndex: { color: themeColor('#7E9487', 'text'), fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] }, matchHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 }, league: { color: ACCENT, fontSize: 13, lineHeight: 20, fontWeight: '800' }, stateBadge: { paddingVertical: 6, paddingHorizontal: 9, backgroundColor: themeColor('rgba(22,163,74,.1)', 'surface'), borderRadius: 9 }, stateText: { color: ACCENT, fontSize: 10, fontWeight: '800' },
  teams: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 22 }, team: { flex: 1, minWidth: 0, alignItems: 'center', gap: 10 }, teamLogo: { width: 60, height: 60 }, teamName: { color: TEXT, fontSize: 14, lineHeight: 21, fontWeight: '800', textAlign: 'center', flexShrink: 1 }, actualScore: { width: 56, alignItems: 'center', gap: 5, flexShrink: 0 }, matchScore: { color: TEXT, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] }, vs: { color: MUTED, fontSize: 11, fontWeight: '700' },
  prediction: { marginTop: 20, borderTopWidth: 1, borderTopColor: themeColor('rgba(126,148,135,.18)', 'border'), paddingTop: 18, gap: 12 }, predictionLabel: { color: themeColor('#C5D2C9', 'text'), fontSize: 13, fontWeight: '800' },
  scoreEditor: { flexDirection: 'row', alignItems: 'center', gap: 10 }, scoreSide: { flex: 1, minWidth: 0, gap: 8, alignItems: 'center' }, scoreInput: { width: '100%', maxWidth: 112, minHeight: 58, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: themeColor('rgba(22,163,74,.55)', 'border'), borderRadius: 13, color: TEXT, fontSize: 26, fontWeight: '800', textAlign: 'center', backgroundColor: BG }, editorDash: { width: 56, textAlign: 'center', color: MUTED, fontSize: 22 }, submitButton: { backgroundColor: themeColor('rgba(22,163,74,.12)', 'surface') },
  emptyCard: { padding: 28, alignItems: 'center', gap: 14, borderWidth: 1, borderColor: LINE, borderRadius: 20, backgroundColor: PANEL }, emptyText: { color: MUTED, fontSize: 13, lineHeight: 20, textAlign: 'center' }, savedFooter: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 15, padding: 16, backgroundColor: PANEL }, footerTitle: { color: themeColor('#C7D4CC', 'text'), fontSize: 12, fontWeight: '800' },
  backdrop: { flex: 1, backgroundColor: themeColor('rgba(0,0,0,.78)', 'surface'), padding: 18, justifyContent: 'center' }, modal: { width: '100%', maxWidth: 560, maxHeight: '90%', alignSelf: 'center', borderRadius: 24, borderWidth: 1, borderColor: themeColor('rgba(22,163,74,.6)', 'border'), backgroundColor: PANEL, overflow: 'hidden' }, modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderBottomWidth: 1, borderBottomColor: themeColor('rgba(126,148,135,.15)', 'border') }, modalIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: themeColor('rgba(22,163,74,.12)', 'surface'), alignItems: 'center', justifyContent: 'center' }, modalTitle: { color: TEXT, fontSize: 18, fontWeight: '800', lineHeight: 25 }, modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: themeColor('rgba(126,148,135,.15)', 'border'), gap: 16 },
  rankingSwitch: { flexDirection: 'row', gap: 4, padding: 4, marginHorizontal: 18, marginTop: 16, borderRadius: 13, backgroundColor: BG, borderWidth: 1, borderColor: LINE },
  rankingSwitchButton: { flex: 1, minWidth: 0, minHeight: 42, justifyContent: 'center', alignItems: 'center', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  rankingSwitchSelected: { borderColor: ACCENT, backgroundColor: themeColor('rgba(22,163,74,.1)', 'surface') },
  placementCount: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 6, borderRadius: 7, backgroundColor: themeColor('rgba(255,255,255,.03)', 'surface') },
  rankContent: { padding: 14, gap: 8 }, rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: LINE, borderRadius: 14, padding: 12, backgroundColor: CARD }, ownRank: { borderColor: ACCENT, backgroundColor: themeColor('rgba(22,163,74,.1)', 'surface') }, rankNumber: { minWidth: 28, alignItems: 'center', gap: 4 }, rank: { color: MUTED, fontSize: 12, fontWeight: '800' }, rankName: { color: TEXT, fontSize: 13, fontWeight: '700' }, rankPoints: { color: ACCENT, fontSize: 21, fontWeight: '900', fontVariant: ['tabular-nums'] }, emptyRank: { alignItems: 'center', paddingVertical: 30, gap: 16 }, scoreSummary: { flexDirection: 'row', gap: 8 }, summaryCell: { flex: 1, minWidth: 0, gap: 5, alignItems: 'center' }, summaryValue: { color: TEXT, fontSize: 18, fontWeight: '900' },
});
  return {ACCENT, BG, CARD, DANGER, FEATURE_COLORS, FRAME_HEADING, FRAME_STRIPE, FRAME_TITLE, LINE, MUTED, PANEL, TEXT, tierColor, tierLabelColor, s, themeColor};
});
