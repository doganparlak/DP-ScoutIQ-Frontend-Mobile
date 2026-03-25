import React from 'react';
import { Platform} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StrategyScreen from '@/screens/StrategyScreen';
import ChatScreen from '@/screens/ChatScreen';
import MyProfileScreen from '@/screens/MyProfileScreen';
import ManagePlanScreen from '@/screens/ManagePlanScreen';
import HelpCenter from '@/screens/HelpCenterScreen';
import { ACCENT, MUTED, PANEL, LINE } from '@/theme';
import type { MainTabsParamList, RootStackParamList } from '@/types';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Tab = createBottomTabNavigator<MainTabsParamList>();
const ProfileStack = createNativeStackNavigator<RootStackParamList>();
const AI_CONSENT_KEY = 'ai_data_usage_consent_v1';

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="MyProfile" component={MyProfileScreen} />
      <ProfileStack.Screen name="ManagePlan" component={ManagePlanScreen} />
      <ProfileStack.Screen name="HelpCenter" component={HelpCenter} />
    </ProfileStack.Navigator>
  );
}


export default function MainTabs() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const androidBottom = Platform.OS === 'android' ? insets.bottom : 0;
  const [hasAiConsent, setHasAiConsent] = React.useState(false);
  React.useEffect(() => {
    const loadConsent = async () => {
      const saved = await AsyncStorage.getItem(AI_CONSENT_KEY);
      setHasAiConsent(saved === 'true');
    };

    loadConsent();
    const interval = setInterval(loadConsent, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <Tab.Navigator
      initialRouteName="Strategy"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: PANEL,
          borderTopColor: LINE,
          borderTopWidth: 1,
          height: 70 + androidBottom,
        },
        tabBarActiveTintColor: ACCENT,
        tabBarInactiveTintColor: MUTED,
        tabBarLabelStyle: { fontWeight: '800', fontSize: 10, marginTop: 4 },
      }}
    >
      
      <Tab.Screen
        name="Strategy"
        component={StrategyScreen}
        options={{
          tabBarLabel: t('tabStrategy', 'Strategy'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="analytics-outline" size={24} color={color} />
          ),
        }}
      />
      
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        listeners={{
          tabPress: (e) => {
            if (!hasAiConsent) {
              e.preventDefault();
            }
          },
        }}
        options={{
          tabBarLabel: t('tabChat', 'Chat'),
          tabBarIcon: ({ color }) => (
            <Ionicons
              name="chatbox-ellipses-outline"
              size={24}
              color={hasAiConsent ? color : MUTED}
            />
          ),
          tabBarLabelStyle: {
            fontWeight: '800',
            fontSize: 10,
            marginTop: 4,
            opacity: hasAiConsent ? 1 : 0.45,
          },
        }}
      />
      
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: t('tabProfile', 'My Profile'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
