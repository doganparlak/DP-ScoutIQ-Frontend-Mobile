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
  value: number | string;
  min: number;
  max: number;
};

type Props = {
  title: string;
  points: SpiderPoint[];
};

function splitAfterFirstWord(label: string) {
  const parts = label.trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || '', rest: '' };
  return { first: parts[0], rest: parts.slice(1).join(' ') };
}

function normalize(points: SpiderPoint[]) {
  const seen = new Set<string>();

  return points
    .map((p) => {
      if (seen.has(p.label)) return null; // dedupe by label
      seen.add(p.label);

      const min = Number(p.min);
      const max = Number(p.max);
      const v =
        typeof p.value === 'string'
          ? Number(String(p.value).replace('%', ''))
          : Number(p.value);

      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;

      const raw = (v - min) / (max - min);
      const y = Math.max(0, Math.min(1, raw));

      const { first, rest } = splitAfterFirstWord(p.label);
      // Always three lines: first word, rest (or a space), value
      const show = `${first}\n${rest || ' '}\n${p.value}`;

      return { x: seen.size, y, label: p.label, show };
    })
    .filter(Boolean) as Array<{ x: number; y: number; label: string; show: string }>;
}

export default function SpiderChart({ title, points }: Props) {
  const cleaned = normalize(points);
  if (cleaned.length < 3) return null;

  const categories = cleaned.map((_, i) => i + 1);
  const axisLabels = cleaned.map((p) => p.show);
  const data = cleaned.map((p) => ({ x: p.x, y: p.y }));

  const ticks = [0.2, 0.4, 0.6, 0.8, 1];

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 12, gap: 8 }}>
      <Text style={{ color: TEXT, fontWeight: '700', fontSize: 16 }}>{title}</Text>

      <VictoryChart
        polar
        height={360}
        padding={{ top: 30, bottom: 40, left: 62, right: 82 }}
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

        {/* spokes + category labels:
            line1 = first word (muted), line2 = rest (muted), line3 = value (highlighted) */}
        <VictoryPolarAxis
          tickValues={categories}
          tickFormat={(_, i) => axisLabels[i] ?? ''}
          tickLabelComponent={
            <VictoryLabel
              angle={360}
              textAnchor="middle"
              verticalAnchor="middle"
              dy={4}
              style={[
                { fill: MUTED, fontSize: 12, fontWeight: '600' }, // first word
                { fill: MUTED, fontSize: 12, fontWeight: '600' }, // rest (or blank)
                { fill: TEXT,  fontSize: 13, fontWeight: '700' }, // value (highlighted)
              ]}
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
