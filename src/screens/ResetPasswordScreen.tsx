import ScoutWiseBrandMark from '@/components/ScoutWiseBrandMark';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo,useState } from 'react';
import {
ActivityIndicator,
KeyboardAvoidingView,
Platform,
Pressable,
ScrollView,
StyleSheet,
Text,
TextInput,
View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { requestPasswordReset } from '@/services/api';
import { RootStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';


type Nav = NativeStackNavigationProp<RootStackParamList, 'ResetPassword'>;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ResetPasswordScreen() {
  const themed = useThemedStyles(getModuleTheme);
  const {BG, styles, MUTED} = themed;

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
      enabled={Platform.OS === 'android'}
      behavior="height"
    >
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

          <ScrollView style={{ flex: 1 }}
            contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 24 }]}
            onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            alwaysBounceVertical={Platform.OS === 'ios'} showsVerticalScrollIndicator>

            {/* Logo above app name */}
            <ScoutWiseBrandMark style={styles.logo}/>

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
                      opacity: !isValid || submitting ? 0.6 : pressed ? 0.9 : 1,
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
          </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );

}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {BG, TEXT, ACCENT, PANEL, CARD, MUTED, LINE, themeColor} = colors;

  const styles = StyleSheet.create({
  topBar: { position: 'absolute', zIndex: 10 },

  back: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backIcon: { color: TEXT, fontSize: 24, fontWeight: '800', marginRight: 2 },
  backText: { color: TEXT, fontWeight: '700', fontSize: 18 },

  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },

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
    color: themeColor('#FFFFFF', 'text'),
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

  error: { color: themeColor('#F87171', 'text'), marginTop: 12, fontWeight: '600' },

  primaryBtn: {
    marginTop: 16,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: themeColor('rgba(22, 163, 74, 0.12)', 'surface'),
  },
  primaryBtnText: { color: ACCENT, fontWeight: '900', fontSize: 16 },

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
  return {BG, TEXT, ACCENT, PANEL, CARD, MUTED, LINE, styles, themeColor};
});
