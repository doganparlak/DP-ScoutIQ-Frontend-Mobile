import { TutorialProvider } from '@/components/Tutorial';
import { TeamAnalysisProvider } from '@/context/TeamAnalysisContext';
import ChatScreen from '@/screens/ChatScreen';
import DailyScoutScreen from '@/screens/DailyScoutScreen';
import HelpCenter from '@/screens/HelpCenterScreen';
import ManagePlanScreen from '@/screens/ManagePlanScreen';
import MyProfileScreen from '@/screens/MyProfileScreen';
import PlayerPoolScreen from '@/screens/PlayerPoolScreen';
import ScorePredictionScreen from '@/screens/ScorePredictionScreen';
import ScoutWiseProScreen from '@/screens/ScoutWiseProScreen';
import SimilarPlayersScreen from '@/screens/SimilarPlayersScreen';
import StrategyScreen from '@/screens/StrategyScreen';
import WeeklySearchesScreen from '@/screens/WeeklySearchesScreen';
import { MatchupWorkspaceScreen,PortfolioWorkspaceScreen } from '@/screens/WorkspaceScreens';
import { getMe,type Plan } from '@/services/api';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import type { MainTabsParamList,RootStackParamList,ScoutWiseProStackParamList } from '@/types';
import { canUseChat } from '@/utils/chatAccess';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MainNavigationContext } from './MainNavigationContext';
import MainSidebar from './MainSidebar';

import { MatchupProvider } from '@/context/MatchupContext';
import LeaguePerformanceScreen from '@/screens/LeaguePerformanceScreen';
import LeaguePoolScreen from '@/screens/LeaguePoolScreen';
import MatchPoolScreen from '@/screens/MatchPoolScreen';
import MatchPortfolioScreen from '@/screens/MatchPortfolioScreen';
import SeasonDataScreen from '@/screens/SeasonDataScreen';
import TeamAnalysisScreen from '@/screens/TeamAnalysisScreen';
import TeamPoolScreen from '@/screens/TeamPoolScreen';
import TeamPortfolioScreen from '@/screens/TeamPortfolioScreen';

// Keep the existing route identities and nested stacks so tutorials, deep navigation,
// and each section's state continue to work while the navigation UI becomes a drawer.
const Tab = createBottomTabNavigator<MainTabsParamList>();
const ProfileStack = createNativeStackNavigator<RootStackParamList>();
const ScoutWiseProStack = createNativeStackNavigator<ScoutWiseProStackParamList>();

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="MyProfile" component={MyProfileScreen} />
      <ProfileStack.Screen name="ManagePlan" component={ManagePlanScreen} />
      <ProfileStack.Screen name="HelpCenter" component={HelpCenter} />
    </ProfileStack.Navigator>
  );
}

function ScoutWiseProStackScreen() {
  return (
    <ScoutWiseProStack.Navigator screenOptions={{ headerShown: false }}>
      <ScoutWiseProStack.Screen name="ProHome" component={ChatScreen} />
      <ScoutWiseProStack.Screen name="LegacyStrategy" component={StrategyScreen} />
      <ScoutWiseProStack.Screen name="ProPlans" component={ScoutWiseProScreen} />
    </ScoutWiseProStack.Navigator>
  );
}

export default function MainTabs() {
  const themed = useThemedStyles(getModuleTheme);
  const {BG} = themed;

  const [plan, setPlan] = React.useState<Plan | null>(null);

  const loadPlan = React.useCallback(async () => {
    try {
      const me = await getMe();
      if (me?.plan) {
        setPlan(me.plan as Plan);
      }
    } catch (e: any) {
      console.log('LOAD PLAN ERROR:', e?.message ?? e);
      setPlan(null);
    }
  }, []);

  const resolveChatAccess = React.useCallback(async () => {
    try {
      const me = await getMe();
      if (me?.plan) {
        const latestPlan = me.plan as Plan;
        setPlan(latestPlan);
        return canUseChat(me);
      }
    } catch (e: any) {
      console.log('RESOLVE PLAN ERROR:', e?.message ?? e);
    }

    return false;
  }, []);

  React.useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  useFocusEffect(
    React.useCallback(() => {
      loadPlan();
    }, [loadPlan]),
  );

  return (
    <TutorialProvider>
      <MatchupProvider>
      <TeamAnalysisProvider>
      <MainNavigationContext.Provider value={true}>
        <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: BG }}>
          <Tab.Navigator
            initialRouteName="Profile"
            backBehavior="history"
            tabBar={(props) => <MainSidebar {...props} resolveChatAccess={resolveChatAccess} />}
            screenOptions={{
              headerShown: false,
              tabBarPosition: 'top',
              sceneStyle: { backgroundColor: BG },
            }}
          >
            <Tab.Screen name="Strategy" component={PlayerPoolScreen} />
            <Tab.Screen name="Portfolio" component={PortfolioWorkspaceScreen} />
            <Tab.Screen name="Matchup" component={MatchupWorkspaceScreen} />
            <Tab.Screen name="TeamPortfolio" component={TeamPortfolioScreen} />
            <Tab.Screen name="MatchPortfolio" component={MatchPortfolioScreen} />
            <Tab.Screen name="SimilarPlayers" component={SimilarPlayersScreen} />
            <Tab.Screen name="TeamAnalysis" component={TeamAnalysisScreen} />
            <Tab.Screen name="TeamPool" component={TeamPoolScreen} />
            <Tab.Screen name="LeaguePool" component={LeaguePoolScreen} />
            <Tab.Screen name="LeaguePerformance" component={LeaguePerformanceScreen} />
            <Tab.Screen name="MatchPool" component={MatchPoolScreen} />
            <Tab.Screen name="SeasonData" component={SeasonDataScreen} />
            <Tab.Screen name="DailyScout" component={DailyScoutScreen} />
            <Tab.Screen name="ScorePrediction" component={ScorePredictionScreen} />
            <Tab.Screen name="Weekly" component={WeeklySearchesScreen} />
            <Tab.Screen name="Chat" component={ScoutWiseProStackScreen} />
            <Tab.Screen name="Profile" component={ProfileStackScreen} />
            <Tab.Screen name="ManagePlan" component={ManagePlanScreen} />
            <Tab.Screen name="HelpCenter" component={HelpCenter} />
          </Tab.Navigator>
        </SafeAreaView>
      </MainNavigationContext.Provider>
      </TeamAnalysisProvider>
    </MatchupProvider>
    </TutorialProvider>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {BG, themeColor} = colors;


  return {BG, themeColor};
});
