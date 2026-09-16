import { FRAME_STRIPE, FRAME_TITLE, FRAME_HEADING } from '@/theme';
import { Settings2 } from 'lucide-react-native';
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Database, SlidersHorizontal, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { getMatchupSources, type MatchupSource } from "@/services/api";
import type { SearchResultRow } from "./CandidatePlayers";
import { ACCENT, CARD, DANGER, LINE, MUTED, PANEL, TEXT } from "@/theme";

type Props = {
  rows: (SearchResultRow | null)[];
  mode: 2 | 3 | 4;
  onMode: (mode: 2 | 3 | 4) => void;
  custom: boolean;
  onCustom: (value: boolean) => void;
  sources: Record<string, string[]>;
  onSources: (value: Record<string, string[]>) => void;
};
export default function MatchupWorkspaceControls({
  rows,
  mode,
  onMode,
  custom,
  onCustom,
  sources,
  onSources,
}: Props) {
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<Record<string, MatchupSource[]>>(
    {},
  );
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [retry, setRetry] = React.useState(0);
  const players = rows
    .slice(0, mode)
    .filter(
      (row): row is SearchResultRow =>
        !!row && (!row.player.entityType || row.player.entityType === "player"),
    );
  const ids = players.map((row) => row.id).join("|");
  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.all(
      players.map(
        async (row) => [row.id, await getMatchupSources(row.id, row.player.meta?.sportmonksId)] as const,
      ),
    )
      .then((entries) => {
        if (active) setOptions(Object.fromEntries(entries));
      })
      .catch((e) => {
        if (active) setError(String(e.message || e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ids, open, retry]);
  const update = (id: string, selected: string[]) =>
    onSources({ ...sources, [id]: selected });
  return (
    <>
      <View style={styles.panel}>
        <View style={styles.topStripe} />
        <View style={FRAME_HEADING}><Settings2 size={20} color={ACCENT} /><Text style={[styles.title, FRAME_TITLE]}>
          {tr ? "Karşılaştırma Ayarları" : "Comparison Settings"}
        </Text></View>
        <Pressable
          testID="matchup-configure-sources"
          onPress={() => setOpen(true)}
          disabled={!players.length}
          accessibilityState={{ disabled: !players.length }}
          style={[styles.sourceButton, !players.length && { opacity: 0.4 }]}
        >
          <Database size={18} color={ACCENT} />
          <Text style={styles.activeText}>
            {tr ? "Veri Kaynaklarını Ayarla" : "Configure Data Sources"}
          </Text>
        </Pressable>
        <View style={styles.switchRow}>
          {([2, 3, 4] as const).map((value) => (
            <Pressable
              key={value}
              testID={`workspace-matchup-mode-${value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === value }}
              onPress={() => onMode(value)}
              style={[styles.option, mode === value && styles.active]}
            >
              <Text style={[styles.text, mode === value && styles.activeText]}>
                {tr
                  ? `${value}’${value === 2 ? "li" : "lü"} Eşleşme`
                  : `${value}-way Matchup`}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.switchRow}>
          {[false, true].map((value) => (
            <Pressable
              key={String(value)}
              testID={value ? "matchup-customize" : "matchup-scoutwise-view"}
              accessibilityRole="button"
              accessibilityState={{ selected: custom === value }}
              onPress={() => onCustom(value)}
              style={[styles.option, custom === value && styles.active]}
            >
              {value && (
                <SlidersHorizontal size={15} color={custom ? ACCENT : MUTED} />
              )}
              <Text
                style={[styles.text, custom === value && styles.activeText]}
              >
                {value
                  ? tr
                    ? "Kişiselleştir"
                    : "Customize"
                  : <Text style={{ color: TEXT }}>Scout<Text style={{ color: ACCENT }}>Wise</Text>{tr ? ' Bakışı' : ' View'}</Text>}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <View style={styles.heading}>
              <Text style={styles.title}>
                {tr ? "Veri Kaynaklarını Ayarla" : "Configure Data Sources"}
              </Text>
              <Pressable
                onPress={() => setOpen(false)}
                accessibilityLabel={tr ? "Kapat" : "Close"}
                style={{ padding: 10 }}
              >
                <X color={DANGER} size={22} />
              </Pressable>
            </View>
            <Text style={styles.hint}>
              {tr
                ? "Her oyuncu için son bir yılın tüm verilerini veya belirli ülke, lig ve takım kayıtlarını seç."
                : "Choose all data from the last year or individual country, league and team records for each player."}
            </Text>
            {loading ? (
              <ActivityIndicator color={ACCENT} />
            ) : error ? (
              <Pressable onPress={() => setRetry((value) => value + 1)}>
                <Text style={{ color: DANGER }}>{error}</Text>
                <Text style={styles.activeText}>
                  {tr ? "Tekrar dene" : "Retry"}
                </Text>
              </Pressable>
            ) : (
              <ScrollView contentContainerStyle={{ gap: 16 }}>
                {!players.length && (
                  <Text style={styles.hint}>
                    {tr
                      ? "Lig verileri, Lig Havuzu’nda seçtiğin lig ve rol filtrelerinden hesaplanır. Oyuncu eklediğinde burada oyuncunun veri kaynaklarını seçebilirsin."
                      : "League data uses the league and role filters selected in League Pool. Add a player to choose their data sources here."}
                  </Text>
                )}
                {players.map((row) => {
                  const available = options[row.id] || [];
                  const selected = sources[row.id] || [];
                  return (
                    <View key={row.id} style={styles.player}>
                      <Text style={styles.activeText}>{row.player.name}</Text>
                      <Pressable
                        onPress={() => update(row.id, [])}
                        style={[
                          styles.sourceButton,
                          !selected.length && styles.active,
                        ]}
                      >
                        <Text style={styles.text}>
                          {tr
                            ? "Tüm Veriler (Son 1 Yıl)"
                            : "All Data (Last 1 Year)"}
                        </Text>
                      </Pressable>
                      {available.map((option) => {
                        const active =
                          !selected.length || selected.includes(option.key);
                        return (
                          <Pressable
                            key={option.key}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: active }}
                            onPress={() => {
                              const next = !selected.length
                                ? available
                                    .map((item) => item.key)
                                    .filter((key) => key !== option.key)
                                : active
                                  ? selected.filter((key) => key !== option.key)
                                  : [...selected, option.key];
                              update(
                                row.id,
                                next.length === available.length ? [] : next,
                              );
                            }}
                            style={[
                              styles.sourceButton,
                              active && styles.active,
                            ]}
                          >
                            <Text
                              style={active ? styles.activeText : styles.text}
                            >
                              {active ? "✓" : "○"}
                            </Text>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.text}>
                                {option.competition} · {option.team}
                              </Text>
                              <Text style={styles.hint}>
                                {option.country} · {option.matchCount}{" "}
                                {tr ? "maç" : "matches"}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                      {!available.length && (
                        <Text style={styles.hint}>
                          {tr
                            ? "Ayrı lig/takım kaydı yok; yıllık toplam veri kullanılır."
                            : "No separate competition records; annual data is used."}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
            <Pressable
              onPress={() => setOpen(false)}
              style={styles.sourceButton}
            >
              <Text style={styles.activeText}>{tr ? "Tamam" : "Done"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  panel: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    gap: 14,
  },
  title: { flex: 1, fontSize: 16, fontWeight: "800", color: ACCENT },
  topStripe: { ...FRAME_STRIPE, marginBottom: -4 },
  heading: { flexDirection: "row", alignItems: "center" },
  sourceButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 12,
  },
  switchRow: { flexDirection: "row", gap: 5 },
  option: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 5,
    padding: 7,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  active: { borderColor: ACCENT, backgroundColor: "rgba(22,163,74,0.12)" },
  text: { color: TEXT, fontWeight: "700", fontSize: 12, textAlign: "center" },
  activeText: { color: ACCENT, fontWeight: "800", fontSize: 12 },
  hint: { color: MUTED, fontSize: 12, lineHeight: 18 },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  modal: {
    maxHeight: "85%",
    backgroundColor: PANEL,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 18,
    gap: 16,
  },
  player: {
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
});
