import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createBottomTabNavigator,
  type BottomTabBarButtonProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import PlayerPoolScreen from '@/screens/PlayerPoolScreen';
import ScoutWiseProScreen from '@/screens/ScoutWiseProScreen';
import StrategyScreen from '@/screens/StrategyScreen';
import ChatScreen from '@/screens/ChatScreen';
import MyProfileScreen from '@/screens/MyProfileScreen';
import ManagePlanScreen from '@/screens/ManagePlanScreen';
import HelpCenter from '@/screens/HelpCenterScreen';
import { ACCENT, MUTED, PANEL, LINE } from '@/theme';
import type {
  MainTabsParamList,
  RootStackParamList,
  ScoutWiseProStackParamList,
} from '@/types';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { TutorialProvider, useTutorial } from '@/components/Tutorial';
import { getMe, type Plan } from '@/services/api';

const TAB_BASE_HEIGHT = 70;
const MAIN_TAB_ICON_SIZE = 30;
const MAIN_TAB_ICON_LABEL_GAP = 8;
const SCOUTWISE_PRO_TAB_VERTICAL_OFFSET = 12;
const SIDE_TAB_VERTICAL_OFFSET = -4;

const isFreePlan = (plan: Plan | null) => plan === 'Free';

type MainTabIconSlotProps = {
  children: React.ReactNode;
};

function MainTabIconSlot({ children }: MainTabIconSlotProps) {
  return <View style={styles.mainTabIconSlot}>{children}</View>;
}

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

type FootballJerseyIconProps = {
  size: number;
  color: string;
  strokeWidth?: number;
};

function FootballJerseyIcon({ size, color, strokeWidth = 2.2 }: FootballJerseyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8.2 3.5 4.1 5.2 2.5 10l3.4 1.3 1-2.1v11.4h10.2V9.2l1 2.1 3.4-1.3-1.6-4.8-4.1-1.7a4 4 0 0 1-7.6 0Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText
        x="12"
        y="15"
        fill={color}
        fontSize="5.6"
        fontWeight="800"
        textAnchor="middle"
      >
        10
      </SvgText>
    </Svg>
  );
}

type TacticsBoardIconProps = {
  size: number;
  color: string;
  strokeWidth?: number;
};

function TacticsBoardIcon({ size, color, strokeWidth = 2.2 }: TacticsBoardIconProps) {
  const pitchStrokeWidth = strokeWidth * 0.5;
  const pitchOpacity = 0.75;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="4.2"
        width="16"
        height="16.8"
        rx="2.2"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M9.2 4.2V3.3h5.6v.9M9.4 20.9v-.9h5.2v.9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10.1 3.3c.4-.7 1-.9 1.9-.9s1.5.2 1.9.9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Line
        x1="6.2"
        y1="12"
        x2="17.8"
        y2="12"
        stroke={color}
        strokeWidth={pitchStrokeWidth}
        strokeOpacity={pitchOpacity}
        strokeLinecap="round"
      />
      <Circle
        cx="12"
        cy="12"
        r="2.1"
        stroke={color}
        strokeWidth={pitchStrokeWidth}
        strokeOpacity={pitchOpacity}
      />
      <Path
        d="M8 5.9v2.7h8V5.9M8 18.1v-2.7h8v2.7"
        stroke={color}
        strokeWidth={pitchStrokeWidth}
        strokeOpacity={pitchOpacity}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

type ScoutWiseProTabButtonProps = BottomTabBarButtonProps & {
  onResolvePlan: () => Promise<Plan | null>;
  t: TFunction;
};

function ScoutWiseProTabButton({
  accessibilityState,
  children,
  style,
  onResolvePlan,
  t,
}: ScoutWiseProTabButtonProps) {
  const navigation = useNavigation<any>();
  const tutorial = useTutorial();
  const isScoutWiseTutorial = tutorial.active && tutorial.stage === 'scoutwise';

  return (
    <View style={[style, styles.tabButtonWrap]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        accessibilityLabel={t('tabScoutWisePro', 'ScoutWise Pro')}
        onPress={async () => {
          const latestPlan = await onResolvePlan();

          navigation.navigate('Chat', {
            screen: isScoutWiseTutorial || !isFreePlan(latestPlan) ? 'LegacyStrategy' : 'ProHome',
          });
        }}
        style={({ pressed }) => [
          styles.tabButton,
          styles.scoutWiseProTabOffset,
          pressed && styles.tabButtonPressed,
        ]}
      >
        {children}
      </Pressable>
    </View>
  );
}

export default function MainTabs() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const androidBottom = Platform.OS === 'android' ? insets.bottom : 0;
  const tabHeight = TAB_BASE_HEIGHT + androidBottom;

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

  const resolvePlan = React.useCallback(async () => {
    try {
      const me = await getMe();
      if (me?.plan) {
        const latestPlan = me.plan as Plan;
        setPlan(latestPlan);
        return latestPlan;
      }
    } catch (e: any) {
      console.log('RESOLVE PLAN ERROR:', e?.message ?? e);
    }

    return plan;
  }, [plan]);

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
      <Tab.Navigator
        initialRouteName="Strategy"
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: PANEL,
            borderTopColor: LINE,
            borderTopWidth: 1,
            height: tabHeight,
            overflow: 'visible',
          },
          tabBarActiveTintColor: ACCENT,
          tabBarInactiveTintColor: MUTED,
          tabBarItemStyle: styles.mainTabItem,
        }}
      >
        <Tab.Screen
          name="Strategy"
          component={PlayerPoolScreen}
          options={{
            tabBarItemStyle: [styles.mainTabItem, styles.sideTabOffset],
            tabBarLabel: ({ color }) => (
              <Text style={[styles.mainTabLabel, { color }]}>
                {t('tabPlayerPool', 'Player Pool')}
              </Text>
            ),
            tabBarIcon: ({ color }) => (
              <MainTabIconSlot>
                <FootballJerseyIcon size={MAIN_TAB_ICON_SIZE} color={color} strokeWidth={2.2} />
              </MainTabIconSlot>
            ),
          }}
        />

        <Tab.Screen
          name="Chat"
          component={ScoutWiseProStackScreen}
          options={{
            tabBarLabel: ({ color }) => (
              <Text style={[styles.mainTabLabel, { color }]}>
                {t('tabScoutWisePro', 'ScoutWise Pro')}
              </Text>
            ),
            tabBarIcon: ({ color }) => (
              <MainTabIconSlot>
                <TacticsBoardIcon
                  size={MAIN_TAB_ICON_SIZE}
                  color={color}
                  strokeWidth={2.2}
                />
              </MainTabIconSlot>
            ),
            tabBarButton: (props) => (
              <ScoutWiseProTabButton
                {...props}
                onResolvePlan={resolvePlan}
                t={t}
              />
            ),
          }}
        />

        <Tab.Screen
          name="Profile"
          component={ProfileStackScreen}
          options={{
            tabBarItemStyle: [styles.mainTabItem, styles.sideTabOffset],
            tabBarLabel: ({ color }) => (
              <Text style={[styles.mainTabLabel, { color }]}>
                {t('tabProfile', 'My Profile')}
              </Text>
            ),
            tabBarIcon: ({ color }) => (
              <MainTabIconSlot>
                <Ionicons name="person-circle-outline" size={MAIN_TAB_ICON_SIZE} color={color} />
              </MainTabIconSlot>
            ),
          }}
        />
      </Tab.Navigator>
    </TutorialProvider>
  );
}

const styles = StyleSheet.create({
  mainTabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
    paddingBottom: 4,
  },
  sideTabOffset: {
    transform: [{ translateY: SIDE_TAB_VERTICAL_OFFSET }],
  },
  mainTabIconSlot: {
    width: MAIN_TAB_ICON_SIZE,
    height: MAIN_TAB_ICON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTabLabel: {
    height: 12,
    lineHeight: 12,
    marginTop: MAIN_TAB_ICON_LABEL_GAP,
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  tabButtonWrap: {
    flex: 1,
    overflow: 'visible',
  },
  tabButton: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoutWiseProTabOffset: {
    transform: [{ translateY: SCOUTWISE_PRO_TAB_VERTICAL_OFFSET }],
  },
  tabButtonPressed: {
    opacity: 0.92,
  },
});
