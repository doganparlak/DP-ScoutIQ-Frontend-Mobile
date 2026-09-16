import React from 'react';
import { View } from 'react-native';
import { DailyScoutChallengeModal, DailyScoutLeaderboardModal } from '@/components/DailyScoutChallenge';
import { BG } from '@/theme';
import { TutorialPageGuide } from '@/components/Tutorial';

export default function DailyScoutScreen() {
  const [leaderboard, setLeaderboard] = React.useState(false);
  return <View style={{ flex: 1, backgroundColor: BG, padding: 16, gap: 16 }}>
    <TutorialPageGuide page="daily" />
    <DailyScoutChallengeModal embedded visible onOpenLeaderboard={() => setLeaderboard(true)} />
    <DailyScoutLeaderboardModal visible={leaderboard} onClose={() => setLeaderboard(false)} />
  </View>;
}
