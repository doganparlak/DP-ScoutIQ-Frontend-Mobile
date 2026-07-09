import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  BrickWall,
  GitCompareArrows,
  DraftingCompass,
  List,
  LogIn,
  Medal,
  LineChart,
  ShieldAlert,
  ShieldCheck,
  Star,
  Trophy,
  X,
} from 'lucide-react-native';
import {
  VictoryArea,
  VictoryChart,
  VictoryGroup,
  VictoryLabel,
  VictoryPolarAxis,
} from 'victory-native';

import { TutorialHint } from '@/components/Tutorial';
import {
  CONTRIBUTION_IMPACT_METRICS,
  DEFENDING_METRICS,
  ERRORS_DISCIPLINE_METRICS,
  GK_METRICS,
  PASSING_METRICS,
  SHOOTING_METRICS,
  toSpiderPoints,
} from '@/components/spiderRanges';
import PlayerCard from '@/components/PlayerCard';
import type { SpiderPoint } from '@/components/SpiderChart';
import { rolePickerCode } from '@/services/api';
import { ACCENT, CARD, DANGER, DANGER_DARK, LINE, MUTED, PANEL, TEXT } from '@/theme';
import type { PlayerData } from '@/types';

const PLAYER_2_ACCENT = '#38BDF8';
const PLAYER_3_ACCENT = '#F59E0B';
const CATEGORY_GREEN_BACKGROUND = 'rgba(22, 163, 74, 0.08)';

type ComparisonPlayer = {
  id: string;
  player: PlayerData;
};

type Props = {
  visible: boolean;
  loading: boolean;
  error: string | null;
  player1: ComparisonPlayer | null;
  player2: ComparisonPlayer | null;
  player3?: ComparisonPlayer | null;
  onClose: () => void;
  tutorialVisible?: boolean;
  onTutorialSkipAll?: () => void;
  worldCupMode?: boolean;
  theme?: {
    panel: string;
    card: string;
    line: string;
    accent: string;
    accentSoft: string;
    winnerAccent?: string;
    winnerSoft?: string;
    muted: string;
  };
};

type MetricRow = {
  metric: string;
  value1?: number;
  value2?: number;
  point1: SpiderPoint;
  point2: SpiderPoint;
};

type PartialMetricRow = {
  metric: string;
  value1?: number;
  value2?: number;
  point1?: SpiderPoint;
  point2?: SpiderPoint;
};

const GROUPS = [
  { key: 'goalkeeping', fallbackTitle: 'Goalkeeping', metrics: GK_METRICS, lowerIsBetter: false, Icon: ShieldCheck },
  {
    key: 'contribution_impact',
    fallbackTitle: 'Contribution & Impact',
    metrics: CONTRIBUTION_IMPACT_METRICS,
    lowerIsBetter: false,
    Icon: Star,
  },
  { key: 'shooting', fallbackTitle: 'Shooting & Finishing', metrics: SHOOTING_METRICS, lowerIsBetter: false, Icon: LogIn },
  { key: 'passing', fallbackTitle: 'Passing & Delivery', metrics: PASSING_METRICS, lowerIsBetter: false, Icon: DraftingCompass },
  { key: 'defending', fallbackTitle: 'Defending', metrics: DEFENDING_METRICS, lowerIsBetter: false, Icon: BrickWall },
  {
    key: 'errors_discipline',
    fallbackTitle: 'Errors & Discipline',
    metrics: ERRORS_DISCIPLINE_METRICS,
    lowerIsBetter: true,
    Icon: ShieldAlert,
  },
] as const;

function formatValue(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function roleShortLabel(value?: string) {
  return rolePickerCode(value);
}

function roleDistribution(player?: PlayerData | null) {
  const rawCounts = player?.meta?.positionCounts ?? {};
  const counts = Object.entries(rawCounts).reduce<Record<string, number>>((acc, [role, count]) => {
    const short = roleShortLabel(role);
    if (short && count > 0) acc[short] = (acc[short] || 0) + count;
    return acc;
  }, {});
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const fromCounts = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([role, count]) => ({
      role,
      pct: total > 0 ? Math.round((count / total) * 100) : null,
    }))
    .filter((item) => item.role);

  if (fromCounts.length) return fromCounts;

  const source = player?.meta?.positionNamesSeen?.length
    ? player.meta.positionNamesSeen
    : player?.meta?.roles ?? [];

  return Array.from(new Set(source.map(roleShortLabel).filter(Boolean)))
    .map((role) => ({ role, pct: null }));
}

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function scoreColor(value: number) {
  if (value < 50) return DANGER;
  if (value < 70) return '#F59E0B';
  return ACCENT;
}

function findStatValue(player: PlayerData | null, metric: string) {
  const stat = player?.stats?.find((item) => item.metric === metric);
  const value = typeof stat?.value === 'number' ? stat.value : Number(stat?.value);
  return Number.isFinite(value) ? value : undefined;
}

function formatAmpersandTitle(title: string, shouldSplit: boolean) {
  return shouldSplit ? title.replace(' & ', '\n& ') : title;
}

function compactPlayerName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return trimmed;

  const firstInitial = parts[0]?.[0]?.toLocaleUpperCase() ?? '';
  return `${firstInitial}. ${parts.slice(1).join(' ')}`;
}

function chartPlayerNameLabel(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return trimmed;

  const lastName = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((part) => part[0]?.toLocaleUpperCase())
    .filter(Boolean)
    .join('.');

  return initials ? `${initials}.${lastName}` : lastName;
}

function lastNameLabel(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? trimmed;
}

function uppercaseLabel(value: string, lang?: string) {
  return value.toLocaleUpperCase(lang?.startsWith('tr') ? 'tr-TR' : undefined);
}

function buildSyntheticRow(metric: string, value1: number | undefined, value2: number | undefined, min: number, max: number): MetricRow | null {
  if (typeof value1 !== 'number' || typeof value2 !== 'number') return null;
  if (!Number.isFinite(value1) || !Number.isFinite(value2)) return null;
  return {
    metric,
    value1,
    value2,
    point1: { label: metric, value: value1, min, max },
    point2: { label: metric, value: value2, min, max },
  };
}

function buildMetricRows(player1: PlayerData | null, player2: PlayerData | null) {
  const syntheticGroup = {
    key: 'scoutwise_scores',
    fallbackTitle: 'ScoutWise Scores & Ratings',
    metrics: [] as readonly string[],
    lowerIsBetter: false,
    Icon: Medal,
    rows: [
      buildSyntheticRow('Potential', player1?.meta?.potential, player2?.meta?.potential, 0, 100),
      buildSyntheticRow('Form', player1?.meta?.form, player2?.meta?.form, 0, 100),
      buildSyntheticRow('Rating', findStatValue(player1, 'Rating'), findStatValue(player2, 'Rating'), 0, 10),
    ].filter(Boolean) as MetricRow[],
  };

  return [
    syntheticGroup,
    ...GROUPS.map((group) => {
    const groupMetrics = group.metrics.filter((metric) => metric !== 'Rating');
    const p1 = player1 ? toSpiderPoints(player1.stats ?? [], groupMetrics) : [];
    const p2 = player2 ? toSpiderPoints(player2.stats ?? [], groupMetrics) : [];
    const byMetric = new Map<string, PartialMetricRow>();

    p1.forEach((point) => {
      const value = typeof point.value === 'number' ? point.value : Number(point.value);
      byMetric.set(point.label, {
        metric: point.label,
        value1: Number.isFinite(value) ? value : undefined,
        point1: { ...point, value: Number.isFinite(value) ? value : 0 },
      });
    });
    p2.forEach((point) => {
      const value = typeof point.value === 'number' ? point.value : Number(point.value);
      const current = byMetric.get(point.label) ?? { metric: point.label };
      byMetric.set(point.label, {
        ...current,
        value2: Number.isFinite(value) ? value : undefined,
        point2: { ...point, value: Number.isFinite(value) ? value : 0 },
      });
    });

    const rows = groupMetrics
      .map((metric) => byMetric.get(metric))
      .filter((row) => typeof row?.value1 === 'number' && typeof row?.value2 === 'number')
      .filter((row) => row?.point1 && row?.point2)
      .map((row) => row as MetricRow);

    return { ...group, rows };
    }),
  ].filter((group) => group.rows.length > 0);
}

function summaryMetricValue(player: PlayerData | null, metric: string) {
  if (metric === 'Potential') return player?.meta?.potential;
  if (metric === 'Form') return player?.meta?.form;
  return findStatValue(player, metric);
}

function metricPointForPlayer(player: PlayerData | null, metric: string, basePoint: SpiderPoint): SpiderPoint | null {
  const value = summaryMetricValue(player, metric);
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return { ...basePoint, label: metric, value };
}

function buildCategorySummaries(
  groups: ReturnType<typeof buildMetricRows>,
  player1Name: string,
  player2Name: string,
  player3: PlayerData | null,
  player3Name: string,
) {
  return groups.map((group) => {
    let player1Wins = 0;
    let player2Wins = 0;
    let player3Wins = 0;

    group.rows.forEach((row) => {
      const values = [
        row.value1,
        row.value2,
        player3 ? summaryMetricValue(player3, row.metric) : undefined,
      ];

      if (player3) {
        if (!values.every((value) => typeof value === 'number' && Number.isFinite(value))) return;
        const nums = values as number[];
        const best = group.lowerIsBetter ? Math.min(...nums) : Math.max(...nums);
        const winners = nums
          .map((value, index) => (value === best ? index : -1))
          .filter((index) => index >= 0);
        if (winners.length !== 1) return;
        if (winners[0] === 0) player1Wins += 1;
        else if (winners[0] === 1) player2Wins += 1;
        else player3Wins += 1;
        return;
      }

      const v1 = row.value1;
      const v2 = row.value2;
      if (typeof v1 !== 'number' || typeof v2 !== 'number' || v1 === v2) return;

      const player1Better = group.lowerIsBetter ? v1 < v2 : v1 > v2;
      if (player1Better) {
        player1Wins += 1;
      } else {
        player2Wins += 1;
      }
    });

    const counts = player3
      ? [player1Wins, player2Wins, player3Wins]
      : [player1Wins, player2Wins];
    const maxWins = Math.max(...counts);
    const winningIndexes = counts
      .map((count, index) => (count === maxWins ? index : -1))
      .filter((index) => index >= 0);
    const winner = maxWins === 0 || winningIndexes.length !== 1
      ? null
      : winningIndexes[0] === 0
        ? player1Name
        : winningIndexes[0] === 1
          ? player2Name
          : player3Name;

    return {
      key: group.key,
      fallbackTitle: group.fallbackTitle,
      winner,
      player1Wins,
      player2Wins,
      player3Wins: player3 ? player3Wins : undefined,
      total: group.rows.length,
    };
  });
}

export default function ComparisonModal({
  visible,
  loading,
  error,
  player1,
  player2,
  player3 = null,
  onClose,
  tutorialVisible = false,
  onTutorialSkipAll,
  worldCupMode = false,
  theme,
}: Props) {
  const { t, i18n } = useTranslation();
  const [chartGroups, setChartGroups] = React.useState<Record<string, boolean>>({});
  const [previewPlayer, setPreviewPlayer] = React.useState<PlayerData | null>(null);

  const hasThirdPlayer = !!player3?.player;

  const groups = React.useMemo(
    () => buildMetricRows(player1?.player ?? null, player2?.player ?? null),
    [player1?.player, player2?.player],
  );
  const categoryTitle = React.useCallback(
    (key: string, fallbackTitle: string) => {
      if (key === 'scoutwise_scores') {
        const title = String(t('scoutwise_scores', i18n.language.startsWith('tr') ? 'ScoutWise Skorları & Puanlar' : 'ScoutWise Scores & Ratings'));
        return title.replace('ScoutWise Skorları', 'ScoutWise\u00A0Skorları');
      }
      return String(t(key, fallbackTitle));
    },
    [i18n.language, t],
  );
  const categorySummaries = React.useMemo(
    () =>
      buildCategorySummaries(
        groups,
        player1?.player.name ?? String(t('matchupPlayer1Placeholder', 'Player 1')),
        player2?.player.name ?? String(t('matchupPlayer2Placeholder', 'Player 2')),
        player3?.player ?? null,
        player3?.player.name ?? String(t('matchupPlayer3Placeholder', 'Player 3')),
      ),
    [groups, player1?.player.name, player2?.player.name, player3?.player, player3?.player.name, t],
  );

  React.useEffect(() => {
    if (!visible) {
      setChartGroups({});
      setPreviewPlayer(null);
    }
  }, [visible]);

  const toggleChartGroup = React.useCallback((key: string) => {
    setChartGroups((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const renderPlayerHeader = (label: string, item: ComparisonPlayer | null) => {
    const player = item?.player;
    const roles = roleDistribution(player);
    const fullPotentialLabel = i18n.language?.startsWith('tr') ? 'POTANSİYEL' : t('potential', 'Potential');
    const scores = [
      {
        label: fullPotentialLabel,
        value: player && isValidScore(player.meta?.potential) ? player.meta.potential : undefined,
      },
      {
        label: t('form', 'Form'),
        value: player && isValidScore(player.meta?.form) ? player.meta.form : undefined,
      },
    ];
    const height = player?.meta?.height;
    const weight = player?.meta?.weight;
    const hasHeight = typeof height === 'number' && Number.isFinite(height);
    const hasWeight = typeof weight === 'number' && Number.isFinite(weight);
    const physicalValue = [
      hasHeight ? `${Math.round(height)} cm` : null,
      hasWeight ? `${Math.round(weight)} kg` : null,
    ].filter(Boolean).join(' · ');
    const upper = (value: string) => uppercaseLabel(value, i18n.language);
    return (
      <Pressable
        disabled={!player || tutorialVisible}
        onPress={() => player && setPreviewPlayer(player)}
        style={({ pressed }) => [
          styles.playerHeader,
          theme && { backgroundColor: theme.card, borderColor: theme.line },
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.playerIntroRow}>
          <View style={styles.playerIntroText}>
            <Text style={styles.playerSlotLabel}>{label}</Text>
            <Text numberOfLines={1} style={styles.playerName}>
              {player ? compactPlayerName(player.name) : '-'}
            </Text>
          </View>
          {physicalValue && !worldCupMode ? (
            <View style={styles.physicalChip}>
              <Text numberOfLines={1} style={styles.physicalChipLabel}>{upper(t('physical', 'Physical'))}</Text>
              <Text numberOfLines={1} style={styles.physicalChipValue}>{physicalValue}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.headerScoreRow}>
          {scores.map((score) => (
            <View key={score.label} style={styles.headerScorePill}>
              <Text numberOfLines={1} style={styles.headerScoreLabel}>{upper(score.label)}</Text>
              <Text style={[styles.headerScoreValue, score.value !== undefined ? { color: scoreColor(score.value) } : styles.headerScoreValueMissing]}>
                {score.value !== undefined ? Math.round(score.value) : '-'}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.identityGrid}>
          {worldCupMode ? (
            <View style={styles.identityPillRow}>
              <View style={styles.identityPill}>
                <Text numberOfLines={1} style={styles.identityPillLabel}>{upper(t('team', 'Team'))}</Text>
                <Text numberOfLines={1} style={styles.identityPillValue}>{player?.meta?.team ?? '-'}</Text>
              </View>
              <View style={styles.identityPill}>
                <Text numberOfLines={1} style={styles.identityPillLabel}>{upper(t('age', 'Age'))}</Text>
                <Text numberOfLines={1} style={styles.identityPillValue}>{player?.meta?.age ? `${player.meta.age}` : '-'}</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.identityPillRow}>
                <View style={styles.identityPill}>
                  <Text numberOfLines={1} style={styles.identityPillLabel}>{upper(t('team', 'Team'))}</Text>
                  <Text numberOfLines={1} style={styles.identityPillValue}>{player?.meta?.team ?? '-'}</Text>
                </View>
                <View style={styles.identityPill}>
                  <Text numberOfLines={1} style={styles.identityPillLabel}>{upper(t('league', 'League'))}</Text>
                  <Text numberOfLines={1} style={styles.identityPillValue}>{player?.meta?.league ?? '-'}</Text>
                </View>
              </View>
              <View style={styles.identityPillRow}>
                <View style={styles.identityPill}>
                  <Text numberOfLines={1} style={styles.identityPillLabel}>{upper(t('age', 'Age'))}</Text>
                  <Text numberOfLines={1} style={styles.identityPillValue}>{player?.meta?.age ? `${player.meta.age}` : '-'}</Text>
                </View>
                <View style={styles.identityPill}>
                  <Text numberOfLines={1} style={styles.identityPillLabel}>{upper(t('nationality', 'Nationality'))}</Text>
                  <Text numberOfLines={1} style={styles.identityPillValue}>{player?.meta?.nationality ?? '-'}</Text>
                </View>
              </View>
            </>
          )}
        </View>
        <View style={styles.headerRolesArea}>
          <Text style={styles.headerRolesLabel}>{upper(t('roleDistribution', 'Role Distribution'))}</Text>
          {roles.length ? (
            <View style={styles.headerRolesRow}>
              {roles.map((item) => (
                <View key={`${item.role}-${item.pct ?? 'role'}`} style={styles.headerRolePill}>
                  <Text numberOfLines={1} style={styles.headerRoleText}>
                    {item.role}
                    {item.pct !== null ? <Text style={styles.headerRolePctText}> {item.pct}%</Text> : null}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.headerRoleMissing}>-</Text>
          )}
        </View>
      </Pressable>
    );
  };

  const renderTwoWayMetricValue = (
    value: number | undefined,
    otherValue: number | undefined,
    lowerIsBetter: boolean,
  ) => {
    const hasBoth =
      typeof value === 'number' &&
      Number.isFinite(value) &&
      typeof otherValue === 'number' &&
      Number.isFinite(otherValue);
    const isWinner = hasBoth && value !== otherValue && (lowerIsBetter ? value < otherValue : value > otherValue);

    return (
      <View style={[
        styles.twoValueCell,
        isWinner && (theme ? { backgroundColor: theme.winnerSoft ?? theme.accentSoft } : styles.valueCellWinner),
        isWinner && { borderColor: theme?.winnerAccent ?? theme?.accent ?? ACCENT },
      ]}>
        <Text style={[
          styles.valueText,
          isWinner && (theme ? { color: theme.winnerAccent ?? theme.accent, fontWeight: '900' } : styles.valueTextWinner),
        ]}>
          {formatValue(value)}
        </Text>
      </View>
    );
  };

  const renderTwoWayValueHeader = (player1Name: string, player2Name: string) => (
    <View style={styles.twoValueHeaderBlock}>
      <View style={styles.twoMetricNameCell} />
      <View style={styles.twoValuesRow}>
        {[player1Name, player2Name].map((name, index) => (
          <View key={`${name}-${index}`} style={styles.twoValueHeaderCell}>
            <Text numberOfLines={1} style={styles.valueHeaderText}>{lastNameLabel(name)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderThreeWayValueHeader = (names: string[]) => (
    <View style={styles.threeValueHeaderBlock}>
      <View style={styles.threeMetricNameCell} />
      <View style={styles.threeValuesRow}>
        {names.map((name, index) => (
          <View key={`${name}-${index}`} style={styles.threeValueHeaderCell}>
            <Text numberOfLines={1} style={styles.valueHeaderText}>{lastNameLabel(name)}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderDualSpiderChart = (
    title: string,
    rows: MetricRow[],
    player1Name: string,
    player2Name: string,
  ) => {
    const cleaned = rows
      .map((row, index) => {
        const min = Number(row.point1.min);
        const max = Number(row.point1.max);
        const v1 = Number(row.value1);
        const v2 = Number(row.value2);
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
        if (!Number.isFinite(v1) || !Number.isFinite(v2)) return null;

        return {
          x: String(index + 1),
          label: row.metric,
          y1: Math.max(0, Math.min(1, (v1 - min) / (max - min))),
          y2: Math.max(0, Math.min(1, (v2 - min) / (max - min))),
        };
      })
      .filter(Boolean) as Array<{ x: string; label: string; y1: number; y2: number }>;

    if (cleaned.length < 3) {
      return (
        <View style={styles.emptyChartState}>
          <Text style={styles.emptyText}>
            {t('notEnoughChartMetrics', 'At least three shared metrics are needed for a chart.')}
          </Text>
        </View>
      );
    }

    const labelToLines = (label: string) => {
      const translated = t(`metric.${label}`, label) as string;
      const parts = translated.trim().split(/\s+/).filter(Boolean);
      return parts.join('\n');
    };

    return (
      <View style={styles.dualChartCard}>
        <View style={styles.dualChartHeader}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
            <Text numberOfLines={1} style={styles.legendText}>{chartPlayerNameLabel(player1Name)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PLAYER_2_ACCENT }]} />
            <Text numberOfLines={1} style={styles.legendText}>{chartPlayerNameLabel(player2Name)}</Text>
          </View>
        </View>

        <VictoryChart
          polar
          height={320}
          padding={{ top: 34, bottom: 42, left: 35, right: 83 }}
          categories={{ x: cleaned.map((point) => point.x) }}
          domain={{ y: [0, 1] }}
          startAngle={90}
          endAngle={450}
        >
          <VictoryPolarAxis
            dependentAxis
            tickFormat={() => ''}
            style={{
              axis: { stroke: 'transparent' },
              grid: { stroke: MUTED, opacity: 0.28 },
              tickLabels: { fill: MUTED, fontSize: 10 },
            }}
          />
          <VictoryPolarAxis
            tickValues={cleaned.map((point) => point.x)}
            tickFormat={(_, index) => labelToLines(cleaned[index]?.label ?? '')}
            tickLabelComponent={
              <VictoryLabel
                angle={0}
                textAnchor="middle"
                verticalAnchor="middle"
                dy={4}
                style={{ fill: MUTED, fontSize: 10.5, fontWeight: '700' }}
              />
            }
            style={{
              axis: { stroke: MUTED, opacity: 0.22 },
              grid: { stroke: MUTED, opacity: 0.22 },
            }}
          />
          <VictoryGroup>
            <VictoryArea
              data={cleaned.map((point) => ({ x: point.x, y: point.y1 }))}
              style={{
                data: {
                  fill: ACCENT,
                  fillOpacity: 0.18,
                  stroke: ACCENT,
                  strokeWidth: 2.2,
                },
              }}
            />
            <VictoryArea
              data={cleaned.map((point) => ({ x: point.x, y: point.y2 }))}
              style={{
                data: {
                  fill: PLAYER_2_ACCENT,
                  fillOpacity: 0.14,
                  stroke: PLAYER_2_ACCENT,
                  strokeWidth: 2.2,
                },
              }}
            />
          </VictoryGroup>
        </VictoryChart>
      </View>
    );
  };

  const renderDualErrorTiles = (rows: MetricRow[], player1Name: string, player2Name: string) => {
    const riskFor = (point: SpiderPoint, value?: number) => {
      const min = Number(point.min);
      const max = Number(point.max);
      const v = Number(value);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(v)) return 0;
      return Math.max(0, Math.min(1, (v - min) / (max - min)));
    };

    const severityColor = (risk: number) => {
      if (risk < 0.33) return ACCENT;
      if (risk < 0.66) return '#F59E0B';
      return DANGER;
    };

    return (
      <View style={styles.dualTilesCard}>
        <View style={styles.dualTilesHintRow}>
          <Text style={styles.dualTilesHint}>{t('riskBetter', 'Better')}</Text>
          <Text style={styles.dualTilesHint}>{t('riskWorse', 'Worse')}</Text>
        </View>

        {rows.map((row) => {
          const p1Risk = riskFor(row.point1, row.value1);
          const p2Risk = riskFor(row.point2, row.value2);
          const p1Better = typeof row.value1 === 'number' && typeof row.value2 === 'number' && row.value1 < row.value2;
          const p2Better = typeof row.value1 === 'number' && typeof row.value2 === 'number' && row.value2 < row.value1;

          return (
            <View key={row.metric} style={styles.dualTileRow}>
              <Text numberOfLines={2} style={styles.dualTileMetric}>
                {String(t(`metric.${row.metric}`, row.metric))}
              </Text>

              <View style={styles.dualRiskStack}>
                <View style={[styles.dualRiskCell, p1Better && styles.dualRiskCellWinner]}>
                  <View style={styles.dualRiskTopLine}>
                    <Text style={[styles.dualRiskValue, p1Better && styles.dualRiskValueWinner]}>
                      {formatValue(row.value1)}
                    </Text>
                    <Text numberOfLines={1} style={styles.dualRiskLabel}>{compactPlayerName(player1Name)}</Text>
                  </View>
                  <View style={styles.dualRiskTrack}>
                    <View
                      style={[
                        styles.dualRiskFill,
                        { width: `${p1Risk * 100}%`, backgroundColor: severityColor(p1Risk) },
                      ]}
                    />
                  </View>
                </View>

                <View style={[styles.dualRiskCell, p2Better && styles.dualRiskCellWinner]}>
                  <View style={styles.dualRiskTopLine}>
                    <Text style={[styles.dualRiskValue, p2Better && styles.dualRiskValueWinner]}>
                      {formatValue(row.value2)}
                    </Text>
                    <Text numberOfLines={1} style={styles.dualRiskLabel}>{compactPlayerName(player2Name)}</Text>
                  </View>
                  <View style={styles.dualRiskTrack}>
                    <View
                      style={[
                        styles.dualRiskFill,
                        { width: `${p2Risk * 100}%`, backgroundColor: severityColor(p2Risk) },
                      ]}
                    />
                  </View>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const threeWayRowsForGroup = React.useCallback((rows: MetricRow[]) => {
    if (!player3?.player) return [];
    return rows
      .map((row) => {
        const point3 = metricPointForPlayer(player3.player, row.metric, row.point1);
        if (!point3) return null;
        return { ...row, value3: point3.value, point3 };
      })
      .filter(Boolean) as Array<MetricRow & { value3: number; point3: SpiderPoint }>;
  }, [player3?.player]);

  const renderThreeWayMetricValue = (
    value: number | undefined,
    values: Array<number | undefined>,
    lowerIsBetter: boolean,
  ) => {
    const numeric = values.filter((item): item is number => typeof item === 'number' && Number.isFinite(item));
    const hasAll = numeric.length === values.length;
    const best = hasAll ? (lowerIsBetter ? Math.min(...numeric) : Math.max(...numeric)) : undefined;
    const winnerCount = best === undefined ? 0 : numeric.filter((item) => item === best).length;
    const isWinner = typeof value === 'number' && value === best && winnerCount === 1;

    return (
      <View style={[
        styles.threeValueCell,
        isWinner && (theme ? { backgroundColor: theme.winnerSoft ?? theme.accentSoft } : styles.valueCellWinner),
        isWinner && { borderColor: theme?.winnerAccent ?? theme?.accent ?? ACCENT },
      ]}>
        <Text style={[
          styles.valueText,
          isWinner && (theme ? { color: theme.winnerAccent ?? theme.accent, fontWeight: '900' } : styles.valueTextWinner),
        ]}>
          {formatValue(value)}
        </Text>
      </View>
    );
  };

  const renderThreeWaySpiderChart = (
    rows: Array<MetricRow & { value3: number; point3: SpiderPoint }>,
    player1Name: string,
    player2Name: string,
    player3Name: string,
  ) => {
    const cleaned = rows
      .map((row, index) => {
        const min = Number(row.point1.min);
        const max = Number(row.point1.max);
        const v1 = Number(row.value1);
        const v2 = Number(row.value2);
        const v3 = Number(row.value3);
        if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
        if (!Number.isFinite(v1) || !Number.isFinite(v2) || !Number.isFinite(v3)) return null;
        return {
          x: String(index + 1),
          label: row.metric,
          y1: Math.max(0, Math.min(1, (v1 - min) / (max - min))),
          y2: Math.max(0, Math.min(1, (v2 - min) / (max - min))),
          y3: Math.max(0, Math.min(1, (v3 - min) / (max - min))),
        };
      })
      .filter(Boolean) as Array<{ x: string; label: string; y1: number; y2: number; y3: number }>;

    if (cleaned.length < 3) {
      return (
        <View style={styles.emptyChartState}>
          <Text style={styles.emptyText}>
            {t('notEnoughChartMetrics', 'At least three shared metrics are needed for a chart.')}
          </Text>
        </View>
      );
    }

    const labelToLines = (label: string) => {
      const translated = t(`metric.${label}`, label) as string;
      return translated.trim().split(/\s+/).filter(Boolean).join('\n');
    };

    return (
      <View style={styles.dualChartCard}>
        <View style={styles.dualChartHeader}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
            <Text numberOfLines={1} style={styles.legendText}>{chartPlayerNameLabel(player1Name)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PLAYER_2_ACCENT }]} />
            <Text numberOfLines={1} style={styles.legendText}>{chartPlayerNameLabel(player2Name)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PLAYER_3_ACCENT }]} />
            <Text numberOfLines={1} style={styles.legendText}>{chartPlayerNameLabel(player3Name)}</Text>
          </View>
        </View>
        <VictoryChart
          polar
          height={320}
          padding={{ top: 34, bottom: 42, left: 35, right: 83 }}
          categories={{ x: cleaned.map((point) => point.x) }}
          domain={{ y: [0, 1] }}
          startAngle={90}
          endAngle={450}
        >
          <VictoryPolarAxis
            dependentAxis
            tickFormat={() => ''}
            style={{ axis: { stroke: 'transparent' }, grid: { stroke: MUTED, opacity: 0.28 }, tickLabels: { fill: MUTED, fontSize: 10 } }}
          />
          <VictoryPolarAxis
            tickValues={cleaned.map((point) => point.x)}
            tickFormat={(_, index) => labelToLines(cleaned[index]?.label ?? '')}
            tickLabelComponent={<VictoryLabel angle={0} textAnchor="middle" verticalAnchor="middle" dy={4} style={{ fill: MUTED, fontSize: 10.5, fontWeight: '700' }} />}
            style={{ axis: { stroke: MUTED, opacity: 0.22 }, grid: { stroke: MUTED, opacity: 0.22 } }}
          />
          <VictoryGroup>
            <VictoryArea data={cleaned.map((point) => ({ x: point.x, y: point.y1 }))} style={{ data: { fill: ACCENT, fillOpacity: 0.16, stroke: ACCENT, strokeWidth: 2.2 } }} />
            <VictoryArea data={cleaned.map((point) => ({ x: point.x, y: point.y2 }))} style={{ data: { fill: PLAYER_2_ACCENT, fillOpacity: 0.12, stroke: PLAYER_2_ACCENT, strokeWidth: 2.2 } }} />
            <VictoryArea data={cleaned.map((point) => ({ x: point.x, y: point.y3 }))} style={{ data: { fill: PLAYER_3_ACCENT, fillOpacity: 0.10, stroke: PLAYER_3_ACCENT, strokeWidth: 2.2 } }} />
          </VictoryGroup>
        </VictoryChart>
      </View>
    );
  };

  const renderThreeWayErrorTiles = (
    rows: Array<MetricRow & { value3: number; point3: SpiderPoint }>,
    names: string[],
  ) => {
    const riskFor = (point: SpiderPoint, value?: number) => {
      const min = Number(point.min);
      const max = Number(point.max);
      const v = Number(value);
      if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || !Number.isFinite(v)) return 0;
      return Math.max(0, Math.min(1, (v - min) / (max - min)));
    };
    const severityColor = (risk: number) => {
      if (risk < 0.33) return ACCENT;
      if (risk < 0.66) return '#F59E0B';
      return DANGER;
    };

    return (
      <View style={styles.dualTilesCard}>
        {rows.map((row) => {
          const values = [row.value1, row.value2, row.value3];
          const best = Math.min(...(values as number[]));
          return (
            <View key={row.metric} style={styles.dualTileRow}>
              <Text numberOfLines={2} style={styles.dualTileMetric}>
                {String(t(`metric.${row.metric}`, row.metric))}
              </Text>
              {[row.point1, row.point2, row.point3].map((point, index) => {
                const value = values[index];
                const risk = riskFor(point, value);
                const isWinner = value === best && values.filter((item) => item === best).length === 1;
                return (
                  <View key={`${row.metric}-${index}`} style={[styles.dualRiskCell, isWinner && styles.dualRiskCellWinner]}>
                    <View style={styles.dualRiskTopLine}>
                      <Text style={[styles.dualRiskValue, isWinner && styles.dualRiskValueWinner]}>
                        {formatValue(value)}
                      </Text>
                      <Text numberOfLines={1} style={styles.dualRiskLabel}>{compactPlayerName(names[index] ?? '-')}</Text>
                    </View>
                    <View style={styles.dualRiskTrack}>
                      <View style={[styles.dualRiskFill, { width: `${risk * 100}%`, backgroundColor: severityColor(risk) }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <>
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, theme && { backgroundColor: theme.panel, borderColor: theme.line }]}>
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <GitCompareArrows size={18} color={theme?.accent ?? ACCENT} strokeWidth={2.2} />
              <Text style={[styles.modalTitle, theme && { color: theme.accent }]}>{t('matchupComparisonTitle', 'Matchup Comparison')}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityLabel={t('close', 'Close')}
            >
              {({ pressed }) => (
                <X size={20} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
              )}
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={theme?.accent ?? ACCENT} />
              <Text style={styles.loadingText}>{t('loadingMatchupComparison', 'Loading matchup comparison...')}</Text>
            </View>
          ) : error ? (
            <View style={styles.emptyState}>
              <ShieldAlert size={22} color={DANGER} strokeWidth={2.2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <TutorialHint
                visible={tutorialVisible}
                title={t('tutorialComparisonTitle', 'Matchup comparison')}
                body={t(
                  'tutorialComparisonBody',
                  'Compare both players by shared metrics. Close this modal when you are done.',
                )}
                onSkipAll={onTutorialSkipAll}
                arrow="none"
              />
              <View style={styles.playersStack}>
                {renderPlayerHeader(t('matchupPlayer1Placeholder', 'Player 1'), player1)}
                {renderPlayerHeader(t('matchupPlayer2Placeholder', 'Player 2'), player2)}
                {hasThirdPlayer ? renderPlayerHeader(t('matchupPlayer3Placeholder', 'Player 3'), player3) : null}
              </View>

              {groups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {t('noComparisonMetrics', 'No comparable metrics are available for these players.')}
                  </Text>
                </View>
              ) : (
                <>
                <View style={[styles.summaryBlock, theme && { borderColor: theme.line, backgroundColor: theme.card }]}>
                  <View style={styles.summaryHeader}>
                    <Trophy size={16} color={theme?.accent ?? ACCENT} strokeWidth={2.2} />
                    <Text style={[styles.summaryTitle, theme && { color: theme.accent }]}>
                      {t('categoryLeaders', 'Category Leaders')}
                    </Text>
                  </View>
                  <View style={styles.summaryGrid}>
                    {categorySummaries.map((item) => (
                      <View key={item.key} style={[styles.summaryRow, theme && { borderColor: theme.line }]}>
                        <Text
                          numberOfLines={2}
                          adjustsFontSizeToFit={item.key === 'scoutwise_scores'}
                          minimumFontScale={0.86}
                          style={styles.summaryCategory}
                        >
                          {formatAmpersandTitle(
                            categoryTitle(item.key, item.fallbackTitle),
                            item.key === 'scoutwise_scores' || item.key === 'contribution_impact' || (hasThirdPlayer && item.key === 'errors_discipline'),
                          )}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.summaryWinner,
                            item.winner
                              ? { color: theme?.winnerAccent ?? theme?.accent ?? ACCENT }
                              : { color: MUTED },
                          ]}
                        >
                          {item.winner ? compactPlayerName(item.winner) : t('evenCategory', 'Even')}
                        </Text>
                        <Text style={styles.summaryScore}>
                          {item.player3Wins !== undefined
                            ? `${item.player1Wins}-${item.player2Wins}-${item.player3Wins}`
                            : `${item.player1Wins}-${item.player2Wins}`}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {groups.map((group) => {
                  const threeRows = hasThirdPlayer ? threeWayRowsForGroup(group.rows) : [];
                  const rowsForDisplay = hasThirdPlayer ? threeRows : group.rows;
                  const chartableCount = rowsForDisplay.length;
                  const showToggle = chartableCount >= 5;

                  return (
                  <View key={group.key} style={[styles.groupBlock, theme && { borderColor: theme.line }, { backgroundColor: CATEGORY_GREEN_BACKGROUND }]}>
                    <View style={[styles.groupHeader, theme && { borderBottomColor: theme.line }]}>
                      <View style={styles.groupTitleRow}>
                        <group.Icon size={16} color={theme?.accent ?? ACCENT} strokeWidth={2.2} />
                        <Text style={[styles.groupTitle, theme && { color: theme.accent }]}>
                          {formatAmpersandTitle(
                            categoryTitle(group.key, group.fallbackTitle),
                            group.key === 'contribution_impact' && showToggle,
                          )}
                        </Text>
                      </View>
                      {showToggle ? (
                        <Pressable
                          onPress={() => toggleChartGroup(group.key)}
                          style={({ pressed }) => [
                            styles.chartToggle,
                            theme && { borderColor: theme.accent, backgroundColor: theme.accentSoft },
                            pressed && styles.pressed,
                          ]}
                        >
                          {chartGroups[group.key] ? (
                            <List size={14} color={theme?.accent ?? ACCENT} strokeWidth={2.2} />
                          ) : (
                            <LineChart size={14} color={theme?.accent ?? ACCENT} strokeWidth={2.2} />
                          )}
                          <Text style={[styles.chartToggleText, theme && { color: theme.accent }]}>
                            {chartGroups[group.key]
                              ? t('showNumbers', 'Show numbers')
                              : t('showOnChart', 'Show on chart')}
                          </Text>
                        </Pressable>
                      ) : group.lowerIsBetter ? (
                        <Text style={styles.groupHint}>
                          {t('lowerIsBetter', 'Lower is better')}
                        </Text>
                      ) : null}
                    </View>

                    {hasThirdPlayer ? (
                      chartGroups[group.key] ? (
                        group.lowerIsBetter
                          ? renderThreeWayErrorTiles(
                              threeRows,
                              [
                                player1?.player.name ?? String(t('matchupPlayer1Placeholder', 'Player 1')),
                                player2?.player.name ?? String(t('matchupPlayer2Placeholder', 'Player 2')),
                                player3?.player.name ?? String(t('matchupPlayer3Placeholder', 'Player 3')),
                              ],
                            )
                          : renderThreeWaySpiderChart(
                              threeRows,
                              player1?.player.name ?? String(t('matchupPlayer1Placeholder', 'Player 1')),
                              player2?.player.name ?? String(t('matchupPlayer2Placeholder', 'Player 2')),
                              player3?.player.name ?? String(t('matchupPlayer3Placeholder', 'Player 3')),
                            )
                      ) : (
                        <>
                          {renderThreeWayValueHeader([
                            player1?.player.name ?? String(t('matchupPlayer1Placeholder', 'Player 1')),
                            player2?.player.name ?? String(t('matchupPlayer2Placeholder', 'Player 2')),
                            player3?.player.name ?? String(t('matchupPlayer3Placeholder', 'Player 3')),
                          ])}
                          {threeRows.map((row) => (
                            <View key={row.metric} style={styles.threeMetricRow}>
                              <View style={styles.threeMetricNameCell}>
                                <Text numberOfLines={2} style={styles.metricName}>
                                  {String(t(`metric.${row.metric}`, row.metric))}
                                </Text>
                              </View>
                              <View style={styles.threeValuesRow}>
                                {renderThreeWayMetricValue(row.value1, [row.value1, row.value2, row.value3], group.lowerIsBetter)}
                                {renderThreeWayMetricValue(row.value2, [row.value1, row.value2, row.value3], group.lowerIsBetter)}
                                {renderThreeWayMetricValue(row.value3, [row.value1, row.value2, row.value3], group.lowerIsBetter)}
                              </View>
                            </View>
                          ))}
                        </>
                      )
                    ) : chartGroups[group.key] ? (
                      group.lowerIsBetter
                        ? renderDualErrorTiles(
                            group.rows,
                            player1?.player.name ?? String(t('matchupPlayer1Placeholder', 'Player 1')),
                            player2?.player.name ?? String(t('matchupPlayer2Placeholder', 'Player 2')),
                          )
                        : renderDualSpiderChart(
                            categoryTitle(group.key, group.fallbackTitle),
                            group.rows,
                            player1?.player.name ?? String(t('matchupPlayer1Placeholder', 'Player 1')),
                            player2?.player.name ?? String(t('matchupPlayer2Placeholder', 'Player 2')),
                          )
                    ) : (
                      <>
                        {renderTwoWayValueHeader(
                          player1?.player.name ?? String(t('matchupPlayer1Placeholder', 'Player 1')),
                          player2?.player.name ?? String(t('matchupPlayer2Placeholder', 'Player 2')),
                        )}
                        {group.rows.map((row) => (
                          <View key={row.metric} style={styles.twoMetricRow}>
                            <View style={styles.twoMetricNameCell}>
                              <Text numberOfLines={2} style={styles.metricName}>
                                {String(t(`metric.${row.metric}`, row.metric))}
                              </Text>
                            </View>
                            <View style={styles.twoValuesRow}>
                              {renderTwoWayMetricValue(row.value1, row.value2, group.lowerIsBetter)}
                              {renderTwoWayMetricValue(row.value2, row.value1, group.lowerIsBetter)}
                            </View>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                  );
                })}
                </>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
    <Modal
      transparent
      visible={!!previewPlayer}
      animationType="fade"
      onRequestClose={() => setPreviewPlayer(null)}
    >
      <View style={styles.previewBackdrop}>
        <View style={styles.previewCardWrap}>
          {previewPlayer ? (
            <PlayerCard player={previewPlayer} titleAlign="center" />
          ) : null}
          <Pressable
            onPress={() => setPreviewPlayer(null)}
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            style={({ pressed }) => [styles.previewClose, pressed && styles.pressed]}
            accessibilityLabel={t('closePlayerCard', 'Close player card')}
          >
            {({ pressed }) => (
              <X size={22} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.64)',
    justifyContent: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    color: ACCENT,
    fontSize: 17,
    fontWeight: '900',
  },
  playersStack: {
    gap: 10,
    marginBottom: 14,
  },
  playerHeader: {
    flex: 1,
    alignSelf: 'stretch',
    minHeight: 252,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    padding: 12,
    gap: 7,
  },
  playerSlotLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  playerIntroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  playerIntroText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  playerName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
    minWidth: 0,
  },
  physicalChip: {
    maxWidth: 118,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.16)',
    backgroundColor: 'rgba(255,255,255,0.018)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 1,
  },
  physicalChipLabel: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: '800',
  },
  physicalChipValue: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 10.5,
    fontWeight: '800',
  },
  headerScoreRow: {
    flexDirection: 'row',
    gap: 6,
  },
  headerScorePill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(255,255,255,0.025)',
    paddingHorizontal: 7,
    paddingVertical: 6,
    gap: 2,
  },
  headerScoreLabel: {
    color: MUTED,
    fontSize: 9.5,
    fontWeight: '800',
  },
  headerScoreValue: {
    fontSize: 13,
    fontWeight: '900',
  },
  headerScoreValueMissing: {
    color: MUTED,
  },
  headerRolesArea: {
    minHeight: 74,
    maxHeight: 74,
    justifyContent: 'flex-start',
    overflow: 'hidden',
    marginTop: 'auto',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(255,255,255,0.018)',
    paddingHorizontal: 7,
    paddingVertical: 6,
    gap: 5,
  },
  headerRolesLabel: {
    color: MUTED,
    fontSize: 9.5,
    fontWeight: '800',
  },
  headerRolesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
    gap: 5,
  },
  headerRolePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.22)',
    backgroundColor: 'rgba(22, 163, 74, 0.13)',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  headerRoleText: {
    color: ACCENT,
    fontSize: 10.5,
    fontWeight: '800',
  },
  headerRolePctText: {
    color: MUTED,
  },
  headerRoleMissing: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  identityGrid: {
    gap: 6,
  },
  identityPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  identityPill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(255,255,255,0.025)',
    paddingHorizontal: 7,
    paddingVertical: 6,
    gap: 2,
  },
  identityPillLabel: {
    color: MUTED,
    fontSize: 9.5,
    fontWeight: '800',
  },
  identityPillValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryTitle: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '900',
  },
  summaryGrid: {
    gap: 8,
  },
  summaryRow: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(17, 19, 21, 0.42)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryCategory: {
    flex: 1,
    minWidth: 0,
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
  },
  summaryWinner: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '900',
  },
  summaryScore: {
    width: 50,
    textAlign: 'right',
    color: MUTED,
    fontSize: 11,
    fontWeight: '900',
  },
  groupBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CATEGORY_GREEN_BACKGROUND,
    overflow: 'hidden',
    marginBottom: 12,
  },
  groupHeader: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  groupTitle: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '900',
    flex: 1,
  },
  groupTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupHint: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
  },
  chartToggle: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  chartToggleText: {
    color: ACCENT,
    fontSize: 10.5,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dualChartCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    margin: 10,
    padding: 10,
  },
  dualChartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 2,
  },
  legendItem: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
  },
  dualTilesCard: {
    backgroundColor: CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    margin: 10,
    padding: 12,
    gap: 12,
  },
  dualTilesLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  dualTileRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(26, 29, 26, 0.72)',
    padding: 10,
    gap: 9,
  },
  dualTileMetric: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  dualRiskStack: {
    gap: 8,
  },
  dualRiskCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(31, 34, 32, 0.78)',
    padding: 8,
    gap: 7,
  },
  dualRiskCellWinner: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
  },
  dualRiskTopLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 6,
  },
  dualRiskValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '900',
  },
  dualRiskValueWinner: {
    color: ACCENT,
  },
  dualRiskLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  dualRiskTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: '#272a2a',
    overflow: 'hidden',
  },
  dualRiskFill: {
    height: '100%',
    borderRadius: 999,
  },
  dualTilesHintRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dualTilesHint: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '700',
  },
  metricRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  twoValueHeaderBlock: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: 'rgba(17, 19, 21, 0.32)',
  },
  twoValueHeaderCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(17, 19, 21, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  valueHeaderText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  threeValueHeaderBlock: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: 'rgba(17, 19, 21, 0.32)',
  },
  threeValueHeaderCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(17, 19, 21, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  twoMetricRow: {
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  twoMetricNameCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  twoValuesRow: {
    flexDirection: 'row',
    gap: 7,
  },
  twoValueCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(17, 19, 21, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  threeMetricRow: {
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
  },
  threeMetricNameCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  threeValuesRow: {
    flexDirection: 'row',
    gap: 7,
  },
  threeValueCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(17, 19, 21, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  valueCell: {
    flex: 0.72,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  valueCellWinner: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  valueText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },
  valueTextWinner: {
    color: ACCENT,
    fontWeight: '900',
  },
  metricNameCell: {
    flex: 1.12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  metricName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  loadingState: {
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  errorText: {
    color: DANGER,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyChartState: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.68)',
    justifyContent: 'center',
    padding: 18,
  },
  previewCardWrap: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 16,
    overflow: 'visible',
    padding: 2,
    position: 'relative',
  },
  previewClose: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    padding: 6,
  },
  pressed: {
    opacity: 0.9,
  },
});
