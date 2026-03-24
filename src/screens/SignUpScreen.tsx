import React, { useMemo, useState, useMemo as useRNMemo } from 'react';
import { Eye, EyeOff } from 'lucide-react-native';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Switch,
  Modal,
  FlatList,
  Image,
  Keyboard,
  TouchableWithoutFeedback,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { signUp, requestSignupCode } from '@/services/api';
import DataUsage from '@/components/DataUsage';
import { useTranslation } from 'react-i18next';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import scoutwiseLogo from '../../assets/scoutwise_logo.png';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const LEGAL_URLS = {
  en: {
    privacy: 'https://scoutwise.ai/legal/privacy/en',
    terms: 'https://scoutwise.ai/legal/terms/en',
  },
  tr: {
    privacy: 'https://scoutwise.ai/legal/privacy/tr',
    terms: 'https://scoutwise.ai/legal/terms/tr',
  },
  iosTerms: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
} as const;


// Format "YYYY-MM-DD" as the user types
function formatDob(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

// helper
function toIsoDob(dmy: string): string {
  const [dd, mm, yyyy] = dmy.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

export default function SignUpScreen() {
  const navigation = useNavigation<Nav>();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  const privacyUrl = LEGAL_URLS[lang].privacy;
  const termsUrl =
  Platform.OS === 'ios' ? LEGAL_URLS.iosTerms : LEGAL_URLS[lang].terms;

  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');

  const hasMin = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const pwValid = hasMin && hasLetter && hasNumber;

  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeDataUsage, setAgreeDataUsage] = useState(false);
  const [dataUsageOpen, setDataUsageOpen] = useState(false);

  const [newsletter, setNewsletter] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => {
    return (
      emailRegex.test(email) &&
      pwValid &&
      agreePrivacy &&
      agreeTerms &&
      agreeDataUsage
    );
  }, [email, pwValid, agreePrivacy, agreeTerms, agreeDataUsage]);

  const goToLogin = () => navigation.replace('Login');
  
  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          t('cannotOpenLink', 'Cannot open link'),
          t('cannotOpenLinkDesc', 'Your device cannot open this link right now.'),
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert(
        t('cannotOpenLink', 'Cannot open link'),
        String(e?.message || t('tryAgain', 'Please try again.')),
      );
    }
  };

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    try {
      setError(null);
      setSubmitting(true);
      await signUp({ email, password, dob: '', country: 'Unknown', plan: 'Free', favorite_players: [], newsletter });
      await requestSignupCode(email);
      navigation.replace('Verification', {
        email,
        password,
        context: 'signup',
      });
    } catch (e: any) {
      setError(t('signupFailed', 'Sign up failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.flex}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: Math.max(insets.bottom + 24, 36) },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.wrap}>
                <Image source={scoutwiseLogo} style={styles.logo} resizeMode="contain" />

                <Text style={styles.appName}>
                  <Text style={styles.appNameScout}>SCOUT</Text>
                  <Text style={styles.appNameWise}>WISE</Text>
                </Text>

                <View style={styles.card}>
                  <Text style={styles.title}>{t('createAccount', 'Create your account')}</Text>
                  <Text style={styles.subtitle}>
                    {t('signupSubtitle', 'Join the data-driven scouting revolution.')}
                  </Text>

                  {/* Email */}
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
                      returnKeyType="next"
                    />
                  </View>

                  {/* Password */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.label}>{t('password', 'Password')}</Text>

                    <View style={styles.passwordRow}>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t('placeholderPassword', '••••••••')}
                        placeholderTextColor={MUTED}
                        secureTextEntry={!showPassword}
                        style={styles.passwordInput}
                        returnKeyType="next"
                      />
                      <Pressable
                        onPress={() => setShowPassword(prev => !prev)}
                        hitSlop={8}
                        style={styles.eyeButton}
                      >
                        {showPassword ? (
                          <EyeOff size={20} color={MUTED} />
                        ) : (
                          <Eye size={20} color={MUTED} />
                        )}
                      </Pressable>
                    </View>

                    <View style={styles.pwChecklist}>
                      <PwRule ok={hasMin} text={t('pwAtLeast8', 'At least 8 characters')} />
                      <PwRule ok={hasLetter} text={t('pwLetter', 'Contains a letter (A–Z or a–z)')} />
                      <PwRule ok={hasNumber} text={t('pwNumber', 'Contains a number (0–9)')} />
                    </View>
                  </View>

                  <View style={[styles.switchRow, { marginTop: 12 }]}>
                    <Text style={styles.switchLabel}>{t('newsletter', 'Subscribe to newsletter')}</Text>
                    <Switch value={newsletter} onValueChange={setNewsletter} />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelWrap}>
                      <Text style={styles.switchLabel}>
                        {t('signupAgreePrefix', 'I agree to the ')}
                        <Text style={styles.link} onPress={() => openUrl(privacyUrl)}>
                          {t('privacyPolicySignup', 'Privacy Policy')}
                        </Text>
                        {t('signupAgreeSuffix', '')}
                      </Text>
                    </View>
                    <Switch value={agreePrivacy} onValueChange={setAgreePrivacy} />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelWrap}>
                      <Text style={styles.switchLabel}>
                        {t('signupAgreePrefix', 'I agree to the ')}
                        <Text style={styles.link} onPress={() => openUrl(termsUrl)}>
                          {t('termsOfUseSignup', 'Terms of Service')}
                        </Text>
                        {t('signupAgreeSuffix', '')}
                      </Text>
                    </View>
                    <Switch value={agreeTerms} onValueChange={setAgreeTerms} />
                  </View>

                  <View style={styles.switchRow}>
                    <View style={styles.switchLabelWrap}>
                      <Text style={styles.switchLabel}>
                        {t('signupAgreePrefix', 'I agree to the ')}
                        <Text style={styles.link} onPress={() => setDataUsageOpen(true)}>
                          {t('dataUsageSignup', 'Data Usage')}
                        </Text>
                        {t('signupAgreeSuffix', '')}
                      </Text>
                    </View>
                    <Switch value={agreeDataUsage} onValueChange={setAgreeDataUsage} />
                  </View>

                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Pressable
                    onPress={handleSubmit}
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
                      <Text style={styles.primaryBtnText}>{t('signup', 'Sign up')}</Text>
                    )}
                  </Pressable>

                  <Pressable
                    onPress={goToLogin}
                    style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={styles.secondaryBtnText}>
                      {t('haveAccount', 'Already have an account?')}{' '}
                      <Text style={{ fontWeight: '700', color: ACCENT_DARK }}>
                        {t('login', 'Log in')}
                      </Text>
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <Modal
              visible={dataUsageOpen}
              animationType="slide"
              transparent
              onRequestClose={() => setDataUsageOpen(false)}
            >
              <View style={styles.modalBackdrop}>
                <View style={[styles.modalCard, styles.dataUsageModalCard]}>
                  <View style={styles.dataUsageHeader}>
                    <Text style={styles.modalTitle}>{t('dataUsageTitle', 'Data Usage')}</Text>

                    <Pressable
                      onPress={() => setDataUsageOpen(false)}
                      hitSlop={8}
                      style={styles.dataUsageCloseBtn}
                    >
                      <Text style={styles.dataUsageCloseText}>{t('close', 'Close')}</Text>
                    </Pressable>
                  </View>

                  <DataUsage />
                </View>
              </View>
            </Modal>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  safe: {
  flex: 1,
    backgroundColor: BG,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 24,
  },
  wrap: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },

  logo: {
    width: '42%',
    maxWidth: 120,
    height: 80,
    marginBottom: 18,
    alignSelf: 'center',
  },
  appName: { fontSize: 28, fontWeight: '800', marginBottom: 14, letterSpacing: 0.5 },
  appNameScout: { color: '#FFFFFF' },
  appNameWise: { color: ACCENT },

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

  pwChecklist: { marginTop: 8, gap: 6 },
  pwRuleRow: { flexDirection: 'row', alignItems: 'center' },
  pwRuleDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  pwRuleText: { fontSize: 12 },

  row2: { flexDirection: 'row', alignItems: 'center' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  switchLabelWrap: { flex: 1, paddingRight: 10 },
  switchLabel: { color: TEXT },

  link: {
    color: ACCENT_DARK,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: { marginTop: 16, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: { color: MUTED, fontSize: 14 },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: PANEL,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
  },
  modalTitle: { color: TEXT, fontSize: 18, fontWeight: '700' },
  countryRow: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomColor: LINE,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderColor: LINE,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingRight: 10,
  },
  passwordInput: {
    flex: 1,
    color: TEXT,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  eyeButton: {
    paddingLeft: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dataUsageModalCard: {
    maxHeight: '85%',
    paddingBottom: 12,
  },

  dataUsageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  dataUsageCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  dataUsageCloseText: {
    color: ACCENT_DARK,
    fontWeight: '800',
  },

});
