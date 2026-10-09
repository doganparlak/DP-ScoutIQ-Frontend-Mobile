import { createThemedStyles,type ThemeColors } from '@/theme';
import { StyleSheet } from "react-native";


/** Shared season, team and league results-table appearance. */


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, LINE, TEXT, themeColor} = colors;

  const poolTableStyles = StyleSheet.create({
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
  selected: { backgroundColor: themeColor("rgba(22,163,74,.14)", 'surface') },
});
  return {ACCENT, CARD, LINE, TEXT, poolTableStyles, themeColor};
});
export const getThemed_poolTableStyles = (colors: ThemeColors) => getModuleTheme(colors).poolTableStyles;
