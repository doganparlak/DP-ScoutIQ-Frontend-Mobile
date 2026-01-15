import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BG, TEXT, ACCENT, ACCENT_DARK, LINE, PANEL } from '@/theme';
import { RootStackParamList } from '@/types';
import { useLanguage } from '@/context/LanguageProvider';
import { useTranslation } from 'react-i18next';

import { Fontisto } from '@expo/vector-icons';

import scoutwiseLogo from '../../assets/scoutwise_logo.png';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();

  const [langOpen, setLangOpen] = useState(false);

  // Default language to English (only if it's not already set)
  useMemo(() => {
    if (!lang) setLang('en');
  }, [lang, setLang]);

  return (
    <View style={styles.wrap}>
      {/* Logo */}
      <Image source={scoutwiseLogo} style={styles.logo} resizeMode="contain" />

      {/* App name: "scout" white, "wise" green */}
      <Text style={styles.appName}>
        <Text style={styles.appNameScout}>SCOUT</Text>
        <Text style={styles.appNameWise}>WISE</Text>
      </Text>

      {/* Language picker (world icon + dropdown) */}
      <View style={styles.langRow}>
        <View style={styles.langWrapper}>
          <Pressable
            onPress={() => setLangOpen((v) => !v)}
            style={({ pressed }) => [
              styles.langIconBtn,
              pressed && { opacity: 0.9 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Change language"
          >
            <Fontisto name="world-o" size={32} color={ACCENT} />
          </Pressable>

          {langOpen && (
            <View style={styles.langDropdown}>
              <Pressable
                onPress={() => {
                  setLang('en');
                  setLangOpen(false);
                }}
                style={({ pressed }) => [
                  styles.langOption,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.langOptionText}>English</Text>
              </Pressable>

              <View style={styles.langDivider} />

              <Pressable
                onPress={() => {
                  setLang('tr');
                  setLangOpen(false);
                }}
                style={({ pressed }) => [
                  styles.langOption,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <Text style={styles.langOptionText}>Türkçe</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.buttonsSpacer} />
        </View>
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
    marginBottom: 60,
  },
  appNameScout: {
    color: '#FFFFFF',
  },
  appNameWise: {
    color: ACCENT,
  },

  // Language
  langRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
  },
  langWrapper: {
    position: 'relative',
    alignItems: 'center',
  },
  langIconBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: PANEL,
    borderColor: LINE,
  },
  langDropdown: {
    position: 'absolute',
    top: 54, // was 48 (a bit lower so it doesn't overlap the icon)
    left: '50%',
    transform: [{ translateX: -70 }], // half of width (140) to center it
    width: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    overflow: 'hidden',
    zIndex: 999,
    elevation: 6,
  },

  langOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',       // ✅ centers text horizontally
    justifyContent: 'center',   // ✅ centers text vertically
  },

  langOptionText: {
    color: TEXT,
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center', // ✅ ensures centered alignment for text
  },
  langDivider: {
    height: 1,
    backgroundColor: LINE,
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
  buttonsSpacer: {
  height: 55, // increases vertical gap so Login/Signup sit a bit lower
},
});
