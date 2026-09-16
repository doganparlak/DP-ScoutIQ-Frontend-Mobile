import React from 'react';
import {
  AccessibilityInfo, ActivityIndicator, Animated, Easing, findNodeHandle, Image,
  Keyboard, Modal, PanResponder, Pressable, ScrollView, StyleSheet, Text,
  useWindowDimensions, View,
} from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, CreditCard, CircleHelp, Target, BarChart3, BookMarked, BookOpenCheck, CalendarSearch, ClipboardList, Database, Shield, Trophy, Search, GitCompareArrows, ChevronRight, Menu, MessageSquareText, UserRound, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '@/components/Tutorial';
import { ACCENT, BG, TEXT } from '@/theme';

const logo = require('../../assets/scoutwise_logo.png');

function SidebarBrandMark() {
  return (
    <View style={styles.brandMark} accessible={false}>
      <View style={styles.brandPole} />
      <View style={styles.brandHandle} />
      <View style={styles.brandLensMask}>
        <Image source={logo} style={styles.brandLensImage} resizeMode="stretch" />
      </View>
    </View>
  );
}

const items = [
  { route: 'Profile', label: 'tabProfile', fallback: 'Panel', Icon: LayoutDashboard, group: 'navigationWorkspace', groupFallback: 'YOUR WORKSPACE' },
  { route: 'Chat', label: 'tabScoutWisePro', fallback: 'ScoutWise Pro', Icon: MessageSquareText, group: '', groupFallback: '' },
  { route: 'Weekly', label: 'tabWeeklySearches', fallback: 'Weekly Searches', Icon: Search, group: 'interactionCenter', groupFallback: 'Interaction Center' },
  { route: 'DailyScout', label: 'dailyScoutChallengeTitle', fallback: 'Daily Scout Challenge', Icon: Target, group: '', groupFallback: '' },
  { route: 'Strategy', label: 'tabPlayerPool', fallback: 'Player Pool', Icon: UserRound, group: 'dataCenter', groupFallback: 'Data Center' },
  { route: 'TeamPool', label: 'teamPoolWorkspace', fallback: 'Team Pool', Icon: Shield, group: '', groupFallback: '' },
  { route: 'LeaguePool', label: 'leaguePoolWorkspace', fallback: 'League Pool', Icon: Trophy, group: '', groupFallback: '' },
  { route: 'MatchPool', label: 'matchPoolWorkspace', fallback: 'Match Pool', Icon: CalendarSearch, group: '', groupFallback: '' },
  { route: 'SeasonData', label: 'seasonDataWorkspace', fallback: 'Season Data', Icon: Database, group: '', groupFallback: '' },
  { route: 'Portfolio', label: 'portfolioWorkspace', fallback: 'Player Portfolio', Icon: ClipboardList, group: 'portfolioCenter', groupFallback: 'Portfolio Center' },
  { route: 'MatchPortfolio', label: 'matchPortfolioWorkspace', fallback: 'Match Portfolio', Icon: BookMarked, group: '', groupFallback: '' },
  { route: 'Matchup', label: 'matchupWorkspace', fallback: 'Matchup Center', Icon: GitCompareArrows, group: 'analysisCenter', groupFallback: 'Analysis Center' },
  { route: 'TeamAnalysis', label: 'teamAnalysisWorkspace', fallback: 'Team Analysis Center', Icon: BarChart3, group: '', groupFallback: '' },
  { route: 'ManagePlan', label: 'managePlan', fallback: 'Manage Plan', Icon: CreditCard, group: 'settingsGroup', groupFallback: 'Settings' },
  { route: 'HelpCenter', label: 'helpCenter', fallback: 'Help Center', Icon: CircleHelp, group: '', groupFallback: '' },
] as const;

type Props = BottomTabBarProps & { resolveChatAccess: () => Promise<boolean> };

export default function MainSidebar({ state, navigation, resolveChatAccess }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(340, width - 48);
  const tutorial = useTutorial();
  const [visible, setVisible] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [reduceMotion, setReduceMotion] = React.useState(false);
  const progress = React.useRef(new Animated.Value(0)).current;
  const menuRef = React.useRef<View>(null);
  const closeRef = React.useRef<View>(null);
  const mounted = React.useRef(true);
  const selecting = React.useRef(false);
  const currentRoute = state.routes[state.index].name;
  const currentItem = items.find((item) => item.route === currentRoute) ?? items[0];
  const nestedState = state.routes[state.index].state as { index?: number; routes?: Array<{ name: string }> } | undefined;
  const nestedRoute = nestedState?.routes?.[nestedState.index ?? 0]?.name;
  const tutorialPage = ({
    Profile: nestedRoute && nestedRoute !== 'MyProfile' ? null : 'panel',
    Chat: 'pro',
    Weekly: 'weekly',
    DailyScout: 'daily',
    Strategy: 'playerPool',
    TeamPool: 'teamPool',
    LeaguePool: 'leaguePool',
    MatchPool: 'matchPool',
    SeasonData: 'seasonData',
    Portfolio: 'playerPortfolio',
    MatchPortfolio: 'matchPortfolio',
    Matchup: 'matchup',
    TeamAnalysis: 'teamAnalysis',
  } as Partial<Record<string, string | null>>)[currentRoute] ?? null;
  const tutorialFrame = currentRoute === 'Chat' && nestedRoute === 'LegacyChat' ? 1 : 0;
  const previousRoute = React.useRef(currentRoute);

  React.useEffect(() => {
    if (previousRoute.current !== currentRoute && tutorial.active) {
      tutorial.closeTutorial();
    }
    previousRoute.current = currentRoute;
  }, [currentRoute, tutorial.active, tutorial.closeTutorial]);

  React.useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted.current) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted.current = false; subscription.remove(); };
  }, []);

  const focus = (ref: React.RefObject<View | null>) => {
    const node = findNodeHandle(ref.current);
    if (node) AccessibilityInfo.setAccessibilityFocus(node);
  };

  const close = React.useCallback(() => {
    Animated.timing(progress, {
      toValue: 0, duration: reduceMotion ? 0 : 180, useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && mounted.current) {
        setVisible(false);
        requestAnimationFrame(() => focus(menuRef));
      }
    });
  }, [progress, reduceMotion]);

  const swipe = React.useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) =>
      gesture.dx < -16 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -45 || gesture.vx < -0.5) close();
    },
  }), [close]);

  const select = async (item: typeof items[number]) => {
    if (selecting.current) return;
    const route = state.routes.find((entry) => entry.name === item.route);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (event.defaultPrevented) return;
    if (tutorial.active) tutorial.closeTutorial();
    if (item.route === 'Weekly' || item.route === 'DailyScout') {
      navigation.navigate(item.route, { visitKey: Date.now() });
      close();
      return;
    }
    if (currentRoute === item.route && item.route !== 'Chat') { close(); return; }

    if (item.route === 'Chat') {
      selecting.current = true;
      setPending(true);
      try {
        const allowed = await resolveChatAccess();
        if (!mounted.current) return;
        navigation.navigate('Chat', {
          screen: allowed ? 'LegacyStrategy' : 'ProHome',
        });
      } finally {
        selecting.current = false;
        if (mounted.current) setPending(false);
      }
    } else {
      navigation.navigate(item.route);
    }
    close();
  };

  return (
    <View style={[styles.headerSafe, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={styles.header}>
        <Pressable
          ref={menuRef}
          testID="navigation-menu"
          accessibilityRole="button"
          accessibilityLabel={t('navigationOpen', 'Open navigation menu')}
          accessibilityState={{ expanded: visible }}
          onPress={() => { Keyboard.dismiss(); progress.setValue(0); setVisible(true); }}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Menu size={23} color={TEXT} />
        </Pressable>
        <View style={styles.headerTitle}>
          <Text style={styles.wordmark} maxFontSizeMultiplier={1.3}>SCOUT<Text style={styles.green}>WISE</Text></Text>
          <Text style={styles.currentSection} numberOfLines={1} maxFontSizeMultiplier={1.3}>
            {t(currentItem.label, currentItem.fallback)}
          </Text>
        </View>
        {tutorialPage && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('pageTutorialOpen', 'Open page guide')}
            accessibilityState={{ expanded: tutorial.active && tutorial.activePage === tutorialPage }}
            onPress={() => {
              if (tutorial.active && tutorial.activePage === tutorialPage) {
                tutorial.closeTutorial();
                return;
              }
              if (currentRoute === 'Chat' && nestedRoute !== 'LegacyChat' && nestedRoute !== 'LegacyStrategy') {
                navigation.navigate('Chat', { screen: 'LegacyStrategy' });
              }
              tutorial.openPageTutorial(tutorialPage, tutorialFrame);
            }}
            style={({ pressed }) => [
              styles.tutorialButton,
              tutorial.active && tutorial.activePage === tutorialPage && styles.tutorialButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <BookOpenCheck size={20} color={tutorial.active && tutorial.activePage === tutorialPage ? '#4ADE80' : '#A4B2A9'} />
          </Pressable>
        )}
        <Image source={logo} style={styles.headerLogo} resizeMode="contain" accessible={false} />
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={close}
        onShow={() => {
          Animated.timing(progress, {
            toValue: 1, duration: reduceMotion ? 0 : 240,
            easing: Easing.out(Easing.cubic), useNativeDriver: true,
          }).start(() => focus(closeRef));
        }}
      >
        <View style={styles.overlay} accessibilityViewIsModal onAccessibilityEscape={close}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel={t('navigationClose', 'Close navigation menu')}
              testID="navigation-backdrop"
            />
          </Animated.View>
          <Animated.View
            {...swipe.panHandlers}
            style={[styles.drawer, {
              width: drawerWidth,
              paddingTop: insets.top + 12,
              paddingBottom: Math.max(insets.bottom, 16),
              paddingLeft: Math.max(insets.left, 16),
              transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-drawerWidth, 0] }) }],
            }]}
          >
            <View style={styles.drawerHeading}>
              <View style={styles.drawerBrand}>
              <SidebarBrandMark />
              <Text style={[styles.wordmark, styles.drawerWordmark]} maxFontSizeMultiplier={1.2}>
                SCOUT<Text style={styles.green}>WISE</Text>
              </Text>
              </View>
              <Pressable
                ref={closeRef}
                testID="navigation-close"
                accessibilityRole="button"
                accessibilityLabel={t('navigationClose', 'Close navigation menu')}
                onPress={close}
                style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
              >
                <X size={22} color={TEXT} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.links} showsVerticalScrollIndicator={false}>
              {items.map((item) => {
                const active = item.route === currentRoute;
                const color = active ? '#4ADE80' : item.route === 'Chat' ? '#34D399' : '#E5EBE7';
                return (
                  <React.Fragment key={item.route}>
                  {!!item.group && <Text style={[styles.sectionLabel, { marginTop: 12 }]}>{t(item.group, item.groupFallback)}</Text>}
                  <Pressable
                    testID={`navigation-${item.route}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active, disabled: pending }}
                    disabled={pending}
                    onPress={() => { void select(item); }}
                    style={({ pressed }) => [styles.navItem, active && styles.activeItem, pressed && styles.pressed]}
                  >
                    {active && <View style={styles.activeMarker} />}
                    <View style={[styles.navIcon, active && styles.activeIcon]}><item.Icon size={21} color={color} /></View>
                    <Text style={[styles.navLabel, { color }]}>{t(item.label, item.fallback)}</Text>
                    {pending && item.route === 'Chat'
                      ? <ActivityIndicator size="small" color={ACCENT} />
                      : <ChevronRight size={16} color={active ? color : '#75847B'} />}
                  </Pressable>
                  </React.Fragment>
                );
              })}
            </ScrollView>
            <View style={styles.footer}>
              <View style={styles.footerDot} />
              <Text style={styles.footerText}>{t('navigationTagline', 'Spot the next star.')}</Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerSafe: { backgroundColor: BG, borderBottomWidth: 1, borderBottomColor: 'rgba(22,163,74,0.2)' },
  header: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
  iconButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(22,163,74,0.3)', backgroundColor: '#18251C', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, gap: 3 },
  tutorialButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(126,148,135,.25)', backgroundColor: 'rgba(255,255,255,.035)', alignItems: 'center', justifyContent: 'center' },
  tutorialButtonActive: { borderColor: 'rgba(22,163,74,.62)', backgroundColor: 'rgba(22,163,74,.14)' },
  wordmark: { color: TEXT, fontSize: 19, fontWeight: '900', letterSpacing: 0.4 },
  green: { color: ACCENT },
  currentSection: { color: '#A4B2A9', fontSize: 12, fontWeight: '600' },
  headerLogo: { width: 52, height: 52 },
  overlay: { flex: 1 },
  scrim: { backgroundColor: 'rgba(0,0,0,0.65)' },
  drawer: { flex: 1, backgroundColor: '#101A14', paddingRight: 16, borderRightWidth: 1, borderColor: 'rgba(22,163,74,0.3)', borderTopRightRadius: 28, borderBottomRightRadius: 28, shadowColor: '#000', shadowOpacity: 0.35, shadowOffset: { width: 8, height: 0 }, shadowRadius: 24, elevation: 24 },
  drawerHeading: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 10, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(22,163,74,0.24)', backgroundColor: 'rgba(255,255,255,0.025)' },
  brandMark: { width: 44, height: 48 },
  brandPole: { position: 'absolute', top: 0, bottom: 0, left: 21, width: 2, borderRadius: 1, backgroundColor: '#FFFFFF' },
  brandHandle: { position: 'absolute', left: 1, bottom: 4, width: 16, height: 6, borderRadius: 1.5, backgroundColor: '#FFFFFF', transform: [{ rotate: '-45deg' }] },
  brandLensMask: { position: 'absolute', left: 5, top: 6, width: 34, height: 34, borderRadius: 17, overflow: 'hidden' },
  brandLensImage: { position: 'absolute', left: -5, top: -4, width: 44, height: 44 },
  drawerBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  drawerWordmark: { fontSize: 18, flexShrink: 1 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)' },
  links: { paddingTop: 28, gap: 12, paddingBottom: 24 },
  sectionLabel: { color: '#94A79B', fontSize: 10, fontWeight: '800', letterSpacing: 1.7, marginLeft: 4, marginBottom: 4 },
  navItem: { minHeight: 68, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(87,111,98,0.25)', backgroundColor: 'rgba(255,255,255,0.024)', overflow: 'hidden' },
  activeItem: { borderColor: 'rgba(22,163,74,0.62)', backgroundColor: 'rgba(22,163,74,0.14)' },
  activeMarker: { position: 'absolute', left: 0, top: 21, width: 3, height: 26, backgroundColor: ACCENT, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
  navIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.025)' },
  activeIcon: { borderColor: 'rgba(22,163,74,0.36)', backgroundColor: 'rgba(22,163,74,0.12)' },
  navLabel: { flex: 1, fontSize: 15, fontWeight: '800' },
  footer: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(22,163,74,0.24)', backgroundColor: 'rgba(22,163,74,0.07)', flexDirection: 'row', gap: 10, alignItems: 'center' },
  footerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: ACCENT },
  footerText: { color: '#A4B2A9', fontSize: 12, fontWeight: '600', flex: 1 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
});
