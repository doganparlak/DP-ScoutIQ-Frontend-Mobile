import React, {useEffect, useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {ArrowDownRight, ArrowUpRight, Trophy} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {createThemedStyles, useThemedStyles, type ThemeColors} from '@/theme';
import {sportmonksLeagueImage} from '@/utils/sportmonksImages';
import type {EnterpriseMetricUnit} from '@/utils/comparisonRanges';
import {
  reportPercentileRows, reportPercentileColor,
  type DomesticCompetition, type PercentileMetric,
} from '@/utils/reportPercentiles';

export function ReportPercentileScopeSwitch({competitions, scope, onChange}: {
  competitions: DomesticCompetition[]; scope: string; onChange: (scope: string) => void;
}) {
  const {i18n} = useTranslation();
  const {s, ACCENT, TEXT, MUTED} = useThemedStyles(getStyles);
  const tr = i18n.language.startsWith('tr');
  if (!competitions.length) return null;
  const selected = scope === 'annual' ? undefined
    : competitions.find(item => String(item.leagueId) === scope) || competitions[0];
  return <View style={s.choices} accessibilityLabel={tr ? 'Veri kapsamı' : 'Data scope'}>
    {[{key: 'annual', name: tr ? 'Tüm müsabakalar' : 'All competitions'},
      ...competitions.map(item => ({key: String(item.leagueId), name: item.leagueName}))].map(item => {
      const active = item.key === 'annual' ? scope === 'annual' : String(selected?.leagueId) === item.key;
      return <Pressable key={item.key} accessibilityRole="button" accessibilityState={{selected: active}}
        onPress={() => onChange(item.key)} style={[s.choice, active && {borderColor: ACCENT, backgroundColor: `${ACCENT}18`}]}>
        <Text style={[s.choiceText, {color: active ? TEXT : MUTED}]}>{item.name}</Text>
      </Pressable>;
    })}
  </View>;
}

function LeagueLogo({competition}: {competition: DomesticCompetition}) {
  const {ACCENT, s} = useThemedStyles(getStyles);
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => setFailed([]), [competition.leagueId, competition.leagueLogoUrl]);
  const uri = [competition.leagueLogoUrl, sportmonksLeagueImage(competition.leagueId)]
    .find(url => url && !failed.includes(url));
  return <View style={s.logoFrame}>{uri
    ? <Image source={{uri}} style={s.logo} resizeMode="contain" accessibilityLabel={competition.leagueName}
        onError={() => setFailed(current => [...current, uri])}/>
    : <Trophy size={23} color={ACCENT}/>}</View>;
}

function metricUnit(metric: PercentileMetric, unit: EnterpriseMetricUnit, tr: boolean) {
  if (metric.basis === 'percentage') return '%';
  if (metric.basis === 'rating') return '/ 10';
  return unit === 'per90' ? '/ 90' : unit === 'total' ? (tr ? 'toplam' : 'total') : (tr ? '/ maç' : '/ match');
}

export default function ReportPercentileTiles({competition, groupKey, role, onRoleChange, unit, minimumMinutes = 300, metricLimit = Infinity, lockedContent, metricLabels}: {
  competition: DomesticCompetition; groupKey: string; role: string;
  onRoleChange: (role: string) => void; unit: EnterpriseMetricUnit; minimumMinutes?: number;
  metricLimit?: number; lockedContent?: React.ReactNode; metricLabels?: readonly string[];
}) {
  const {t, i18n} = useTranslation();
  const {s, ACCENT, TEXT, MUTED, themeColor} = useThemedStyles(getStyles);
  const tr = i18n.language.startsWith('tr');
  const {selectedRole, benchmark, rows} = reportPercentileRows(competition, role, groupKey, unit, metricLabels);
  const options = Object.entries(competition.benchmarks);
  const format = (value: number) => value.toLocaleString(tr ? 'tr-TR' : 'en-GB', {maximumFractionDigits: 2});
  const isErrors = groupKey === 'errors_discipline';
  return <View style={s.block}>
    <View style={s.scope}>
      <View style={s.identity}><LeagueLogo competition={competition}/><View style={s.identityText}>
        <Text style={s.league}>{competition.leagueName}</Text>
        {!!competition.teams.length && <Text style={s.club}>{competition.teams.join(' · ')}</Text>}
      </View></View>
      <View style={s.scopeStats}>
        <View style={s.scopeStat}><Text style={s.scopeStatLabel}>{tr ? 'Dönem' : 'Period'}</Text><Text style={s.scopeStatValue}>{tr ? 'Son 1 yıl' : 'Last year'}</Text></View>
        <View style={[s.scopeStat, s.scopeStatDivider]}><Text style={s.scopeStatLabel}>{tr ? 'Oyuncu havuzu' : 'Peer pool'}</Text><Text style={s.scopeStatValue}>{benchmark?.peerCount ?? 0} {tr ? 'oyuncu' : 'players'}</Text></View>
        <View style={[s.scopeStat, s.scopeStatDivider]}><Text style={s.scopeStatLabel}>{tr ? 'Min. süre' : 'Min. minutes'}</Text><Text style={s.scopeStatValue}>{minimumMinutes} {tr ? 'dk' : 'min'}</Text></View>
      </View>
      <View style={s.choices}>{Object.entries(competition.roles).map(([code, share]) =>
        <View key={code} style={s.role}><Text style={s.roleText}>{code} · {Math.round(share)}%</Text></View>)}</View>
    </View>
    {options.length > 1 && <View style={s.block}>
      <Text style={s.caption}>{tr ? 'Karşılaştırma mevkisi' : 'Comparison position'}</Text>
      <View style={s.choices}>{options.map(([key, option]) => <Pressable key={key} accessibilityRole="button"
        accessibilityState={{selected: selectedRole === key}} onPress={() => onRoleChange(key)}
        style={[s.choice, selectedRole === key && {borderColor: ACCENT, backgroundColor: `${ACCENT}18`}]}>
        <Text style={[s.choiceText, {color: selectedRole === key ? TEXT : MUTED}]}>{Object.keys(option.playerRoles || {}).join(' / ') || key}</Text>
      </Pressable>)}</View>
    </View>}
    <View style={s.contextFrame}>
      <Text style={s.caption}>{tr ? 'Persentil: /90 ve başarı oranlarına göre benzer oyuncuların yüzde kaçının önünde olduğunu gösterir.' : 'Percentile: the percentage of comparable players ranked below, based on per 90 and success rates.'}</Text>
      <View style={s.contextDirections}>
        <View style={s.direction}><ArrowUpRight size={15} color={ACCENT}/><Text style={s.directionText}>
          {tr ? 'Persentil: daha yüksek, daha iyi' : 'Percentile: higher is better'}
        </Text></View>
        {isErrors && <View style={s.direction}><ArrowDownRight size={15} color={ACCENT}/><Text style={s.directionText}>
          {tr ? 'Değer: daha düşük, daha iyi' : 'Value: lower is better'}
        </Text></View>}
      </View>
    </View>
    {rows.length ? rows.slice(0, metricLimit).map(({label, metric, value, percentile}) => {
      const color = themeColor(reportPercentileColor(percentile), 'text');
      const title = String(t(`metric.${label}`, {defaultValue: label}));
      return <View key={label} style={[s.tile, {borderColor: `${color}55`, backgroundColor: `${color}09`}]}
        accessible accessibilityLabel={`${title}: ${value === undefined ? '—' : format(value)} ${metricUnit(metric, unit, tr)}. P${Math.round(percentile)}.`}>
        <View style={[s.stripe, {backgroundColor: color}]}/>
        <View style={s.tileHeading}><Text style={s.metric}>{title}</Text>{metric.lowerIsBetter && <ArrowDownRight size={16} color={color}/>}</View>
        <View style={s.values}><View style={s.valueGroup}><Text style={s.value}>{value === undefined ? '—' : format(value)}</Text><Text style={s.unit}>{metricUnit(metric, unit, tr)}</Text></View>
          <View style={[s.rank, {backgroundColor: `${color}18`}]}><Text style={[s.rankLetter, {color}]}>P</Text><Text style={[s.rankNumber, {color}]}>{Math.round(percentile)}</Text>{percentile >= 90 && <ArrowUpRight size={14} color={color}/>}</View>
        </View>
        <View style={s.bar} accessibilityRole="progressbar" accessibilityLabel={`${title} ${tr ? 'persentil' : 'percentile'}`}
          accessibilityValue={{min: 0, max: 100, now: percentile}}>
          <View style={[s.fill, {width: `${percentile}%`, backgroundColor: color}]}/>
          {[25, 50, 75].map(tick => <View key={tick} style={[s.tick, {left: `${tick}%`}]}/>)}
          <View style={[s.marker, {left: `${Math.min(percentile, 99.5)}%`, backgroundColor: color}]}/>
        </View>
        <View style={s.scale}><Text style={s.scaleText}>0</Text><Text style={s.scaleText}>50</Text><Text style={s.scaleText}>100</Text></View>
      </View>;
    }) : <Text style={[s.caption, s.empty]}>{tr ? 'Bu bölüm için karşılaştırılabilir veri bulunamadı.' : 'No comparable statistics in this section.'}</Text>}
    {rows.length > metricLimit && lockedContent}
    <Text style={s.detail}>{tr ? 'P = mevki grubundaki persentil. Eşit değerler ortak sıra alır. Persentiller, seçilen gösterim biriminden bağımsız olarak 90 dakika veya başarı oranları üzerinden hesaplanır.' : 'P = percentile within the position group. Ties share a rank. Percentiles always use per 90 or success rates, regardless of the displayed unit.'}</Text>
  </View>;
}

const getStyles = createThemedStyles((c: ThemeColors) => {
  const s = StyleSheet.create({
    block: {gap: 12}, choices: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
    choice: {paddingHorizontal: 12, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: c.LINE, backgroundColor: c.CARD},
    choiceText: {fontSize: 11, fontWeight: '800'},
    scope: {gap: 14, padding: 15, borderWidth: 1, borderColor: `${c.ACCENT}40`, backgroundColor: `${c.ACCENT}09`, borderRadius: 16},
    identity: {flexDirection: 'row', alignItems: 'center', gap: 11}, identityText: {flex: 1, gap: 3},
    logoFrame: {width: 43, height: 43, borderRadius: 12, backgroundColor: `${c.ACCENT}18`, alignItems: 'center', justifyContent: 'center'},
    logo: {width: 32, height: 32}, league: {color: c.TEXT, fontSize: 14, fontWeight: '800'},
    scopeStats: {flexDirection: 'row', borderTopWidth: 1, borderTopColor: `${c.ACCENT}20`, paddingTop: 12},
    scopeStat: {flex: 1, gap: 4, paddingHorizontal: 6},
    scopeStatDivider: {borderLeftWidth: 1, borderLeftColor: `${c.ACCENT}20`},
    scopeStatLabel: {color: c.MUTED, fontSize: 10, lineHeight: 15},
    scopeStatValue: {color: c.TEXT, fontSize: 12, lineHeight: 18, fontWeight: '700'},
    club: {color: c.MUTED, fontSize: 12, lineHeight: 18, fontWeight: '600'},
    caption: {color: c.MUTED, fontSize: 11, lineHeight: 17},
    role: {borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: `${c.ACCENT}16`},
    roleText: {fontSize: 11, fontWeight: '800', color: c.ACCENT},
    contextFrame: {gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, borderColor: `${c.ACCENT}30`, backgroundColor: `${c.ACCENT}07`},
    contextDirections: {gap: 7, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${c.ACCENT}20`},
    direction: {flexDirection: 'row', alignItems: 'flex-start', gap: 6, minHeight: 17}, directionText: {flex: 1, fontSize: 11, lineHeight: 17, color: c.ACCENT, fontWeight: '700'},
    tile: {position: 'relative', overflow: 'hidden', gap: 11, borderWidth: 1, borderRadius: 16, padding: 15},
    stripe: {position: 'absolute', width: 3, top: 0, bottom: 0, left: 0},
    tileHeading: {flexDirection: 'row', alignItems: 'flex-start', gap: 10}, metric: {flex: 1, color: c.TEXT, fontSize: 12, lineHeight: 18, fontWeight: '700'},
    values: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10},
    valueGroup: {flex: 1, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 5},
    value: {fontSize: 27, fontWeight: '900', color: c.TEXT, fontVariant: ['tabular-nums']}, unit: {fontSize: 10, color: c.MUTED, fontWeight: '600'},
    rank: {flexDirection: 'row', gap: 3, alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10},
    rankLetter: {fontSize: 10, fontWeight: '800'}, rankNumber: {fontSize: 18, fontWeight: '900', fontVariant: ['tabular-nums']},
    bar: {position: 'relative', height: 7, borderRadius: 4, backgroundColor: c.LINE, marginTop: 4},
    fill: {height: 7, borderRadius: 4}, tick: {position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: c.CARD},
    marker: {position: 'absolute', width: 2, top: -2, bottom: -2, borderRadius: 2},
    scale: {flexDirection: 'row', justifyContent: 'space-between', marginTop: -5}, scaleText: {fontSize: 9, color: c.MUTED},
    detail: {fontSize: 10, lineHeight: 16, color: c.MUTED}, empty: {paddingVertical: 22, textAlign: 'center'},
  });
  return {s, ACCENT: c.ACCENT, TEXT: c.TEXT, MUTED: c.MUTED, themeColor: c.themeColor};
});
