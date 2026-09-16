import { portfolioViewportHeight } from "@/utils/portfolioLayout";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { BookmarkX } from "lucide-react-native";
import { ACCENT, DANGER, LINE, MUTED, TEXT } from "@/theme";
import { MatchFixture, matchDateOnly, matchScore } from "@/services/matchPool";
import { shortCountry, shortTeam } from "@/utils/seasonTableLabels";
import { comparisonSourceShortLabel } from "@/utils/comparisonSourceLabel";
export default function MatchPortfolioTable({
  rows,
  selectedId,
  tr,
  loading,
  deletingId,
  onSelect,
  onDelete,
}: {
  rows: MatchFixture[];
  selectedId?: number;
  tr: boolean;
  loading: boolean;
  deletingId: number | null;
  onSelect: (id: number) => void;
  onDelete: (f: MatchFixture) => void;
}) {
  const { height } = useWindowDimensions();
  const flex = [1.5, 0.55, 0.6, 0.9, 0.65];
  const cells = (values: string[], header = false) => (
    <>
      {values.map((v, i) => (
        <React.Fragment key={i}>
          <Text style={[s.cell, { flex: flex[i] }, header && s.headerText]}>
            {v}
          </Text>
          <View style={s.separator} />
        </React.Fragment>
      ))}
    </>
  );
  return (
    <View
      style={{
        marginTop: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: LINE,
      }}
    >
      <View style={[s.row, s.header, { marginRight: 5 }]}>
        {cells(
          tr
            ? ["Maç Adı", "Ülke", "Lig", "Zaman", "Skor"]
            : ["Match Name", "Ctry", "Leag.", "Date", "Score"],
          true,
        )}
        <View style={s.deleteCell}>
          <BookmarkX size={14} color={MUTED} />
        </View>
      </View>
      <ScrollView
        nestedScrollEnabled
        style={{
          maxHeight: portfolioViewportHeight(height),
          marginTop: 8,
        }}
        contentContainerStyle={{ paddingRight: 5, paddingVertical: 4, gap: 8 }}
      >
        {loading ? (
          <ActivityIndicator color={ACCENT} style={{ margin: 30 }} />
        ) : rows.length ? (
          rows.map((f) => (
            <Pressable
              key={f.fixtureId}
              testID={`portfolio-match-${f.fixtureId}`}
              accessibilityRole="button"
              accessibilityLabel={f.name}
              accessibilityState={{ selected: selectedId === f.fixtureId }}
              onPress={() => onSelect(f.fixtureId)}
              style={[s.row, selectedId === f.fixtureId && s.selected]}
            >
              {cells([
                `${shortTeam(f.homeTeam.name)} – ${shortTeam(f.awayTeam.name)}`,
                shortCountry(f.country.name),
                comparisonSourceShortLabel({
                  competition: f.league.name,
                  team: "",
                }),
                matchDateOnly(f.startingAt),
                matchScore(f),
              ])}
              <View style={s.deleteCell}>
                <Pressable
                  testID={`portfolio-match-delete-${f.fixtureId}`}
                  accessibilityLabel={
                    tr
                      ? `${f.name} maçını portföyden kaldır`
                      : `Remove ${f.name} from portfolio`
                  }
                  disabled={deletingId !== null}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete(f);
                  }}
                  style={{ paddingVertical: 12, paddingHorizontal: 3 }}
                >
                  {deletingId === f.fixtureId ? (
                    <ActivityIndicator size="small" color={DANGER} />
                  ) : (
                    <BookmarkX size={18} color={DANGER} />
                  )}
                </Pressable>
              </View>
            </Pressable>
          ))
        ) : (
          <Text style={s.empty}>
            {tr
              ? "Gösterilecek kayıtlı maç yok."
              : "No saved matches to display."}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}
const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 52,
    borderWidth: 1,
    borderColor: "rgba(36,245,166,.16)",
    backgroundColor: "rgba(22,163,74,.055)",
    borderRadius: 14,
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  header: {
    borderColor: "rgba(36,245,166,.22)",
    backgroundColor: "rgba(22,163,74,.09)",
  },
  selected: { borderColor: ACCENT, backgroundColor: "rgba(22,163,74,.14)" },
  cell: {
    minWidth: 0,
    paddingVertical: 10,
    paddingHorizontal: 2,
    textAlign: "center",
    color: TEXT,
    fontSize: 11.5,
  },
  headerText: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  separator: { width: 1, alignSelf: "stretch", backgroundColor: LINE },
  deleteCell: { width: 26, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", padding: 16, color: MUTED },
});
