// src/screens/VerificationScreen.tsx
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { verifyResetCode, verifySignupCode } from '@/services/api';
import { useTranslation } from 'react-i18next';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Verification'>;
type Route = RouteProp<RootStackParamList, 'Verification'>;

export default function VerificationScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<Route>(); // { email, context: 'signup' | 'reset' }
  const { t } = useTranslation();

  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // measure container width → align back button to card's left edge
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const cardWidth = useMemo(() => {
    if (containerWidth == null) return null;
    const available = Math.max(containerWidth - 36, 0); // wrap paddingHorizontal: 18 → total 36
    return Math.min(available, 560);
  }, [containerWidth]);
  const cardLeft = useMemo(() => {
    if (containerWidth == null || cardWidth == null) return 12;
    return (containerWidth - cardWidth) / 2;
  }, [containerWidth, cardWidth]);

  const isSixDigits = useMemo(() => /^\d{6}$/.test(code), [code]);

  const handleVerify = async () => {
    if (!isSixDigits || submitting) return;
    try {
      setError(null);
      setSubmitting(true);

      if (params.context === 'reset') {
        await verifyResetCode(params.email, code);
        navigation.replace('NewPassword', { email: params.email });
      } else {
        await verifySignupCode(params.email, code);
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (e: any) {
      setError(e?.message || t('verificationFailed', 'Verification failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    params.context === 'signup'
      ? t('verifyEmailTitle', 'Verify your email')
      : t('verifyResetTitle', 'Verify your reset request');

  const subtitle =
    params.context === 'signup' ? (
      <Text style={styles.subtitle}>
        {t('verifyEmailSubtitlePrefix', 'Enter the 6-digit code we sent to')}{' '}
        <Text style={{ fontWeight: '700' }}>{params.email}</Text>.
      </Text>
    ) : (
      <Text style={styles.subtitle}>
        {t('verifyResetSubtitlePrefix', 'Enter the 6-digit code sent to')}{' '}
        <Text style={{ fontWeight: '700' }}>{params.email}</Text>{' '}
        {t('verifyResetSubtitleSuffix', 'to continue resetting your password.')}
      </Text>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      {/* Top-left back button aligned to card left */}
      <View style={[styles.topBar, { top: insets.top + 8, left: cardLeft }]}>
        <Pressable
          onPress={() => navigation.replace('Login')}
          hitSlop={14}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={t('backToLogin', 'Back to Login')}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>{t('login', 'Log in')}</Text>
        </Pressable>
      </View>

      <View
        style={styles.wrap}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <Text style={styles.appName}>{t('appName', 'ScoutIQ')}</Text>

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {subtitle}

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t('verificationCode', 'Verification code')}</Text>
            <TextInput
              value={code}
              onChangeText={(t_) => setCode(t_.replace(/\D/g, '').slice(0, 6))}
              placeholder={t('verificationCodePlaceholder', '123456')}
              placeholderTextColor={MUTED}
              keyboardType="number-pad"
              style={styles.input}
              maxLength={6}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleVerify}
            disabled={!isSixDigits || submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: pressed ? ACCENT_DARK : ACCENT,
                opacity: !isSixDigits || submitting ? 0.6 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryBtnText}>{t('verify', 'Verify')}</Text>
            )}
          </Pressable>
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
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },

  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: { marginTop: 16, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },
});
