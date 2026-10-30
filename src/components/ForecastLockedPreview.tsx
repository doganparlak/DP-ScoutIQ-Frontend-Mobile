import React, {useId} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Svg, {Defs, FeGaussianBlur, Filter, G, LinearGradient, Rect, Stop} from 'react-native-svg';
import {createThemedStyles, useThemedStyles, type ThemeColors} from '@/theme';
import TeamReportLockedDetail from './TeamReportLockedDetail';

type PreviewSection = 'goals' | 'scenarios';

export default function ForecastLockedPreview({section, tr, onOpenPlans}: {section: PreviewSection; tr: boolean; onOpenPlans: () => void}) {
  const {s, ACCENT, BLUE, CARD, LINE} = useThemedStyles(getTheme);
  const id = useId().replace(/[^\w-]/g, '');
  const blur = `forecast-blur-${id}`, fade = `forecast-fade-${id}`;
  const title = section === 'goals' ? (tr ? 'Toplam Gol Aralığı ve Gol Dağılımı' : 'Total Goal Range & Goal Distribution')
    : (tr ? 'Gol Senaryoları' : 'Goal Scenarios');
  return <View style={s.frame}>
    <View style={s.heading}><Text style={s.title}>{title}</Text><Text style={s.previewLabel}>{tr ? 'Önizleme' : 'Preview'}</Text></View>
    <View style={s.preview} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Illustrative geometry only: this component never receives paid forecast data. */}
      <Svg width="100%" height={190} viewBox="0 0 320 190" accessible={false}>
        <Defs>
          <Filter id={blur} x="-10%" y="-10%" width="120%" height="120%"><FeGaussianBlur stdDeviation={3}/></Filter>
          <LinearGradient id={fade} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={CARD} stopOpacity={0.08}/><Stop offset="0.65" stopColor={CARD} stopOpacity={0.3}/><Stop offset="1" stopColor={CARD} stopOpacity={1}/></LinearGradient>
        </Defs>
        <G filter={`url(#${blur})`} opacity={0.65}>
          {section === 'goals' && <>
            <Rect x={8} y={12} width={78} height={13} rx={6} fill={LINE}/><Rect x={90} y={12} width={136} height={13} rx={6} fill={ACCENT}/><Rect x={230} y={12} width={82} height={13} rx={6} fill={BLUE}/>
            {[38, 76, 100, 69, 39, 18, 8].map((height, index) => <G key={index}>
              <Rect x={10 + index * 44} y={168 - height} width={15} height={height} rx={4} fill={ACCENT}/>
              <Rect x={28 + index * 44} y={168 - [24, 57, 90, 85, 50, 27, 12][index]} width={15} height={[24, 57, 90, 85, 50, 27, 12][index]} rx={4} fill={BLUE}/>
            </G>)}
          </>}
          {section === 'scenarios' && [0, 1, 2, 3].map(index => {
            const x = 8 + index % 2 * 160, y = 8 + Math.floor(index / 2) * 91;
            const color = index === 3 ? BLUE : ACCENT;
            return <G key={index}><Rect x={x} y={y} width={144} height={78} rx={12} fill={color} fillOpacity={0.08} stroke={LINE}/><Rect x={x + 18} y={y + 14} width={105} height={7} rx={3} fill={LINE}/><Rect x={x + 48} y={y + 32} width={48} height={18} rx={5} fill={color} fillOpacity={0.6}/><Rect x={x + 17} y={y + 62} width={110} height={5} rx={2} fill={LINE}/><Rect x={x + 17} y={y + 62} width={[64, 80, 45, 55][index]} height={5} rx={2} fill={color}/></G>;
          })}
        </G>
        <Rect width={320} height={190} fill={`url(#${fade})`}/>
      </Svg>
    </View>
    <View style={s.callout}><TeamReportLockedDetail tr={tr} kind="matchForecast" onOpenPlans={onOpenPlans}/></View>
  </View>;
}

const getTheme = createThemedStyles((c: ThemeColors) => {
  const {ACCENT, CARD, LINE, MUTED, TEXT, themeColor} = c;
  const BLUE = themeColor('#38BDF8', 'text');
  const s = StyleSheet.create({
    frame: {padding: 14, borderRadius: 20, borderWidth: 1, borderColor: `${ACCENT}70`, backgroundColor: CARD, overflow: 'hidden'},
    heading: {flexDirection: 'row', alignItems: 'center', gap: 8}, title: {flex: 1, color: TEXT, fontSize: 15, lineHeight: 21, fontWeight: '800'}, previewLabel: {color: MUTED, fontSize: 10, fontWeight: '600'},
    preview: {height: 190, marginTop: 14}, callout: {marginTop: -42, zIndex: 1},
  });
  return {s, ACCENT, BLUE, CARD, LINE};
});
