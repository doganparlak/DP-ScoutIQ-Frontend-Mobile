import * as React from 'react';
import { View, Text } from 'react-native';
import {
  VictoryChart,
  VictoryPolarAxis,
  VictoryGroup,
  VictoryArea,
  VictoryLabel,
} from 'victory-native';
import { ACCENT, TEXT, CARD, MUTED } from '@/theme';

export type SpiderPoint = {
  label: string;
  value: number | string; // supports "52%" etc.
  min: number;
  max: number;
};

type Props = {
  title: string;
  points: SpiderPoint[];
};

// Split metric names after the first word: "Pass Accuracy (%)" -> "Pass\nAccuracy (%)"
function breakAfterFirstWord(label: string) {
  const parts = label.trim().split(/\s+/);
  if (parts.length <= 1) return label;
  return parts[0] + '\n' + parts.slice(1).join(' ');
}

function normalize(points: SpiderPoint[]) {
  return points
    .map((p, i) => {
      const min = Number(p.min);
      const max = Number(p.max);
      const v = typeof p.value === 'string'
        ? Number(String(p.value).replace('%', ''))
        : Number(p.value);

      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

      const raw = (v - min) / (max - min);
      const y = Math.max(0, Math.min(1, raw));

      const metricBroken = breakAfterFirstWord(p.label);
      const show = `${metricBroken}\n${p.value}`; // "metric (possibly two lines)\nvalue"

      return { x: i + 1, y, label: p.label, show };
    })
    .filter(Boolean) as Array<{ x: number; y: number; label: string; show: string }>;
}

export default function SpiderChart({ title, points }: Props) {
  const cleaned = normalize(points);
  if (cleaned.length < 3) return null;

  const categories = cleaned.map((_, i) => i + 1);
  const axisLabels = cleaned.map(p => p.show);
  const data = cleaned.map(p => ({ x: p.x, y: p.y }));

  const ticks = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 12, gap: 8 }}>
      <Text style={{ color: TEXT, fontWeight: '700', fontSize: 16 }}>{title}</Text>

      <VictoryChart
        polar
        height={360}
        // Shift the plot slightly LEFT by giving the right side a bit more padding than the left
        padding={{ top: 40, bottom: 40, left: 62, right: 78 }}
        domain={{ y: [0, 1] }}
      >
        {/* radial grid (rings) */}
        <VictoryPolarAxis
          dependentAxis
          tickValues={ticks}
          style={{
            axis: { stroke: 'transparent' },
            grid: { stroke: MUTED, opacity: 0.3 },
            tickLabels: { fill: MUTED, fontSize: 10 },
          }}
        />

        {/* spokes + category labels (metric split after 1st word + value on new line) */}
        <VictoryPolarAxis
          tickValues={categories}
          tickFormat={(_, i) => axisLabels[i] ?? ''}
          tickLabelComponent={
            <VictoryLabel
              textAnchor="middle"
              style={[
                { fill: TEXT, fontSize: 11, fontWeight: '700' }, // metric (first word)
                { fill: TEXT, fontSize: 11, fontWeight: '600' }, // metric (rest)
                { fill: MUTED, fontSize: 11 },                   // value
              ]}
              dy={4}
            />
          }
          style={{
            axis: { stroke: MUTED, opacity: 0.25 },
            grid: { stroke: MUTED, opacity: 0.25 },
          }}
        />

        <VictoryGroup>
          <VictoryArea
            data={data}
            style={{
              data: {
                fill: ACCENT,
                fillOpacity: 0.25,
                stroke: ACCENT,
                strokeWidth: 2,
              },
            }}
          />
        </VictoryGroup>
      </VictoryChart>
    </View>
  );
}
