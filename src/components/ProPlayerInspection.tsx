import { formatNarrativeNumbers } from '@/utils/narrativeNumbers';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Activity,BrickWall,DraftingCompass,LogIn,ShieldAlert,Star,UserRound } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable,Text,View } from 'react-native';
import { TutorialPageGuide } from './Tutorial';

import { CONTRIBUTION_IMPACT_METRICS,DEFENDING_METRICS,ERRORS_DISCIPLINE_METRICS,GK_METRICS,PASSING_METRICS,SHOOTING_METRICS,toSpiderPoints,type EnterpriseMetricUnit } from '@/utils/proSpiderRanges';
import { ChatPitchMap } from './ChatVisualsBlock';
import LeaguePlayerCardModal from './LeaguePlayerCardModal';
import GoalkeeperGlovesIcon from './ProGoalkeeperGlovesIcon';
import ProMetricChart from './ProMetricChart';
import ReportPercentileTiles, {ReportPercentileScopeSwitch} from './ReportPercentileTiles';
import {getProPlayerPercentiles} from '@/services/api';
import {reportPercentileCompetition, type DomesticPercentiles} from '@/utils/reportPercentiles';
import type { ProInspection } from './ProWorkspaceControls';
import { getThemed_proStyles as __getThemed_proStyles } from './ProWorkspaceControls';

export default function ProPlayerInspection({guideActive=true, value, onCheckFit, onFindSimilar}: {guideActive?:boolean;value: ProInspection; onCheckFit: () => void; onFindSimilar: () => void}) {
  const themed = useThemedStyles(getModuleTheme);
  const {proStyles, ACCENT, FRAME_TITLE, LINE, MUTED, themeColor} = themed;

  const {t, i18n} = useTranslation(), tr = i18n.language.startsWith('tr');
  const [unitsByCategory, setUnitsByCategory] = React.useState<Record<string,EnterpriseMetricUnit>>({});
  const playerId = value.entry.id;
  const [scope, setScope] = React.useState('annual');
  const [role, setRole] = React.useState('');
  const [attempt, setAttempt] = React.useState(0);
  const [percentileResult, setPercentileResult] = React.useState<{playerId: string; attempt: number; data?: DomesticPercentiles; error?: boolean}>();
  React.useEffect(() => {
    setScope('annual'); setRole(''); setUnitsByCategory({});
  }, [playerId]);
  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    getProPlayerPercentiles(playerId, controller.signal)
      .then(data => {
        if (!Array.isArray(data.competitions)) throw new Error('Invalid percentile data');
        if (!cancelled) setPercentileResult({playerId, attempt, data});
      })
      .catch(() => {if (!cancelled) setPercentileResult({playerId, attempt, error: true});})
      .finally(() => clearTimeout(timeout));
    return () => {cancelled = true; clearTimeout(timeout); controller.abort();};
  }, [playerId, attempt]);
  const currentPercentiles = percentileResult?.playerId === playerId && percentileResult.attempt === attempt ? percentileResult : undefined;
  const percentileData = currentPercentiles?.data;
  const competition = reportPercentileCompetition(percentileData, scope);

  const titles: Record<string,string> = {goalkeeping:t('chartGK','Goalkeeping'), contribution_impact:t('contribution_impact','Contribution & Impact'), shooting:t('shooting','Shooting'), passing:t('passing','Passing'), defending:t('defending','Defending'), errors_discipline:t('errors_discipline','Errors & Discipline')};
  const icons: Record<string,React.ComponentType<{size?:number;color?:string}>>={goalkeeping:GoalkeeperGlovesIcon,contribution_impact:Star,shooting:LogIn,passing:DraftingCompass,defending:BrickWall,errors_discipline:ShieldAlert};
  const categoryMetrics={contribution_impact:CONTRIBUTION_IMPACT_METRICS,goalkeeping:GK_METRICS,shooting:SHOOTING_METRICS,passing:PASSING_METRICS,defending:DEFENDING_METRICS,errors_discipline:ERRORS_DISCIPLINE_METRICS};
  const categories=Object.entries(categoryMetrics).map(([key,metrics])=>({key,metrics}));
  const stats=value.sourceStats || value.entry.player.stats;
  const units=[{key:'perMatch',label:tr?'Maç Başı':'Per Match'},{key:'per90',label:tr?'90 Dakika':'Per 90'},{key:'total',label:tr?'Toplam':'Total'}] as const;
  const hasPositions=Object.keys(value.entry.player.meta?.positionCounts || {}).length || value.entry.player.meta?.positionNamesSeen?.length;
  return <>
    <TutorialPageGuide page='proInspect' frame={0} enabled={guideActive} summaryLines={0}/>
    <TutorialPageGuide page='proInspect' frame={1} enabled={guideActive} summaryLines={0}/>
    <View style={proStyles.frame}><View style={proStyles.heading}><UserRound size={21} color={ACCENT}/><Text style={FRAME_TITLE}>{tr?'Oyuncu Kartı':'Player Card'}</Text></View><LeaguePlayerCardModal inline proMode onFindSimilar={onFindSimilar} initialEntry={value.entry} onCheckFit={onCheckFit} onClose={()=>{}}/></View>
    {!!hasPositions && <View style={proStyles.frame}><ChatPitchMap player={value.entry.player} pro/></View>}
    {!currentPercentiles && <Text accessibilityRole="text" style={proStyles.hint}>{tr ? 'Lig persentilleri yükleniyor…' : 'Loading league percentiles…'}</Text>}
    {currentPercentiles?.error && <View style={{gap: 8}}>
      <Text style={proStyles.hint}>{tr ? 'Lig persentilleri yüklenemedi.' : 'League percentiles could not be loaded.'}</Text>
      <Pressable accessibilityRole="button" onPress={() => setAttempt(previous => previous + 1)} style={{alignSelf: 'flex-start', paddingVertical: 8}}>
        <Text style={{color: ACCENT, fontWeight: '800'}}>{tr ? 'Yeniden dene' : 'Retry'}</Text>
      </Pressable>
    </View>}
    {categories.map(category => {
      const unit = unitsByCategory[category.key] || 'per90';
      const points = toSpiderPoints(stats, [...category.metrics], {unit, matchCount: value.matchCount});
      const Icon = icons[category.key] || Activity;
      if (!points.length) return null;
      return <View key={category.key} style={proStyles.frame}>
        <View style={proStyles.heading}><Icon size={21} color={ACCENT}/><Text style={[FRAME_TITLE, {flex: 1}]}>{titles[category.key] || category.key}</Text></View>
        <View style={{flexDirection: 'row', gap: 6}}>{units.map(({key, label}) => {
          const disabled = key === 'total' && !competition && !value.matchCount;
          return <Pressable key={key} accessibilityRole="button" accessibilityState={{selected: unit === key, disabled}}
            disabled={disabled} onPress={() => setUnitsByCategory(previous => ({...previous, [category.key]: key}))}
            style={{flex: 1, minWidth: 0, borderWidth: 1, borderColor: unit === key ? ACCENT : LINE, borderRadius: 12, minHeight: 42, padding: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: unit === key ? themeColor('rgba(22,163,74,.08)', 'surface') : 'transparent', opacity: disabled ? .4 : 1}}>
            <Text style={{color: unit === key ? ACCENT : MUTED, fontSize: 12, fontWeight: '800', textAlign: 'center'}}>{label}</Text>
          </Pressable>;
        })}</View>
        <ReportPercentileScopeSwitch competitions={percentileData?.competitions || []} scope={scope} onChange={setScope}/>
        {competition ? <ReportPercentileTiles competition={competition} groupKey={category.key} metricLabels={category.metrics}
          role={role} onRoleChange={setRole} unit={unit} minimumMinutes={percentileData?.minimumMinutes}/>
          : <>
            <ProMetricChart points={points} lowerIsBetter={category.key === 'errors_discipline'}/>
            {!!value.insights[category.key] && <View style={{borderTopWidth: 1, borderColor: themeColor('rgba(22,163,74,.24)', 'border'), paddingTop: 12, gap: 8, width: '100%', minWidth: 0}}>
              <Text style={{color: ACCENT, fontSize: 12, fontWeight: '800'}}>{tr ? 'ScoutWise Perspektifi' : 'ScoutWise Perspective'}</Text>
              <Text style={{color: themeColor('#DCE8E0', 'text'), fontSize: 13, lineHeight: 21, width: '100%', flexShrink: 1}}>{formatNarrativeNumbers(value.insights[category.key], tr ? 'tr' : 'en')}</Text>
            </View>}
          </>}
      </View>;
    })}
    {!value.categories.length&&<Text style={proStyles.hint}>{tr?'Bu oyuncunun analiz edilebilir performans verisi henüz mevcut değil.':'Performance metrics are not yet available for this player.'}</Text>}
  </>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, FRAME_TITLE, LINE, MUTED, themeColor} = colors;
  const proStyles = __getThemed_proStyles(colors);

  return {ACCENT, FRAME_TITLE, LINE, MUTED, proStyles, themeColor};
});
