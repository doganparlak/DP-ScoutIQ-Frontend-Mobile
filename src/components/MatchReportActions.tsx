import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import React, { useState } from "react";
import PreMatchReportModal from './PreMatchReportModal';
import PostMatchReportModal from "./PostMatchReportModal";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { FileText } from "lucide-react-native";
import { ACCENT, MUTED } from "@/theme";
import {
  FavoriteMatch,
  MatchFixture,
  matchReportAction,
} from "@/services/matchPool";
export default function MatchReportActions({
  fixture,
  favorites,
  tr,
  onOpenPlans,
}: {
  fixture: MatchFixture;
  favorites: FavoriteMatch[];
  tr: boolean;
  onOpenPlans: () => void;
}) {
  const ads = useWorkspaceActionAd();
  const [preMatchOpen, setPreMatchOpen] = useState(false);
  const [postMatchOpen, setPostMatchOpen] = useState(false);
  return (
    <View style={s.row}>
      {ads.fallback}
      {(["pre_match", "post_match"] as const).map((type) => {
        const saved = favorites.find(
          (f) =>
            f.fixture.fixtureId === fixture.fixtureId && f.reportType === type,
        );
        const action = matchReportAction(fixture, type, saved);
        const enabled = action === "generate" || action === "view" || action === "processing";
        const title =
          type === "pre_match"
            ? tr
              ? "Maç Önü Raporu"
              : "Pre-Match Report"
            : tr
              ? "Maç Sonu Raporu"
              : "Post-Match Report";
        return (
          <Pressable
            key={type}
            testID={`match-report-${type}-${action}`}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !enabled || ads.busy,
              busy: action === "processing",
            }}
            disabled={!enabled || ads.busy}
            style={[s.button, !enabled && { opacity: 0.4 }]}
            onPress={async () => {
              try {
                await ads.run(type === 'pre_match' ? 'preMatchReport' : 'postMatchReport', () => {
                  if (type === "post_match") setPostMatchOpen(true);
                  else setPreMatchOpen(true);
                });
              } catch (error) {
                Alert.alert(tr ? 'Rapor hatası' : 'Report error', String(error));
              }
            }}
          >
            {action === "processing" ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <FileText size={16} color={enabled ? ACCENT : MUTED} />
            )}
            <Text
              numberOfLines={1}
              style={[s.label, { color: enabled ? ACCENT : MUTED }]}
            >
              {title}
            </Text>
          </Pressable>
        );
      })}
      {preMatchOpen && <PreMatchReportModal fixture={fixture} tr={tr} onOpenPlans={onOpenPlans} onClose={() => setPreMatchOpen(false)} />}
      {postMatchOpen && <PostMatchReportModal visible onOpenPlans={onOpenPlans} onClose={() => setPostMatchOpen(false)} fixture={fixture} tr={tr} />}
    </View>
  );
}
const s = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, marginTop: 12, alignItems: "center" },
  button: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 11,
  },
  label: { flexShrink: 1, textAlign: "center", fontSize: 10.5, fontWeight: "800" },
});
