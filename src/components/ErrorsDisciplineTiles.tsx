// src/components/ErrorsDisciplineTiles.tsx
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Bug } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ACCENT, TEXT, CARD, MUTED, DANGER } from '@/theme';
import type { SpiderPoint } from './SpiderChart';

type Props = {
  title?: string; // e.g. "Errors & Discipline"
  points: SpiderPoint[]; // label/value/min/max
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  thresholds?: { good: number; warn: number }; // risk thresholds in [0..1]

  // Collapsing behavior
  collapsedCount?: number; // default 2
  defaultCollapsed?: boolean; // default true
};

type Tile = {
  label: string;
  value: number;
  risk: number; // 0..1 (higher = worse)
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function formatValue(v: number, label: string) {
  if (label.includes('(%)')) return `${v.toFixed(1)}%`;
  if (Math.abs(v) >= 100) return v.toFixed(0);
  return v.toFixed(2);
}

/**
 * Errors & Discipline "Risk Tiles"
 * - risk = normalized value in [0..1] based on (value-min)/(max-min)
 * - higher risk = worse
 * - collapsed by default (shows first N rows)
 */
export default function ErrorsDisciplineTiles({
  title = 'Errors & Discipline',
  points,
  Icon,
  thresholds = { good: 0.33, warn: 0.66 },
  collapsedCount = 3,
  defaultCollapsed = true,
}: Props) {
  const { t } = useTranslation();
  const AutoIcon = Icon ?? Bug;

  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const tiles: Tile[] = React.useMemo(() => {
    const seen = new Set<string>();

    return (points || [])
      .map((p) => {
        if (!p?.label || seen.has(p.label)) return null;
        seen.add(p.label);

        const min = Number(p.min);
        const max = Number(p.max);

        const vNum =
          typeof p.value === 'number'
            ? p.value
            : Number(String(p.value ?? '').replace('%', '').trim());

        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
        if (!Number.isFinite(vNum)) return null;

        const risk = clamp01((vNum - min) / (max - min));
        return { label: p.label, value: vNum, risk };
      })
      .filter(Boolean) as Tile[];
  }, [points]);

  if (tiles.length === 0) return null;

  const { good, warn } = thresholds;

  const severityFor = (risk: number): 'good' | 'warn' | 'bad' => {
    if (risk < good) return 'good';
    if (risk < warn) return 'warn';
    return 'bad';
  };

  const colorFor = (sev: 'good' | 'warn' | 'bad') => {
    if (sev === 'good') return ACCENT;
    if (sev === 'warn') return '#F59E0B'; // amber-500
    return DANGER;
  };

  const labelFor = (sev: 'good' | 'warn' | 'bad') => {
    if (sev === 'good') return t('riskGood', { defaultValue: 'Good' });
    if (sev === 'warn') return t('riskWatch', { defaultValue: 'Watch' });
    return t('riskBad', { defaultValue: 'Problem' });
  };

  const canToggle = tiles.length > collapsedCount;
  const shown = collapsed && canToggle ? tiles.slice(0, collapsedCount) : tiles;

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 12, gap: 10 }}>
      {/* Header pill */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          backgroundColor: ACCENT,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 6,
          gap: 8,
        }}
      >
        <AutoIcon size={18} color="white" />
        <Text style={{ color: TEXT, fontWeight: '700', fontSize: 16 }}>{title}</Text>
      </View>

      {shown.map((m) => {
        const sev = severityFor(m.risk);
        const sevColor = colorFor(sev);
        const sevText = labelFor(sev);
        const labelTr = t(`metric.${m.label}`, { defaultValue: m.label });

        return (
          <View key={m.label} style={{ marginTop: 6 }}>
            {/* Top row: label + severity + value */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ color: MUTED, fontSize: 13, fontWeight: '600' }}>
                  {labelTr}
                </Text>

                <Text style={{ color: sevColor, fontSize: 12, marginTop: 2, fontWeight: '700' }}>
                  {sevText}
                </Text>
              </View>

              <Text style={{ color: TEXT, fontSize: 14, fontWeight: '800' }}>
                {formatValue(m.value, m.label)}
              </Text>
            </View>

            {/* Risk bar (fills as it gets WORSE) */}
            <View
              style={{
                marginTop: 8,
                height: 7,
                borderRadius: 999,
                backgroundColor: '#272a2a',
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  width: `${m.risk * 100}%`,
                  height: '100%',
                  backgroundColor: sevColor,
                }}
              />
            </View>

            {/* Hint line */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ color: MUTED, fontSize: 11 }}>
                {t('riskBetter', { defaultValue: 'Better' })}
              </Text>
              <Text style={{ color: MUTED, fontSize: 11 }}>
                {t('riskWorse', { defaultValue: 'Worse' })}
              </Text>
            </View>
          </View>
        );
      })}

      {/* Show more / Show less */}
      {canToggle ? (
        <Pressable
          onPress={() => setCollapsed((c) => !c)}
          accessibilityRole="button"
          style={{
            marginTop: 8,
            alignSelf: 'flex-start',
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: MUTED, fontWeight: '800' }}>
            {collapsed
              ? t('showMore', {
                  defaultValue: `Show ${tiles.length - collapsedCount} more`,
                })
              : t('showLess', { defaultValue: 'Show less' })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
