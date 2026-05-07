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
import {
  MessageSquareMore,
  ChartSpline,
} from 'lucide-react-native';
import { getMe, type Plan } from '@/services/api';

const TAB_BASE_HEIGHT = 70;
const TAB_ICON_SIZE = 24;
const MAIN_TAB_ICON_SIZE = 30;
const MAIN_TAB_ICON_LABEL_GAP = 8;
const SCOUTWISE_PRO_TAB_VERTICAL_OFFSET = 12;
const SIDE_TAB_VERTICAL_OFFSET = -4;

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

type ShortcutButtonProps = {
  label: string;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
  subtitle: string;
};

function ShortcutButton({
  label,
  disabled = false,
  onPress,
  children,
  subtitle,
}: ShortcutButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.shortcutButton,
        disabled && styles.shortcutButtonDisabled,
        pressed && !disabled && styles.shortcutButtonPressed,
      ]}
    >
      <View style={styles.shortcutInner}>
        <View style={[styles.shortcutIconWrap, disabled && styles.shortcutIconWrapDisabled]}>
          {children}
        </View>
        <Text style={[styles.shortcutLabel, disabled && styles.shortcutLabelDisabled]}>
          {label}
        </Text>
        <Text style={[styles.shortcutSubtitle, disabled && styles.shortcutSubtitleDisabled]}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

type ScoutWiseProTabButtonProps = BottomTabBarButtonProps & {
  hasAiConsent: boolean;
  isConsentLoading: boolean;
  isMenuOpen: boolean;
  isFreePlan: boolean;
  onCloseMenu: () => void;
  onOpenMenu: () => void;
  t: TFunction;
};

function ScoutWiseProTabButton({
  accessibilityState,
  children,
  style,
  hasAiConsent,
  isConsentLoading,
  isMenuOpen,
  isFreePlan,
  onCloseMenu,
  onOpenMenu,
  t,
}: ScoutWiseProTabButtonProps) {
  const navigation = useNavigation<any>();

  return (
    <View style={[style, styles.tabButtonWrap]} pointerEvents="box-none">
      {isMenuOpen ? (
        <View style={styles.shortcutMenu} pointerEvents="box-none">
          <ShortcutButton
            label={t('tabStrategy', 'Strategy')}
            subtitle={t('setStrategy', 'Set Strategy')}
            onPress={() => {
              onCloseMenu();
              navigation.navigate('Chat', { screen: 'LegacyStrategy' });
            }}
          >
            <ChartSpline size={TAB_ICON_SIZE} color={ACCENT} strokeWidth={2.2} />
          </ShortcutButton>

          <ShortcutButton
            label={t('tabChat', 'Chat')}
            subtitle={t('startChatting', 'Start Chatting')}
            disabled={!hasAiConsent || isConsentLoading}
            onPress={() => {
              if (!hasAiConsent || isConsentLoading) return;
              onCloseMenu();
              navigation.navigate('Chat', { screen: 'LegacyChat' });
            }}
          >
            <MessageSquareMore
              size={TAB_ICON_SIZE}
              color={hasAiConsent && !isConsentLoading ? ACCENT : MUTED}
              strokeWidth={2.2}
            />
          </ShortcutButton>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={accessibilityState}
        accessibilityLabel={t('tabScoutWisePro', 'ScoutWise Pro')}
        onLongPress={() => {
          if (isFreePlan) {
            return;
          }
          if (isMenuOpen) {
            onCloseMenu();
            return;
          }
          onOpenMenu();
        }}
        onPress={() => {
          onCloseMenu();
          navigation.navigate('Chat', {
            screen: isFreePlan ? 'ProHome' : 'LegacyStrategy',
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

  const [hasAiConsent, setHasAiConsent] = React.useState(false);
  const [loadingConsent, setLoadingConsent] = React.useState(true);
  const [proMenuOpen, setProMenuOpen] = React.useState(false);
  const [plan, setPlan] = React.useState<Plan>('Free');

  const closeProMenu = React.useCallback(() => {
    setProMenuOpen(false);
  }, []);

  const loadConsent = React.useCallback(async () => {
    try {
      setLoadingConsent(true);
      const me = await getMe();
      setHasAiConsent(!!me.consent);
      if (me?.plan) {
        setPlan(me.plan as Plan);
      }
    } catch (e: any) {
      console.log('LOAD CONSENT ERROR:', e?.message ?? e);
      setHasAiConsent(false);
      setPlan('Free');
    } finally {
      setLoadingConsent(false);
    }
  }, []);

  React.useEffect(() => {
    loadConsent();
  }, [loadConsent]);

  useFocusEffect(
    React.useCallback(() => {
      loadConsent();
    }, [loadConsent]),
  );

  return (
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
        listeners={{
          tabPress: closeProMenu,
        }}
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
        listeners={{
          tabPress: closeProMenu,
        }}
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
              hasAiConsent={hasAiConsent}
              isConsentLoading={loadingConsent}
              isMenuOpen={proMenuOpen}
              isFreePlan={plan === 'Free'}
              onCloseMenu={closeProMenu}
              onOpenMenu={() => {
                loadConsent();
                setProMenuOpen(true);
              }}
              t={t}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        listeners={{
          tabPress: closeProMenu,
        }}
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
  shortcutMenu: {
    position: 'absolute',
    left: '50%',
    bottom: TAB_BASE_HEIGHT + 14,
    transform: [{ translateX: -118 }],
    zIndex: 40,
    elevation: 40,
    width: 236,
    padding: 8,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 24,
    backgroundColor: '#161917',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  shortcutButton: {
    flex: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D211F',
    borderWidth: 1,
    borderColor: '#2A302C',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  shortcutButtonDisabled: {
    opacity: 0.45,
  },
  shortcutButtonPressed: {
    backgroundColor: '#232826',
    transform: [{ translateY: 1 }],
  },
  shortcutInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.28)',
    marginBottom: 10,
  },
  shortcutIconWrapDisabled: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
  },
  shortcutLabel: {
    color: ACCENT,
    fontWeight: '800',
    fontSize: 13,
  },
  shortcutSubtitle: {
    marginTop: 3,
    color: '#98A29B',
    fontWeight: '600',
    fontSize: 11,
  },
  shortcutLabelDisabled: {
    color: MUTED,
  },
  shortcutSubtitleDisabled: {
    color: MUTED,
  },
});
