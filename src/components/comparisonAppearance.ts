import { StyleSheet } from "react-native";
import { ACCENT, CARD, DANGER, LINE, MUTED, PANEL, TEXT } from "@/theme";
import { rolePickerCode } from "@/services/api";
import type { PlayerData } from "@/types";
export type ComparisonTheme = {
  panel: string;
  card: string;
  line: string;
  accent: string;
  accentSoft: string;
  winnerAccent?: string;
  winnerSoft?: string;
  muted: string;
};
export const COMPARISON_COLORS = [ACCENT, "#38BDF8", "#F59E0B", "#C084FC"];
const CATEGORY_GREEN_BACKGROUND = "rgba(22, 163, 74, 0.08)";
export function formatValue(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  if (Math.abs(value) >= 100) return String(Math.round(value));
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

export function roleShortLabel(value?: string) {
  return rolePickerCode(value);
}

export function roleDistribution(player?: PlayerData | null) {
  const rawCounts = player?.meta?.positionCounts ?? {};
  const counts = Object.entries(rawCounts).reduce<Record<string, number>>(
    (acc, [role, count]) => {
      const short = roleShortLabel(role);
      if (short && count > 0) acc[short] = (acc[short] || 0) + count;
      return acc;
    },
    {},
  );
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
    : (player?.meta?.roles ?? []);

  return Array.from(new Set(source.map(roleShortLabel).filter(Boolean))).map(
    (role) => ({ role, pct: null }),
  );
}

export function isValidScore(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function scoreColor(value: number) {
  if (value < 50) return DANGER;
  if (value < 70) return "#F59E0B";
  return ACCENT;
}

export function compactPlayerName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return trimmed;

  const firstInitial = parts[0]?.[0]?.toLocaleUpperCase() ?? "";
  return `${firstInitial}. ${parts.slice(1).join(" ")}`;
}

// Match web's separate player/league counters; reuse the identity on every surface.
export function comparisonParticipantLabels(
  players: PlayerData[],
  tr: boolean,
) {
  let playerIndex = 0;
  let leagueIndex = 0;
  let seasonIndex = 0;
  return players.map((player) => {
    const league = player.entityType === "league";
    const slot = league
      ? `${tr ? "Lig" : "League"} ${++leagueIndex}`
      : player.entityType === "season"
        ? `${tr ? "GEÇMİŞ OYUNCU" : "HISTORICAL PLAYER"} ${++seasonIndex}`
        : `${tr ? "Oyuncu" : "Player"} ${++playerIndex}`;
    const name = league
      ? `${player.name} ${tr ? "Ort." : "Avg."}`
      : compactPlayerName(player.name);
    return { slot, name, display: `${slot} · ${name}` };
  });
}

export function chartPlayerNameLabel(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return trimmed;

  const lastName = parts[parts.length - 1];
  const initials = parts
    .slice(0, -1)
    .map((part) => part[0]?.toLocaleUpperCase())
    .filter(Boolean)
    .join(".");

  return initials ? `${initials}.${lastName}` : lastName;
}

export function lastNameLabel(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return name;

  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? trimmed;
}

export function uppercaseLabel(value: string, lang?: string) {
  return value.toLocaleUpperCase(lang?.startsWith("tr") ? "tr-TR" : undefined);
}

export const comparisonStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.64)",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  modalTitle: {
    color: ACCENT,
    fontSize: 17,
    fontWeight: "900",
  },
  playersStack: {
    gap: 10,
    marginBottom: 14,
  },
  playerHeader: {
    flex: 1,
    alignSelf: "stretch",
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
    fontWeight: "800",
    textTransform: "uppercase",
  },
  playerIntroRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  playerIdentityLead: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  playerPortraitFrame: {
    width: 44,
    height: 50,
    flexShrink: 0,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "#122019",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  playerPortrait: {
    width: "100%",
    height: "100%",
    borderRadius: 9,
  },
  playerPortraitInitials: {
    fontSize: 14,
    fontWeight: "900",
  },
  playerIntroText: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  playerName: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
    minWidth: 0,
  },
  physicalChip: {
    maxWidth: 118,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    backgroundColor: "rgba(255,255,255,0.018)",
    paddingHorizontal: 7,
    paddingVertical: 4,
    gap: 1,
  },
  physicalChipLabel: {
    color: MUTED,
    fontSize: 8.5,
    fontWeight: "800",
  },
  physicalChipValue: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 10.5,
    fontWeight: "800",
  },
  headerScoreRow: {
    flexDirection: "row",
    gap: 6,
  },
  headerScorePill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(255,255,255,0.025)",
    paddingHorizontal: 7,
    paddingVertical: 6,
    gap: 2,
  },
  headerScoreLabel: {
    color: MUTED,
    fontSize: 9.5,
    fontWeight: "800",
  },
  headerScoreValue: {
    fontSize: 13,
    fontWeight: "900",
  },
  headerScoreValueMissing: {
    color: MUTED,
  },
  headerRolesArea: {
    minHeight: 74,
    justifyContent: "flex-start",
    overflow: "hidden",
    marginTop: "auto",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(255,255,255,0.018)",
    paddingHorizontal: 7,
    paddingVertical: 6,
    gap: 5,
  },
  headerRolesLabel: {
    color: MUTED,
    fontSize: 9.5,
    fontWeight: "800",
  },
  headerRolesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "flex-start",
    gap: 5,
  },
  headerRolePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(36, 245, 166, 0.22)",
    backgroundColor: "rgba(22, 163, 74, 0.13)",
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  headerRoleText: {
    color: ACCENT,
    fontSize: 10.5,
    fontWeight: "800",
  },
  headerRolePctText: {
    color: MUTED,
  },
  headerRoleMissing: {
    color: MUTED,
    fontSize: 12,
    fontWeight: "800",
  },
  identityGrid: {
    gap: 6,
  },
  identityPillRow: {
    flexDirection: "row",
    gap: 6,
  },
  identityPill: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(255,255,255,0.025)",
    paddingHorizontal: 7,
    paddingVertical: 6,
    gap: 2,
  },
  identityPillLabel: {
    color: MUTED,
    fontSize: 9.5,
    fontWeight: "800",
  },
  identityPillValue: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  identityPillValueRow: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  identityPillLogo: {
    width: 18,
    height: 18,
    flexShrink: 0,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryTitle: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: "900",
  },
  summaryGrid: {
    gap: 8,
  },
  summaryRow: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(17, 19, 21, 0.42)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  summaryCategory: {
    flex: 1,
    minWidth: 0,
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
  },
  summaryWinner: {
    flex: 1,
    minWidth: 0,
    textAlign: "right",
    fontSize: 12,
    fontWeight: "900",
  },
  summaryScore: {
    width: 50,
    textAlign: "right",
    color: MUTED,
    fontSize: 11,
    fontWeight: "900",
  },
  groupBlock: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CATEGORY_GREEN_BACKGROUND,
    overflow: "hidden",
    marginBottom: 12,
  },
  groupHeader: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  groupTitle: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: "900",
    flex: 1,
  },
  groupTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupHint: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "800",
  },
  chartToggle: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: "rgba(22, 163, 74, 0.10)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
  },
  chartToggleText: {
    color: ACCENT,
    fontSize: 10.5,
    fontWeight: "900",
    textTransform: "uppercase",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 2,
  },
  legendItem: {
    flexShrink: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
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
    fontWeight: "800",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  dualTileRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(26, 29, 26, 0.72)",
    padding: 10,
    gap: 9,
  },
  dualTileMetric: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
  },
  dualRiskStack: {
    gap: 8,
  },
  dualRiskCell: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(31, 34, 32, 0.78)",
    padding: 8,
    gap: 7,
  },
  dualRiskCellWinner: {
    borderColor: ACCENT,
    backgroundColor: "rgba(22, 163, 74, 0.10)",
  },
  dualRiskTopLine: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 6,
  },
  dualRiskValue: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "900",
  },
  dualRiskValueWinner: {
    color: ACCENT,
  },
  dualRiskLabel: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  dualRiskTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: "#272a2a",
    overflow: "hidden",
  },
  dualRiskFill: {
    height: "100%",
    borderRadius: 999,
  },
  dualTilesHintRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dualTilesHint: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },
  metricRow: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "stretch",
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  twoValueHeaderBlock: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: "rgba(17, 19, 21, 0.32)",
  },
  twoValueHeaderCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(17, 19, 21, 0.34)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  valueHeaderText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  threeValueHeaderBlock: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: "rgba(17, 19, 21, 0.32)",
  },
  threeValueHeaderCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(17, 19, 21, 0.34)",
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  twoValuesRow: {
    flexDirection: "row",
    gap: 7,
  },
  twoValueCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(17, 19, 21, 0.42)",
    alignItems: "center",
    justifyContent: "center",
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
    alignItems: "center",
    justifyContent: "center",
  },
  threeValuesRow: {
    flexDirection: "row",
    gap: 7,
  },
  threeValueCell: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: "rgba(17, 19, 21, 0.42)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  valueCell: {
    flex: 0.72,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  valueCellWinner: {
    backgroundColor: "rgba(22, 163, 74, 0.12)",
  },
  valueText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  valueTextWinner: {
    color: ACCENT,
    fontWeight: "900",
  },
  metricNameCell: {
    flex: 1.12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: LINE,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  metricName: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  loadingState: {
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  errorText: {
    color: DANGER,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  emptyChartState: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.68)",
    justifyContent: "center",
    padding: 18,
  },
  previewCardWrap: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 16,
    overflow: "visible",
    padding: 2,
    position: "relative",
  },
  previewClose: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 10,
    padding: 6,
  },
  pressed: {
    opacity: 0.9,
  },
});
