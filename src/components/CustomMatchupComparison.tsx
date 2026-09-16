import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { ChevronDown, Plus, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import {
  CATEGORIES,
  playerPoints,
  scoreGroup,
  type MetricUnit,
  type ComparisonRow,
} from "@/utils/comparisonGroups";
import MetricSection from "./ComparisonMetricSection";
import type { SearchResultRow } from "./CandidatePlayers";
import { ACCENT, CARD, DANGER, LINE, MUTED, PANEL, TEXT } from "@/theme";

type Metric = ComparisonRow & {
  category: string;
  categoryTr: string;
  categoryEn: string;
};
export default function CustomMatchupComparison({
  entries,
  worldCupMode = false,
}: {
  entries: SearchResultRow[];
  worldCupMode?: boolean;
}) {
  const { t, i18n } = useTranslation(),
    tr = i18n.language.startsWith("tr");
  const players = entries.map((entry) => entry.player);
  const allowTotal = !players.some((player) => player.entityType === "league");
  const [units, setUnits] = React.useState<Record<string, MetricUnit>>({});
  const [selected, setSelected] = React.useState<Record<string, string[]>>({});
  const [categories, setCategories] = React.useState<Record<string, string>>(
    {},
  );
  const [pending, setPending] = React.useState<Record<string, string>>({});
  const [picker, setPicker] = React.useState<{
    group: string;
    field: "category" | "metric";
  } | null>(null);
  const metricLabel = (metric: string) =>
    metric === "Potential"
      ? tr
        ? "Potansiyel"
        : "Potential"
      : metric === "Form"
        ? "Form"
        : metric === "Rating"
          ? tr
            ? "Puan"
            : "Rating"
          : String(t(`metric.${metric}`, metric));
  const build = (unit: MetricUnit): Metric[] => {
    const score = scoreGroup(players);
    const synthetic = score.rows
      .filter(
        (row) =>
          row.values.every((value) => value !== undefined) &&
          (!players.some((p) => p.entityType === "season") ||
            row.metric === "Rating"),
      )
      .map((row) => ({
        ...row,
        category: score.key,
        categoryTr: score.tr,
        categoryEn: score.en,
      }));
    const regular = CATEGORIES.flatMap((category) => {
      const metrics = category.metrics.filter((metric) => metric !== "Rating");
      const points = players.map((player) =>
        playerPoints(player, metrics, unit, worldCupMode),
      );
      return metrics.flatMap((metric) => {
        const values = points.map((list) =>
          list.find((point) => point.label === metric),
        );
        return values.every(Boolean)
          ? [
              {
                metric,
                points: values,
                values: values.map((point) => point?.value),
                lower: category.lower,
                category: category.key,
                categoryTr: category.tr,
                categoryEn: category.en,
              },
            ]
          : [];
      });
    });
    return [...synthetic, ...regular];
  };
  const available = build("per90");
  const context =
    entries.map((entry) => entry.id).join("|") +
    "::" +
    available.map((row) => row.metric).join("|");
  React.useEffect(() => {
    const performance = available
      .filter((row) => !row.lower)
      .map((row) => row.metric);
    const preferred = [
      "Potential",
      "Form",
      "Rating",
      "Minutes Played",
      "Touches",
    ];
    setSelected({
      performance: [
        ...new Set([
          ...preferred.filter((metric) => performance.includes(metric)),
          ...performance,
        ]),
      ].slice(0, 5),
      risk: available
        .filter((row) => row.lower)
        .slice(0, 3)
        .map((row) => row.metric),
    });
    setCategories({});
    setPending({});
    setUnits({});
    setPicker(null);
  }, [context]);
  const categoryFor = (group: string) => {
    const options = available.filter((row) => row.lower === (group === "risk"));
    return options.some((row) => row.category === categories[group])
      ? categories[group]
      : options[0]?.category || "";
  };
  const optionsFor = (group: string) =>
    available.filter(
      (row) =>
        row.lower === (group === "risk") && row.category === categoryFor(group),
    );
  const candidateFor = (group: string) => {
    const options = optionsFor(group).filter(
      (row) => !(selected[group] || []).includes(row.metric),
    );
    return options.some((row) => row.metric === pending[group])
      ? pending[group]
      : options[0]?.metric || "";
  };
  const add = (group: string) => {
    const metric = candidateFor(group);
    if (!metric) return;
    setSelected((previous) => ({
      ...previous,
      [group]: [...new Set([...(previous[group] || []), metric])],
    }));
    setPending((previous) => ({ ...previous, [group]: "" }));
  };
  const optionRows = picker
    ? picker.field === "category"
      ? Array.from(
          new Map(
            available
              .filter((row) => row.lower === (picker.group === "risk"))
              .map((row) => [
                row.category,
                {
                  id: row.category,
                  label: tr ? row.categoryTr : row.categoryEn,
                  disabled: false,
                },
              ]),
          ).values(),
        )
      : optionsFor(picker.group).map((row) => ({
          id: row.metric,
          label: metricLabel(row.metric),
          disabled: (selected[picker.group] || []).includes(row.metric),
        }))
    : [];
  return (
    <>
      {["performance", "risk"].map((group) => {
        const risk = group === "risk",
          category = categoryFor(group),
          categoryRow = available.find((row) => row.category === category);
        const unit =
          !allowTotal && units[group] === "total"
            ? "per90"
            : units[group] || "per90";
        const computed = build(unit);
        const rows = (selected[group] || []).flatMap((metric) => {
          const row = computed.find(
            (row) => row.metric === metric && row.lower === risk,
          );
          return row ? [row] : [];
        });
        const controls = (
          <View style={styles.controls}>
            <View style={styles.row}>
              <View style={styles.field}>
                <Text style={styles.label}>{tr ? "Kategori" : "Category"}</Text>
                <Pressable
                  testID={`custom-category-${group}`}
                  accessibilityRole="button"
                  onPress={() => setPicker({ group, field: "category" })}
                  style={styles.select}
                >
                  <Text numberOfLines={2} style={styles.value}>
                    {categoryRow
                      ? tr
                        ? categoryRow.categoryTr
                        : categoryRow.categoryEn
                      : "—"}
                  </Text>
                  <ChevronDown size={16} color={MUTED} />
                </Pressable>
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{tr ? "Metrik" : "Metric"}</Text>
                <Pressable
                  testID={`custom-metric-${group}`}
                  accessibilityRole="button"
                  onPress={() => setPicker({ group, field: "metric" })}
                  style={styles.select}
                >
                  <Text numberOfLines={2} style={styles.value}>
                    {candidateFor(group)
                      ? metricLabel(candidateFor(group))
                      : tr
                        ? "Metrik seçin"
                        : "Select metric"}
                  </Text>
                  <ChevronDown size={16} color={MUTED} />
                </Pressable>
              </View>
            </View>
            <Pressable
              testID={`custom-add-${group}`}
              accessibilityRole="button"
              disabled={!candidateFor(group)}
              onPress={() => add(group)}
              style={[styles.add, !candidateFor(group) && { opacity: 0.4 }]}
            >
              <Plus size={17} color={ACCENT} />
              <Text style={styles.addText}>
                {tr ? "Metrik Ekle" : "Add Metric"}
              </Text>
            </Pressable>
            <View style={styles.chips}>
              {(selected[group] || []).map((metric) => (
                <Pressable
                  key={metric}
                  testID={`custom-remove-${group}-${metric}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${metricLabel(metric)} ${tr ? "kaldır" : "remove"}`}
                  onPress={() =>
                    setSelected((previous) => ({
                      ...previous,
                      [group]: (previous[group] || []).filter(
                        (value) => value !== metric,
                      ),
                    }))
                  }
                  style={styles.chip}
                >
                  <Text style={styles.chipText}>{metricLabel(metric)}</Text>
                  <X size={14} color={DANGER} />
                </Pressable>
              ))}
            </View>
          </View>
        );
        return (
          <MetricSection
            key={group}
            defaultPlot
            allowPlotType={!risk}
            controls={controls}
            group={{
              key: risk ? "errors_discipline" : "custom_performance",
              tr: risk ? "Hatalar ve Disiplin Grafiği" : "Performans Grafiği",
              en: risk ? "Errors & Discipline Chart" : "Performance Chart",
              rows,
              lower: risk,
            }}
            unit={unit}
            onUnit={(value) =>
              setUnits((previous) => ({ ...previous, [group]: value }))
            }
            allowTotal={allowTotal}
            players={players}
            tr={tr}
            label={metricLabel}
          />
        );
      })}
      <Modal
        visible={!!picker}
        transparent
        animationType="fade"
        onRequestClose={() => setPicker(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.row}>
              <Text style={[styles.addText, { flex: 1 }]}>
                {picker?.field === "category"
                  ? tr
                    ? "Kategori"
                    : "Category"
                  : tr
                    ? "Metrik"
                    : "Metric"}
              </Text>
              <Pressable
                accessibilityLabel={tr ? "Kapat" : "Close"}
                hitSlop={12}
                onPress={() => setPicker(null)}
              >
                <X size={22} color={DANGER} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 6 }}>
              {optionRows.map((option) => (
                <Pressable
                  key={option.id}
                  disabled={option.disabled}
                  onPress={() => {
                    if (!picker) return;
                    if (picker.field === "category") {
                      setCategories((previous) => ({
                        ...previous,
                        [picker.group]: option.id,
                      }));
                      setPending((previous) => ({
                        ...previous,
                        [picker.group]: "",
                      }));
                    } else
                      setPending((previous) => ({
                        ...previous,
                        [picker.group]: option.id,
                      }));
                    setPicker(null);
                  }}
                  style={[styles.option, option.disabled && { opacity: 0.4 }]}
                >
                  <Text style={{ color: TEXT }}>
                    {option.disabled ? "✓ " : ""}
                    {option.label}
                  </Text>
                </Pressable>
              ))}
              {!optionRows.length && (
                <Text style={styles.label}>
                  {tr
                    ? "Ortak metrik bulunamadı."
                    : "No common metrics available."}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  controls: { padding: 10, gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  field: { flex: 1, minWidth: 0, gap: 5 },
  label: { color: MUTED, fontSize: 11 },
  select: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
    backgroundColor: CARD,
    padding: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  value: { flex: 1, color: TEXT, fontSize: 12, fontWeight: "700" },
  add: {
    minHeight: 42,
    borderColor: ACCENT,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(22,163,74,.1)",
  },
  addText: { color: ACCENT, fontWeight: "800", fontSize: 13 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    maxWidth: "100%",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  chipText: { color: TEXT, fontSize: 11, flexShrink: 1 },
  overlay: {
    flex: 1,
    padding: 24,
    paddingVertical: 60,
    backgroundColor: "rgba(0,0,0,.8)",
    justifyContent: "center",
  },
  modal: {
    maxHeight: "85%",
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 20,
    padding: 18,
    gap: 16,
  },
  option: {
    minHeight: 44,
    padding: 12,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 10,
  },
});
