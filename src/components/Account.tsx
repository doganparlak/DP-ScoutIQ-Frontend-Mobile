import React from "react";
import Svg, {
  Defs,
  ClipPath,
  Circle,
  Rect,
  Polygon,
  Image as SvgImage,
} from "react-native-svg";
import { LogOut, CreditCard, CircleHelp } from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { PANEL, LINE, TEXT, MUTED, ACCENT, CARD } from "../theme";
import { getMe, updateMe, type Profile, type UILang } from "../services/api";
import { useTranslation } from "react-i18next";
import type { Plan } from "@/services/api";
import { useLanguage } from "@/context/LanguageProvider";

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
  const [email, setEmail] = React.useState<string>("—");
  const [savingLanguage, setSavingLanguage] = React.useState(false);
  const [languageOpen, setLanguageOpen] = React.useState(false);
  const { t } = useTranslation();
  const { lang, setLang } = useLanguage();

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me: Profile = await getMe();
        if (!alive) return;
        setEmail(me?.email ?? "—");
        if (me?.uiLanguage && me.uiLanguage !== lang) {
          await setLang(me.uiLanguage);
        }
      } catch {
        // keep placeholder on error
      }
    })();
    return () => {
      alive = false;
    };
  }, [lang, setLang]);

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
          <Svg
            width={48}
            height={48}
            viewBox="0 0 1024 1024"
            accessible={false}
          >
            <Defs>
              <ClipPath id="welcome-logo-shape">
                <Circle cx="512" cy="491" r="397" />
              </ClipPath>
            </Defs>
            <Rect x="496" y="0" width="32" height="1024" fill="#FFFFFF" />
            <Polygon
              points="0,918 218,700 306,788 70,1024 0,1024"
              fill="#FFFFFF"
            />
            <SvgImage
              href={require("../../assets/scoutwise_logo.png")}
              width="1024"
              height="1024"
              clipPath="url(#welcome-logo-shape)"
            />
          </Svg>
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
        <View style={styles.planBadge}>
          <View style={styles.planDot} />
          <Text style={styles.planText}>{planLabel}</Text>
        </View>

        <View style={styles.kv}>
          <Text style={styles.k}>{t("language", "Language")}</Text>
          <View style={styles.languageWrap}>
            <Pressable
              disabled={savingLanguage}
              onPress={() => setLanguageOpen((open) => !open)}
              style={({ pressed }) => [
                styles.languagePill,
                pressed && { opacity: 0.86 },
              ]}
            >
              {savingLanguage ? (
                <ActivityIndicator size="small" color={ACCENT} />
              ) : (
                <Text style={styles.languagePillText}>
                  {lang === "tr"
                    ? t("turkish", "Turkish")
                    : t("english", "English")}{" "}
                  ▾
                </Text>
              )}
            </Pressable>

            {languageOpen && (
              <View style={styles.languageDropdown}>
                {(
                  [
                    ["en", t("english", "English")],
                    ["tr", t("turkish", "Turkish")],
                  ] as Array<[UILang, string]>
                ).map(([code, label]) => (
                  <Pressable
                    key={code}
                    disabled={savingLanguage || lang === code}
                    onPress={async () => {
                      try {
                        setSavingLanguage(true);
                        await updateMe({ uiLanguage: code });
                        await setLang(code);
                        setLanguageOpen(false);
                      } catch (e: any) {
                        Alert.alert(
                          t("languageUpdateFailed", "Language update failed"),
                          String(e?.message || e),
                        );
                      } finally {
                        setSavingLanguage(false);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.languageOption,
                      lang === code && styles.languageOptionActive,
                      pressed && lang !== code && { opacity: 0.86 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        lang === code && styles.languageOptionTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 16,
    zIndex: 10,
  },
  kv: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    zIndex: 10,
  },
  k: { color: MUTED },
  v: { color: TEXT, fontWeight: "600" },

  languageWrap: {
    alignItems: "flex-end",
    position: "relative",
    zIndex: 2,
  },
  languagePill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  languagePillText: { color: TEXT, fontWeight: "700", fontSize: 13 },
  languageDropdown: {
    position: "absolute",
    top: 32,
    right: 0,
    minWidth: 132,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    padding: 4,
    zIndex: 5,
  },
  languageOption: {
    borderRadius: 9,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  languageOptionActive: {
    backgroundColor: "rgba(22, 163, 74, 0.12)",
  },
  languageOptionText: { color: MUTED, fontWeight: "800", fontSize: 14 },
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
  intro: { color: "#AAB7AC", fontSize: 13, lineHeight: 20, marginTop: 7 },
  planBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 20,
    backgroundColor: "#163823",
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
    borderColor: "#16A34A66",
    borderRadius: 14,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  actionText: { color: TEXT, fontSize: 13, fontWeight: "700", flexShrink: 1 },
  logoutIcon: { padding: 8, borderRadius: 12, backgroundColor: CARD },
});
