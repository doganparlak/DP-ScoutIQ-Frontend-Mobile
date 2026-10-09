import { DailyScoutChallengeModal,DailyScoutLeaderboardModal } from '@/components/DailyScoutChallenge';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import React from 'react';
import { View } from 'react-native';

import { TutorialPageGuide } from '@/components/Tutorial';

export default function DailyScoutScreen() {
  const themed = useThemedStyles(getModuleTheme);
  const {BG} = themed;

  const [leaderboard, setLeaderboard] = React.useState(false);
  return <View style={{ flex: 1, backgroundColor: BG, padding: 16, gap: 16 }}>
    <TutorialPageGuide page="daily" />
    <DailyScoutChallengeModal embedded visible onOpenLeaderboard={() => setLeaderboard(true)} />
    <DailyScoutLeaderboardModal visible={leaderboard} onClose={() => setLeaderboard(false)} />
  </View>;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {BG, themeColor} = colors;


  return {BG, themeColor};
});
