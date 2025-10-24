import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PANEL, LINE, TEXT, MUTED, ACCENT, ACCENT_DARK, CARD } from '../theme';
import { getMe, type Profile } from '../services/api';
import { useTranslation } from 'react-i18next';

type Props = {
  plan: 'Free' | 'Pro' | 'Elite';
  onOpenPlans: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
};

export default function Account({ plan, onOpenPlans, onOpenHelp, onLogout }: Props) {
  const [email, setEmail] = React.useState<string>('—');
  const { t } = useTranslation();

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const me: Profile = await getMe();
        if (alive) setEmail(me?.email ?? '—');
      } catch {
        // keep placeholder on error
      }
    })();
    return () => { alive = false; };
  }, []);

  // Map plan code to localized label, e.g. plan_Pro
  const planLabel = t(`plan_${plan}`, plan);

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
