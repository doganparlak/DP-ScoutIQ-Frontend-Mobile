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
  Image, 
  Keyboard,
  TouchableWithoutFeedback
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { requestPasswordReset } from '@/services/api';
import { useTranslation } from 'react-i18next';

import scoutwiseLogo from '../../assets/scoutwise_logo.png'; 

type Nav = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(t('resetFailed', 'We couldn’t start the reset process. Please try again.'));
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
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          {/* Top-left back button aligned to the card's left edge */}
          <View style={[styles.topBar, { top: insets.top + 8, left: cardLeft }]}>
            <Pressable
              onPress={() => navigation.goBack()}
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
            {/* Logo above app name */}
            <Image
              source={scoutwiseLogo}
              style={styles.logo}
              resizeMode="contain"
            />

            {/* App name: SCOUT white, WISE green */}
            <Text style={styles.appName}>
              <Text style={styles.appNameScout}>SCOUT</Text>
              <Text style={styles.appNameWise}>WISE</Text>
            </Text>

            <View style={styles.card}>
              <Text style={styles.title}>{t('resetTitle', 'Reset your password')}</Text>
              <Text style={styles.subtitle}>
                {t(
                  'resetSubtitle',
                  "Enter your email address. We’ll send a verification code to your inbox to reset your password."
                )}
              </Text>

              <View style={styles.fieldBlock}>
                <Text style={styles.label}>{t('email', 'E-mail')}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={t('placeholderEmail', 'you@club.com')}
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
                    <Text style={styles.primaryBtnText}>
                      {t('sendResetCode', 'Send reset code')}
                    </Text>
                  )}
                </Pressable>
              ) : (
                <>
                  <View style={styles.successBox}>
                    <Text style={styles.successTitle}>{t('codeSent', 'Code sent')}</Text>
                    <Text style={styles.successText}>
                      {t(
                        'codeSentDesc',
                        'If an account exists for {{email}}, a verification code has been sent. Please check your inbox and spam folder.',
                        { email }
                      )}
                    </Text>
                  </View>

                  <Pressable
                    onPress={goToLogin}
                    style={({ pressed }) => [
                      styles.secondaryBtn,
                      { opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={styles.secondaryBtnText}>
                      {t('backToLogin', 'Back to Login')}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );

}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', zIndex: 10 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backIcon: { color: TEXT, fontSize: 24, fontWeight: '800', marginRight: 2 },
  backText: { color: TEXT, fontWeight: '700', fontSize: 18 },

  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },

  logo: {
    width: 120,
    height: 120,
    marginBottom: 26, // space between logo and title
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 14, // space between title and card
    letterSpacing: 0.5,
  },
  appNameScout: {
    color: '#FFFFFF',
  },
  appNameWise: {
    color: ACCENT,
  },

  card: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 18,
    paddingTop: 24,
  },
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
