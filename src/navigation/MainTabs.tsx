import { TeamAnalysisProvider } from '@/context/TeamAnalysisContext';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { PortfolioWorkspaceScreen, MatchupWorkspaceScreen, EmptyWorkspaceScreen } from '@/screens/WorkspaceScreens';
import DailyScoutScreen from '@/screens/DailyScoutScreen';
import WeeklySearchesScreen from '@/screens/WeeklySearchesScreen';
import PlayerPoolScreen from '@/screens/PlayerPoolScreen';
import ScoutWiseProScreen from '@/screens/ScoutWiseProScreen';
import StrategyScreen from '@/screens/StrategyScreen';
import ChatScreen from '@/screens/ChatScreen';
import MyProfileScreen from '@/screens/MyProfileScreen';
import ManagePlanScreen from '@/screens/ManagePlanScreen';
import HelpCenter from '@/screens/HelpCenterScreen';
import type { MainTabsParamList, RootStackParamList, ScoutWiseProStackParamList } from '@/types';
import { TutorialProvider } from '@/components/Tutorial';
import { canUseChat } from '@/utils/chatAccess';
import { getMe, type Plan } from '@/services/api';
import MainSidebar from './MainSidebar';
import { MainNavigationContext } from './MainNavigationContext';
import { BG } from '@/theme';
import SeasonDataScreen from '@/screens/SeasonDataScreen';
import TeamAnalysisScreen from '@/screens/TeamAnalysisScreen';
import MatchPortfolioScreen from '@/screens/MatchPortfolioScreen';
import MatchPoolScreen from '@/screens/MatchPoolScreen';
import TeamPoolScreen from '@/screens/TeamPoolScreen';
import LeaguePoolScreen from '@/screens/LeaguePoolScreen';
import { MatchupProvider } from '@/context/MatchupContext';

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
      <ScoutWiseProStack.Screen name="ProHome" component={ScoutWiseProScreen} />
      <ScoutWiseProStack.Screen name="LegacyStrategy" component={StrategyScreen} />
      <ScoutWiseProStack.Screen name="LegacyChat" component={ChatScreen} />
    </ScoutWiseProStack.Navigator>
  );
}

export default function MainTabs() {
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
            <Tab.Screen name="MatchPortfolio" component={MatchPortfolioScreen} />
            <Tab.Screen name="TeamAnalysis" component={TeamAnalysisScreen} />
            <Tab.Screen name="TeamPool" component={TeamPoolScreen} />
            <Tab.Screen name="LeaguePool" component={LeaguePoolScreen} />
            <Tab.Screen name="MatchPool" component={MatchPoolScreen} />
            <Tab.Screen name="SeasonData" component={SeasonDataScreen} />
            <Tab.Screen name="DailyScout" component={DailyScoutScreen} />
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
