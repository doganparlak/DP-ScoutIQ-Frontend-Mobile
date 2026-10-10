import SocialAuthButtons from '@/components/SocialAuthButtons';
import ScoutWiseBrandMark from '@/components/ScoutWiseBrandMark';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
// src/screens/LoginScreen.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Eye,EyeOff } from 'lucide-react-native';
import { useMemo,useRef,useState } from 'react';
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

import { useLanguage } from '@/context/LanguageProvider';
import { login } from '@/services/api';
import { RootStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const themed = useThemedStyles(getModuleTheme);
  const {BG, styles, MUTED, ACCENT_DARK} = themed;

  const navigation = useNavigation<Nav>();
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const passwordInput = useRef<TextInput>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(
    () => emailRegex.test(email) && password.length >= 8,
    [email, password]
  );

  const handleForgotPassword = () => navigation.navigate('ResetPassword');
  const goToSignUp = () => navigation.navigate('SignUp');

  const handleLogin = async () => {
    if (!isValid || submitting || socialBusy) return;
    try {
      setError(null);
      setSubmitting(true);

      const { user } = await login({ email, password, uiLanguage: lang });

      if (user?.uiLanguage && user.uiLanguage !== lang) {
        await setLang(user.uiLanguage);
      }

      await AsyncStorage.removeItem('reachout_sent_this_login').catch(() => {});

      navigation.reset({ index: 0, routes: [{ name: 'App' }] });
    } catch {
      setError(t('loginFailed', 'Log in failed. Please check your credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

    return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      enabled={Platform.OS === 'android'}
      behavior="height"
    >
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            alwaysBounceVertical={Platform.OS === 'ios'} showsVerticalScrollIndicator
            contentContainerStyle={[styles.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>

            {/* Logo above app name */}
            <ScoutWiseBrandMark style={styles.logo}/>

            {/* App name: SCOUT white, WISE green */}
            <Text style={styles.appName}>
              <Text style={styles.appNameScout}>SCOUT</Text>
              <Text style={styles.appNameWise}>WISE</Text>
            </Text>

            {/* Login frame/card */}
            <View style={styles.card}>
              <Text style={styles.title}>{t('login', 'Log in')}</Text>

              <Text style={styles.greeting}>
                {t('greeting', 'Spot the next star before anyone else.')}
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
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => passwordInput.current?.focus()}
                />
              </View>

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
                    onSubmitEditing={handleLogin}
                  />
                  <Pressable
                    onPress={() => setShowPassword(prev => !prev)}
                    hitSlop={8}
                    style={styles.eyeButton}
                  >
                    {showPassword ? <EyeOff size={20} color={MUTED} /> : <Eye size={20} color={MUTED} />}
                  </Pressable>
                </View>
              </View>

              <Pressable
                onPress={handleForgotPassword}
                style={({ pressed }) => [{ alignSelf: 'flex-end', opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.forgotLink}>
                  {t('forgotPassword', 'Did you forget your password?')}
                </Text>
              </Pressable>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                onPress={handleLogin}
                disabled={!isValid || submitting || socialBusy}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    opacity: !isValid || submitting || socialBusy ? 0.6 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                {submitting ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>{t('login', 'Log in')}</Text>}
              </Pressable>

              <Pressable
                onPress={goToSignUp}
                style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Text style={styles.secondaryBtnText}>
                  {t('noAccount', 'Don’t have an account yet?')}{' '}
                  <Text style={{ fontWeight: '700', color: ACCENT_DARK }}>{t('signup', 'Sign up')}</Text>
                </Text>
              </Pressable>
              <SocialAuthButtons appearance="compact" disabled={submitting} onBusyChange={setSocialBusy} />
            </View>
          </ScrollView>
        </View>
    </KeyboardAvoidingView>
  );

}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE, themeColor} = colors;

  const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 26,   // space between logo and title
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 14,  // space between title and card
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
    maxWidth: 520,
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 18,
    paddingTop: 24,
  },
  greeting: {
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
    marginTop: 6,
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
  forgotLink: { color: MUTED, fontWeight: '700', marginTop: 8, fontSize: 13 },
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
  title: { color: TEXT, fontSize: 20, fontWeight: '700', textAlign: 'center' },
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
});
  return {BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE, styles, themeColor};
});
