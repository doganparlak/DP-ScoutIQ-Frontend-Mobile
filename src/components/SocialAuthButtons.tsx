import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { FontAwesome } from '@expo/vector-icons';
import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import { useLanguage } from '@/context/LanguageProvider';
import type { RootStackParamList } from '@/types';
import {
  appleModule, getSocialConfig, googleAvailable, saveSocialSession, startSocialSignIn,
  SocialAuthError, type SocialConfig, type SocialProvider,
} from '@/services/socialAuth';

export default function SocialAuthButtons({ intent = 'signin', disabled = false, connected = [], onConnected, onBusyChange, appearance = 'default' }: {
  appearance?: 'default' | 'welcome';
  intent?: 'signin' | 'connect'; disabled?: boolean; connected?: SocialProvider[];
  onConnected?: () => void; onBusyChange?: (busy: boolean) => void;
}) {
  const { styles, TEXT, DANGER, mode } = useThemedStyles(getStyles);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const [config, setConfig] = React.useState<SocialConfig | null>(null);
  const [appleReady, setAppleReady] = React.useState(false);
  const [busy, setBusy] = React.useState<SocialProvider | null>(null);
  const busyRef = React.useRef(false);
  const [error, setError] = React.useState('');
  const alive = React.useRef(true);
  React.useEffect(() => {
    alive.current = true;
    void getSocialConfig().then(value => {
      if (alive.current) setConfig(value);
      if (value.appleIOS && Platform.OS === 'ios') {
        try { void appleModule()?.isAvailableAsync().then(ready => { if (alive.current) setAppleReady(ready); }).catch(() => {}); } catch {}
      }
    });
    return () => { alive.current = false; };
  }, []);
  const apple = Platform.OS === 'ios' ? config?.appleIOS && appleReady : config?.appleAndroid;
  const google = (Platform.OS === 'ios' ? config?.googleIOS : config?.googleAndroid) && googleAvailable();
  if (!apple && !google) return null;
  const run = async (provider: SocialProvider) => {
    if (busyRef.current || disabled || connected.includes(provider)) return;
    busyRef.current = true; setBusy(provider); setError(''); onBusyChange?.(true);
    try {
      const result = await startSocialSignIn(provider, intent, lang);
      if (!result || !alive.current || !navigation.isFocused()) return;
      if (result.status === 'connected') { onConnected?.(); return; }
      if (result.status === 'pending') { navigation.navigate('SignUp', { social: result }); return; }
      const user = await saveSocialSession(result);
      if (user.uiLanguage && user.uiLanguage !== lang) await setLang(user.uiLanguage);
      navigation.reset({ index: 0, routes: [{ name: 'App' }] });
    } catch (e) {
      if (alive.current) setError(e instanceof SocialAuthError && e.status === 409
        ? t('socialAlreadyConnected') : t('socialSignInFailed'));
    } finally {
      busyRef.current = false;
      if (alive.current) { setBusy(null); onBusyChange?.(false); }
    }
  };
  const appleForeground = mode === 'light' ? '#FFFFFF' : '#000000';
  return (
    <View style={[styles.wrap, appearance === 'welcome' && styles.welcomeWrap]}>
      {apple ? (
        <Pressable accessibilityRole="button"
          accessibilityLabel={connected.includes('apple') ? t('socialAppleConnected') : t('socialContinueApple')}
          disabled={disabled || !!busy || connected.includes('apple')} onPress={() => { void run('apple'); }}
          style={({ pressed }) => [styles.button, appearance === 'welcome' && styles.welcomeButton,
            { backgroundColor: mode === 'light' ? '#000000' : '#FFFFFF', borderColor: mode === 'light' ? '#000000' : '#FFFFFF' },
            (pressed || disabled || !!busy || connected.includes('apple')) && { opacity: 0.55 }]}>
          <FontAwesome name="apple" size={22} color={appleForeground} />
          <Text style={[styles.label, appearance === 'welcome' && styles.welcomeLabel, { color: appleForeground }]}>
            {connected.includes('apple') ? t('socialAppleConnected') : t('socialContinueApple')}
          </Text>
        </Pressable>
      ) : null}
      {google ? (
        <Pressable accessibilityRole="button" disabled={disabled || !!busy || connected.includes('google')} onPress={() => { void run('google'); }} style={({ pressed }) => [styles.button, appearance === 'welcome' && styles.welcomeButton, (pressed || disabled || connected.includes('google')) && { opacity: 0.6 }]}>
          <GoogleMark />
          <Text style={[styles.label, appearance === 'welcome' && styles.welcomeLabel]}>{connected.includes('google') ? t('socialGoogleConnected') : t('socialContinueGoogle')}</Text>
        </Pressable>
      ) : null}
      {busy && <ActivityIndicator color={TEXT} />}
      {!!error && <Text accessibilityRole="alert" style={{ color: DANGER, fontSize: 13 }}>{error}</Text>}
      {intent === 'signin' && <View style={styles.divider}><View style={styles.line} /><Text style={styles.or}>{t('socialOrEmail')}</Text><View style={styles.line} /></View>}
    </View>
  );
}

// Google's recognizable multicolour mark, kept on a white surface in either theme.
import Svg, { Path } from 'react-native-svg';
function GoogleMark() {
  return <Svg width={20} height={20} viewBox="0 0 48 48">
    <Path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.67-.35-3.93H24v7.44h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.8 6.08-14.83Z" />
    <Path fill="#34A853" d="M24 44c5.5 0 10.12-1.82 13.53-4.71l-6.61-5.14c-1.83 1.23-4.18 1.96-6.92 1.96-5.32 0-9.83-3.59-11.44-8.42H5.73v5.3A20.43 20.43 0 0 0 24 44Z" />
    <Path fill="#FBBC05" d="M12.56 27.69a12.2 12.2 0 0 1 0-7.38v-5.3H5.73a20 20 0 0 0 0 17.98l6.83-5.3Z" />
    <Path fill="#EA4335" d="M24 11.89c3 0 5.7 1.03 7.83 3.05l5.87-5.87A19.63 19.63 0 0 0 24 4 20.43 20.43 0 0 0 5.73 15.01l6.83 5.3C14.17 15.48 18.68 11.89 24 11.89Z" />
  </Svg>;
}
const getStyles = createThemedStyles((c: ThemeColors) => ({ TEXT: c.TEXT, DANGER: c.DANGER, mode: c.mode, styles: StyleSheet.create({
  welcomeWrap: { marginTop: 0, marginBottom: 0 },
  welcomeButton: { minHeight: 52, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16 },
  welcomeLabel: { fontSize: 16, fontWeight: '600' },
  wrap: { gap: 10, marginTop: 16, marginBottom: 4, width: '100%' },
  button: { minHeight: 48, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: c.LINE, backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  label: { color: '#1F1F1F', fontSize: 15, fontWeight: '600', flexShrink: 1 },
  connected: { color: c.ACCENT, textAlign: 'center', fontSize: 12, marginTop: 5 },
  divider: { flexDirection: 'row', gap: 10, alignItems: 'center', marginVertical: 6 },
  line: { flex: 1, height: 1, backgroundColor: c.LINE }, or: { color: c.MUTED, fontSize: 12 },
}) }));
