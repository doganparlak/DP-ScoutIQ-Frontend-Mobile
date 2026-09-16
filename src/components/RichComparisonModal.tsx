import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { GitCompareArrows, Trophy, X } from "lucide-react-native";
import { ACCENT, DANGER, MUTED } from "@/theme";
import type { PlayerData } from "@/types";
import {
  CATEGORIES,
  leaderSummaries,
  metricGroup,
  scoreGroup,
  comparisonScoreVisibility,
  type MetricUnit,
} from "@/utils/comparisonGroups";
import UnitSwitch from "./ComparisonUnitSwitch";
import MetricSection from "./ComparisonMetricSection";
import ComparisonIdentityCard from "./ComparisonIdentityCard";
import CustomMatchupComparison from "./CustomMatchupComparison";
import { TutorialHint } from "./Tutorial";
import {
  comparisonStyles as styles,
  comparisonParticipantLabels,
  COMPARISON_COLORS,
} from "./comparisonAppearance";
type ComparisonPlayer = {
  id: string;
  player: PlayerData;
};

type Props = {
  customRadarMode?: boolean;
  visible: boolean;
  loading: boolean;
  error: string | null;
  player1: ComparisonPlayer | null;
  player2: ComparisonPlayer | null;
  player3?: ComparisonPlayer | null;
  player4?: ComparisonPlayer | null;
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

export default function RichComparisonModal(props: Props) {
  const { t, i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const insets = useSafeAreaInsets();
  const entries = [
    props.player1,
    props.player2,
    props.player3,
    props.player4,
  ].filter((p): p is ComparisonPlayer => !!p);
  const players = entries.map((e) => e.player);
  const participants = comparisonParticipantLabels(players, tr);
  const scoreVisibility = comparisonScoreVisibility(
    players.filter((player) => player.entityType !== "league"),
  );
  const allowTotal = !players.some((p) => p.entityType === "league");
  const [units, setUnits] = React.useState<Record<string, MetricUnit>>({});
  const key = entries.map((e) => e.id).join("|");
  React.useEffect(() => {
    setUnits({});
  }, [props.visible, key]);
  const unit = (key: string): MetricUnit =>
    !allowTotal && units[key] === "total" ? "per90" : units[key] || "per90";
  const setUnit = (key: string) => (value: MetricUnit) =>
    setUnits((previous) => ({ ...previous, [key]: value }));
  const summaries = leaderSummaries(
    players,
    unit("leaders"),
    props.worldCupMode,
  );
  const overall = Array(players.length).fill(0) as number[];
  summaries.forEach((summary) =>
    summary.winners.forEach((index) => overall[index]++),
  );
  const maximum = Math.max(0, ...overall);
  const winners = overall.flatMap((value, index) =>
    value > 0 && value === maximum ? [index] : [],
  );
  const names = (indexes: number[]) =>
    indexes.length ? (
      indexes.map((i, position) => (
        <React.Fragment key={i}>
          {position > 0 && "\n"}
          <Text style={{ color: COMPARISON_COLORS[i] }}>
            {participants[i].name}
          </Text>
        </React.Fragment>
      ))
    ) : (
      <Text style={{ color: MUTED }}>{tr ? "Berabere" : "Tie"}</Text>
    );
  const label = (metric: string) =>
    metric === "Potential"
      ? tr
        ? "Potansiyel"
        : "Potential"
      : metric === "Form"
        ? tr
          ? "Form"
          : "Form"
        : metric === "Rating"
          ? tr
            ? "Puan"
            : "Rating"
          : String(t(`metric.${metric}`, metric));
  const groups = [
    scoreGroup(players),
    ...CATEGORIES.map((category) =>
      metricGroup(players, category, unit(category.key), props.worldCupMode),
    ).filter((group) => group.rows.length),
  ];
  return (
    <>
      <Modal
        transparent
        visible={props.visible}
        animationType="fade"
        onRequestClose={props.onClose}
      >
        <View
          style={[
            styles.backdrop,
            {
              paddingTop: Math.max(14, insets.top),
              paddingBottom: Math.max(14, insets.bottom),
            },
          ]}
        >
          <View
            style={[
              styles.modalCard,
              { width: "100%", maxWidth: 620, alignSelf: "center" },
              props.theme && {
                backgroundColor: props.theme.panel,
                borderColor: props.theme.line,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.titleRow}>
                <GitCompareArrows
                  size={18}
                  color={props.theme?.accent ?? ACCENT}
                />
                <Text
                  style={[
                    styles.modalTitle,
                    props.theme && { color: props.theme.accent },
                  ]}
                >
                  {players.some((player) => player.entityType === "league")
                    ? tr
                      ? "Eşleşme Karşılaştırması"
                      : "Matchup Comparison"
                    : t("matchupComparisonTitle", "Matchup Comparison")}
                </Text>
              </View>
              <Pressable
                testID="comparison-close"
                accessibilityLabel={tr ? "Kapat" : "Close"}
                hitSlop={10}
                onPress={props.onClose}
              >
                <X size={20} color={DANGER} />
              </Pressable>
            </View>
            {props.loading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={ACCENT} />
                <Text style={styles.loadingText}>
                  {tr ? "Karşılaştırma hazırlanıyor…" : "Loading comparison…"}
                </Text>
              </View>
            ) : props.error ? (
              <View style={styles.emptyState}>
                <Text style={styles.errorText}>{props.error}</Text>
              </View>
            ) : players.length < 2 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {tr
                    ? "En az iki katılımcı seç."
                    : "Select at least two participants."}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false}>
                <TutorialHint
                  visible={!!props.tutorialVisible}
                  title={String(
                    t("tutorialComparisonTitle", "Matchup comparison"),
                  )}
                  body={String(
                    t(
                      "tutorialComparisonBody",
                      "Compare the shared metrics. Close this modal when you are done.",
                    ),
                  )}
                  onSkipAll={props.onTutorialSkipAll}
                  arrow="none"
                />
                <View style={styles.playersStack}>
                  {players.map((player, i) => (
                    <ComparisonIdentityCard
                      key={entries[i].id}
                      testID={`comparison-card-${i + 1}`}
                      player={player}
                      scoreVisibility={scoreVisibility}
                      label={participants[i].slot}
                      slotColor={COMPARISON_COLORS[i]}
                      theme={props.theme}
                      worldCupMode={props.worldCupMode}
                    />
                  ))}
                </View>
                {!props.customRadarMode && (
                  <View
                    style={[
                      styles.summaryBlock,
                      props.theme && { backgroundColor: props.theme.card },
                      { borderColor: props.theme?.accent ?? ACCENT, borderWidth: 1.5 },
                    ]}
                  >
                    <View style={styles.summaryHeader}>
                      <Trophy size={16} color={props.theme?.accent ?? ACCENT} />
                      <Text style={styles.summaryTitle}>
                        {tr ? "Kategori Liderleri" : "Category Leaders"}
                      </Text>
                    </View>
                    <UnitSwitch
                      value={unit("leaders")}
                      onChange={setUnit("leaders")}
                      allowTotal={allowTotal}
                      tr={tr}
                    />
                    <View
                      testID="comparison-overall-leader"
                      style={[
                        styles.summaryRow,
                        {
                          borderWidth: 1,
                          borderColor: ACCENT,
                          borderRadius: 12,
                          backgroundColor: "rgba(22,163,74,.12)",
                          padding: 12,
                          marginVertical: 12,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.summaryCategory,
                          { color: ACCENT, fontWeight: "900" },
                        ]}
                      >
                        {tr ? "Genel Lider" : "Overall Leader"}
                      </Text>
                      <Text style={[styles.summaryWinner, { color: ACCENT }]}>
                        {names(
                          players.length === 2 && winners.length === 2
                            ? []
                            : winners,
                        )}
                      </Text>
                      <Text style={styles.summaryScore}>
                        {overall.join("-")}
                      </Text>
                    </View>
                    <View style={styles.summaryGrid}>
                      {summaries.map((summary) => (
                        <View key={summary.key} style={styles.summaryRow}>
                          <Text style={styles.summaryCategory}>
                            {tr ? summary.tr : summary.en}
                          </Text>
                          <Text
                            style={[
                              styles.summaryWinner,
                              {
                                color: summary.winners.length
                                  ? (props.theme?.winnerAccent ?? ACCENT)
                                  : MUTED,
                              },
                            ]}
                          >
                            {names(summary.winners)}
                          </Text>
                          <Text style={styles.summaryScore}>
                            {summary.wins.join("-")}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                {groups
                  .filter(() => !props.customRadarMode)
                  .map((group) => (
                    <MetricSection
                      key={group.key}
                      group={group}
                      unit={unit(group.key)}
                      onUnit={setUnit(group.key)}
                      allowTotal={allowTotal}
                      players={players}
                      tr={tr}
                      language={i18n.language}
                      label={label}
                      theme={props.theme}
                    />
                  ))}
                {props.customRadarMode && (
                  <CustomMatchupComparison
                    key={`${key}:${props.visible}`}
                    entries={entries}
                    worldCupMode={props.worldCupMode}
                  />
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}
