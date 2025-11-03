import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '../theme';
import type { RootStackParamList, MainTabsParamList } from '../types';
import { logout } from '../services/api';

// Components
import FavoritePlayers from '@/components/FavoritePlayers';
import Account from '@/components/Account';
import { useTranslation } from 'react-i18next';

type ProfileTabNav = BottomTabNavigationProp<MainTabsParamList, 'Profile'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function MyProfileScreen() {
  const rootNav = useNavigation<RootNav>();
  const { t } = useTranslation();

  // Account plan code (display can be localized in Account)
  const [plan] = useState<'Free' | 'Pro' | 'Elite'>('Pro');

  const openPlans = () => Linking.openURL('https://example.com/plans'); // TODO: replace
  const openHelp  = () => rootNav.navigate('HelpCenter');

  const handleLogout = async () => {
    try { await logout(); } catch {}
    rootNav.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { paddingTop: 0 }]}
      // localized a11y description for the screen container
      accessibilityLabel={t('profileScreenAL', 'Profile screen')}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: -10, paddingBottom: 50 }}
        accessibilityLabel={t('profileScrollAL', 'Profile content')}
      >
        <Account
          plan={plan}
          onOpenPlans={openPlans}
          onOpenHelp={openHelp}
          onLogout={handleLogout}
        />

        <FavoritePlayers />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  // (Unused styles kept for future UI; safe to remove if not needed)
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

  logoutLinkWrap: {
    alignSelf: 'center',
    marginTop: 10,
    paddingBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  logoutText: { color: TEXT, fontWeight: '800', fontSize: 15, textAlign: 'center' },
});
