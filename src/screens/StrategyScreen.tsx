// src/screens/StrategyScreen.tsx
import * as React from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Header from '@/components/Header';
import StrategyCard from '@/components/StrategyCard';
import { BG, ACCENT, ACCENT_DARK, MUTED } from '@/theme';
import type { MainTabsParamList } from '@/types';
import { useTranslation } from 'react-i18next';

type Nav = BottomTabNavigationProp<MainTabsParamList, 'Strategy'>;

export default function StrategyScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  const handleStart = () => navigation.navigate('Chat');

  return (
    <View style={styles.wrap}>
      <Header />
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <StrategyCard />
        <View style={{ paddingHorizontal: 16 }}>
          <Pressable
            onPress={handleStart}
            accessibilityRole="button"
            accessibilityLabel={t('startChatting', 'Start Chatting')}
            style={({ pressed }) => ({
              backgroundColor: pressed ? ACCENT_DARK : ACCENT,
              borderRadius: 12,
              padding: 14,
            })}
          >
            <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>
              {t('startChatting', 'Start Chatting')}
            </Text>
          </Pressable>

          <Text style={{ color: MUTED, marginTop: 8, textAlign: 'center' }}>
            {t('updateStrategyHint', 'You can update your strategy anytime.')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: BG },
});
