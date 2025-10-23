import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '../theme';
import type { RootStackParamList, MainTabsParamList } from '../types';
import { logout } from '../services/api';

// ⬇️ new component import (relative)
import FavoritePlayers from '@/components/FavoritePlayers';
import Account from '@/components/Account';


type ProfileTabNav = BottomTabNavigationProp<MainTabsParamList, 'Profile'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function MyProfileScreen() {
  const rootNav = useNavigation<RootNav>();

  // ----- account (placeholder; wire to /me if you want here) -----
  const [plan] = useState<'Free' | 'Pro' | 'Elite'>('Pro');

  const openPlans = () => Linking.openURL('https://example.com/plans'); // TODO: replace
  const openHelp  = () => rootNav.navigate('HelpCenter');

  const handleLogout = async () => {
    try { await logout(); } catch {}
    rootNav.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { paddingTop: 0 }]}>
      <ScrollView contentContainerStyle={{ paddingTop: -10, paddingBottom: 50 }}>
        {/* Account card */}
        <Account
          plan={plan}
          onOpenPlans={openPlans}
          onOpenHelp={openHelp}
          onLogout={handleLogout}
        />

        {/* Favorite players section moved to component */}
        <FavoritePlayers />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 10 },

  kv: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  k: { color: MUTED },
  v: { color: TEXT, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryBtn: { flex: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  outlineBtnText: { color: TEXT, fontWeight: '700', fontSize: 15 },

  // Subtle logout link
  logoutLinkWrap: {
    alignSelf: 'center',
    marginTop: 10,
    paddingBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  logoutText: { color: TEXT, fontWeight: '800', fontSize: 15, textAlign: 'center' },
});
