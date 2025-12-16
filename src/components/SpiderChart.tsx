// src/components/SpiderChart.tsx
import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  ShieldCheck,
  BrickWall,
  LogIn,
  DraftingCompass,
  Star,
  Bug,
} from 'lucide-react-native';
import {
  VictoryChart,
  VictoryPolarAxis,
  VictoryGroup,
  VictoryArea,
  VictoryLabel,
} from 'victory-native';
import { ACCENT, TEXT, CARD, MUTED } from '@/theme';
import { useTranslation } from 'react-i18next';

export type SpiderPoint = {
  label: string;        // canonical label from spiderRanges
  value: number | string;
  min: number;
  max: number;
};

type Props = {
  title: string;
  points: SpiderPoint[];
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
};

type Cleaned = { x: number; y: number; value: number; label: string };

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
      next = used.indexOf(false);
      if (next === -1) break;
    }
    i = next;
  }
  return out;
}

// 1) Normalize numerically; keep original value and canonical label.
//    (We will translate labels later for display.)
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
      return { y, value: vNum, label: p.label };
    })
    .filter(Boolean) as Array<{ y: number; value: number; label: string }>;

  if (prelim.length < 4) return [];
  return prelim.map((p, i) => ({ x: i + 1, ...p }));
}
// Add a simple normalized type for the list
type NormalizedPoint = {
  label: string;
  value: number;
  y: number;      // 0–1
  min: number;
  max: number;
};

const AVATAR = 34;

export default function SpiderChart({ title, points, Icon }: Props) {
  const { t } = useTranslation();

  const isInPossession =
    (title || '').toLowerCase().includes('in possession') ||
    (title || '').toLowerCase().includes('in-possession');

  // Auto-pick icon if not provided
  let AutoIcon = Icon;
  const tTitle = (title || '').toLowerCase();
  if (!AutoIcon) {
    if (tTitle.includes('goalkeeper') || tTitle.includes('gk')) {
      AutoIcon = ShieldCheck;
    } else if (tTitle.includes('shoot') || tTitle.includes('finish')) {
      // Shooting / finishing
      AutoIcon = LogIn;
    } else if (tTitle.includes('pass') || tTitle.includes('delivery')) {
      // Passing / delivery
      AutoIcon = DraftingCompass;
    } else if (tTitle.includes('contribution') || tTitle.includes('impact')) {
      // Contribution & impact
      AutoIcon = Star;
    } else if (tTitle.includes('error') || tTitle.includes('discipline')) {
      // Errors & discipline
      AutoIcon = Bug;
    } else if (
      tTitle.includes('defend') ||
      tTitle.includes('out of possession') ||
      tTitle.includes('out-of-possession')
    ) {
      // Defending / out of possession
      AutoIcon = BrickWall;
    }
  }

  // ---- Fallback list normalization (works for 1–2 metrics) ----
  type ListMetric = { label: string; value: number; y: number };

  const listMetrics: ListMetric[] = (() => {
    const seen = new Set<string>();

    return (points || [])
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
        return { label: p.label, value: vNum, y };
      })
      .filter(Boolean) as ListMetric[];
  })();

  // No valid stats at all → nothing
  if (listMetrics.length === 0) return null;

  // ---- Radar normalization (only used if we have 3+ metrics) ----
  let cleaned = normalize(points);

  // spread angles for In Possession so stats are equally located
  if (isInPossession && cleaned.length > 1) {
    const spread = spreadByStride(cleaned);
    cleaned = spread.map((p, i) => ({ ...p, x: i + 1 }));
  }

  // If fewer than 3 valid metrics, show list fallback instead of radar
  if (cleaned.length < 3) {
    return (
      <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 12, gap: 8 }}>
        {/* header bubble with icon + title */}
        <View style={styles.headerRow}>
          <View style={styles.titleFrame}>
            {AutoIcon ? <AutoIcon size={18} color="white" /> : null}
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>

        {listMetrics.map((p) => {
          const labelTr = t(`metric.${p.label}`, { defaultValue: p.label });
          return (
            <View key={p.label} style={{ marginTop: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: MUTED, fontSize: 13 }}>{labelTr}</Text>
                <Text style={{ color: TEXT, fontSize: 14, fontWeight: '700' }}>
                  {p.value}
                </Text>
              </View>

              {/* progress bar */}
              <View
                style={{
                  height: 6,
                  borderRadius: 999,
                  backgroundColor: '#272a2a',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${p.y * 100}%`,
                    height: '100%',
                    backgroundColor: ACCENT,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
    );
  }

  // ---- Radar path (3+ metrics) ----

  function labelToLines(label: string): string[] {
    const parts = (label ?? '').trim().split(/\s+/).filter(Boolean);

    if (parts.length <= 1) return parts;                 // 1 word
    if (parts.length === 2) return [parts[0], parts[1]]; // 2 words → each on its own line
    if (parts.length === 3) return [parts[0], parts[1], parts[2]]; // 3 words → each on its own line

    // 4+ words → first line = first word, second line = second word, third line = rest
    return [parts[0], parts[1], parts.slice(2).join(' ')];
  }

  // Build display lines with translations
  const withDisplay = cleaned.map((p) => {
    const labelTr = t(`metric.${p.label}`, { defaultValue: p.label });
    const labelLines = labelToLines(labelTr);
    const lines = [...labelLines, String(p.value)];
    return { ...p, show: lines.join('\n'), lineCount: lines.length };
  });

  const fourLine = withDisplay
  .filter((p) => p.lineCount === 4)
  .sort((a, b) => a.x - b.x);

  const threeLine = withDisplay
    .filter((p) => p.lineCount === 3)
    .sort((a, b) => a.x - b.x);
  const twoLine = withDisplay
    .filter((p) => p.lineCount === 2)
    .sort((a, b) => a.x - b.x);

  const spokes = withDisplay.map((_, i) => String(i + 1));
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
          tickFormat={() => ''}
          style={{
            axis: { stroke: 'transparent' },
            grid: { stroke: MUTED, opacity: 0.3 },
            tickLabels: { fill: MUTED, fontSize: 10 },
          }}
        />

        {/* base spokes */}
        <VictoryPolarAxis
          tickValues={spokes}
          tickFormat={() => ''}
          style={{
            axis: { stroke: MUTED, opacity: 0.25 },
            grid: { stroke: MUTED, opacity: 0.25 },
          }}
        />

        {/* 4-line labels */}
        <VictoryPolarAxis
          tickValues={fourLine.map((p) => toSpoke(p.x))}
          tickFormat={(_, i) => fourLine[i]?.show ?? ''}
          tickLabelComponent={
            <VictoryLabel
              angle={0}
              textAnchor="middle"
              verticalAnchor="middle"
              dy={4}
              style={[
                { fill: MUTED, fontSize: 12, fontWeight: '600' }, // label line 1
                { fill: MUTED, fontSize: 12, fontWeight: '600' }, // label line 2
                { fill: MUTED, fontSize: 12, fontWeight: '600' }, // label line 3 (rest)
                { fill: TEXT,  fontSize: 13, fontWeight: '700' }, // value line
              ]}
            />
          }
          style={{ axis: { stroke: 'transparent' }, grid: { stroke: 'transparent' } }}
        />

        {/* 3-line labels */}
        <VictoryPolarAxis
          tickValues={threeLine.map((p) => toSpoke(p.x))}
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
                { fill: TEXT, fontSize: 13, fontWeight: '700' },
              ]}
            />
          }
          style={{ axis: { stroke: 'transparent' }, grid: { stroke: 'transparent' } }}
        />

        {/* 2-line labels */}
        <VictoryPolarAxis
          tickValues={twoLine.map((p) => toSpoke(p.x))}
          tickFormat={(_, i) => twoLine[i]?.show ?? ''}
          tickLabelComponent={
            <VictoryLabel
              angle={0}
              textAnchor="middle"
              verticalAnchor="middle"
              dy={4}
              style={[
                { fill: MUTED, fontSize: 12, fontWeight: '600' },
                { fill: TEXT, fontSize: 13, fontWeight: '700' },
              ]}
            />
          }
          style={{ axis: { stroke: 'transparent' }, grid: { stroke: 'transparent' } }}
        />

        <VictoryGroup>
          <VictoryArea
            data={withDisplay.map((p) => ({ x: toSpoke(p.x), y: p.y }))}
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
    gap: 8,
  },
});
