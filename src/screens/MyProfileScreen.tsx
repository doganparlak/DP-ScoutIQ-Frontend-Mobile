// MyProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BG } from '../theme';
import type { RootStackParamList } from '../types';
import { logout, getMe } from '../services/api';
import type { Plan } from '@/services/api';

import Account from '@/components/Account';
import ProfileSummary from '@/components/ProfileSummary';
import { ProfileTutorialModal, TutorialPageGuide, useTutorial } from '@/components/Tutorial';
import { useTranslation } from 'react-i18next';
type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<RootNav>();
  const { t } = useTranslation();
  const tutorial = useTutorial();
  const scrollRef = React.useRef<ScrollView | null>(null);

  const [plan, setPlan] = useState<Plan>('Free');

  const loadMe = useCallback(async () => {
    try {
      const me = await getMe();
      if (me?.plan) setPlan(me.plan as Plan);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    loadMe();
  }, [loadMe]);

  useFocusEffect(
    useCallback(() => {
      loadMe();
    }, [loadMe]),
  );


  const moveToScoutWiseTutorial = () => {
    tutorial.moveToScoutWise();
    rootNav.getParent()?.navigate('Chat', { screen: 'LegacyStrategy' } as never);
  };

  const isProfileTutorial = tutorial.active && tutorial.stage === 'profile';
  React.useEffect(() => {
    if (isProfileTutorial && tutorial.profileStep !== 'intro') moveToScoutWiseTutorial();
  }, [isProfileTutorial, tutorial.profileStep]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    rootNav.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  return (
    <SafeAreaView
      edges={[]}
      style={[styles.safe, { paddingTop: 0 }]}
      accessibilityLabel={t('profileScreenAL', 'Profile screen')}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ flexGrow: 1, paddingTop: 0, paddingBottom: Math.max(12, insets.bottom) }}
        accessibilityLabel={t('profileScrollAL', 'Profile content')}
      >
        <Account
          plan={plan}
          onLogout={handleLogout}
          onOpenPlans={() => rootNav.getParent()?.navigate("ManagePlan")}
          onOpenHelp={() => rootNav.getParent()?.navigate("HelpCenter")}
          navigationLocked={isProfileTutorial}
        />
        <View style={styles.tutorialGuide}>
          <TutorialPageGuide page="panel" onShow={y => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        </View>
        <ProfileSummary />
      </ScrollView>

      <ProfileTutorialModal
        visible={isProfileTutorial && tutorial.profileStep === 'intro'}
        onDone={moveToScoutWiseTutorial}
        onSkip={() => {
          tutorial.skipTutorial();
          rootNav.getParent()?.navigate('Strategy' as never);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  tutorialGuide: { marginHorizontal: 16, marginTop: 14 },
});
