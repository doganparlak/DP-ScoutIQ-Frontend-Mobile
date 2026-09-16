import React from "react";
import { Pressable, Text, View, useWindowDimensions } from "react-native";
import {
  VictoryArea,
  VictoryChart,
  VictoryGroup,
  VictoryLabel,
  VictoryPolarAxis,
} from "victory-native";
import {
  BrickWall,
  DraftingCompass,
  List,
  LineChart,
  LogIn,
  Medal,
  ShieldAlert,
  ShieldCheck,
  Star,
} from "lucide-react-native";
import type { PlayerData } from "@/types";
import { ACCENT, CARD, DANGER, LINE, MUTED, PANEL } from "@/theme";
import type {
  ComparisonGroup,
  ComparisonRow,
  MetricUnit,
} from "@/utils/comparisonGroups";
import UnitSwitch from "./ComparisonUnitSwitch";
import {
  comparisonStyles as styles,
  COMPARISON_COLORS,
  comparisonParticipantLabels,
  formatValue,
  type ComparisonTheme,
} from "./comparisonAppearance";
const ICONS: Record<string, typeof Star> = {
  scoutwise_scores: Medal,
  contribution_impact: Star,
  goalkeeping: ShieldCheck,
  shooting: LogIn,
  passing: DraftingCompass,
  defending: BrickWall,
  errors_discipline: ShieldAlert,
};
export default function MetricSection({
  group,
  unit,
  onUnit,
  allowTotal,
  players,
  tr,
  label,
  theme,
  defaultPlot = false,
  controls,
  allowPlotType = false,
}: {
  group: ComparisonGroup;
  unit: MetricUnit;
  onUnit: (unit: MetricUnit) => void;
  allowTotal: boolean;
  players: PlayerData[];
  tr: boolean;
  language?: string;
  label: (metric: string) => string;
  theme?: ComparisonTheme;
  defaultPlot?: boolean;
  controls?: React.ReactNode;
  allowPlotType?: boolean;
}) {
  const [plot, setPlot] = React.useState(defaultPlot);
  const [plotType, setPlotType] = React.useState<"radar" | "bars">("radar");
  const { width } = useWindowDimensions();
  const [chartWidth, setChartWidth] = React.useState(
    Math.min(480, width - 104),
  );
  const accent = theme?.accent ?? ACCENT;
  const winner = theme?.winnerAccent ?? accent;
  const Icon = ICONS[group.key] ?? Star;
  const participants = comparisonParticipantLabels(players, tr);
  const names = participants.map((participant) => participant.name);
  const best = (row: ComparisonRow, index: number) => {
    const values = row.values.filter((v): v is number => v !== undefined);
    return (
      values.length === players.length &&
      new Set(values).size > 1 &&
      row.values[index] ===
        (row.lower ? Math.min(...values) : Math.max(...values))
    );
  };
  const normalized = (row: ComparisonRow, index: number) => {
    const p = row.points[index];
    return !p
      ? 0
      : Math.max(0, Math.min(1, (p.value - p.min) / (p.max - p.min || 1)));
  };
  const legend = (
    <View style={[styles.dualChartHeader, { flexWrap: "wrap" }]}>
      {names.map((name, i) => (
        <View key={i} style={styles.legendItem}>
          <View
            style={[
              styles.legendDot,
              { backgroundColor: COMPARISON_COLORS[i] },
            ]}
          />
          <Text
            numberOfLines={2}
            style={[styles.legendText, { color: COMPARISON_COLORS[i] }]}
          >
            {name}
          </Text>
        </View>
      ))}
    </View>
  );
  return (
    <View
      testID={`comparison-category-${group.key}`}
      style={[styles.groupBlock, { borderColor: accent, borderWidth: 1.5 }]}
    >
      <View
        style={[
          styles.groupHeader,
          { paddingVertical: 7, flexWrap: "wrap" },
          theme && { borderBottomColor: theme.line },
        ]}
      >
        <View style={styles.groupTitleRow}>
          <Icon size={16} color={accent} />
          <Text style={[styles.groupTitle, { color: accent }]}>
            {tr ? group.tr : group.en}
          </Text>
        </View>
        <Pressable
          testID={`comparison-plot-${group.key}`}
          accessibilityRole="button"
          accessibilityLabel={
            plot
              ? tr
                ? "Sayıları göster"
                : "Show numbers"
              : tr
                ? "Grafikte göster"
                : "Show on chart"
          }
          onPress={() => setPlot((v) => !v)}
          style={[
            styles.chartToggle,
            { borderColor: accent },
            theme && { backgroundColor: theme.accentSoft },
          ]}
        >
          {plot ? (
            <List size={14} color={accent} />
          ) : (
            <LineChart size={14} color={accent} />
          )}
          <Text style={[styles.chartToggleText, { color: accent }]}>
            {plot ? (tr ? "Sayılar" : "Numbers") : tr ? "Grafik" : "Chart"}
          </Text>
        </Pressable>
      </View>
      {controls}
      {plot && allowPlotType && !group.lower && (
        <View style={{ padding: 8 }}>
          <View style={{ flexDirection: 'row', backgroundColor: PANEL, borderRadius: 999, borderWidth: 1, borderColor: LINE, padding: 4, gap: 3 }}>
            {(['radar', 'bars'] as const).map(type => (
              <Pressable key={type} testID={`custom-plot-type-${type}`} accessibilityRole="radio" accessibilityState={{ checked: plotType === type }} onPress={() => setPlotType(type)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 999, backgroundColor: plotType === type ? 'rgba(22,163,74,.16)' : 'transparent' }}>
                <Text style={{ fontSize: 10.5, fontWeight: '900', color: plotType === type ? ACCENT : MUTED }}>{type === 'radar' ? 'Radar' : tr ? 'Yatay Bar' : 'Horizontal Bars'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      <View style={{ padding: 8 }}>
        <UnitSwitch
          value={unit}
          onChange={onUnit}
          allowTotal={allowTotal}
          tr={tr}
        />
      </View>
      {!group.rows.length ? (
        <Text style={{ color: MUTED, padding: 20 }}>
          {tr
            ? "Kategori ve metrik seçip Metrik Ekle’ye basın."
            : "Choose a category and metric, then tap Add Metric."}
        </Text>
      ) : plot && !group.lower && allowPlotType && plotType === "bars" ? (
        <View style={styles.dualTilesCard}>
          {legend}
          {group.rows.map((row) => (
            <View key={row.metric} style={styles.dualTileRow}>
              <Text style={styles.dualTileMetric}>{label(row.metric)}</Text>
              <View style={styles.dualRiskStack}>
                {players.map((_, i) => (
                  <View
                    key={i}
                    testID={
                      best(row, i) ? "custom-performance-winner" : undefined
                    }
                    style={[
                      styles.dualRiskCell,
                      best(row, i) && {
                        borderColor: COMPARISON_COLORS[i],
                        backgroundColor: `${COMPARISON_COLORS[i]}20`,
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <View style={styles.dualRiskTopLine}>
                      <Text
                        style={[
                          styles.dualRiskLabel,
                          { color: COMPARISON_COLORS[i], flex: 1 },
                        ]}
                      >
                        {names[i]}
                      </Text>
                      <Text
                        style={[
                          styles.dualRiskValue,
                          { color: COMPARISON_COLORS[i] },
                        ]}
                      >
                        {formatValue(row.values[i])}
                      </Text>
                    </View>
                    <View style={styles.dualRiskTrack}>
                      <View
                        testID="custom-performance-bar"
                        style={[
                          styles.dualRiskFill,
                          {
                            width: `${normalized(row, i) * 100}%`,
                            backgroundColor: COMPARISON_COLORS[i],
                          },
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : plot && group.lower ? (
        <View
          style={[
            styles.dualTilesCard,
            theme && { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          <View style={styles.dualTilesHintRow}>
            <Text style={styles.dualTilesHint}>
              {tr ? "Daha iyi" : "Better"}
            </Text>
            <Text style={styles.dualTilesHint}>
              {tr ? "Daha kötü" : "Worse"}
            </Text>
          </View>
          {group.rows.map((row) => (
            <View key={row.metric} style={styles.dualTileRow}>
              <Text style={styles.dualTileMetric}>{label(row.metric)}</Text>
              <View style={styles.dualRiskStack}>
                {players.map((_, i) => {
                  const risk = normalized(row, i);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.dualRiskCell,
                        best(row, i) && {
                          borderColor: winner,
                          backgroundColor:
                            theme?.winnerSoft ?? "rgba(22,163,74,.10)",
                        },
                      ]}
                    >
                      <View style={styles.dualRiskTopLine}>
                        <Text
                          style={[
                            styles.dualRiskValue,
                            best(row, i) && { color: winner },
                          ]}
                        >
                          {formatValue(row.values[i])}
                        </Text>
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.dualRiskLabel,
                            {
                              flexShrink: 1,
                              textAlign: "right",
                              color: COMPARISON_COLORS[i],
                            },
                          ]}
                        >
                          {names[i]}
                        </Text>
                      </View>
                      <View style={styles.dualRiskTrack}>
                        <View
                          style={[
                            styles.dualRiskFill,
                            {
                              width: `${risk * 100}%`,
                              backgroundColor:
                                risk < 0.33
                                  ? ACCENT
                                  : risk < 0.66
                                    ? "#F59E0B"
                                    : DANGER,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : plot && allowPlotType && group.rows.length < 3 ? (
        <Text style={{ color: MUTED, padding: 20 }}>
          {tr
            ? "Radar için en az 3 metrik ekleyin veya Yatay Bar seçin."
            : "Add at least 3 metrics for radar or select Horizontal Bars."}
        </Text>
      ) : plot &&
        group.rows.length >= 3 &&
        group.rows.every((row) => row.values.every((v) => v !== undefined)) ? (
        <View
          onLayout={(event) =>
            setChartWidth(Math.max(180, event.nativeEvent.layout.width - 20))
          }
          style={[
            styles.dualChartCard,
            theme && { backgroundColor: theme.card, borderColor: theme.line },
          ]}
        >
          {legend}
          <VictoryChart
            polar
            width={chartWidth}
            height={Math.max(300, chartWidth + 8)}
            padding={{ top: 36, bottom: 36, left: 32, right: 32 }}
            categories={{ x: group.rows.map((_, i) => String(i + 1)) }}
            domain={{ y: [0, 1] }}
            startAngle={90}
            endAngle={450}
          >
            <VictoryPolarAxis
              dependentAxis
              tickFormat={() => ""}
              style={{
                axis: { stroke: "transparent" },
                grid: { stroke: MUTED, opacity: 0.28 },
                tickLabels: { fill: MUTED, fontSize: 10 },
              }}
            />
            <VictoryPolarAxis
              tickValues={group.rows.map((_, i) => String(i + 1))}
              tickFormat={(_, i) =>
                label(group.rows[i]?.metric ?? "")
                  .split(/\s+/)
                  .join("\n")
              }
              tickLabelComponent={
                <VictoryLabel
                  angle={0}
                  textAnchor="middle"
                  verticalAnchor="middle"
                  dy={4}
                  style={{ fill: MUTED, fontSize: 9.5, fontWeight: "700" }}
                />
              }
              style={{
                axis: { stroke: MUTED, opacity: 0.22 },
                grid: { stroke: MUTED, opacity: 0.22 },
              }}
            />
            <VictoryGroup>
              {players.map((_, i) => (
                <VictoryArea
                  key={i}
                  data={group.rows.map((row, j) => ({
                    x: String(j + 1),
                    y: normalized(row, i),
                  }))}
                  style={{
                    data: {
                      fill: COMPARISON_COLORS[i],
                      fillOpacity: i === 0 ? 0.18 : 0.14,
                      stroke: COMPARISON_COLORS[i],
                      strokeWidth: 2.2,
                    },
                  }}
                />
              ))}
            </VictoryGroup>
          </VictoryChart>
        </View>
      ) : (
        <>
          <View style={styles.twoValueHeaderBlock}>
            <View style={styles.twoValuesRow}>
              {participants.map((participant, i) => (
                <View key={i} style={styles.twoValueHeaderCell}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.valueHeaderText,
                      { color: COMPARISON_COLORS[i] },
                      players.length === 4 && { fontSize: 11 },
                    ]}
                  >
                    {participants[i].name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {group.rows.map((row) => (
            <View key={row.metric} style={styles.twoMetricRow}>
              <View style={styles.twoMetricNameCell}>
                <Text style={styles.metricName}>{label(row.metric)}</Text>
              </View>
              <View style={styles.twoValuesRow}>
                {row.values.map((value, i) => (
                  <View
                    key={i}
                    style={[
                      styles.twoValueCell,
                      best(row, i) && {
                        borderColor: COMPARISON_COLORS[i],
                        backgroundColor: `${COMPARISON_COLORS[i]}18`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.valueText,
                        { color: COMPARISON_COLORS[i], fontWeight: "900" },
                      ]}
                    >
                      {formatValue(value)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </>
      )}
    </View>
  );
}
