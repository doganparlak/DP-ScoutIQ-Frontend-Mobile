import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Animated, Easing } from 'react-native';
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

  // Ball-drop animation values
  const dropY = useRef(new Animated.Value(-260)).current; // start above screen
  const squash = useRef(new Animated.Value(1)).current;  // scaleY for squash/stretch
  const stretch = useRef(new Animated.Value(1)).current; // scaleX inverse-ish for realism (optional)
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance: drop -> bounce -> settle + a little squash/stretch on impact
    Animated.sequence([
      Animated.timing(fade, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),

      // DROP (fast acceleration feeling)
      Animated.timing(dropY, {
        toValue: 0,
        duration: 650,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),

      // IMPACT squash (short + punchy)
      Animated.parallel([
        Animated.timing(squash, {
          toValue: 0.85, // squish vertically
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(stretch, {
          toValue: 1.08, // widen a bit
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // BOUNCE UP (first rebound)
      Animated.parallel([
        Animated.timing(dropY, {
          toValue: -70,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(squash, {
          toValue: 1.05, // stretch vertically a bit as it leaves ground
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(stretch, {
          toValue: 0.98,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // FALL BACK DOWN (smaller)
      Animated.timing(dropY, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),

      // small squash
      Animated.parallel([
        Animated.timing(squash, {
          toValue: 0.92,
          duration: 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(stretch, {
          toValue: 1.05,
          duration: 80,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),

      // smaller bounce up
      Animated.timing(dropY, {
        toValue: -28,
        duration: 170,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),

      // settle back to rest + stabilize scales
      Animated.parallel([
        Animated.timing(dropY, {
          toValue: 0,
          duration: 170,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(squash, {
          toValue: 1,
          friction: 6,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.spring(stretch, {
          toValue: 1,
          friction: 6,
          tension: 140,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [dropY, squash, stretch, fade]);

  return (
    <View style={styles.wrap}>
      {/* Logo: drops from top, bounces, stabilizes */}
      <Animated.View
        style={[
          styles.logoWrap,
          {
            opacity: fade,
            transform: [
              { translateY: dropY },
              { scaleX: stretch },
              { scaleY: squash },
            ],
          },
        ]}
      >
        <Image source={scoutwiseLogo} style={styles.logo} resizeMode="contain" />
      </Animated.View>

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
        style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}
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

  // Keep marginBottom here so the final "resting" position matches your old layout
  logoWrap: {
    borderRadius: 28,
    marginBottom: 26,

    // depth (iOS)
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },

    // depth (Android)
    elevation: 6,
  },

  logo: {
    width: 140,
    height: 140,
  },

  appName: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 40,
  },
  appNameScout: { color: '#FFFFFF' },
  appNameWise: { color: ACCENT },

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
