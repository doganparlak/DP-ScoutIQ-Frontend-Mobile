import SocialAuthButtons from '@/components/SocialAuthButtons';
import { linkSocialAccount, registerSocialAccount, saveSocialSession, SocialAuthError } from '@/services/socialAuth';
import { useLanguage } from '@/context/LanguageProvider';
import ScoutWiseBrandMark from '@/components/ScoutWiseBrandMark';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useNavigation,useRoute,type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye,EyeOff } from 'lucide-react-native';
import { useMemo,useRef,useState } from 'react';
import {
ActivityIndicator,
Alert,
Keyboard,
KeyboardAvoidingView,
Linking,
Modal,
Platform,
Pressable,
ScrollView,
StyleSheet,
Switch,
Text,
TextInput,
View
} from 'react-native';

import DataUsage from '@/components/DataUsage';
import { requestSignupCode,signUp } from '@/services/api';
import { RootStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export default function SignUpScreen() {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, MUTED, TEXT, ACCENT_DARK, LINE} = themed;

  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteProp<RootStackParamList, 'SignUp'>>();
  const social = route.params?.social;
  const { setLang } = useLanguage();
  const [socialMode, setSocialMode] = useState<'link' | 'create'>('create');
  const linking = !!social && socialMode === 'link';
  const [socialBusy, setSocialBusy] = useState(false);
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  const privacyUrl = LEGAL_URLS[lang].privacy;
  const termsUrl =
    Platform.OS === 'ios' ? LEGAL_URLS.iosTerms : LEGAL_URLS[lang].terms;


  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordInput = useRef<TextInput>(null);
  const [password, setPassword] = useState('');

  const hasMin = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const pwValid = hasMin && hasLetter && hasNumber;

  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeDataUsage, setAgreeDataUsage] = useState(false);
  const [dataUsageOpen, setDataUsageOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isValid = useMemo(() => {
    return (
      (social ? (linking ? emailRegex.test(email) && password.length > 0 : true) : emailRegex.test(email) && pwValid) &&
      (linking || (agreePrivacy && agreeTerms && agreeDataUsage))
    );
  }, [email, password, pwValid, agreePrivacy, agreeTerms, agreeDataUsage, social, linking]);

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
    if (!isValid || submitting || socialBusy) return;
    try {
      setError(null);
      setSubmitting(true);
      if (social) {
        const result = linking
          ? await linkSocialAccount(social.challenge, email.trim(), password, lang)
          : await registerSocialAccount({ challenge: social.challenge, dob: null,
              country: 'Unknown', newsletter: false, uiLanguage: lang,
              privacyAccepted: agreePrivacy, termsAccepted: agreeTerms, dataUsageAccepted: agreeDataUsage });
        const user = await saveSocialSession(result);
        if (user.uiLanguage && user.uiLanguage !== lang) await setLang(user.uiLanguage);
        navigation.reset({ index: 0, routes: [{ name: 'App' }] });
        return;
      }
      await signUp({
        email,
        password,
        dob: '',
        country: 'Unknown',
        plan: 'Free',
        favorite_players: [],
        newsletter: false,
      });
      await requestSignupCode(email);
      navigation.replace('Verification', {
        email,
        password,
        context: 'signup',
      });
    } catch (e: any) {
      if (social && e instanceof SocialAuthError && e.status === 409) setSocialMode('link');
      setError(social ? t(e instanceof SocialAuthError && e.status === 409 ? 'socialUseExisting' : e instanceof SocialAuthError && e.status === 401 ? 'socialLinkFailed' : 'socialSignInFailed') : t('signupFailed', 'Sign up failed. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        enabled={Platform.OS === 'android'}
        behavior="height"
      >
          <View style={styles.flex}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.scrollContent,
              ]}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              showsVerticalScrollIndicator
              alwaysBounceVertical={Platform.OS === 'ios'}
            >
              <View style={styles.wrap}>
                <ScoutWiseBrandMark style={styles.logo}/>

                <Text style={styles.appName}>
                  <Text style={styles.appNameScout}>SCOUT</Text>
                  <Text style={styles.appNameWise}>WISE</Text>
                </Text>

                <View style={styles.card}>
                  <Text style={styles.title}>{social ? t('socialFinishTitle') : t('createAccount', 'Create your account')}</Text>
                  <Text style={styles.subtitle}>
                    {social ? t('socialFinishBody') : t('signupSubtitle', 'Join the data-driven scouting revolution.')}
                  </Text>

                  {social && <View style={styles.socialModeSwitch}>
                    {(['create', 'link'] as const).map(mode => <Pressable key={mode}
                      accessibilityRole="tab" accessibilityState={{ selected: mode === socialMode, disabled: submitting }}
                      disabled={submitting} onPress={() => { setSocialMode(mode); setError(null); }}
                      style={[styles.socialModeSegment, mode === socialMode && styles.socialModeSelected]}>
                      <Text style={[styles.socialModeText, mode === socialMode && styles.socialModeSelectedText]}>
                        {t(mode === 'create' ? 'socialNewAccountTab' : 'socialExistingAccountTab')}
                      </Text>
                    </Pressable>)}
                  </View>}
                  {social && !linking && <Text style={styles.socialAccountNote}>{t('socialExistingAccountNote')}</Text>}
                  {(!social || linking) && <>
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
                      blurOnSubmit={false}
                      onSubmitEditing={() => passwordInput.current?.focus()}
                    />
                  </View>

                  {/* Password */}
                  <View style={styles.fieldBlock}>
                    <Text style={styles.label}>{t('password', 'Password')}</Text>

                    <View style={styles.passwordRow}>
                      <TextInput
                        ref={passwordInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t('placeholderPassword', '••••••••')}
                        placeholderTextColor={MUTED}
                        secureTextEntry={!showPassword}
                        style={styles.passwordInput}
                        returnKeyType="done"
                        onSubmitEditing={Keyboard.dismiss}
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

                    {linking && <Pressable accessibilityRole="link" disabled={submitting}
                      onPress={() => navigation.navigate('ResetPassword')}
                      style={({ pressed }) => [styles.socialForgotPassword, { opacity: pressed ? 0.7 : 1 }]}>
                      <Text style={styles.socialForgotPasswordText}>{t('forgotPassword')}</Text>
                    </Pressable>}
                    {!social && <View style={styles.pwChecklist}>
                      <PwRule ok={hasMin} text={t('pwAtLeast8', 'At least 8 characters')} />
                      <PwRule
                        ok={hasLetter}
                        text={t('pwLetter', 'Contains a letter (A–Z or a–z)')}
                      />
                      <PwRule ok={hasNumber} text={t('pwNumber', 'Contains a number (0–9)')} />
                    </View>}
                  </View>

                  </>}
                  {!linking && <>
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

                  </>}
                  {error ? <Text style={styles.error}>{error}</Text> : null}

                  <Pressable
                    onPress={handleSubmit}
                    disabled={!isValid || submitting || socialBusy}
                    style={({ pressed }) => [
                      styles.primaryBtn,
                      {
                        opacity: !isValid || submitting || socialBusy ? 0.6 : pressed ? 0.9 : 1,
                      },
                    ]}
                  >
                    {submitting ? (
                      <ActivityIndicator />
                    ) : (
                      <Text style={styles.primaryBtnText}>{social ? t(linking ? 'socialLinkAndContinue' : 'socialCreateAndContinue') : t('signup', 'Sign up')}</Text>
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
                  {!social && <SocialAuthButtons appearance="compact" disabled={submitting} onBusyChange={setSocialBusy} />}
                </View>
              </View>
            </ScrollView>

            {/* rest unchanged */}


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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PwRule({ ok, text }: { ok: boolean; text: string }) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, MUTED} = themed;

  return (
    <View style={styles.pwRuleRow}>
      <View style={[styles.pwRuleDot, { backgroundColor: ok ? ACCENT : MUTED }]} />
      <Text style={[styles.pwRuleText, { color: ok ? ACCENT : MUTED }]}>{text}</Text>
    </View>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE, themeColor} = colors;

  const styles = StyleSheet.create({
  socialAccountNote: { color: MUTED, fontSize: 13, lineHeight: 19, marginTop: 10, marginBottom: 4 },
  socialForgotPassword: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 4 },
  socialForgotPasswordText: { color: ACCENT_DARK, fontSize: 13, fontWeight: '600' },
  socialModeSwitch: {
    flexDirection: 'row',
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 15,
    padding: 4,
    marginTop: 16,
    marginBottom: 4,
  },
  socialModeSegment: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialModeSelected: { backgroundColor: ACCENT_DARK },
  socialModeText: { color: MUTED, fontSize: 14, fontWeight: '600', textAlign: 'center' },
  socialModeSelectedText: { color: '#FFFFFF', fontWeight: '700' },
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
    justifyContent: 'flex-start',
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
  appNameScout: { color: themeColor('#FFFFFF', 'text') },
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
  subtitle: {
    color: MUTED,
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 20,
    textAlign: 'center',
  },

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
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: { color: MUTED, fontSize: 14 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: themeColor('rgba(0,0,0,0.4)', 'surface'),
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
    justifyContent: 'center',
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
  countryModalCard: {
    maxHeight: '70%',
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
  return {BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE, styles, themeColor};
});
