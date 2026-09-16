import { StyleSheet } from "react-native";
import { ACCENT, CARD, LINE, TEXT } from "@/theme";

/** Shared season, team and league results-table appearance. */
export const poolTableStyles = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: LINE,
    minHeight: 48,
  },
  header: { backgroundColor: CARD },
  cell: {
    paddingHorizontal: 3,
    paddingVertical: 10,
    color: TEXT,
    fontSize: 12.5,
    textAlign: "center",
    minWidth: 0,
  },
  headerText: { color: ACCENT, fontWeight: "800", fontSize: 12 },
  selected: { backgroundColor: "rgba(22,163,74,.14)" },
});
