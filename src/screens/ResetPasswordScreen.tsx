// src/screens/ResetPasswordScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { requestPasswordReset } from '@/services/api';

type Nav = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 these hooks must be inside the component
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const cardWidth = useMemo(() => {
    if (containerWidth == null) return null;
    const available = Math.max(containerWidth - 36, 0); // wrap paddingHorizontal: 18 → total 36
    return Math.min(available, 560);
  }, [containerWidth]);

  const cardLeft = useMemo(() => {
    if (containerWidth == null || cardWidth == null) return 12; // safe fallback
    return (containerWidth - cardWidth) / 2;
  }, [containerWidth, cardWidth]);

  const isValid = useMemo(() => emailRegex.test(email), [email]);

  const handleSend = async () => {
    if (!isValid || submitting) return;
    try {
      setError(null);
      setSubmitting(true);
      await requestPasswordReset(email);
      setSent(true);
      navigation.replace('Verification', { email, context: 'reset' });
    } catch {
      setError('We couldn’t start the reset process. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => navigation.replace('Login');

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      {/* Top-left back button aligned to the card's left edge */}
      <View style={[styles.topBar, { top: insets.top + 8, left: cardLeft }]}>
        <Pressable
          onPress={() => navigation.goBack()}
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
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <Text style={styles.appName}>ScoutIQ</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            Enter your email address. We’ll send a verification code to your inbox to reset your password.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@club.com"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleSend}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {!sent ? (
            <Pressable
              onPress={handleSend}
              disabled={!isValid || submitting}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: pressed ? ACCENT_DARK : ACCENT,
                  opacity: !isValid || submitting ? 0.6 : 1,
                },
              ]}
            >
              {submitting ? (
                <ActivityIndicator />
              ) : (
                <Text style={styles.primaryBtnText}>Send reset code</Text>
              )}
            </Pressable>
          ) : (
            <>
              <View style={styles.successBox}>
                <Text style={styles.successTitle}>Code sent</Text>
                <Text style={styles.successText}>
                  If an account exists for <Text style={{ fontWeight: '700' }}>{email}</Text>, a verification code has been sent.
                  Please check your inbox and spam folder.
                </Text>
              </View>

              <Pressable
                onPress={goToLogin}
                style={({ pressed }) => [
                  styles.secondaryBtn,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.secondaryBtnText}>Back to Login</Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', zIndex: 10 },

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
    color: TEXT,
    backgroundColor: CARD,
    borderColor: LINE,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },

  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: { marginTop: 16, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    marginTop: 14,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: { color: MUTED, fontSize: 14 },

  successBox: {
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    padding: 12,
  },
  successTitle: { color: TEXT, fontWeight: '700', marginBottom: 6 },
  successText: { color: MUTED, lineHeight: 20 },
});
