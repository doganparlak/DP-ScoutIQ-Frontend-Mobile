import React, { useMemo, useState, useMemo as useRNMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
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
import { COUNTRIES } from '@/constants/countries';
import { useTranslation } from 'react-i18next';

import scoutwiseLogo from '../../assets/scoutwise_logo.png';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateRegex = /^\d{2}-\d{2}-\d{4}$/;

const PRIVACY_URL = 'https://scoutwise.ai/docs/PRIVACY%20POLICY.pdf';
const TERMS_URL = 'https://scoutwise.ai/docs/TERMS%20OF%20USE%20%26%20EULA.pdf';

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
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const hasMin = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const pwValid = hasMin && hasLetter && hasNumber;

  const [dob, setDob] = useState('');
  const [country, setCountry] = useState('');

  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [newsletter, setNewsletter] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // country picker state
  const [countryOpen, setCountryOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');

  const filteredCountries = useRNMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c => c.toLowerCase().includes(q));
  }, [countryQuery]);

  const isValid = useMemo(() => {
    return (
      emailRegex.test(email) &&
      pwValid &&
      dateRegex.test(dob) &&
      country.trim().length >= 2 &&
      agreePrivacy &&
      agreeTerms
    );
  }, [email, pwValid, dob, country, agreePrivacy, agreeTerms]);

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
      const dobIso = toIsoDob(dob);
      await signUp({ email, password, dob: dobIso, country, plan: 'Free', favorite_players: [], newsletter });
      await requestSignupCode(email);
      navigation.replace('Verification', { email, context: 'signup' });
    } catch (e: any) {
      setError(t('signupFailed', 'Sign up failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openCountryPicker = () => {
    setCountryQuery('');
    setCountryOpen(true);
  };

  const pickCountry = (name: string) => {
    setCountry(name);
    setCountryOpen(false);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={{ flex: 1 }}>
          <View style={styles.wrap}>
            <Image source={scoutwiseLogo} style={styles.logo} resizeMode="contain" />

            <Text style={styles.appName}>
              <Text style={styles.appNameScout}>SCOUT</Text>
              <Text style={styles.appNameWise}>WISE</Text>
            </Text>

            <View style={styles.card}>
              <Text style={styles.title}>{t('createAccount', 'Create your account')}</Text>
              <Text style={styles.subtitle}>{t('signupSubtitle', 'Join the data-driven scouting revolution.')}</Text>

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
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('placeholderPassword', '••••••••')}
                  placeholderTextColor={MUTED}
                  secureTextEntry
                  style={styles.input}
                  returnKeyType="next"
                />

                <View style={styles.pwChecklist}>
                  <PwRule ok={hasMin} text={t('pwAtLeast8', 'At least 8 characters')} />
                  <PwRule ok={hasLetter} text={t('pwLetter', 'Contains a letter (A–Z or a–z)')} />
                  <PwRule ok={hasNumber} text={t('pwNumber', 'Contains a number (0–9)')} />
                </View>
              </View>

              {/* DOB + Country */}
              <View style={styles.row2}>
                <View style={[styles.fieldBlock, { flex: 1, marginRight: 6 }]}>
                  <Text style={styles.label}>{t('dob', 'Date of birth')}</Text>
                  <TextInput
                    value={dob}
                    onChangeText={(t_) => setDob(formatDob(t_))}
                    placeholder={t('placeholderDob', 'DD-MM-YYYY')}
                    placeholderTextColor={MUTED}
                    style={styles.input}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    autoCorrect={false}
                    autoComplete="off"
                    importantForAutofill="no"
                    maxLength={10}
                  />
                </View>

                <View style={[styles.fieldBlock, { flex: 1, marginLeft: 6 }]}>
                  <Text style={styles.label}>{t('country', 'Country')}</Text>
                  <Pressable onPress={openCountryPicker}>
                    <View style={[styles.input, { justifyContent: 'center' }]}>
                      <Text style={{ color: country ? TEXT : MUTED }}>
                        {country || t('selectCountry', 'Select your country')}
                      </Text>
                    </View>
                  </Pressable>
                </View>
              </View>

              {/* Newsletter (unchanged) */}
              <View style={[styles.switchRow, { marginTop: 12 }]}>
                <Text style={styles.switchLabel}>{t('newsletter', 'Subscribe to newsletter')}</Text>
                <Switch value={newsletter} onValueChange={setNewsletter} />
              </View>

              {/* ✅ Privacy agreement with hyperlink (i18n-friendly) */}
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchLabel}>
                    {t('signupAgreePrefix', 'I agree to the ')}
                    <Text style={styles.link} onPress={() => openUrl(PRIVACY_URL)}>
                      {t('privacyPolicySignup', 'Privacy Policy')}
                    </Text>
                    {t('signupAgreeSuffix', '')}
                  </Text>
                </View>
                <Switch value={agreePrivacy} onValueChange={setAgreePrivacy} />
              </View>

              {/* ✅ Terms agreement with hyperlink (i18n-friendly) */}
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.switchLabel}>
                    {t('signupAgreePrefix', 'I agree to the ')}
                    <Text style={styles.link} onPress={() => openUrl(TERMS_URL)}>
                      {t('termsOfUseSignup', 'Terms of Service')}
                    </Text>
                    {t('signupAgreeSuffix', '')}
                  </Text>
                </View>
                <Switch value={agreeTerms} onValueChange={setAgreeTerms} />
              </View>


              {error ? <Text style={styles.error}>{error}</Text> : null}

              {/* Submit */}
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
                {submitting ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>{t('signup', 'Sign up')}</Text>}
              </Pressable>

              {/* Go to Login */}
              <Pressable
                onPress={goToLogin}
                style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.secondaryBtnText}>
                  {t('haveAccount', 'Already have an account?')}{' '}
                  <Text style={{ fontWeight: '700', color: ACCENT_DARK }}>{t('login', 'Log in')}</Text>
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Country Picker Modal */}
          <Modal
            visible={countryOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setCountryOpen(false)}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={styles.modalBackdrop}>
                <TouchableWithoutFeedback accessible={false}>
                  <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>{t('selectCountry', 'Select your country')}</Text>

                    <TextInput
                      value={countryQuery}
                      onChangeText={setCountryQuery}
                      placeholder={t('searchCountry', 'Search country...')}
                      placeholderTextColor={MUTED}
                      style={[styles.input, { marginTop: 10 }]}
                    />

                    <FlatList
                      data={filteredCountries}
                      keyExtractor={(item) => item}
                      keyboardShouldPersistTaps="handled"
                      style={{ marginTop: 10, maxHeight: 360 }}
                      renderItem={({ item }) => (
                        <Pressable onPress={() => pickCountry(item)}>
                          <View style={styles.countryRow}>
                            <Text style={{ color: TEXT }}>{item}</Text>
                          </View>
                        </Pressable>
                      )}
                    />

                    <Pressable
                      onPress={() => setCountryOpen(false)}
                      style={({ pressed }) => [
                        styles.secondaryBtn,
                        { marginTop: 12, opacity: pressed ? 0.85 : 1 },
                      ]}
                    >
                      <Text style={styles.secondaryBtnText}>{t('close', 'Close')}</Text>
                    </Pressable>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
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
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },

  logo: { width: 120, height: 120, marginBottom: 26 },
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
    color: ACCENT,
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
});
