import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import Svg, {Circle, Line, Polygon, Text as SvgText, TSpan} from 'react-native-svg';
import {ChartNoAxesColumnIncreasing, Radar} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {ACCENT, CARD, DANGER, LINE, MUTED, TEXT} from '@/theme';
import ErrorsDisciplineTiles from './ErrorsDisciplineTiles';
import type {EnterpriseSpiderPoint} from '@/utils/proSpiderRanges';

type Props = {points: EnterpriseSpiderPoint[]; lowerIsBetter?: boolean};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
function format(value: number, label: string) {return /%|percentage/i.test(label) ? `${value.toFixed(1)}%` : value.toFixed(Math.abs(value) >= 100 ? 0 : 2);}
function wrap(text: string, limit = 16) {
  const lines: string[] = []; let current = '';
  for (const word of text.split(/\s+/).flatMap(word => word.match(new RegExp(`.{1,${limit}}`, 'g')) || [])) {
    if (current && ((current + ' ' + word).length > limit || current.split(' ').length >= 2)) {lines.push(current); current = word;} else current = current ? current + ' ' + word : word;
  }
  if (current) lines.push(current);
  return lines;
}
export default function ProMetricChart({points, lowerIsBetter = false}: Props) {
  const {t, i18n} = useTranslation(), tr = i18n.language.startsWith('tr'), {width, height, fontScale} = useWindowDimensions();
  const [mode, setMode] = React.useState<'radar' | 'bars'>('radar'), [measured, setMeasured] = React.useState(0);
  const viewport = measured || Math.max(220, width - 64);
  const data = points.filter(point => Number.isFinite(point.value) && Number.isFinite(point.max) && point.max > point.min);
  const canRadar = !lowerIsBetter && data.length >= 4, bars = mode === 'bars' || !canRadar;
  const size = viewport, chartHeight = size;
  const labelFont = (data.length > 14 ? 14 : 16) * Math.min(1.2, Math.max(1, fontScale));
  const labelLineHeight = labelFont + 3;
  const labels = data.map(point => wrap(String(t(`metric.${point.label}`, {defaultValue: point.label})), 13));
  const center = 260, centerY = 260, radius = 155;
  const listHeight = Math.min(380, Math.max(220, height * .4));
  const position = (index: number, distance: number) => {const angle = -Math.PI / 2 + index * Math.PI * 2 / data.length; return {x: center + Math.cos(angle) * distance, y: centerY + Math.sin(angle) * distance};};
  const disciplineColor = (risk: number) => risk < .25 ? ACCENT : risk < .55 ? '#F59E0B' : DANGER;
  if (!data.length) return null;
  if (lowerIsBetter) return <ScrollView nestedScrollEnabled style={{maxHeight:listHeight}}><ErrorsDisciplineTiles points={data} hideTitle expandable={false} defaultCollapsed={false} framed thresholds={{good:.33,warn:.66}}/></ScrollView>;
  return <View onLayout={event => setMeasured(event.nativeEvent.layout.width)} style={{gap: 12}}>
    <View style={styles.toggleRow}>{([{key:'radar', label:tr?'Radar':'Radar', Icon:Radar}, {key:'bars', label:tr?'Yatay':'Horizontal', Icon:ChartNoAxesColumnIncreasing}] as const).filter(option => !lowerIsBetter || option.key === 'bars').map(({key,label,Icon}) => <Pressable key={key} accessibilityRole="button" accessibilityState={{selected:key === (bars ? 'bars' : 'radar'), disabled:key === 'radar' && !canRadar}} disabled={key === 'radar' && !canRadar} onPress={() => setMode(key)} style={[styles.toggle, key === (bars ? 'bars' : 'radar') && styles.selected, key === 'radar' && !canRadar && {opacity:.4}]}><Icon size={15} color={key === (bars ? 'bars' : 'radar') ? ACCENT : MUTED}/><Text style={{fontSize:12,fontWeight:'700',color:key === (bars ? 'bars' : 'radar') ? ACCENT : MUTED}}>{label}</Text></Pressable>)}</View>
    {!canRadar && !lowerIsBetter && <Text style={styles.note}>{tr ? 'Radar için en az 4 metrik gerekir; yatay grafik gösteriliyor.' : 'Radar needs at least 4 metrics; showing horizontal bars.'}</Text>}
    {bars ? <ScrollView nestedScrollEnabled style={{maxHeight:listHeight}} contentContainerStyle={styles.bars}>{data.map((point,index) => <View key={point.label} style={{gap:8,...(lowerIsBetter?{padding:14,borderWidth:1,borderColor:LINE,borderRadius:14}:{})}}><View style={{flexDirection:'row',alignItems:'flex-start',gap:12}}><Text style={styles.metric}>{String(t(`metric.${point.label}`,{defaultValue:point.label}))}</Text><Text style={styles.value}>{format(point.value,point.label)}</Text></View>{lowerIsBetter && <Text style={{color:disciplineColor(clamp((point.value-point.min)/(point.max-point.min))),fontWeight:'800',fontSize:12}}>{(point.value-point.min)/(point.max-point.min)<.25 ? (tr?'İyi':'Good') : (point.value-point.min)/(point.max-point.min)<.55 ? (tr?'Dikkat':'Watch') : 'Problem'}</Text>}<View style={styles.track}><View style={{width:`${clamp((point.value-point.min)/(point.max-point.min))*100}%`,height:'100%',borderRadius:5,backgroundColor:lowerIsBetter ? disciplineColor((point.value-point.min)/(point.max-point.min)) : ACCENT}}/></View>{lowerIsBetter && <View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={styles.note}>{tr?'Daha İyi':'Better'}</Text><Text style={styles.note}>{tr?'Daha Kötü':'Worse'}</Text></View>}</View>)}</ScrollView> : <>
        <Svg width={size} height={chartHeight} viewBox="0 0 520 520" accessibilityLabel={tr ? 'Oyuncu metriklerinin radar grafiği' : 'Radar chart of player metrics'}>
          {[.25,.5,.75,1].map(level => <Polygon key={level} points={data.map((_,index)=>{const p=position(index,radius*level);return `${p.x},${p.y}`;}).join(' ')} stroke="rgba(145,169,155,.22)" strokeWidth={1} fill="transparent"/>)}
          {data.map((point,index) => {const end=position(index,radius);return <Line key={point.label} x1={center} y1={centerY} x2={end.x} y2={end.y} stroke="rgba(145,169,155,.17)"/>;})}
          <Polygon points={data.map((point,index)=>{const p=position(index,radius*clamp((point.value-point.min)/(point.max-point.min)));return `${p.x},${p.y}`;}).join(' ')} fill="rgba(22,163,74,.18)" stroke={ACCENT} strokeWidth={2.5}/>
          {data.map((point,index)=>{const pos=position(index,205), lines=labels[index];const halfWidth=Math.max(...lines.map(line=>line.length))*labelFont*.29;pos.x=Math.max(halfWidth+6,Math.min(514-halfWidth,pos.x));return <SvgText key={point.label} x={pos.x} y={pos.y-(lines.length-1)*labelLineHeight/2} textAnchor="middle" fontSize={labelFont} fill="#B8C6BE" fontWeight="600">{lines.map((line,lineIndex)=><TSpan key={lineIndex} x={pos.x} dy={lineIndex?labelLineHeight:0}>{line}</TSpan>)}</SvgText>;})}
          {data.map((point,index)=>{const p=position(index,radius*clamp((point.value-point.min)/(point.max-point.min)));return <Circle key={point.label} cx={p.x} cy={p.y} r={3} fill="#A7F3D0" stroke="#143d2b" strokeWidth={1.5} accessibilityLabel={`${String(t(`metric.${point.label}`,{defaultValue:point.label}))}: ${format(point.value,point.label)}`}/>;})}
        </Svg>
    </>}
    {lowerIsBetter && <Text style={styles.note}>{tr ? 'Hata ve disiplin metriklerinde düşük değer daha olumludur.' : 'Lower values are more favorable for errors and discipline.'}</Text>}
  </View>;
}
const styles=StyleSheet.create({toggleRow:{flexDirection:'row',gap:8},toggle:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6,minHeight:36,borderWidth:1,borderColor:LINE,borderRadius:10,paddingHorizontal:12,paddingVertical:8},selected:{borderColor:ACCENT,backgroundColor:'rgba(22,163,74,.08)'},note:{color:MUTED,fontSize:11,lineHeight:17},bars:{backgroundColor:CARD,borderRadius:16,padding:14,gap:20},metric:{color:'#B6C5BC',fontSize:13,lineHeight:20,flex:1},value:{color:TEXT,fontWeight:'800',fontSize:14},track:{height:7,borderRadius:5,backgroundColor:'rgba(145,169,155,.12)',overflow:'hidden'}});
