import React from 'react';
import { ActivityIndicator, Alert, View, Text, StyleSheet, Pressable } from 'react-native';
import { PANEL, LINE, TEXT, MUTED, ACCENT, ACCENT_DARK, CARD } from '../theme';
import { getMe, updateMe, type Profile, type UILang } from '../services/api';
import { useTranslation } from 'react-i18next';
import type { Plan } from '@/services/api';
import { useLanguage } from '@/context/LanguageProvider';

type Props = {
  plan: Plan;
  onOpenPlans: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
};

export default function Account({ plan, onOpenPlans, onOpenHelp, onLogout }: Props) {
  const [email, setEmail] = React.useState<string>('—');
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
        setEmail(me?.email ?? '—');
        if (me?.uiLanguage && me.uiLanguage !== lang) {
          await setLang(me.uiLanguage);
        }
      } catch {
        // keep placeholder on error
      }
    })();
    return () => { alive = false; };
  }, [lang, setLang]);

  // Map plan code to localized label, e.g. plan_Pro
  const planLabel =
    plan === 'Pro Monthly'
      ? t('proMonthly', 'Pro Monthly')
      : plan === 'Pro Yearly'
        ? t('proYearly', 'Pro Yearly')
        : t('free', 'Free');

  return (
    <View style={styles.card} accessibilityLabel={t('accountTitle', 'Account')}>
      <Text style={styles.sectionTitle}>{t('accountTitle', 'Account')}</Text>

      <View style={styles.kv}>
        <Text style={styles.k}>{t('email', 'E-mail')}</Text>
        <Text style={styles.v}>{email}</Text>
      </View>

      <View style={styles.kv}>
        <Text style={styles.k}>{t('currentPlan', 'Current plan')}</Text>
        <Text style={styles.v}>{planLabel}</Text>
      </View>

      <View style={styles.kv}>
        <Text style={styles.k}>{t('language', 'Language')}</Text>
        <View style={styles.languageWrap}>
          <Pressable
            disabled={savingLanguage}
            onPress={() => setLanguageOpen((open) => !open)}
            style={({ pressed }) => [styles.languagePill, pressed && { opacity: 0.86 }]}
          >
            {savingLanguage ? (
              <ActivityIndicator size="small" color={ACCENT} />
            ) : (
              <Text style={styles.languagePillText}>
                {lang === 'tr' ? t('turkish', 'Turkish') : t('english', 'English')} ▾
              </Text>
            )}
          </Pressable>

          {languageOpen && (
            <View style={styles.languageDropdown}>
              {([
                ['en', t('english', 'English')],
                ['tr', t('turkish', 'Turkish')],
              ] as Array<[UILang, string]>).map(([code, label]) => (
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
                        t('languageUpdateFailed', 'Language update failed'),
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
                  <Text style={[styles.languageOptionText, lang === code && styles.languageOptionTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.btnRow}>
        <Pressable
          onPress={onOpenPlans}
          accessibilityRole="button"
          accessibilityLabel={t('managePlan', 'Manage plan')}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? ACCENT_DARK : ACCENT }]}
        >
          <Text style={styles.primaryBtnText}>{t('managePlan', 'Manage plan')}</Text>
        </Pressable>

        <Pressable
          onPress={onOpenHelp}
          accessibilityRole="button"
          accessibilityLabel={t('helpCenter', 'Help Center')}
          style={({ pressed }) => [styles.outlineBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.outlineBtnText}>{t('helpCenter', 'Help Center')}</Text>
        </Pressable>
      </View>

      {/* Subtle logout link */}
      <Pressable
        onPress={onLogout}
        accessibilityRole="button"
        accessibilityLabel={t('logout', 'Log out')}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        style={({ pressed }) => [styles.logoutLinkWrap, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.logoutText}>{t('logout', 'Log out')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },

  sectionTitle: { color: ACCENT, fontSize: 16, fontWeight: '700', marginBottom: 10 },

  kv: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  k: { color: MUTED },
  v: { color: TEXT, fontWeight: '600' },

  languageWrap: {
    alignItems: 'flex-end',
    position: 'relative',
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
  languagePillText: { color: TEXT, fontWeight: '700', fontSize: 13 },
  languageDropdown: {
    position: 'absolute',
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
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  languageOptionActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  languageOptionText: { color: MUTED, fontWeight: '800', fontSize: 14 },
  languageOptionTextActive: { color: ACCENT },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryBtn: { flex: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  outlineBtnText: { color: TEXT, fontWeight: '700', fontSize: 15 },

  logoutLinkWrap: {
    alignSelf: 'center',
    marginTop: 10,
    paddingBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  logoutText: { color: TEXT, fontWeight: '700', fontSize: 15, textAlign: 'center' },
});
