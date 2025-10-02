// src/navigation/MainTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import StrategyScreen from '@/screens/StrategyScreen';
import ChatScreen from '@/screens/ChatScreen';
import MyProfileScreen from '@/screens/MyProfileScreen';
import { ACCENT, MUTED, PANEL, LINE } from '@/theme';
import type { MainTabsParamList } from '@/types';

const Tab = createBottomTabNavigator<MainTabsParamList>();

export default function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Strategy"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PANEL,
          borderTopColor: LINE,
          borderTopWidth: 1,
          height: 56,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: { fontWeight: '700' },
      }}
    >
      <Tab.Screen name="Strategy" component={StrategyScreen} options={{ tabBarLabel: 'Strategy' }} />
      <Tab.Screen name="Chat" component={ChatScreen} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="Profile" component={MyProfileScreen} options={{ tabBarLabel: 'My Profile' }} />
    </Tab.Navigator>
  );
}
