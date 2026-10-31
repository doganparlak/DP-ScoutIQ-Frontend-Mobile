import React, {useEffect, useState} from 'react';
import {Image, Pressable, Text, View} from 'react-native';
import {Check, ChevronDown, RefreshCw} from 'lucide-react-native';
import {createThemedStyles, useThemedStyles, type ThemeColors} from '@/theme';
import {getMatchForecast, type MatchForecastPlus, type MatchForecastPreview, type MatchForecastResponse, type PostMatchCardData} from '@/services/matchPool';
import ActionSpinner from './ActionSpinner';
import ForecastLockedPreview from './ForecastLockedPreview';
import {forecastActuals} from '@/utils/forecastReview';

const percent = (value: number, tr: boolean) => {
  const text = (value * 100).toLocaleString(tr ? 'tr-TR' : 'en-GB', {maximumFractionDigits: 1});
  return tr ? `%${text}` : `${text}%`;
};
const decimal = (value: number, tr: boolean) => value.toLocaleString(tr ? 'tr-TR' : 'en-GB', {maximumFractionDigits: 2});

const sections = [
  {key: 'outcomes', tr: 'Maç Sonucu', en: 'Match Outcome'},
  {key: 'scores', tr: 'Skor Olasılıkları', en: 'Score Probabilities'},
  {key: 'goals', tr: 'Gol Dağılımı', en: 'Goal Distribution'},
  {key: 'scenarios', tr: 'Gol Senaryoları', en: 'Goal Scenarios'},
] as const;
type Section = typeof sections[number]['key'];

function hasForecastDetails(forecast: MatchForecastPreview): forecast is MatchForecastPlus {
  return 'goalDistribution' in forecast;
}

function hasScoreDetails(forecast: MatchForecastPreview) {
  return Array.isArray(forecast.grid) && typeof forecast.gridRemainder === 'number';
}

function totalGoalRanges(home: number[], away: number[]) {
  // Convolve exact low-goal probabilities; the complement includes every high score.
  const totals = [0, 1, 2, 3].map(total => Array.from({length: total + 1}, (_, goals) =>
    (home[goals] || 0) * (away[total - goals] || 0)).reduce((sum, probability) => sum + probability, 0));
  const low = totals[0] + totals[1];
  const middle = totals[2] + totals[3];
  return [low, middle, Math.max(0, 1 - low - middle)];
}

export default function PreMatchForecast({fixtureId, tr, active, free, onOpenPlans, review, providedForecast}: {fixtureId: number; tr: boolean; active: boolean; free: boolean; onOpenPlans: () => void; review?: PostMatchCardData; providedForecast?: MatchForecastResponse}) {
  const {s, ACCENT, BLUE, ACTUAL, TEXT, MUTED, LINE} = useThemedStyles(getTheme);
  const [response, setResponse] = useState<MatchForecastResponse | null>(providedForecast ?? null);
  const [networkError, setNetworkError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [section, setSection] = useState<Section>('outcomes');
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {setSection('outcomes'); setPickerOpen(false);}, [fixtureId]);
  useEffect(() => {
    if (providedForecast) {setResponse(providedForecast); setNetworkError(false); return;}
    if (!active) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const started = Date.now();
    setNetworkError(false);
    const poll = async (retry = false) => {
      try {
        const next = await getMatchForecast(fixtureId, retry, !!review);
        if (!alive) return;
        setResponse(next); failures = 0;
        if (next.status === 'processing') {
          if (Date.now() - started < 180000) timer = setTimeout(() => void poll(), 2500);
          else setNetworkError(true);
        }
      } catch {
        if (!alive) return;
        if (++failures < 3) timer = setTimeout(() => void poll(), 3000);
        else setNetworkError(true);
      }
    };
    void poll(attempt > 0);
    return () => {alive = false; clearTimeout(timer);};
  }, [fixtureId, active, attempt, !!review, providedForecast]);

  const f = response?.status === 'ready' && response.forecast?.fixtureId === fixtureId ? response.forecast : undefined;
  if (!f || networkError) return <View style={s.frame}>
    <View style={s.rule}/>
    {networkError || response?.status === 'failed' || response?.status === 'unavailable' ? <>
      <Text style={s.body}>{response?.status === 'unavailable'
        ? (response.reason === 'match_not_completed' ? (tr ? 'Öngörü değerlendirmesi maç tamamlandıktan sonra açılır.' : 'The forecast review is available after the match finishes.') : response.reason === 'pre_match_forecast_unavailable' ? (tr ? 'Bu maç için maç öncesinde kaydedilmiş bir öngörü bulunmuyor.' : 'No pre-match forecast was saved for this fixture.') : response.reason === 'season_mismatch' ? (tr ? 'Bu maçın sezonu için eğitilmiş bir model henüz bulunmuyor.' : 'No trained model is available for this fixture’s season yet.') : response.reason === 'model_unavailable' ? (tr ? 'Bu maçın başlangıcından önce eğitilmiş bir model henüz bulunmuyor.' : 'No model trained before this match’s kickoff is available yet.') : response.reason === 'unsupported_competition' ? (tr ? 'Maç öngörüsü şu an ulusal lig maçları için kullanılabilir.' : 'Match forecasts are currently available for domestic league fixtures.') : (tr ? 'Bu maç için yeterli geçmiş lig verisi bulunmuyor.' : 'There is not enough historical league data for this match.'))
        : (tr ? 'Maç öngörüsü şu anda yüklenemedi.' : 'The match forecast could not be loaded.')}</Text>
      <Pressable accessibilityRole="button" onPress={() => {setResponse(null); setAttempt(v => v + 1);}} style={s.retry}><RefreshCw size={16} color={ACCENT}/><Text style={s.retryText}>{tr ? 'Tekrar Dene' : 'Try Again'}</Text></Pressable>
    </> : <View style={s.loading}><ActionSpinner size={30} color={ACCENT}/><Text style={s.body}>{tr ? 'Takım istatistikleri değerlendiriliyor…' : 'Assessing team statistics…'}</Text></View>}
  </View>;
  const actual = review?.fixture.id === fixtureId ? forecastActuals(review, f.home.id, f.away.id) : null;
  const actualLabel = (label: string) => <View style={s.actualBadge}><Text style={s.actualBadgeText}>{label}</Text></View>;
  const marker = (value?: boolean | null) => actualLabel(value == null ? (tr ? 'Gerçekleşen' : 'Actual') : `${tr ? 'Gerçekleşen' : 'Actual'}: ${value ? (tr ? 'Evet' : 'Yes') : (tr ? 'Hayır' : 'No')}`);
  const locked = !review && (free || response?.accessTier === 'free');
  const details = !locked && hasForecastDetails(f) ? f : undefined;
  const scoreDetails = hasScoreDetails(f) ? f : undefined;
  const sides = [{key: 'home', label: f.home.name, value: f.outcomes.home, color: ACCENT}, {key: 'draw', label: tr ? 'Beraberlik' : 'Draw', value: f.outcomes.draw, color: MUTED}, {key: 'away', label: f.away.name, value: f.outcomes.away, color: BLUE}];
  const peak = Math.max(...(scoreDetails?.grid.map(c => c.probability) || []), .01);
  const selected = sections.find(option => option.key === section)!;
  const half = details?.halfScenarios;
  const halfOptions = half ? [
    {key: 'first', label: tr ? '1. Yarı' : '1st Half', value: half.moreGoalsHalf.first, color: ACCENT},
    {key: 'equal', label: tr ? 'Eşit' : 'Equal', value: half.moreGoalsHalf.equal, color: MUTED},
    {key: 'second', label: tr ? '2. Yarı' : '2nd Half', value: half.moreGoalsHalf.second, color: BLUE},
  ] : [];
  const ranges = (details ? totalGoalRanges(details.goalDistribution.home, details.goalDistribution.away) : []).map((value, i) => ({
    index: i, label: `${['0–1', '2–3', '4+'][i]} ${tr ? 'gol' : 'goals'}`, value, color: [MUTED, ACCENT, BLUE][i],
  }));
  return <View style={s.page}>
    <View style={s.controls}>
      <View style={s.rule}/>
      <Text style={s.controlLabel}>{tr ? 'Öngörü Bölümü' : 'Forecast Section'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={tr ? 'Öngörü bölümünü seç' : 'Select forecast section'} accessibilityState={{expanded: pickerOpen}} onPress={() => setPickerOpen(value => !value)} style={s.selector}>
        <Text style={s.selectorText}>{selected[tr ? 'tr' : 'en']}</Text><ChevronDown size={18} color={ACCENT} style={pickerOpen ? {transform: [{rotate: '180deg'}]} : undefined}/>
      </Pressable>
      {pickerOpen && <View style={s.options}>{sections.map(option => <Pressable key={option.key} accessibilityRole="button" accessibilityState={{selected: section === option.key}} onPress={() => {setSection(option.key); setPickerOpen(false);}} style={[s.choice, section === option.key && {backgroundColor: `${ACCENT}15`}]}>
        <Text style={[s.choiceText, section === option.key && {color: ACCENT}]}>{option[tr ? 'tr' : 'en']}</Text>{section === option.key && <Check size={16} color={ACCENT}/>}
      </Pressable>)}</View>}
      {section !== 'outcomes' && <View style={s.teams}>{[f.home, f.away].map((team, i) => <View key={team.id} style={s.team}>
        {!!team.imageUrl && <Image source={{uri: team.imageUrl}} accessibilityLabel={team.name} style={s.crest} resizeMode="contain"/>}
        <Text style={[s.teamName, {color: i ? BLUE : ACCENT}]}>{team.name}</Text>
      </View>)}</View>}
    </View>
    {(section === 'goals' || section === 'scenarios') && !details && <ForecastLockedPreview section={section} tr={tr} onOpenPlans={onOpenPlans}/>}
    {section === 'outcomes' && <>
    <View style={s.frame}>
      <View style={s.teams}>{[f.home, f.away].map((team, i) => <View key={team.id} style={s.team}>
        {!!team.imageUrl && <Image source={{uri: team.imageUrl}} style={s.crest} resizeMode="contain"/>}
        <Text style={s.teamName}>{team.name}</Text>
        <View style={s.teamGoalStats}>
          <View style={s.teamGoalStat}><Text style={s.caption}>{tr ? (review ? 'Öngörülen\ngol' : 'Öngörülen gol') : (review ? 'Projected\ngoals' : 'Projected goals')}</Text><Text style={[s.goals, !!review && s.reviewGoalValue, {color: i ? BLUE : ACCENT}]}>{decimal(team.projectedGoals, tr)}</Text></View>
          {!!review && <View style={[s.teamGoalStat, s.actualGoalStat]}><Text style={[s.caption, {color: ACTUAL}]}>{tr ? 'Gerçekleşen\ngol' : 'Actual\ngoals'}</Text><Text style={[s.goals, s.reviewGoalValue, {color: ACTUAL}]}>{actual?.[i ? 'away' : 'home'] ?? '—'}</Text></View>}
        </View>
      </View>)}</View>
      <Text style={s.label}>{tr ? 'Maç Sonucu Olasılıkları' : 'Match Outcome Probabilities'}</Text>
      <View style={s.outcomeBar}>{sides.map(side => <View key={side.key} style={{flex: side.value, backgroundColor: side.color}}/>)}</View>
      <View style={s.odds}>{sides.map(side => <View key={side.key} style={s.oddsCell}><Text style={[s.probability, {color: side.color}]}>{percent(side.value, tr)}</Text><Text style={s.caption}>{side.label}</Text>{actual?.outcome === side.key && marker()}</View>)}</View>
    </View>
    <Text style={s.disclaimer}>{tr ? 'Bu öngörüler kesin sonuç garantisi veya tavsiye niteliği taşımaz.' : 'These forecasts do not guarantee outcomes and do not constitute advice.'}</Text>
    </>}
    {section === 'scores' && scoreDetails && <>
    {(!review || (actual && f.topScores.some(score => score.home === actual.home && score.away === actual.away))) && <View style={s.frame}><Text style={s.title}>{tr ? 'En Olası Skorlar' : 'Most Likely Scores'}</Text><View style={s.topScores}>{f.topScores.map((score, i) => <View key={`${score.home}-${score.away}`} style={[s.scoreCard, i === 0 && {borderColor: ACCENT}, actual && score.home === actual.home && score.away === actual.away && {borderColor: ACTUAL, borderWidth: 2}]}><Text style={s.score}>{score.home}–{score.away}</Text><Text style={[s.probability, {color: i === 0 ? ACCENT : TEXT}]}>{percent(score.probability, tr)}</Text>{actual && score.home === actual.home && score.away === actual.away && marker()}</View>)}</View></View>}
    <View style={s.frame}>
      <Text style={s.title}>{tr ? 'Skor Olasılık Haritası' : 'Score Probability Map'}</Text>
      <Text style={s.caption}>{tr ? `Satır: ${f.home.name} · Sütun: ${f.away.name}` : `Rows: ${f.home.name} · Columns: ${f.away.name}`}</Text>
      <View style={s.gridRow}><View style={s.axis}/>{[0, 1, 2, 3, 4, 5].map(n => <Text key={n} style={s.axisLabel}>{n}</Text>)}</View>
      {[0, 1, 2, 3, 4, 5].map(home => <View key={home} style={s.gridRow}><Text style={s.axis}>{home}</Text>{[0, 1, 2, 3, 4, 5].map(away => {
        const cell = scoreDetails.grid.find(c => c.home === home && c.away === away);
        const p = cell?.probability || 0;
        return <View accessibilityLabel={`${home}–${away}: ${percent(p, tr)}${actual?.home === home && actual?.away === away ? (tr ? ', gerçekleşen skor' : ', actual score') : ''}`} key={away} style={[s.heatCell, {backgroundColor: `${ACCENT}${Math.round(20 + p / peak * 85).toString(16).padStart(2, '0')}`, borderColor: actual?.home === home && actual?.away === away ? ACTUAL : p === peak ? ACCENT : LINE, borderWidth: actual?.home === home && actual?.away === away ? 2.5 : 1}]}><Text style={s.heatText}>{percent(p, tr)}</Text></View>;
      })}</View>)}
      {actual && <Text style={[s.caption, {color: ACTUAL}]}>{tr ? `Gerçekleşen skor: ${actual.home}–${actual.away}${actual.home > 5 || actual.away > 5 ? ' · Diğer skorlar' : ''}` : `Actual score: ${actual.home}–${actual.away}${actual.home > 5 || actual.away > 5 ? ' · Other scores' : ''}`}</Text>}
      <Text style={s.footnote}>{tr ? 'Diğer skorlar' : 'Other scores'}: {percent(scoreDetails.gridRemainder, tr)}</Text>
    </View>
    </>}
    {section === 'goals' && details && <>
    <View style={s.frame}>
      <Text style={s.title}>{tr ? 'Toplam Gol Aralığı' : 'Total Goal Range'}</Text>
      <View style={s.outcomeBar}>{ranges.map(range => <View key={range.label} style={{flex: range.value, backgroundColor: range.color}}/>)}</View>
      <View style={s.odds}>{ranges.map(range => <View key={range.label} style={s.oddsCell}><Text style={[s.probability, {color: range.color}]}>{percent(range.value, tr)}</Text><Text style={s.caption}>{range.label}</Text>{actual?.range === range.index && actualLabel(tr ? `${actual.home + actual.away} gol atıldı` : `${actual.home + actual.away} goals scored`)}</View>)}</View>
      <View style={s.scenarioDivider}/>
      <View style={s.scenarioRow}><Text style={s.scenarioLabel}>{tr ? 'Toplam 3+ Gol' : '3+ Total Goals'}</Text><Text style={[s.scenarioValue, {color: ACCENT}]}>{percent(details.over25, tr)}</Text></View>{actual && actualLabel(tr ? (actual.over25 ? '3+ gol oldu' : '3 golün altında kaldı') : (actual.over25 ? '3+ goals scored' : 'Fewer than 3 goals scored'))}
      <View style={s.track}><View style={{height: 5, width: `${details.over25 * 100}%`, backgroundColor: ACCENT, borderRadius: 4}}/></View>
    </View>
    <View style={s.frame}>
      <Text style={s.title}>{tr ? 'Gol Dağılımı' : 'Goal Distribution'}</Text>
      {!!actual && <Text style={[s.caption, {color: ACTUAL}]}>{tr ? 'Altın çerçeveli sütunlar gerçekleşen golleri gösterir.' : 'Gold-outlined bars show the actual goals.'}</Text>}
      <View style={s.legend}>{(['home', 'away'] as const).map((side, index) => <View key={side} style={[s.goalLegendTeam, s.goalLegendCard, {borderColor: `${index ? BLUE : ACCENT}40`}]}>
        <View style={s.goalLegendHeader}>
          {!!f[side].imageUrl && <Image source={{uri: f[side].imageUrl}} accessibilityLabel={f[side].name} style={s.goalLegendCrest} resizeMode="contain"/>}
          <Text numberOfLines={2} style={[s.legendText, s.goalLegendName, {color: index ? BLUE : ACCENT}]}>{f[side].name}</Text>
        </View>
        {actual && <View style={s.goalLegendActual}><Text style={s.goalLegendLabel}>{tr ? 'Gerçekleşen gol' : 'Actual goals'}</Text><Text style={s.goalLegendValue}>{actual[side]}</Text></View>}
      </View>)}</View>
      <View style={s.histogram}>{[0, 1, 2, 3, 4, 5, 6].map(goal => <View key={goal} style={s.goalColumn}>
        <View style={s.goalBars}>{(['home', 'away'] as const).map((side, index) => {
          const value = details.goalDistribution[side][goal] || 0;
          const max = Math.max(...details.goalDistribution.home, ...details.goalDistribution.away, .01);
          return <View key={side} style={s.goalBarColumn} accessibilityLabel={`${f[side].name}: ${goal === 6 ? '6+' : goal}, ${percent(value, tr)}`}><Text style={s.goalBarLabel}>{Math.round(value * 100)}%</Text><View style={{height: Math.max(2, value / max * 75), width: '100%', borderTopLeftRadius: 3, borderTopRightRadius: 3, backgroundColor: index ? BLUE : ACCENT, borderWidth: actual && Math.min(actual[side], 6) === goal ? 2 : 0, borderColor: ACTUAL}}/></View>;
        })}</View><Text style={s.caption}>{goal === 6 ? '6+' : goal}</Text>
      </View>)}</View>
    </View>
    </>}
    {section === 'scenarios' && details && <>
      <View style={s.frame}>
        <Text style={s.title}>{tr ? 'Karşılıklı Gol' : 'Both Teams Score'}</Text>
        <View style={s.scenarioPair}>{[
          {key: 'match', label: tr ? 'Maç Geneli' : 'Full Match', value: details.bothTeamsScore, actual: actual?.bothTeamsScore},
          {key: 'first', label: tr ? 'İlk Yarı' : 'First Half', value: half?.firstHalfBothTeamsScore, actual: actual?.firstHalfBothTeamsScore},
        ].map(option => <View key={option.key} style={s.scenarioCard}>
          <Text style={s.scenarioLabel}>{option.label}</Text>{option.actual != null && marker(option.actual)}
          <Text style={[s.scenarioValue, {color: option.value == null ? MUTED : ACCENT}]}>{option.value == null ? '—' : percent(option.value, tr)}</Text>
          <View style={s.track}>{option.value != null && <View style={{height: 5, width: `${option.value * 100}%`, backgroundColor: ACCENT, borderRadius: 4}}/>}</View>
        </View>)}</View>
        {!half && <Text style={s.caption}>{tr ? 'İlk yarı için yeterli veri bulunmuyor.' : 'There is not enough first-half data.'}</Text>}
      </View>
      <View style={s.frame}>
        <Text style={s.title}>{tr ? 'Hangi Yarıda Daha Çok Gol Atılır?' : 'Which Half Will Have More Goals?'}</Text>
        {half ? <>
          <View style={s.outcomeBar}>{halfOptions.map(option => <View key={option.key} style={{flex: option.value, backgroundColor: option.color}}/>)}</View>
          <View style={s.halfOptions}>{halfOptions.map(option => <View key={option.key} style={[s.halfOption, option.value === Math.max(...halfOptions.map(item => item.value)) && {borderColor: `${option.color}90`, backgroundColor: `${option.color}12`}]}>
            <Text style={s.caption}>{option.label}</Text><Text style={[s.halfValue, {color: option.color}]}>{percent(option.value, tr)}</Text>{actual?.moreGoalsHalf === option.key && marker()}
          </View>)}</View>
        </> : <Text style={s.caption}>{tr ? 'Yarı öngörüleri için yeterli veri bulunmuyor.' : 'There is not enough data for half-time forecasts.'}</Text>}
      </View>
      <View style={s.frame}>
        <Text style={s.title}>{tr ? 'Kalesini Gole Kapatma' : 'Clean Sheet'}</Text>
        <View style={s.scenarioPair}>{[f.home, f.away].map((team, index) => {
          const color = index ? BLUE : ACCENT;
          const value = details.cleanSheet[index ? 'away' : 'home'];
          return <View key={team.id} style={s.scenarioCard}>
            {actual && marker(actual.cleanSheet[index ? 'away' : 'home'])}<View style={s.scenarioTeam}>{!!team.imageUrl && <Image source={{uri: team.imageUrl}} accessibilityLabel={team.name} style={s.scenarioCrest} resizeMode="contain"/>}<Text numberOfLines={2} style={[s.scenarioTeamName, {color}]}>{team.name}</Text></View>
            <Text style={[s.scenarioValue, {color, textAlign: 'center'}]}>{percent(value, tr)}</Text><View style={s.track}><View style={{height: 5, width: `${value * 100}%`, backgroundColor: color, borderRadius: 4}}/></View>
          </View>;
        })}</View>
      </View>
    </>}
  </View>;
}

const getTheme = createThemedStyles((c: ThemeColors) => {
  const {ACCENT, TEXT, MUTED, LINE, CARD, themeColor} = c;
  const BLUE = themeColor('#38BDF8', 'text');
  const ACTUAL = themeColor('#FBBF24', 'text');
  const s = {
    actualBadge: {alignSelf: 'center' as const, borderRadius: 7, paddingVertical: 3, paddingHorizontal: 6, backgroundColor: themeColor('rgba(251,191,36,.13)', 'surface')},
    actualBadgeText: {fontSize: 9, lineHeight: 14, color: ACTUAL, fontWeight: '800' as const, textAlign: 'center' as const},
    teamGoalStats: {width: '100%' as const, flexDirection: 'row' as const, gap: 8, marginTop: 'auto' as const}, teamGoalStat: {flex: 1, minWidth: 0, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 7},
    actualGoalStat: {borderLeftWidth: 1, borderLeftColor: LINE, paddingLeft: 8}, reviewGoalValue: {fontSize: 24},
    goalLegendTeam: {flex: 1, minWidth: 0, gap: 5},
    goalLegendCard: {borderWidth: 1, borderRadius: 12, padding: 10, gap: 10, justifyContent: 'space-between' as const},
    goalLegendHeader: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 7}, goalLegendCrest: {width: 23, height: 23},
    goalLegendName: {flex: 1, minWidth: 0, fontSize: 11, lineHeight: 16},
    goalLegendActual: {flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 7, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8},
    goalLegendLabel: {flex: 1, minWidth: 0, color: MUTED, fontSize: 10, lineHeight: 15}, goalLegendValue: {color: ACTUAL, fontSize: 23, fontWeight: '800' as const},
    page: {gap: 15}, frame: {padding: 15, borderRadius: 20, borderWidth: 1, borderColor: `${ACCENT}70`, backgroundColor: CARD, gap: 15},
    controls: {padding: 13, borderRadius: 18, borderWidth: 1, borderColor: `${ACCENT}70`, backgroundColor: CARD, gap: 12}, rule: {height: 3, backgroundColor: ACCENT, borderRadius: 3},
    title: {color: TEXT, fontSize: 17, fontWeight: '800' as const, flexShrink: 1},
    controlLabel: {color: MUTED, fontSize: 11, fontWeight: '700' as const}, selector: {borderWidth: 1, borderColor: ACCENT, borderRadius: 13, padding: 13, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8}, selectorText: {flex: 1, color: TEXT, fontSize: 14, fontWeight: '700' as const},
    options: {borderWidth: 1, borderColor: LINE, borderRadius: 12, overflow: 'hidden' as const}, choice: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, padding: 13}, choiceText: {flex: 1, fontSize: 13, color: TEXT, fontWeight: '600' as const},
    body: {fontSize: 13, lineHeight: 20, color: MUTED}, loading: {alignItems: 'center' as const, gap: 15, paddingVertical: 35},
    teams: {flexDirection: 'row' as const, alignItems: 'stretch' as const, gap: 12}, team: {flex: 1, alignItems: 'center' as const, gap: 7, paddingVertical: 7}, crest: {width: 48, height: 48},
    teamName: {fontSize: 15, color: TEXT, fontWeight: '800' as const, textAlign: 'center' as const}, goals: {fontSize: 30, fontWeight: '900' as const},
    caption: {fontSize: 11, lineHeight: 17, color: MUTED, textAlign: 'center' as const}, label: {fontSize: 13, color: TEXT, fontWeight: '700' as const},
    outcomeBar: {height: 12, borderRadius: 7, overflow: 'hidden' as const, flexDirection: 'row' as const, gap: 2}, odds: {flexDirection: 'row' as const, gap: 5}, oddsCell: {flex: 1, gap: 6, alignItems: 'center' as const}, probability: {fontSize: 19, fontWeight: '800' as const},
    footnote: {color: MUTED, fontSize: 10, lineHeight: 16, textAlign: 'center' as const}, topScores: {flexDirection: 'row' as const, gap: 8}, scoreCard: {flex: 1, gap: 9, alignItems: 'center' as const, paddingVertical: 14, borderRadius: 14, borderWidth: 1, borderColor: LINE}, score: {fontSize: 26, fontWeight: '900' as const, color: TEXT},
    disclaimer: {color: MUTED, fontSize: 11, lineHeight: 18, textAlign: 'center' as const, paddingHorizontal: 14, paddingVertical: 16},
    gridRow: {flexDirection: 'row' as const, gap: 3}, axis: {width: 14, color: MUTED, fontSize: 11, textAlign: 'center' as const, alignSelf: 'center' as const}, axisLabel: {flex: 1, color: MUTED, fontSize: 11, textAlign: 'center' as const},
    heatCell: {flex: 1, minHeight: 34, justifyContent: 'center' as const, borderRadius: 5, borderWidth: 1}, heatText: {fontSize: 9, fontWeight: '700' as const, color: TEXT, textAlign: 'center' as const},
    track: {height: 5, backgroundColor: LINE, borderRadius: 4, overflow: 'hidden' as const},
    scenarioPair: {flexDirection: 'row' as const, alignItems: 'stretch' as const, gap: 10}, scenarioCard: {flex: 1, minWidth: 0, borderWidth: 1, borderColor: LINE, borderRadius: 14, padding: 12, gap: 12}, scenarioLabel: {color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: '600' as const, flexShrink: 1}, scenarioValue: {fontSize: 25, fontWeight: '800' as const},
    scenarioRow: {flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: 12}, scenarioDivider: {height: 1, backgroundColor: LINE},
    halfOptions: {flexDirection: 'row' as const, gap: 7}, halfOption: {flex: 1, minWidth: 0, alignItems: 'center' as const, gap: 8, paddingHorizontal: 5, paddingVertical: 11, borderWidth: 1, borderColor: LINE, borderRadius: 12}, halfValue: {fontSize: 20, fontWeight: '800' as const},
    scenarioTeam: {alignItems: 'center' as const, gap: 7}, scenarioCrest: {width: 30, height: 30}, scenarioTeamName: {fontSize: 12, lineHeight: 17, minHeight: 34, textAlign: 'center' as const, fontWeight: '700' as const},
    legend: {flexDirection: 'row' as const, justifyContent: 'space-between' as const, gap: 10}, legendText: {fontSize: 10, fontWeight: '700' as const, flexShrink: 1}, histogram: {flexDirection: 'row' as const, gap: 6, alignItems: 'flex-end' as const}, goalColumn: {flex: 1, gap: 5}, goalBars: {flexDirection: 'row' as const, alignItems: 'flex-end' as const, justifyContent: 'center' as const, gap: 3, height: 97}, goalBarColumn: {flex: 1, alignItems: 'center' as const, justifyContent: 'flex-end' as const, gap: 4}, goalBarLabel: {fontSize: 8, color: MUTED},
    retry: {alignSelf: 'center' as const, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, padding: 12}, retryText: {color: ACCENT, fontWeight: '800' as const},
  };
  return {s, ACCENT, BLUE, ACTUAL, TEXT, MUTED, LINE, CARD};
});
