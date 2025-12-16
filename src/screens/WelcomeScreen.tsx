import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BG, TEXT, ACCENT, ACCENT_DARK, LINE, PANEL } from '@/theme';
import { RootStackParamList } from '@/types';
import { useLanguage } from '@/context/LanguageProvider';
import { useTranslation } from 'react-i18next';

import scoutwiseLogo from '../../assets/scoutwise_logo.png';
type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      {/* Logo */}
      <Image
        source={scoutwiseLogo}
        style={styles.logo}
        resizeMode="contain"
      />

      {/* App name: "scout" white, "wise" green */}
      <Text style={styles.appName}>
        <Text style={styles.appNameScout}>SCOUT</Text>
        <Text style={styles.appNameWise}>WISE</Text>
      </Text>

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
          <Text style={[styles.langText, lang === 'en' && styles.langTextActive]}>
            English
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setLang('tr')}
          style={({ pressed }) => [
            styles.langBtn,
            lang === 'tr' ? styles.langBtnActive : styles.langBtnIdle,
            pressed && { opacity: 0.9 },
          ]}
        >
          <Text style={[styles.langText, lang === 'tr' && styles.langTextActive]}>
            Türkçe
          </Text>
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
  logo: {
    width: 140,
    height: 140,
    marginBottom: 26,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 40,
  },
  appNameScout: {
    color: '#FFFFFF',
  },
  appNameWise: {
    color: ACCENT,
  },
  langRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
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
    fontSize: 17,
  },
  langTextActive: {
    color: TEXT,
    fontSize: 17,
  },
  primaryBtn: {
    width: '80%',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
  },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 17 },
  secondaryBtn: {
    width: '80%',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
  },
  secondaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 17 },
});
