import { preserveComparisonIdentity } from "@/utils/comparisonGroups";
import React from "react";
import { Alert, Modal, Pressable, Text, View, StyleSheet } from "react-native";
import { BadgeCheck } from "lucide-react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import MatchupWorkspaceControls from "./MatchupWorkspaceControls";
import { TutorialPageGuide, useTutorial } from "./Tutorial";
import MatchupCenter from "./MatchupCenter";
import ComparisonModal from "./ComparisonModal";
import { useMatchup } from "@/context/MatchupContext";
import {
  getMe,
  type Plan,
  type MatchupComparisonResponse,
} from "@/services/api";
import { getSharedMatchupComparison } from "@/services/leaguePool";
import {
  incrementMatchupLaunchCount,
  shouldShowMatchupLaunchInterstitial,
} from "@/ads/adGating";
import { showInterstitialAndWaitSafely } from "@/ads/interstitial";
import { PlusProUpsellScreen } from '@/ads/PlusProUpsellScreen';
import type { SearchResultRow } from "./CandidatePlayers";
import { ACCENT, BG, CARD, LINE, MUTED, PANEL, TEXT } from "@/theme";

export default function SharedMatchupCenter({
  workspace = false,
  tutorialOnShow,
}: {
  workspace?: boolean;
  tutorialOnShow?: (y: number) => void;
}) {
  const tutorial = useTutorial();
  const [custom, setCustom] = React.useState(false);
  const [sources, setSources] = React.useState<Record<string, string[]>>({});
  const { t, i18n } = useTranslation();
  const tr = i18n.language.startsWith("tr");
  const navigation = useNavigation<any>();
  const shared = useMatchup();
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [upgrade, setUpgrade] = React.useState<"three" | "four" | "custom" | null>(null);
  const [adFallback, setAdFallback] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<MatchupComparisonResponse | null>(
    null,
  );
  const request = React.useRef(0);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      getMe()
        .then((me) => {
          if (!active) return;
          const paid =
            me.plan === "No Ads Monthly" ||
            me.plan === "Pro Monthly" ||
            me.plan === "Pro Yearly";
          setPlan(paid ? (me.plan as Plan) : "Free");
          if (!paid) shared.setMode(2);
          if (me.plan === "No Ads Monthly" && shared.mode === 4) shared.setMode(3);
          if (me.plan !== "Pro Monthly" && me.plan !== "Pro Yearly") setCustom(false);
        })
        .catch(() => {
          if (active) setPlan(null);
        });
      return () => {
        active = false;
        request.current++;
        setOpen(false);
        setLoading(false);
      };
    }, [shared.mode, shared.setMode]),
  );
  React.useEffect(() => {
    request.current++;
    setOpen(false);
    setData(null);
    setLoading(false);
  }, [shared.rows, shared.mode, sources]);
  const entries = shared.rows
    .slice(0, shared.mode)
    .filter((row): row is SearchResultRow => !!row);
  const resolvePlan = async () => {
    if (plan) return plan;
    try {
      const me = await getMe();
      const next: Plan =
        me.plan === "No Ads Monthly" ||
        me.plan === "Pro Monthly" ||
        me.plan === "Pro Yearly"
          ? me.plan
          : "Free";
      setPlan(next);
      return next;
    } catch {
      Alert.alert(
        t("error", "Error"),
        t(
          "matchupPlanRetry",
          "Hesap bilgileri yüklenemedi. Lütfen tekrar deneyin.",
        ),
      );
      return null;
    }
  };
  const changeMode = async (mode: 2 | 3 | 4) => {
    if (mode === 2) {
      shared.setMode(mode);
      return;
    }
    const currentPlan = await resolvePlan();
    if (!currentPlan) return;
    if (mode === 3 && currentPlan === "Free") {
      setUpgrade("three");
      return;
    }
    if (
      mode === 4 &&
      currentPlan !== "Pro Monthly" &&
      currentPlan !== "Pro Yearly"
    ) {
      setUpgrade("four");
      return;
    }
    shared.setMode(mode);
  };
  const changeCustom = async (value: boolean) => {
    if (!value) {
      setCustom(false);
      return;
    }
    const currentPlan = await resolvePlan();
    if (!currentPlan) return;
    if (currentPlan !== "Pro Monthly" && currentPlan !== "Pro Yearly") {
      setUpgrade("custom");
      return;
    }
    setCustom(true);
  };
  const launch = async () => {
    if (entries.length !== shared.mode || loading) return;
    if (!workspace) {
      navigation.navigate("Matchup");
      return;
    }
    const currentPlan = await resolvePlan();
    if (!currentPlan) return;
    const id = ++request.current;
    setOpen(true);
    setLoading(true);
    setError(null);
    setData(null);
    try {
      if (
        currentPlan === "Free" &&
        !tutorial.active &&
        shouldShowMatchupLaunchInterstitial(await incrementMatchupLaunchCount())
      ) {
        if (!(await showInterstitialAndWaitSafely())) setAdFallback(true);
      }
      if (id !== request.current) return;
      const next = await getSharedMatchupComparison(entries, false, sources);
      if (id === request.current) {
        setData(next);
        if (tutorial.active && tutorial.stage === "playerPool")
          tutorial.setPlayerPoolStep("comparison");
      }
    } catch (e: any) {
      if (id === request.current) setError(String(e?.message || e));
    } finally {
      if (id === request.current) setLoading(false);
    }
  };
  const comparisonRow = (index: number) => {
    const fetched =
      [data?.player1, data?.player2, data?.player3, data?.player4][index] ??
      shared.rows[index];
    const slot = shared.rows[index];
    if (!fetched || !slot || fetched.player.entityType === "league")
      return fetched ?? null;
    return {
      ...fetched,
      player: preserveComparisonIdentity(fetched.player, slot.player),
    };
  };
  return (
    <>
      {workspace && (
        <MatchupWorkspaceControls
          rows={shared.rows}
          mode={shared.mode}
          onMode={changeMode}
          custom={custom}
          onCustom={(value) => void changeCustom(value)}
          sources={sources}
          onSources={setSources}
        />
      )}
      {workspace && <TutorialPageGuide page="matchup" frame={0} onShow={tutorialOnShow} />}
      {workspace && <TutorialPageGuide page="matchup" frame={1} onShow={tutorialOnShow} />}
      <MatchupCenter
        row1={shared.rows[0]}
        row2={shared.rows[1]}
        row3={shared.rows[2]}
        row4={shared.rows[3]}
        matchupMode={shared.mode}
        hideModeSwitch={workspace}
        onMatchupModeChange={changeMode}
        onLaunchMatchup={launch}
        launchDisabled={entries.length !== shared.mode}
        launchLoading={loading}
        onRemoveRow1={() => shared.removeAt(0)}
        onRemoveRow2={() => shared.removeAt(1)}
        onRemoveRow3={() => shared.removeAt(2)}
        onRemoveRow4={() => shared.removeAt(3)}
      />
      <ComparisonModal
        customRadarMode={custom}
        visible={open}
        loading={loading}
        error={error}
        player1={comparisonRow(0)}
        player2={comparisonRow(1)}
        player3={shared.mode >= 3 ? comparisonRow(2) : null}
        player4={shared.mode === 4 ? comparisonRow(3) : null}
        onClose={() => {
          request.current++;
          setOpen(false);
          setLoading(false);
          if (
            tutorial.active &&
            tutorial.stage === "playerPool" &&
            tutorial.playerPoolStep === "comparison"
          ) {
            tutorial.moveToProfile();
            navigation.navigate("Profile", { screen: "MyProfile" });
          }
        }}
      />
      <PlusProUpsellScreen
        visible={adFallback}
        onClose={() => setAdFallback(false)}
      />
      <Modal
        visible={upgrade !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setUpgrade(null)}
      >
        <View style={styles.backdrop}>
          <View style={styles.prompt}>
            <View style={styles.upgradeHeader}>
              <View style={styles.upgradeIconWrap}>
                <BadgeCheck size={20} color={ACCENT} strokeWidth={2.3} />
              </View>
              <Text style={styles.title}>
                {upgrade === "custom"
                  ? tr
                    ? <><Text style={styles.proHighlight}>PRO</Text> ile karşılaştırmanı kişiselleştir</>
                    : <>Customize with <Text style={styles.proHighlight}>PRO</Text></>
                  : upgrade === "three"
                    ? tr
                      ? <><Text style={styles.plusHighlight}>PLUS</Text> veya <Text style={styles.proHighlight}>PRO</Text> ile 3’lü karşılaştırma</>
                      : <><Text style={styles.plusHighlight}>PLUS</Text> or <Text style={styles.proHighlight}>PRO</Text> for a 3-way matchup</>
                    : tr
                      ? <><Text style={styles.proHighlight}>PRO</Text> ile 4’lü karşılaştırma</>
                      : <><Text style={styles.proHighlight}>PRO</Text> for a 4-way matchup</>}
              </Text>
            </View>
            <Text style={styles.body}>
              {upgrade === "custom"
                ? tr
                  ? <>Bu özelliğe erişmek için <Text style={styles.proHighlight}>PRO</Text>’ya geç.</>
                  : <>Go <Text style={styles.proHighlight}>PRO</Text> to access this feature.</>
                : upgrade === "three"
                  ? tr
                    ? <>Bu özelliğe erişmek için <Text style={styles.plusHighlight}>PLUS</Text> veya <Text style={styles.proHighlight}>PRO</Text>’ya geç.</>
                    : <>Switch to <Text style={styles.plusHighlight}>PLUS</Text> or <Text style={styles.proHighlight}>PRO</Text> to access this feature.</>
                  : tr
                    ? <>Bu özelliğe erişmek için <Text style={styles.proHighlight}>PRO</Text>’ya geç.</>
                    : <>Switch to <Text style={styles.proHighlight}>PRO</Text> to access this feature.</>}
            </Text>
            <View style={styles.actions}>
              <Pressable
                style={styles.button}
                onPress={() => setUpgrade(null)}
              >
                <Text style={styles.body}>{t("notNow")}</Text>
              </Pressable>
              <Pressable
                style={[styles.button, { borderColor: ACCENT }]}
                onPress={() => {
                  setUpgrade(null);
                  navigation.navigate("Profile", { screen: "ManagePlan" });
                }}
              >
                <Text style={{ color: ACCENT, fontWeight: "800" }}>
                  {t("managePlan")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0,0,0,0.72)",
  },
  prompt: {
    backgroundColor: PANEL,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 22,
    gap: 16,
  },
  upgradeIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(36,245,166,0.42)",
    backgroundColor: "rgba(22,163,74,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1, color: TEXT, fontSize: 19, lineHeight: 24, fontWeight: "800" },
  body: { color: MUTED, fontSize: 14, lineHeight: 21 },
  proHighlight: { color: ACCENT, fontWeight: "900" },
  plusHighlight: { color: "#38BDF8", fontWeight: "900" },
  actions: { flexDirection: "row", gap: 10 },
  button: {
    flex: 1,
    minHeight: 44,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
