// src/components/SpiderBarsFallback.tsx
import * as React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { ACCENT, TEXT, CARD, MUTED } from '@/theme';
import { useTranslation } from 'react-i18next';
import type { SpiderPoint } from './SpiderChart';

type ListMetric = { label: string; value: number; y: number };

type Props = {
  title: string;
  points: SpiderPoint[];
  Icon?: React.ComponentType<{ size?: number; color?: string }>;
  headerColor?: string;
  collapsedCount?: number;
  defaultCollapsed?: boolean;
};

function formatValue(v: number, label: string) {
  if (label.includes('(%)')) return `${v.toFixed(1)}%`;
  if (Math.abs(v) >= 100) return v.toFixed(0);
  return v.toFixed(2);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function buildListMetrics(points: SpiderPoint[]): ListMetric[] {
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

      const y = clamp01((vNum - min) / (max - min));
      return { label: p.label, value: vNum, y };
    })
    .filter(Boolean) as ListMetric[];
}

export default function SpiderBarsFallback({
  title,
  points,
  Icon,
  headerColor = ACCENT,
  collapsedCount = 3,
  defaultCollapsed = true,
}: Props) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const listMetrics = React.useMemo(() => buildListMetrics(points), [points]);
  if (listMetrics.length === 0) return null;

  const canToggle = listMetrics.length > collapsedCount;
  const shown = collapsed && canToggle ? listMetrics.slice(0, collapsedCount) : listMetrics;

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 12, gap: 8 }}>
      {/* header bubble with icon + title */}
      <View style={styles.headerRow}>
        <View style={[styles.titleFrame, { backgroundColor: headerColor }]}>
          {Icon ? <Icon size={18} color="white" /> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
      </View>

      {shown.map((p) => {
        const labelTr = t(`metric.${p.label}`, { defaultValue: p.label });

        return (
          <View key={p.label} style={{ marginTop: 8 }}>
            {/* Row: label + value */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
              <Text style={{ color: MUTED, fontSize: 13, fontWeight: '600', flex: 1 }}>
                {labelTr}
              </Text>
              <Text style={{ color: TEXT, fontSize: 14, fontWeight: '800' }}>
                {formatValue(p.value, p.label)}
              </Text>
            </View>

            {/* Bar */}
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
                  width: `${p.y * 100}%`,
                  height: '100%',
                  backgroundColor: headerColor,
                }}
              />
            </View>

            {/* Hint */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
              <Text style={{ color: MUTED, fontSize: 11 }}>
                {t('low', { defaultValue: 'Low' })}
              </Text>
              <Text style={{ color: MUTED, fontSize: 11 }}>
                {t('high', { defaultValue: 'High' })}
              </Text>
            </View>
          </View>
        );
      })}

      {canToggle ? (
        <Pressable
          onPress={() => setCollapsed((c) => !c)}
          style={{ marginTop: 8, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10 }}
          accessibilityRole="button"
        >
          <Text style={{ color: MUTED, fontWeight: '700' }}>
            {collapsed
              ? t('showMore', { defaultValue: `Show ${listMetrics.length - collapsedCount} more` })
              : t('showLess', { defaultValue: 'Show less' })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: TEXT, fontWeight: '700', fontSize: 16 },
  titleFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
});
