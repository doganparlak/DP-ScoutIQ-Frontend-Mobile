// src/screens/NewPassword.tsx
import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView,
  Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // ✨ NEW
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { setNewPassword } from '@/services/api';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NewPassword'>;
type Route = RouteProp<RootStackParamList, 'NewPassword'>;

export default function NewPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets(); // ✨
  const { params } = useRoute<Route>(); // { email }
  const email = params.email;

  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✨ measure container width → align back button to card's left edge
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const cardWidth = useMemo(() => {
    if (containerWidth == null) return null;
    const available = Math.max(containerWidth - 36, 0); // wrap paddingHorizontal: 18 → total 36
    return Math.min(available, 560);
  }, [containerWidth]);
  const cardLeft = useMemo(() => {
    if (containerWidth == null || cardWidth == null) return 12; // fallback
    return (containerWidth - cardWidth) / 2;
  }, [containerWidth, cardWidth]);

  // Same rules as SignUp:
  const hasMin = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const pwValid = hasMin && hasLetter && hasNumber;
  const match = password.length > 0 && password === again;
  const isValid = useMemo(() => pwValid && match, [pwValid, match]);

  const handleSave = async () => {
    if (!isValid || submitting) return;
    try {
      setError(null);
      setSubmitting(true);
      await setNewPassword({ email, new_password: password });
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e: any) {
      setError(e?.message || 'Could not set your new password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      {/* ✨ Top-left back button aligned to card left */}
      <View style={[styles.topBar, { top: insets.top + 8, left: cardLeft }]}>
        <Pressable
          onPress={() => navigation.replace('Login')}
          hitSlop={14}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="Back to Login"
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Login</Text>
        </Pressable>
      </View>

      <View
        style={styles.wrap}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)} // ✨ capture width
      >
        <Text style={styles.appName}>ScoutIQ</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>
            Set a new password for <Text style={{ fontWeight: '700' }}>{email}</Text>.
          </Text>

          {/* New password */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="next"
            />
            {/* Always-visible checklist (same format as SignUp) */}
            <View style={styles.pwChecklist}>
              <PwRule ok={hasMin} text="At least 8 characters" />
              <PwRule ok={hasLetter} text="Contains a letter (A–Z or a–z)" />
              <PwRule ok={hasNumber} text="Contains a number (0–9)" />
            </View>
          </View>

          {/* Confirm */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Re-enter new password</Text>
            <TextInput
              value={again}
              onChangeText={setAgain}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {password && again && !match ? (
            <Text style={styles.error}>Passwords do not match.</Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSave}
            disabled={!isValid || submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: pressed ? ACCENT_DARK : ACCENT, opacity: !isValid || submitting ? 0.6 : 1 },
            ]}
          >
            {submitting ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Save password</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function PwRule({ ok, text }: { ok: boolean; text: string }) {
  return (
    <View style={styles.pwRuleRow}>
      <View style={[styles.pwRuleDot, { backgroundColor: ok ? ACCENT : MUTED }]} />
      <Text style={[styles.pwRuleText, { color: ok ? ACCENT : MUTED }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ✨ Top bar holder (absolute; left set dynamically)
  topBar: { position: 'absolute', zIndex: 10 },

  // ✨ Back button styles (same sizing as other screens)
  back: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backIcon: { color: TEXT, fontSize: 24, fontWeight: '800', marginRight: 2 },
  backText: { color: TEXT, fontWeight: '700', fontSize: 18 },

  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  appName: { color: ACCENT, fontSize: 28, fontWeight: '800', marginBottom: 14, letterSpacing: 0.5 },

  card: { width: '100%', maxWidth: 560, backgroundColor: PANEL, borderRadius: 20, borderWidth: 1, borderColor: LINE, padding: 18 },
  title: { color: TEXT, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: MUTED, marginTop: 6, marginBottom: 12, lineHeight: 20, textAlign: 'center' },

  fieldBlock: { marginTop: 12 },
  label: { color: TEXT, marginBottom: 6, fontWeight: '600' },
  input: {
    color: TEXT, backgroundColor: CARD, borderColor: LINE, borderWidth: 1.5,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },

  // Checklist styles
  pwChecklist: { marginTop: 8, gap: 6 },
  pwRuleRow: { flexDirection: 'row', alignItems: 'center' },
  pwRuleDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pwRuleText: { fontSize: 12 },

  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: { marginTop: 16, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },
});
