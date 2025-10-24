import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BG, TEXT, ACCENT, ACCENT_DARK, LINE, PANEL } from '@/theme';
import { RootStackParamList } from '@/types';
import { useLanguage } from '@/context/LanguageProvider';
import { useTranslation } from 'react-i18next';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text style={styles.appName}>{t('appName')}</Text>

      {/* Language picker */}
      <View style={styles.langRow}>
        <Pressable
          onPress={() => setLang('en')}
          style={({ pressed }) => [
            styles.langBtn,
            lang === 'en' ? styles.langBtnActive : styles.langBtnIdle,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>English</Text>
        </Pressable>

        <Pressable
          onPress={() => setLang('tr')}
          style={({ pressed }) => [
            styles.langBtn,
            lang === 'tr' ? styles.langBtnActive : styles.langBtnIdle,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.langText, lang === 'tr' && styles.langTextActive]}>Türkçe</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={() => navigation.navigate('Login')}
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: pressed ? ACCENT_DARK : ACCENT },
        ]}
      >
        <Text style={styles.primaryBtnText}>{t('login')}</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('SignUp')}
        style={({ pressed }) => [
          styles.secondaryBtn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.secondaryBtnText}>{t('signup')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  appName: {
    color: TEXT,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 28,
  },
  langRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  langBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  langBtnIdle: {
    backgroundColor: PANEL,
    borderColor: LINE,
  },
  langBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  langText: {
    color: TEXT,
    fontWeight: '700',
  },
  langTextActive: {
    color: TEXT, // keeps contrast in Dark theme
  },
  primaryBtn: {
    width: '80%',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
  },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    width: '80%',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
  },
  secondaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },
});
