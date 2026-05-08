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
  Bug,
  DraftingCompass,
  List,
  LogIn,
  Medal,
  LineChart,
  ShieldAlert,
  ShieldCheck,
  Star,
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
import { ROLE_LONG_TO_SHORT } from '@/services/api';
import { ACCENT, CARD, DANGER, DANGER_DARK, LINE, MUTED, PANEL, TEXT } from '@/theme';
import type { PlayerData } from '@/types';

const PLAYER_2_ACCENT = '#38BDF8';

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
  onClose: () => void;
  tutorialVisible?: boolean;
  onTutorialSkipAll?: () => void;
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
    Icon: Bug,
  },
] as const;

function formatValue(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function roleLabel(player: PlayerData) {
  const raw = player.meta?.roles?.[0];
  if (!raw) return '-';
  return ROLE_LONG_TO_SHORT[raw] || raw;
}

function compactPlayerName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const parts = trimmed.split(/\s+/);
  if (parts.length < 3) return trimmed;

  const initials = parts
    .slice(2)
    .map((part) => `${part[0]?.toLocaleUpperCase() ?? ''}.`)
    .join('');

  return `${parts[0]} ${parts[1]} ${initials}`;
}

function buildMetricRows(player1: PlayerData | null, player2: PlayerData | null) {
  return GROUPS.map((group) => {
    const p1 = player1 ? toSpiderPoints(player1.stats ?? [], group.metrics) : [];
    const p2 = player2 ? toSpiderPoints(player2.stats ?? [], group.metrics) : [];
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

    const rows = group.metrics
      .map((metric) => byMetric.get(metric))
      .filter((row) => typeof row?.value1 === 'number' && typeof row?.value2 === 'number')
      .filter((row) => row?.point1 && row?.point2)
      .map((row) => row as MetricRow);

    return { ...group, rows };
  }).filter((group) => group.rows.length > 0);
}

export default function ComparisonModal({
  visible,
  loading,
  error,
  player1,
  player2,
  onClose,
  tutorialVisible = false,
  onTutorialSkipAll,
}: Props) {
  const { t } = useTranslation();
  const [chartGroups, setChartGroups] = React.useState<Record<string, boolean>>({});
  const [previewPlayer, setPreviewPlayer] = React.useState<PlayerData | null>(null);

  const groups = React.useMemo(
    () => buildMetricRows(player1?.player ?? null, player2?.player ?? null),
    [player1?.player, player2?.player],
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

    return (
      <Pressable
        disabled={!player || tutorialVisible}
        onPress={() => player && setPreviewPlayer(player)}
        style={({ pressed }) => [styles.playerHeader, pressed && styles.pressed]}
      >
        <Text style={styles.playerSlotLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.playerName}>
          {player ? compactPlayerName(player.name) : '-'}
        </Text>
        <View style={styles.identityGrid}>
          <Text numberOfLines={1} style={styles.identityText}>{player?.meta?.team ?? '-'}</Text>
          <Text numberOfLines={1} style={styles.identityText}>{player?.meta?.league ?? '-'}</Text>
          <Text numberOfLines={1} style={styles.identityText}>{player?.meta?.nationality ?? '-'}</Text>
          <Text numberOfLines={1} style={styles.identityText}>
            {player?.meta?.age ? `${player.meta.age}` : '-'} | {roleLabel(player ?? { name: '', stats: [] })}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderMetricValue = (
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
      <View style={[styles.valueCell, isWinner && styles.valueCellWinner]}>
        <Text style={[styles.valueText, isWinner && styles.valueTextWinner]}>
          {formatValue(value)}
        </Text>
      </View>
    );
  };

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
      const translated = t(`metric.${label}`, label);
      const parts = translated.trim().split(/\s+/).filter(Boolean);
      return parts.join('\n');
    };

    return (
      <View style={styles.dualChartCard}>
        <View style={styles.dualChartHeader}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: ACCENT }]} />
            <Text numberOfLines={1} style={styles.legendText}>{compactPlayerName(player1Name)}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PLAYER_2_ACCENT }]} />
            <Text numberOfLines={1} style={styles.legendText}>{compactPlayerName(player2Name)}</Text>
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
                {t(`metric.${row.metric}`, row.metric)}
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

  return (
    <>
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={styles.titleRow}>
              <Medal size={18} color={ACCENT} strokeWidth={2.2} />
              <Text style={styles.modalTitle}>{t('matchupComparisonTitle', 'Matchup Comparison')}</Text>
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
              <ActivityIndicator color={ACCENT} />
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
                arrow="down"
              />
              <View style={styles.playersRow}>
                {renderPlayerHeader(t('matchupPlayer1Placeholder', 'Player 1'), player1)}
                {renderPlayerHeader(t('matchupPlayer2Placeholder', 'Player 2'), player2)}
              </View>

              {groups.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>
                    {t('noComparisonMetrics', 'No comparable metrics are available for these players.')}
                  </Text>
                </View>
              ) : (
                groups.map((group) => (
                  <View key={group.key} style={styles.groupBlock}>
                    <View style={styles.groupHeader}>
                      <View style={styles.groupTitleRow}>
                        <group.Icon size={16} color={ACCENT} strokeWidth={2.2} />
                        <Text style={styles.groupTitle}>{t(group.key, group.fallbackTitle)}</Text>
                      </View>
                      {group.rows.length >= 5 ? (
                        <Pressable
                          onPress={() => toggleChartGroup(group.key)}
                          style={({ pressed }) => [styles.chartToggle, pressed && styles.pressed]}
                        >
                          {chartGroups[group.key] ? (
                            <List size={14} color={ACCENT} strokeWidth={2.2} />
                          ) : (
                            <LineChart size={14} color={ACCENT} strokeWidth={2.2} />
                          )}
                          <Text style={styles.chartToggleText}>
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

                    {chartGroups[group.key] ? (
                      group.lowerIsBetter
                        ? renderDualErrorTiles(
                            group.rows,
                            player1?.player.name ?? t('matchupPlayer1Placeholder', 'Player 1'),
                            player2?.player.name ?? t('matchupPlayer2Placeholder', 'Player 2'),
                          )
                        : renderDualSpiderChart(
                            t(group.key, group.fallbackTitle),
                            group.rows,
                            player1?.player.name ?? t('matchupPlayer1Placeholder', 'Player 1'),
                            player2?.player.name ?? t('matchupPlayer2Placeholder', 'Player 2'),
                          )
                    ) : (
                      group.rows.map((row) => (
                        <View key={row.metric} style={styles.metricRow}>
                          {renderMetricValue(row.value1, row.value2, group.lowerIsBetter)}
                          <View style={styles.metricNameCell}>
                            <Text numberOfLines={2} style={styles.metricName}>
                              {t(`metric.${row.metric}`, row.metric)}
                            </Text>
                          </View>
                          {renderMetricValue(row.value2, row.value1, group.lowerIsBetter)}
                        </View>
                      ))
                    )}
                  </View>
                ))
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
  playersRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  playerHeader: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    padding: 12,
    gap: 8,
  },
  playerSlotLabel: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  playerName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '900',
  },
  identityGrid: {
    gap: 5,
  },
  identityText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  groupBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(31, 34, 32, 0.66)',
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
    color: MUTED,
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
