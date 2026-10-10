import SocialAuthButtons from '@/components/SocialAuthButtons';
import ScoutWiseBrandMark from '@/components/ScoutWiseBrandMark';
import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, ChevronDown, Check } from 'lucide-react-native';
import { useLanguage } from '@/context/LanguageProvider';
import { RootStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function WelcomeScreen() {
  const { styles, MUTED, ACCENT } = useThemedStyles(getModuleTheme);
  const navigation = useNavigation<Nav>();
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const [langOpen, setLangOpen] = useState(false);
  const logoSize = Math.max(96, Math.min(148, height * 0.17, width * 0.35));

  useEffect(() => { if (!lang) void setLang('en'); }, [lang, setLang]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.langWrapper}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('language')}
              accessibilityState={{ expanded: langOpen }} onPress={() => setLangOpen(v => !v)}
              style={({ pressed }) => [styles.langButton, pressed && { opacity: 0.7 }]}>
              <Globe size={17} color={MUTED} />
              <Text style={styles.langLabel}>{lang === 'tr' ? 'Türkçe' : 'English'}</Text>
              <ChevronDown size={15} color={MUTED} />
            </Pressable>
            {langOpen && <View style={styles.langDropdown}>
              {(['tr', 'en'] as const).map(value => <Pressable key={value} accessibilityRole="button"
                accessibilityState={{ selected: lang === value }}
                onPress={() => { void setLang(value); setLangOpen(false); }}
                style={({ pressed }) => [styles.langOption, pressed && { opacity: 0.7 }]}>
                <Text style={styles.langOptionText}>{value === 'tr' ? 'Türkçe' : 'English'}</Text>
                {lang === value && <Check size={16} color={ACCENT} />}
              </Pressable>)}
            </View>}
          </View>
        </View>

        <View style={[styles.hero, { paddingVertical: height < 700 ? 24 : 40 }]}>
          <ScoutWiseBrandMark style={{ width: logoSize, height: logoSize }} />
          <Text style={[styles.appName, { fontSize: Math.min(36, width * 0.085) }]}>
            <Text style={styles.appNameScout}>SCOUT</Text><Text style={styles.appNameWise}>WISE</Text>
          </Text>
          <Text style={styles.tagline}>{t('navigationTagline')}</Text>
        </View>

        <View style={styles.actions}>
          <SocialAuthButtons appearance="welcome" />
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [styles.actionButton, styles.loginButton, pressed && { opacity: 0.85 }]}>
            <Text style={styles.loginText}>{t('continueWithEmail')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getModuleTheme = createThemedStyles((c: ThemeColors) => ({ MUTED: c.MUTED, ACCENT: c.ACCENT,
  styles: StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.BG },
    wrap: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24 },
    header: { width: '100%', maxWidth: 480, alignItems: 'flex-end', zIndex: 2 },
    langWrapper: { position: 'relative' },
    langButton: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: c.PANEL, borderWidth: 1, borderColor: c.LINE },
    langLabel: { color: c.TEXT, fontSize: 13, fontWeight: '600' },
    langDropdown: { position: 'absolute', top: 46, right: 0, width: 152, borderRadius: 14, borderWidth: 1, borderColor: c.LINE, backgroundColor: c.PANEL, overflow: 'hidden', zIndex: 3, elevation: 6 },
    langOption: { minHeight: 46, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    langOptionText: { color: c.TEXT, fontSize: 14, fontWeight: '600' },
    hero: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
    appName: { fontWeight: '800', letterSpacing: 0.5, marginTop: 20 },
    appNameScout: { color: c.TEXT },
    appNameWise: { color: c.ACCENT },
    tagline: { color: c.MUTED, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 10 },
    actions: { width: '100%', maxWidth: 420, gap: 12 },
    actionButton: { width: '100%', minHeight: 52, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    loginButton: { backgroundColor: c.ACCENT_DARK, borderColor: c.ACCENT_DARK },
    loginText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  }),
}));
