// MyProfileScreen.tsx
import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { BG, TEXT, ACCENT, PANEL, CARD, MUTED, LINE } from '../theme';
import type { RootStackParamList, MainTabsParamList } from '../types';
import { logout, getMe } from '../services/api';
import type { Plan } from '@/services/api';

import FavoritePlayers from '@/components/FavoritePlayers';
import Account from '@/components/Account';
import {
  DailyScoutChallengeFrame,
  DailyScoutChallengeModal,
  DailyScoutLeaderboardModal,
} from '@/components/DailyScoutChallenge';
import { ProfileTutorialModal, TutorialHint, useTutorial } from '@/components/Tutorial';
import { useTranslation } from 'react-i18next';
import { showInterstitialAndWaitSafely } from '@/ads/interstitial';
import {
  incrementDailyScoutChallengeOpenCount,
  shouldShowDailyScoutChallengeInterstitial,
} from '@/ads/adGating';
import { ProNotReadyScreen } from '@/ads/pro';
import { ArrowDown } from 'lucide-react-native';

type RootNav = NativeStackNavigationProp<RootStackParamList>;

export default function MyProfileScreen() {
  const rootNav = useNavigation<RootNav>();
  const { t } = useTranslation();
  const tutorial = useTutorial();
  const scrollRef = React.useRef<ScrollView | null>(null);

  const [plan, setPlan] = useState<Plan>('Free');
  const [dailyChallengeOpen, setDailyChallengeOpen] = useState(false);
  const [dailyLeaderboardOpen, setDailyLeaderboardOpen] = useState(false);
  const [proUpsellOpen, setProUpsellOpen] = useState(false);

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

  const openPlans = () => rootNav.navigate('ManagePlan');
  const openHelp = () => rootNav.navigate('HelpCenter');

  const moveToScoutWiseTutorial = () => {
    tutorial.moveToScoutWise();
    rootNav.getParent()?.navigate('Chat', { screen: 'LegacyStrategy' } as never);
  };

  const isProfileTutorial = tutorial.active && tutorial.stage === 'profile';
  const profileTutorialStep = isProfileTutorial ? tutorial.profileStep : null;

  React.useEffect(() => {
    if (!isProfileTutorial) return;

    const timer = setTimeout(() => {
      if (tutorial.profileStep === 'watchlist') {
        scrollRef.current?.scrollTo({ y: 430, animated: true });
      }
      if (tutorial.profileStep === 'dailyScout') {
        scrollRef.current?.scrollTo({ y: 120, animated: true });
      }
      if (tutorial.profileStep === 'report') {
        scrollRef.current?.scrollTo({ y: 520, animated: true });
      }
      if (tutorial.profileStep === 'filters') {
        scrollRef.current?.scrollTo({ y: 170, animated: true });
      }
      if (tutorial.profileStep === 'lineup') {
        scrollRef.current?.scrollTo({ y: 170, animated: true });
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isProfileTutorial, tutorial.profileStep]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    rootNav.reset({ index: 0, routes: [{ name: 'Auth' }] });
  };

  const openDailyChallenge = async () => {
    if (plan === 'Free') {
      try {
        const nextCount = await incrementDailyScoutChallengeOpenCount();
        if (shouldShowDailyScoutChallengeInterstitial(nextCount)) {
          const shown = await showInterstitialAndWaitSafely();
          if (!shown) {
            setProUpsellOpen(true);
            return;
          }
        }
      } catch {
        setProUpsellOpen(true);
        return;
      }
    }
    setDailyChallengeOpen(true);
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safe, { paddingTop: 0 }]}
      accessibilityLabel={t('profileScreenAL', 'Profile screen')}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: -10, paddingBottom: 50 }}
        accessibilityLabel={t('profileScrollAL', 'Profile content')}
      >
        <Account
          plan={plan}
          onOpenPlans={openPlans}
          onOpenHelp={openHelp}
          onLogout={handleLogout}
          navigationLocked={isProfileTutorial}
        />

        <View style={styles.tutorialHintFrame}>
          <TutorialHint
            visible={isProfileTutorial && tutorial.profileStep === 'dailyScout'}
            title={t('tutorialProfileDailyScoutTitle', 'Daily Scout Challenge')}
            body={t(
              'tutorialProfileDailyScoutBody',
              'This section lets you answer the daily scouting question and follow your weekly score against other users.',
            )}
            actionLabel={t('tutorialContinueToPlayerPortfolio', 'Continue to Player Portfolio')}
            arrow="none"
            onAction={() => tutorial.setProfileStep('watchlist')}
            onSkipAll={() => {
              tutorial.skipTutorial();
              rootNav.getParent()?.navigate('Strategy' as never);
            }}
          />
          {isProfileTutorial && tutorial.profileStep === 'dailyScout' ? (
            <ArrowDown style={styles.tutorialBottomArrow} size={24} color={ACCENT} strokeWidth={2.4} />
          ) : null}
        </View>

        <DailyScoutChallengeFrame
          onOpenChallenge={openDailyChallenge}
          onOpenLeaderboard={() => setDailyLeaderboardOpen(true)}
          navigationLocked={isProfileTutorial}
        />

        <FavoritePlayers
          plan={plan}
          profileTutorialStep={profileTutorialStep}
          onProfileTutorialNext={() => {
            if (tutorial.profileStep === 'watchlist') {
              tutorial.setProfileStep('report');
              return;
            }
            if (tutorial.profileStep === 'report') {
              tutorial.setProfileStep('filters');
              return;
            }
            if (tutorial.profileStep === 'filters') {
              tutorial.setProfileStep('lineup');
              return;
            }
            if (tutorial.profileStep === 'lineup') {
              tutorial.setProfileStep('lineupModal');
              return;
            }
            if (tutorial.profileStep === 'lineupModal') {
              moveToScoutWiseTutorial();
              return;
            }
            moveToScoutWiseTutorial();
          }}
          onProfileTutorialSkip={() => {
            tutorial.skipTutorial();
            rootNav.getParent()?.navigate('Strategy' as never);
          }}
        />
      </ScrollView>

      <ProfileTutorialModal
        visible={isProfileTutorial && tutorial.profileStep === 'intro'}
        onDone={() => tutorial.setProfileStep('watchlist')}
        onSkip={() => {
          tutorial.skipTutorial();
          rootNav.getParent()?.navigate('Strategy' as never);
        }}
      />
      <DailyScoutChallengeModal
        visible={dailyChallengeOpen}
        onClose={() => setDailyChallengeOpen(false)}
      />
      <DailyScoutLeaderboardModal
        visible={dailyLeaderboardOpen}
        onClose={() => setDailyLeaderboardOpen(false)}
      />
      <ProNotReadyScreen
        visible={proUpsellOpen}
        onClose={() => setProUpsellOpen(false)}
      />
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
  tutorialHintFrame: { marginHorizontal: 16 },
  tutorialBottomArrow: { alignSelf: 'center', marginTop: 8, marginBottom: -4 },

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
