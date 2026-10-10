import ConnectedAccounts from '@/components/ConnectedAccounts';
import ScoutWiseBrandMark from '@/components/ScoutWiseBrandMark';
import ThemeToggle from '@/components/ThemeToggle';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { CircleHelp,CreditCard,LogOut } from "lucide-react-native";
import React from "react";
import {
ActivityIndicator,
Alert,
Pressable,
StyleSheet,
Text,
View,
} from "react-native";


import { useLanguage } from "@/context/LanguageProvider";
import type { Plan } from "@/services/api";
import { useTranslation } from "react-i18next";
import { getMe,updateMe,type Profile,type UILang } from "../services/api";


type Props = {
  plan: Plan;
  onLogout: () => void;
  onOpenPlans: () => void;
  onOpenHelp: () => void;
  navigationLocked?: boolean;
};

export default function Account({
  plan,
  onLogout,
  onOpenPlans,
  onOpenHelp,
  navigationLocked = false,
}: Props) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, MUTED, ACCENT} = themed;

  const [email, setEmail] = React.useState<string>("—");
  const [savingLanguage, setSavingLanguage] = React.useState(false);
  const { t } = useTranslation();
  const { lang, setLang } = useLanguage();

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me: Profile = await getMe();
        if (!alive) return;
        setEmail(me?.email ?? "—");
      } catch {
        // keep placeholder on error
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Map plan code to localized label, e.g. plan_Pro
  const planLabel =
    plan === "No Ads Monthly"
      ? t("noAdsMonthly", "No Ads Monthly")
      : plan === "Pro Monthly"
        ? t("proMonthly", "Pro Monthly")
        : plan === "Pro Yearly"
          ? t("proYearly", "Pro Yearly")
          : t("free", "Free");

  return (
    <View style={styles.card} accessibilityLabel={t("accountTitle", "Account")}>
      <View style={styles.welcomeRow}>
        <View style={styles.welcomeIcon}>
          <ScoutWiseBrandMark style={{ width: 48, height: 48 }} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.eyebrow}>ScoutWise</Text>
          <Text style={styles.welcomeTitle}>
            {lang === "tr" ? "Hoş geldiniz" : "Welcome back"}
          </Text>
        </View>
        <Pressable
          onPress={onLogout}
          accessibilityRole="button"
          accessibilityLabel={t("logout", "Log out")}
          hitSlop={10}
          style={styles.logoutIcon}
        >
          <LogOut size={19} color={MUTED} />
        </Pressable>
      </View>
      <Text selectable style={styles.email}>
        {email}
      </Text>
      <Text style={styles.intro}>
        {lang === "tr"
          ? "Portföylerin, raporların ve analizlerin bir arada."
          : "Your portfolios, reports and analyses, together."}
      </Text>
      <View style={styles.preferencesRow}>
        <View style={styles.accountPreferences}>
          <View style={styles.preferenceCell}>
            <View style={styles.planBadge}>
              <View style={styles.planDot} />
              <Text style={styles.planText}>{planLabel}</Text>
            </View>
          </View>
          <ConnectedAccounts disabled={navigationLocked} />
        </View>

        <View style={styles.displayPreferences}>
          <View style={styles.kv}>
            <Text style={styles.k}>{t("language", "Language")}</Text>
            <View style={styles.languageSegment} accessibilityRole="radiogroup" accessibilityLabel={t("language", "Language")} accessibilityState={{ busy: savingLanguage }}>
              {(["tr", "en"] as UILang[]).map((code) => (
                <Pressable
                  key={code}
                  disabled={savingLanguage || lang === code}
                  accessibilityRole="radio"
                  accessibilityLabel={code === "tr" ? t("turkish", "Turkish") : t("english", "English")}
                  accessibilityState={{ checked: lang === code, disabled: savingLanguage }}
                  onPress={async () => {
                    try {
                      setSavingLanguage(true);
                      await updateMe({ uiLanguage: code });
                      await setLang(code);
                    } catch (e: any) {
                      Alert.alert(t("languageUpdateFailed", "Language update failed"), String(e?.message || e));
                    } finally {
                      setSavingLanguage(false);
                    }
                  }}
                  style={({ pressed }) => [styles.languageOption, lang === code && styles.languageOptionActive, pressed && { opacity: 0.7 }]}
                >
                  {savingLanguage && lang !== code ? <ActivityIndicator size="small" color={ACCENT} /> : (
                    <Text style={[styles.languageOptionText, lang === code && styles.languageOptionTextActive]}>{code.toUpperCase()}</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        <ThemeToggle />
        </View>
      </View>
      <View style={styles.actions}>
        <Pressable
          onPress={onOpenPlans}
          disabled={navigationLocked}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.action,
            (pressed || navigationLocked) && { opacity: 0.6 },
          ]}
        >
          <CreditCard size={18} color={ACCENT} />
          <Text style={styles.actionText}>
            {t("managePlan", "Manage Plan")}
          </Text>
        </Pressable>
        <Pressable
          onPress={onOpenHelp}
          disabled={navigationLocked}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.action,
            (pressed || navigationLocked) && { opacity: 0.6 },
          ]}
        >
          <CircleHelp size={18} color={ACCENT} />
          <Text style={styles.actionText}>
            {t("helpCenter", "Help Center")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {PANEL, LINE, TEXT, MUTED, ACCENT, CARD, themeColor} = colors;

  const styles = StyleSheet.create({
  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },

  sectionTitle: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 10,
  },

  preferencesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    zIndex: 10,
  },
  accountPreferences: { flexGrow: 1, flexBasis: 140, minWidth: 140, gap: 8 },
  preferenceCell: { minHeight: 40, justifyContent: "center" },
  displayPreferences: { width: 178, gap: 8, marginLeft: "auto" },
  kv: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    zIndex: 10,
  },
  k: { color: MUTED, width: 78, fontSize: 12, fontWeight: "600" },
  v: { color: TEXT, fontWeight: "600" },

  languageSegment: {
    width: 92,
    height: 40,
    flexDirection: "row",
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    padding: 3,
    gap: 3,
    backgroundColor: CARD,
  },
  languageOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "transparent",
  },
  languageOptionActive: { borderColor: `${ACCENT}55`, backgroundColor: `${ACCENT}12` },
  languageOptionText: { color: MUTED, fontWeight: "700", fontSize: 12 },
  languageOptionTextActive: { color: ACCENT },

  welcomeRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  welcomeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { color: ACCENT, fontWeight: "700", fontSize: 12 },
  welcomeTitle: { color: TEXT, fontSize: 25, fontWeight: "800" },
  email: {
    color: TEXT,
    fontSize: 15,
    marginTop: 18,
    fontWeight: "600",
    lineHeight: 22,
  },
  intro: { color: themeColor("#AAB7AC", 'text'), fontSize: 13, lineHeight: 20, marginTop: 7 },
  planBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 20,
    backgroundColor: themeColor("#163823", 'surface'),
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  planDot: { height: 6, width: 6, borderRadius: 3, backgroundColor: ACCENT },
  planText: { color: ACCENT, fontWeight: "700", fontSize: 12 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: LINE,
  },
  action: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: themeColor("#16A34A66", 'border'),
    borderRadius: 14,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  actionText: { color: TEXT, fontSize: 13, fontWeight: "700", flexShrink: 1 },
  logoutIcon: { padding: 8, borderRadius: 12, backgroundColor: CARD },
});
  return {PANEL, LINE, TEXT, MUTED, ACCENT, CARD, styles, themeColor};
});
