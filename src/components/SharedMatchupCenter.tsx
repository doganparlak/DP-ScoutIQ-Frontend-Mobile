import {
incrementMatchupLaunchCount,
shouldShowMatchupLaunchInterstitial,
} from "@/ads/adGating";
import { showInterstitialAndWaitSafely } from "@/ads/interstitial";
import { PlusProUpsellScreen } from '@/ads/PlusProUpsellScreen';
import { isAdFlowCancelled } from '@/ads/presentation';
import { useMatchup } from "@/context/MatchupContext";
import {
getMe,
type MatchupComparisonResponse,
type Plan,
} from "@/services/api";
import { getSharedMatchupComparison } from "@/services/leaguePool";
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { preserveComparisonIdentity } from "@/utils/comparisonGroups";
import { useFocusEffect,useNavigation } from "@react-navigation/native";
import { ArrowUpRight,BadgeCheck,BookMarked,Database,Gem,Trophy,UserRound,UsersRound } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
import { Alert,Modal,Pressable,StyleSheet,Text,View } from "react-native";
import type { SearchResultRow } from "./CandidatePlayers";
import ComparisonModal from "./ComparisonModal";
import MatchupCenter from "./MatchupCenter";
import MatchupWorkspaceControls from "./MatchupWorkspaceControls";
import PlanManagementButton from './PlanManagementButton';
import { TutorialPageGuide,useTutorial } from "./Tutorial";


export default function SharedMatchupCenter({
  workspace = false,
  tutorialOnShow,
}: {
  workspace?: boolean;
  tutorialOnShow?: (y: number) => void;
}) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, FRAME_STRIPE, ACCENT, FRAME_TITLE, FEATURE_COLORS, MUTED} = themed;

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
  const launchLock = React.useRef(false);
  const fallbackWait = React.useRef<((proceed: boolean) => void) | null>(null);
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
        fallbackWait.current?.(false); fallbackWait.current = null; setAdFallback(false);
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
  const needsPlayers = entries.length < 2;
  const playerSources = [
    { route: 'Strategy', label: tr ? 'Oyuncu\nHavuzu' : 'Player\nPool', Icon: UserRound },
    { route: 'LeaguePool', label: tr ? 'Lig\nHavuzu' : 'League\nPool', Icon: Trophy },
    { route: 'SeasonData', label: tr ? 'Sezon\nVerileri' : 'Season\nData', Icon: Database },
  ] as const;
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
    if (!currentPlan || launchLock.current) return;
    launchLock.current = true;
    const id = ++request.current;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      if (
        currentPlan === "Free" &&
        !tutorial.active &&
        shouldShowMatchupLaunchInterstitial(await incrementMatchupLaunchCount())
      ) {
        if (!(await showInterstitialAndWaitSafely({ action: 'matchup_launch', isActive: () => id === request.current && navigation.isFocused() }))) {
          const proceed = await new Promise<boolean>(resolve => { fallbackWait.current = resolve; setAdFallback(true); });
          if (!proceed) return;
        }
      }
      if (id !== request.current || !navigation.isFocused()) return;
      setOpen(true);
      const next = await getSharedMatchupComparison(entries, false, sources);
      if (id === request.current) {
        setData(next);
        if (tutorial.active && tutorial.stage === "playerPool")
          tutorial.setPlayerPoolStep("comparison");
      }
    } catch (e: any) {
      if (isAdFlowCancelled(e)) return;
      setOpen(true);
      if (id === request.current) setError(String(e?.message || e));
    } finally {
      launchLock.current = false;
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
      {workspace && !needsPlayers && (
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
      {workspace && needsPlayers && (
        <View style={styles.emptyPanel}>
          <View style={FRAME_STRIPE} />
          <View style={styles.emptyHeading}>
            <UsersRound size={20} color={ACCENT} />
            <Text style={[FRAME_TITLE, { flex: 1 }]}>
              {entries.length === 0
                ? (tr ? 'Karşılaştırmaya Başla' : 'Start Comparing')
                : (tr ? 'Bir Oyuncu Daha Ekle' : 'Add Another Player')}
            </Text>
          </View>
          <Text style={styles.body}>
            {tr
              ? 'Bir kaynaktan oyuncu seç ve kartındaki eşleşme butonuyla buraya ekle.'
              : 'Choose a player from a source and add them here using the matchup button on their card.'}
          </Text>
          <View style={styles.sourceActions}>
            {playerSources.map(({ route, label, Icon }) => (
              <Pressable key={route} accessibilityRole="button" onPress={() => navigation.navigate(route)}
                style={({ pressed }) => [styles.sourceAction, pressed && { opacity: 0.7 }]}>
                <View style={styles.sourceActionTop}>
                  <View style={styles.sourceIcon}><Icon size={20} color={ACCENT} /></View>
                  <ArrowUpRight size={14} color={ACCENT} />
                </View>
                <Text style={styles.sourceActionText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.5}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.body}>
            {tr
              ? 'ScoutWise Pro veya portföyündeki oyuncu kartlarından da ekleyebilirsin.'
              : 'You can also add players from cards in ScoutWise Pro or your portfolio.'}
          </Text>
          <View style={styles.sourceActions}>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Chat', { screen: 'ProHome' })}
              style={({ pressed }) => [styles.sourceAction, styles.secondaryAction, pressed && { opacity: 0.7 }]}>
              <View style={styles.sourceActionTop}>
                <View style={[styles.sourceIcon, { backgroundColor: `${FEATURE_COLORS.pro}14` }]}><Gem size={20} color={FEATURE_COLORS.pro} /></View>
                <ArrowUpRight size={14} color={MUTED} />
              </View>
              <Text style={styles.sourceActionText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.5}>ScoutWise <Text style={{ color: FEATURE_COLORS.pro }}>Pro</Text></Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Portfolio')}
              style={({ pressed }) => [styles.sourceAction, styles.secondaryAction, pressed && { opacity: 0.7 }]}>
              <View style={styles.sourceActionTop}>
                <View style={styles.sourceIcon}><BookMarked size={20} color={ACCENT} /></View>
                <ArrowUpRight size={14} color={MUTED} />
              </View>
              <Text style={styles.sourceActionText} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.5}>{tr ? 'Oyuncu Portföyü' : 'Player Portfolio'}</Text>
            </Pressable>
          </View>
        </View>
      )}
      <MatchupCenter
        row1={shared.rows[0]}
        row2={shared.rows[1]}
        row3={shared.rows[2]}
        row4={shared.rows[3]}
        matchupMode={shared.mode}
        hideModeSwitch={workspace}
        hideLaunchButton={workspace && needsPlayers}
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
        onClose={() => { setAdFallback(false); const resume = fallbackWait.current; fallbackWait.current = null; setTimeout(() => resume?.(navigation.isFocused()), 450); }}
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
              <PlanManagementButton onPress={() => {
                setUpgrade(null);
                setTimeout(() => navigation.navigate("Profile", { screen: "ManagePlan" }), 350);
              }} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, BG, CARD, LINE, MUTED, PANEL, TEXT, FRAME_STRIPE, FRAME_TITLE, FEATURE_COLORS, themeColor} = colors;

  const styles = StyleSheet.create({
  emptyPanel: { padding: 16, gap: 14, borderRadius: 20, borderWidth: 1, borderColor: ACCENT, backgroundColor: PANEL },
  emptyHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceActions: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  sourceAction: { flex: 1, minWidth: 0, minHeight: 98, padding: 10, gap: 10, borderRadius: 14,
    borderWidth: 1, borderColor: themeColor('rgba(22,163,74,0.48)', 'border'), backgroundColor: themeColor('rgba(22,163,74,0.08)', 'surface') },
  sourceActionTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  sourceIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: themeColor('rgba(22,163,74,0.10)', 'surface'), alignItems: 'center', justifyContent: 'center' },
  sourceActionText: { minHeight: 36, color: TEXT, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  secondaryAction: { borderColor: LINE, backgroundColor: CARD },
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: themeColor("rgba(0,0,0,0.72)", 'surface'),
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
    borderColor: themeColor("rgba(36,245,166,0.42)", 'border'),
    backgroundColor: themeColor("rgba(22,163,74,0.14)", 'surface'),
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { flex: 1, color: TEXT, fontSize: 19, lineHeight: 24, fontWeight: "800" },
  body: { color: MUTED, fontSize: 14, lineHeight: 21 },
  proHighlight: { color: ACCENT, fontWeight: "900" },
  plusHighlight: { color: themeColor("#38BDF8", 'text'), fontWeight: "900" },
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
  return {ACCENT, BG, CARD, LINE, MUTED, PANEL, TEXT, FRAME_STRIPE, FRAME_TITLE, FEATURE_COLORS, styles, themeColor};
});
