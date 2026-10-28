import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LineChart, List } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import SpiderChart from './SpiderChart';
import ErrorsDisciplineTiles from './ErrorsDisciplineTiles';
import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import { playerPoints, type MetricUnit } from '@/utils/comparisonGroups';
import { convertSeasonMetric, seasonMetricGroups } from '@/utils/seasonData';
import type { PlayerData } from '@/types';
import type { SeasonAggregate } from '@/services/seasonData';

type Props = {
  group: ReturnType<typeof seasonMetricGroups>[number];
  aggregate: SeasonAggregate;
  player: PlayerData;
  unit: MetricUnit;
};
export default function SeasonMetricCategory({ group, aggregate, player, unit }: Props) {
  const { t, i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const { styles, ACCENT, DANGER, TEXT, MUTED, themeColor } = useThemedStyles(getModuleTheme);
  const [plot, setPlot] = React.useState(false);
  const [width, setWidth] = React.useState(0);
  // Use the same value conversion and fixed ranges as the comparison slots.
  const points = playerPoints(player, group.rows.map(row => row.metric), unit);
  const pointValues = new Map(points.map(point => [point.label, point.value]));
  const accent = group.lower ? DANGER : ACCENT;
  const title = group.key === 'passing' && tr ? 'Pas ve Dağıtım' : tr ? group.tr : group.en;
  return <View style={styles.frame} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <View style={styles.heading}>
      <Text style={[styles.title, {color:accent}]}>{title}</Text>
      <View style={styles.switch} accessibilityRole="radiogroup">
        {([{value:false,label:tr?'Sayılar':'Numbers',Icon:List},{value:true,label:tr?'Grafik':'Chart',Icon:LineChart}] as const).map(option=><Pressable key={String(option.value)} accessibilityRole="radio" accessibilityState={{checked:plot===option.value}} onPress={()=>setPlot(option.value)} style={[styles.switchOption,plot===option.value && {backgroundColor:themeColor('rgba(22,163,74,.16)','surface')}]}>
          <option.Icon size={14} color={plot===option.value?accent:MUTED}/><Text style={[styles.switchText,{color:plot===option.value?accent:MUTED}]}>{option.label}</Text>
        </Pressable>)}
      </View>
    </View>
    {plot ? <View style={styles.chart}>
      {group.lower ? <ErrorsDisciplineTiles hideTitle expandable={false} points={points} accent={DANGER}/> : width > 0 && <SpiderChart hideTitle title={title} points={points} chartSize={Math.max(0,width-24)}/>}
    </View> : group.rows.map(({metric,value})=>{
      const displayed = pointValues.get(metric) ?? convertSeasonMetric(metric,value,aggregate,unit);
      return <View key={metric} style={styles.row}>
        <Text style={[styles.valueLabel,{color:TEXT}]}>{String(t(`metric.${metric}`,metric))}</Text>
        <Text style={[styles.value,{color:accent}]}>{metric.includes('(%)') ? `${displayed.toFixed(1)}%` : displayed.toLocaleString(tr?'tr-TR':'en-GB',{maximumFractionDigits:2})}</Text>
      </View>;
    })}
  </View>;
}
const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const { ACCENT, DANGER, TEXT, CARD, LINE, MUTED, PANEL, themeColor } = colors;
  const styles = StyleSheet.create({
    frame:{borderWidth:1,borderColor:LINE,borderRadius:12,overflow:'hidden'},
    heading:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:10,padding:12,backgroundColor:CARD},
    title:{flex:1,minWidth:100,fontSize:13,fontWeight:'800'},
    switch:{flexDirection:'row',backgroundColor:PANEL,borderRadius:999,borderWidth:1,borderColor:LINE,padding:4,gap:3},
    switchOption:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:5,paddingHorizontal:10,paddingVertical:7,borderRadius:999},
    switchText:{fontSize:10.5,fontWeight:'900'},
    chart:{padding:10,alignItems:'stretch'},
    row:{flexDirection:'row',alignItems:'center',gap:12,padding:12,borderTopWidth:1,borderColor:LINE},
    valueLabel:{flex:1,fontSize:13},
    value:{fontSize:13,fontWeight:'800'},
  });
  return { styles, ACCENT, DANGER, TEXT, MUTED, themeColor };
});
