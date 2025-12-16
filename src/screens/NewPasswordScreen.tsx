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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { setNewPassword } from '@/services/api';
import { useTranslation } from 'react-i18next';

import scoutwiseLogo from '../../assets/scoutwise_logo.png'; 

type Nav = NativeStackNavigationProp<RootStackParamList, 'NewPassword'>;
type Route = RouteProp<RootStackParamList, 'NewPassword'>;

export default function NewPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { params } = useRoute<Route>(); // { email }
  const email = params.email;
  const { t } = useTranslation();

  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
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
      setError(
        e?.message || t('setNewPwFailed', 'Could not set your new password. Please try again.')
      );
    } finally {
      setSubmitting(false);
    }
  };

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
          <Text style={styles.title}>{t('newPwTitle', 'Create a new password')}</Text>
          <Text style={styles.subtitle}>
            {t('newPwSubtitle', 'Set a new password for {{email}}.', { email })}
          </Text>

          {/* New password */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t('newPassword', 'New password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder={t('placeholderPassword', '••••••••')}
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="next"
            />
            {/* Always-visible checklist (same format as SignUp) */}
            <View style={styles.pwChecklist}>
              <PwRule ok={hasMin} text={t('pwAtLeast8', 'At least 8 characters')} />
              <PwRule ok={hasLetter} text={t('pwLetter', 'Contains a letter (A–Z or a–z)')} />
              <PwRule ok={hasNumber} text={t('pwNumber', 'Contains a number (0–9)')} />
            </View>
          </View>

          {/* Confirm */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>{t('reenterNewPassword', 'Re-enter new password')}</Text>
            <TextInput
              value={again}
              onChangeText={setAgain}
              placeholder={t('placeholderPassword', '••••••••')}
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {password && again && !match ? (
            <Text style={styles.error}>
              {t('passwordsNoMatch', 'Passwords do not match.')}
            </Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSave}
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
                {t('savePassword', 'Save password')}
              </Text>
            )}
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
  // Top bar holder (absolute; left set dynamically)
  topBar: { position: 'absolute', zIndex: 10 },

  // Back button styles (same sizing as other screens)
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

  // Checklist styles
  pwChecklist: { marginTop: 8, gap: 6 },
  pwRuleRow: { flexDirection: 'row', alignItems: 'center' },
  pwRuleDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pwRuleText: { fontSize: 12 },

  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: {
    marginTop: 16,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },
});
