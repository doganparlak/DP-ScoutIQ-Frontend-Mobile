// spiderchart.tsx
import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ShieldCheck, TrendingUp, BrickWall } from 'lucide-react-native';
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
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
};

function splitAfterFirstWord(label: string) {
  const parts = (label ?? '').trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] || '', rest: '' };
  return { first: parts[0], rest: parts.slice(1).join(' ') };
}

type Cleaned = { x: number; y: number; show: string; lineCount: number; label: string };

// NEW: evenly spread items around a circle by stepping with a coprime stride
function spreadByStride<T>(arr: T[]): T[] {
  const n = arr.length;
  if (n <= 1) return arr.slice();
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

  let step = Math.floor(n / 2);
  while (step > 1 && gcd(step, n) !== 1) step--;
  if (step < 1) step = 1;

  const out: T[] = [];
  const used = new Array(n).fill(false);
  let i = 0;

  for (let count = 0; count < n; count++) {
    out.push(arr[i]);
    used[i] = true;
    let next = (i + step) % n;
    if (used[next]) {
      // fall back to next unvisited (should rarely happen except small n)
      next = used.indexOf(false);
      if (next === -1) break;
    }
    i = next;
  }
  return out;
}

function normalize(points: SpiderPoint[]): Cleaned[] {
  const seen = new Set<string>();
  const prelim = (points || [])
    .map((p) => {
      if (!p || !p.label || seen.has(p.label)) return null;
      seen.add(p.label);

      const min = Number(p.min);
      const max = Number(p.max);
      const vNum =
        typeof p.value === 'number'
          ? p.value
          : Number(String(p.value ?? '').replace('%', '').trim());
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
      if (!Number.isFinite(vNum)) return null;

      const y = Math.max(0, Math.min(1, (vNum - min) / (max - min)));

      const { first, rest } = splitAfterFirstWord(p.label);
      const lines = rest ? [first, rest, String(vNum)] : [first, String(vNum)];
      return { y, show: lines.join('\n'), lineCount: lines.length, label: p.label };
    })
    .filter(Boolean) as Array<{ y: number; show: string; lineCount: number; label: string }>;

  if (prelim.length < 3) return [];
  // assign provisional x (we’ll reassign after optional spreading)
  return prelim.map((p, i) => ({ x: i + 1, ...p }));
}

const AVATAR = 34;

export default function SpiderChart({ title, points, Icon }: Props) {
  const isInPossession = (title || '').toLowerCase().includes('in possession') ||
                         (title || '').toLowerCase().includes('in-possession');

  // 1) clean
  let cleaned = normalize(points);

  // 2) spread angles for In Possession so stats are equally located
  if (isInPossession && cleaned.length > 4) {
    const spread = spreadByStride(cleaned);
    cleaned = spread.map((p, i) => ({ ...p, x: i + 1 }));
  }

  if (cleaned.length <= 4) return null; // hide entirely if ≤4 stats

  const indices = cleaned.map((p) => p.x);
  const threeLine = cleaned.filter((p) => p.lineCount === 3).sort((a, b) => a.x - b.x);
  const twoLine = cleaned.filter((p) => p.lineCount === 2).sort((a, b) => a.x - b.x);
  const data = cleaned.map((p) => ({ x: p.x, y: p.y }));
  const ticks = [0.2, 0.4, 0.6, 0.8, 1];

  // Auto-pick icon if not provided
  let AutoIcon = Icon;
  const t = (title || '').toLowerCase();
  if (!AutoIcon) {
    if (t.includes('goalkeeper') || t.includes('gk')) AutoIcon = ShieldCheck;
    else if (t.includes('in possession') || t.includes('in-possession')) AutoIcon = TrendingUp;
    else if (t.includes('out of possession') || t.includes('out-of-possession')) AutoIcon = BrickWall;
  }

  const n = cleaned.length;
  // Build string spoke ids so categories typing is happy and everything shares one angular scale
  const spokes = cleaned.map((_, i) => String(i + 1));

  // Helpers to map numeric x -> string spoke id
  const toSpoke = (x: number) => String(x);

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 12, gap: 8 }}>
      {/* header bubble with icon + title */}
      <View style={styles.headerRow}>
        <View style={styles.titleFrame}>
          {AutoIcon ? <AutoIcon size={18} color="white" /> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      <VictoryChart
        polar
        height={360}
        padding={{ top: 30, bottom: 40, left: 62, right: 82 }}
        categories={{ x: spokes }}
        domain={{ y: [0, 1] }}
        startAngle={90}
        endAngle={450}
      >
        <VictoryPolarAxis
          dependentAxis
          tickValues={[0.2, 0.4, 0.6, 0.8, 1]}
          style={{
            axis: { stroke: 'transparent' },
            grid: { stroke: MUTED, opacity: 0.3 },
            tickLabels: { fill: MUTED, fontSize: 10 },
          }}
        />

        {/* base spokes */}
        <VictoryPolarAxis
          tickValues={spokes}              // ✅ strings
          tickFormat={() => ''}
          style={{
            axis: { stroke: MUTED, opacity: 0.25 },
            grid: { stroke: MUTED, opacity: 0.25 },
          }}
        />

        {/* 3-line labels */}
        <VictoryPolarAxis
          tickValues={threeLine.map((p) => toSpoke(p.x))}  // ✅ strings
          tickFormat={(_, i) => threeLine[i]?.show ?? ''}
          tickLabelComponent={
            <VictoryLabel
              angle={0}
              textAnchor="middle"
              verticalAnchor="middle"
              dy={4}
              style={[
                { fill: MUTED, fontSize: 12, fontWeight: '600' },
                { fill: MUTED, fontSize: 12, fontWeight: '600' },
                { fill: TEXT,  fontSize: 13, fontWeight: '700' },
              ]}
            />
          }
          style={{ axis: { stroke: 'transparent' }, grid: { stroke: 'transparent' } }}
        />

        {/* 2-line labels */}
        <VictoryPolarAxis
          tickValues={twoLine.map((p) => toSpoke(p.x))}    // ✅ strings
          tickFormat={(_, i) => twoLine[i]?.show ?? ''}
          tickLabelComponent={
            <VictoryLabel
              angle={0}
              textAnchor="middle"
              verticalAnchor="middle"
              dy={4}
              style={[
                { fill: MUTED, fontSize: 12, fontWeight: '600' },
                { fill: TEXT,  fontSize: 13, fontWeight: '700' },
              ]}
            />
          }
          style={{ axis: { stroke: 'transparent' }, grid: { stroke: 'transparent' } }}
        />

        <VictoryGroup>
          <VictoryArea
            data={cleaned.map((p) => ({ x: toSpoke(p.x), y: p.y }))} // ✅ strings
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

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: TEXT, fontWeight: '700', fontSize: 16 },
  // bubble styling for title
  titleBubble: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  titleFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8, // space between icon and text
  },
});
