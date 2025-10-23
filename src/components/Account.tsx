import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PANEL, LINE, TEXT, MUTED, ACCENT, ACCENT_DARK, CARD } from '../theme';
import { getMe, type Profile } from '../services/api';

type Props = {
  plan: 'Free' | 'Pro' | 'Elite';
  onOpenPlans: () => void;
  onOpenHelp: () => void;
  onLogout: () => void;
};

export default function Account({ plan, onOpenPlans, onOpenHelp, onLogout }: Props) {
  const [email, setEmail] = React.useState<string>('—');

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

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Account</Text>

      <View style={styles.kv}>
        <Text style={styles.k}>Email</Text>
        <Text style={styles.v}>{email}</Text>
      </View>

      <View style={styles.kv}>
        <Text style={styles.k}>Current plan</Text>
        <Text style={styles.v}>{plan}</Text>
      </View>

      <View style={styles.btnRow}>
        <Pressable
          onPress={onOpenPlans}
          style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? ACCENT_DARK : ACCENT }]}
        >
          <Text style={styles.primaryBtnText}> Subscription plans</Text>
        </Pressable>

        <Pressable
          onPress={onOpenHelp}
          style={({ pressed }) => [styles.outlineBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.outlineBtnText}>Help center</Text>
        </Pressable>
      </View>

      {/* Subtle logout link */}
      <Pressable
        onPress={onLogout}
        accessibilityRole="button"
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        style={({ pressed }) => [styles.logoutLinkWrap, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.logoutText}>Log out</Text>
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

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 10 },

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
  logoutText: { color: TEXT, fontWeight: '800', fontSize: 15, textAlign: 'center' },
});
