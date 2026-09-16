import React from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BarChart3, BookMarked, BookOpenCheck,
  CalendarSearch, ClipboardList, Database,
  GitCompareArrows, LayoutDashboard, MessageSquareText, Search, Shield,
  Target, Trophy, UserRound, X,
} from 'lucide-react-native';

import { ACCENT, LINE, MUTED, PANEL, TEXT } from '@/theme';
import { getMe, updateTutorialCompletion } from '@/services/api';

export type PlayerPoolTutorialStep =
  | 'worldCupMode'
  | 'weeklyPopularButton'
  | 'weeklyPopularList'
  | 'filters'
  | 'search'
  | 'candidates'
  | 'card'
  | 'revealPotential'
  | 'revealForm'
  | 'addPortfolio'
  | 'addYamalToMatchup'
  | 'viniciusReady'
  | 'addViniciusToMatchup'
  | 'launchMatchup'
  | 'comparison';

export type ScoutWiseTutorialStep =
  | 'setStrategy'
  | 'startChat'
  | 'chatInput'
  | 'chatResponse';

export type ProfileTutorialStep =
  | 'intro'
  | 'dailyScout'
  | 'watchlist'
  | 'report'
  | 'filters'
  | 'lineup'
  | 'lineupModal';

type TutorialStage = 'playerPool' | 'profile' | 'scoutwise' | 'done';

type TutorialContextValue = {
  active: boolean;
  stage: TutorialStage;
  postTutorialReady: boolean;
  playerPoolStep: PlayerPoolTutorialStep;
  profileStep: ProfileTutorialStep;
  scoutWiseStep: ScoutWiseTutorialStep;
  activationKey: number;
  activePage: string | null;
  activeFrame: number;
  setPlayerPoolStep: (step: PlayerPoolTutorialStep) => void;
  setProfileStep: (step: ProfileTutorialStep) => void;
  setScoutWiseStep: (step: ScoutWiseTutorialStep) => void;
  moveToProfile: () => void;
  moveToScoutWise: () => void;
  openPageTutorial: (page: string, frame?: number) => void;
  closeTutorial: () => void;
  activateTutorial: () => Promise<void>;
  completeTutorial: () => Promise<void>;
  skipTutorial: () => Promise<void>;
};

type Guide = {
  page: string;
  route: string;
  nestedRoute?: string;
  title: string;
  Icon: React.ComponentType<any>;
  summary: string;
  details: string[];
};

const TutorialContext = React.createContext<TutorialContextValue | null>(null);
type EmbeddedGuideValue = {
  active: boolean;
  current: Guide;
  frameIndex: number;
  frameTotal: number;
  previous: () => void;
  next: () => void;
  finish: () => void;
};
const EmbeddedGuideContext = React.createContext<EmbeddedGuideValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState(false);
  const [postTutorialReady] = React.useState(false);
  const [stage, setStage] = React.useState<TutorialStage>('done');
  const [playerPoolStep, setPlayerPoolStep] = React.useState<PlayerPoolTutorialStep>('filters');
  const [profileStep, setProfileStep] = React.useState<ProfileTutorialStep>('intro');
  const [scoutWiseStep, setScoutWiseStep] = React.useState<ScoutWiseTutorialStep>('setStrategy');
  const [activationKey, setActivationKey] = React.useState(0);
  const [guideIndex, setGuideIndex] = React.useState(0);
  const [welcomeVisible, setWelcomeVisible] = React.useState(false);
  const [welcomeSaving, setWelcomeSaving] = React.useState(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    let active = true;
    getMe()
      .then(profile => {
        if (active) setWelcomeVisible(profile.tutorialCompleted !== true);
      })
      .catch(error => {
        console.log('LOAD TUTORIAL COMPLETION ERROR:', error?.message ?? error);
        if (active) setWelcomeVisible(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const guides = React.useMemo<Guide[]>(() => [
    { page: 'panel', route: 'Profile', title: t('tabProfile', 'Panel'), Icon: LayoutDashboard, summary: t('helpGuidePanelSummary'), details: [t('helpGuidePanel1'), t('helpGuidePanel2')] },
    { page: 'pro', route: 'Chat', nestedRoute: 'LegacyStrategy', title: t('tabStrategy', 'Strategy'), Icon: MessageSquareText, summary: t('tutorialStrategySummary'), details: [] },
    { page: 'pro', route: 'Chat', nestedRoute: 'LegacyChat', title: t('tabScoutWisePro', 'ScoutWise Pro'), Icon: MessageSquareText, summary: t('tutorialProChatSummary'), details: [] },
    { page: 'weekly', route: 'Weekly', title: t('tabWeeklySearches', 'Weekly Popular Players'), Icon: Search, summary: t('helpGuideWeeklySummary'), details: [t('helpGuideWeekly1'), t('helpGuideWeekly2')] },
    { page: 'daily', route: 'DailyScout', title: t('dailyScoutChallengeTitle', 'Daily Scout Challenge'), Icon: Target, summary: t('helpGuideDailySummary'), details: [t('helpGuideDaily1'), t('helpGuideDaily2')] },
    { page: 'playerPool', route: 'Strategy', title: t('tabPlayerPool', 'Player Pool'), Icon: UserRound, summary: t('tutorialPlayerPoolSearch'), details: [] },
    { page: 'playerPool', route: 'Strategy', title: t('playerCard', 'Player Card'), Icon: UserRound, summary: t('tutorialPlayerPoolCard'), details: [] },
    { page: 'playerPool', route: 'Strategy', title: t('matchupWorkspace', 'Matchup Center'), Icon: GitCompareArrows, summary: t('tutorialPlayerPoolMatchup'), details: [] },
    { page: 'teamPool', route: 'TeamPool', title: t('teamPoolWorkspace', 'Team Pool'), Icon: Shield, summary: t('tutorialTeamPoolSearch'), details: [] },
    { page: 'teamPool', route: 'TeamPool', title: t('teamCard', 'Team Card'), Icon: Shield, summary: t('tutorialTeamPoolAnalyze'), details: [] },
    { page: 'leaguePool', route: 'LeaguePool', title: t('leaguePoolWorkspace', 'League Pool'), Icon: Trophy, summary: t('tutorialLeaguePoolSearch'), details: [] },
    { page: 'leaguePool', route: 'LeaguePool', title: t('matchupWorkspace', 'Matchup Center'), Icon: GitCompareArrows, summary: t('tutorialLeaguePoolMatchup'), details: [] },
    { page: 'matchPool', route: 'MatchPool', title: t('matchPoolWorkspace', 'Match Pool'), Icon: CalendarSearch, summary: t('tutorialMatchPoolSearch'), details: [] },
    { page: 'matchPool', route: 'MatchPool', title: t('matchCard', 'Match Card'), Icon: CalendarSearch, summary: t('tutorialMatchPoolCard'), details: [] },
    { page: 'seasonData', route: 'SeasonData', title: t('seasonDataWorkspace', 'Season Data'), Icon: Database, summary: t('tutorialSeasonSearch'), details: [] },
    { page: 'seasonData', route: 'SeasonData', title: t('careerHistory', 'Career History'), Icon: Database, summary: t('tutorialSeasonHistory'), details: [] },
    { page: 'seasonData', route: 'SeasonData', title: t('matchupWorkspace', 'Matchup Center'), Icon: GitCompareArrows, summary: t('tutorialSeasonMatchup'), details: [] },
    { page: 'playerPortfolio', route: 'Portfolio', title: t('portfolioWorkspace', 'Player Portfolio'), Icon: ClipboardList, summary: t('tutorialPlayerPortfolioSummary'), details: [] },
    { page: 'matchPortfolio', route: 'MatchPortfolio', title: t('matchPortfolioWorkspace', 'Match Portfolio'), Icon: BookMarked, summary: t('helpGuideMatchPortfolioSummary'), details: [t('helpGuideMatchPortfolio2'), t('helpGuideMatchPortfolio3')] },
    { page: 'matchup', route: 'Matchup', title: t('matchupWorkspace', 'Matchup Center'), Icon: GitCompareArrows, summary: t('helpGuideMatchupSummary'), details: [t('helpGuideMatchup1')] },
    { page: 'matchup', route: 'Matchup', title: t('matchupWorkspace', 'Matchup Center'), Icon: GitCompareArrows, summary: t('helpGuideMatchup2'), details: [t('helpGuideMatchup3')] },
    { page: 'teamAnalysis', route: 'TeamAnalysis', title: t('teamAnalysisWorkspace', 'Team Analysis Center'), Icon: BarChart3, summary: t('helpGuideTeamAnalysisSummary'), details: [t('helpGuideTeamAnalysis1'), t('helpGuideTeamAnalysis2')] },
    { page: 'teamAnalysis', route: 'TeamAnalysis', title: t('teamAnalysisWorkspace', 'Team Analysis Center'), Icon: BarChart3, summary: t('helpGuideTeamAnalysis3'), details: [] },
  ], [t]);

  const current = guides[guideIndex] || guides[0];
  const frameIndices = guides.reduce<number[]>((items, guide, index) => guide.page === current?.page ? [...items, index] : items, []);
  const frameIndex = Math.max(0, frameIndices.indexOf(guideIndex));

  const closeTutorial = React.useCallback(() => {
    setActive(false);
    setStage('done');
  }, []);

  const openPageTutorial = React.useCallback((page: string, frame = 0) => {
    const indices = guides.reduce<number[]>((result, guide, index) =>
      guide.page === page ? [...result, index] : result, []);
    if (!indices.length) return;
    const target = indices[Math.max(0, Math.min(frame, indices.length - 1))];
    setGuideIndex(target);
    setActive(true);
    setStage('done');
    setActivationKey(key => key + 1);
  }, [guides]);

  const activateTutorial = React.useCallback(async () => {
    openPageTutorial('panel');
  }, [openPageTutorial]);

  const next = () => frameIndex >= frameIndices.length - 1
    ? closeTutorial()
    : setGuideIndex(frameIndices[frameIndex + 1]);
  const previous = () => {
    if (frameIndex > 0) setGuideIndex(frameIndices[frameIndex - 1]);
  };

  const value = React.useMemo<TutorialContextValue>(() => ({
    active, activePage: active ? current.page : null, activeFrame: frameIndex, stage, postTutorialReady, playerPoolStep, profileStep, scoutWiseStep, activationKey,
    setPlayerPoolStep, setProfileStep, setScoutWiseStep,
    moveToProfile: () => setStage('done'),
    moveToScoutWise: () => setStage('done'),
    openPageTutorial,
    closeTutorial,
    activateTutorial,
    completeTutorial: async () => closeTutorial(),
    skipTutorial: async () => closeTutorial(),
  }), [activateTutorial, activationKey, active, closeTutorial, current.page, frameIndex, openPageTutorial, playerPoolStep, postTutorialReady, profileStep, scoutWiseStep, stage]);

  const embeddedGuide = React.useMemo<EmbeddedGuideValue>(() => ({
    active, current, frameIndex, frameTotal: frameIndices.length, previous, next,
    finish: closeTutorial,
  }), [active, closeTutorial, current, frameIndex, frameIndices.length]);

  const completeWelcome = React.useCallback(async () => {
    if (welcomeSaving) return;
    setWelcomeSaving(true);
    try {
      await updateTutorialCompletion(true);
    } catch (error: any) {
      console.log('UPDATE TUTORIAL COMPLETION ERROR:', error?.message ?? error);
    } finally {
      setWelcomeVisible(false);
      setWelcomeSaving(false);
    }
  }, [welcomeSaving]);

  return <TutorialContext.Provider value={value}>
    <EmbeddedGuideContext.Provider value={embeddedGuide}>{children}</EmbeddedGuideContext.Provider>
    <Modal
      transparent
      visible={welcomeVisible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => void completeWelcome()}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.introCard}>
          <View style={styles.introGlow} />
          <View style={styles.introGuideIconLarge}>
            <BookOpenCheck size={25} color="#4ADE80" />
          </View>
          <Text style={styles.introEyebrow}>{t('tutorialWelcomeEyebrow')}</Text>
          <Text style={styles.introTitle}>
            {t('tutorialWelcomeBeforeBrand')}<Text style={styles.introWise}>Wise</Text>{t('tutorialWelcomeAfterBrand')}
          </Text>
          <Text style={styles.introBody}>{t('tutorialWelcomeBody')}</Text>
          <View style={styles.introGuideHint}>
            <View style={styles.introHeaderGuideIcon}>
              <BookOpenCheck size={20} color="#4ADE80" />
            </View>
            <Text style={styles.introGuideHintText}>{t('tutorialWelcomeGuideHint')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={welcomeSaving}
            onPress={() => void completeWelcome()}
            style={({ pressed }) => [styles.introWelcomeButton, (pressed || welcomeSaving) && styles.pressed]}
          >
            {welcomeSaving
              ? <ActivityIndicator size="small" color="#07110B" />
              : <Text style={styles.introPrimaryText}>{t('tutorialWelcomeAction')}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  </TutorialContext.Provider>;
}

export function useTutorial() {
  const context = React.useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used inside TutorialProvider');
  }
  return context;
}

export function TutorialPageGuide({ page, frame = 0, onShow }: { page: string; frame?: number; onShow?: (y: number) => void }) {
  const guide = React.useContext(EmbeddedGuideContext);
  const { t } = useTranslation();
  if (!guide?.active || guide.current.page !== page || guide.frameIndex !== frame) return null;
  const Icon = guide.current.Icon;
  return <View
    style={styles.embeddedGuideCard}
    onLayout={event => onShow?.(event.nativeEvent.layout.y)}
  >
    <View style={styles.guideTrack}><View style={[styles.guideTrackFill, { width: `${((guide.frameIndex + 1) / guide.frameTotal) * 100}%` }]} /></View>
    <View style={styles.guideIdentity}>
      <View style={styles.guideIcon}><Icon size={20} color={ACCENT} /></View>
      <View style={styles.guideTitleWrap}>
        <Text numberOfLines={1} style={styles.guideTitle}>{guide.current.title}</Text>
        <Text style={styles.guideFrameCount}>{guide.frameIndex + 1}/{guide.frameTotal}</Text>
      </View>
      <Pressable accessibilityLabel={t('tutorialClose', 'Close guide')} onPress={guide.finish} hitSlop={6} style={({ pressed }) => [styles.guideCloseButton, pressed && styles.pressed]}><X size={16} color="#F87171" /></Pressable>
    </View>
    <Text numberOfLines={3} style={styles.guideSummary}>{guide.current.summary}</Text>
    <View style={styles.guideActions}>
      <Pressable disabled={guide.frameIndex === 0} onPress={guide.previous} accessibilityLabel={t('tutorialPrevious', 'Previous')} style={({ pressed }) => [styles.guideBack, guide.frameIndex === 0 && styles.guideDisabled, pressed && styles.pressed]}><ArrowLeft size={16} color={TEXT} /></Pressable>
      <Pressable onPress={guide.next} style={({ pressed }) => [styles.guidePrimary, pressed && styles.pressed]}><Text style={styles.guidePrimaryText}>{guide.frameIndex === guide.frameTotal - 1 ? t('tutorialDone', 'Done') : t('tutorialNext', 'Next')}</Text><ArrowRight size={16} color="#07110B" /></Pressable>
    </View>
  </View>;
}

type TutorialHintProps = {
  visible: boolean;
  title: string;
  body: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  onSkipAll?: () => void;
  arrow?: 'up' | 'down' | 'none';
  targetLabel?: string;
  targetArrow?: 'up' | 'down';
  targetContent?: React.ReactNode;
};

export function TutorialHint({
  visible,
  title,
  body,
  actionLabel,
  onAction,
  onSkipAll,
  arrow = 'down',
  targetLabel,
  targetArrow,
  targetContent,
}: TutorialHintProps) {
  const { t, i18n } = useTranslation();

  if (!visible) return null;

  const ArrowIcon = arrow === 'up' ? ArrowUp : ArrowDown;
  const TargetArrowIcon = (targetArrow ?? arrow) === 'up' ? ArrowUp : ArrowDown;
  const targetLabelUpper = targetLabel?.toLocaleUpperCase(
    i18n.language?.startsWith('tr') ? 'tr-TR' : undefined,
  );

  return (
    <View style={styles.hintWrap}>
      {arrow !== 'none' ? <ArrowIcon size={24} color={ACCENT} strokeWidth={2.4} /> : null}
      <View style={styles.hintCard}>
        <View style={styles.hintTopRow}>
          <Text style={styles.hintBadge}>{t('tutorialBadge', 'Tutorial')}</Text>
          {onSkipAll ? (
            <Pressable onPress={onSkipAll} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={styles.hintSkipText}>{t('skipTutorial', 'Skip tutorial')}</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.hintTitle}>{title}</Text>
        <Text style={styles.hintBody}>{body}</Text>
        {targetLabel || targetContent ? (
          <View style={styles.targetRow}>
            <TargetArrowIcon size={18} color={ACCENT} strokeWidth={2.5} />
            {targetContent ?? <Text style={styles.targetText}>{targetLabelUpper}</Text>}
          </View>
        ) : null}
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} style={({ pressed }) => [styles.hintButton, pressed && styles.pressed]}>
            <Text style={styles.hintButtonText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function TutorialStrong({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hintBodyStrong}>{children}</Text>;
}

type ProfileTutorialModalProps = {
  visible: boolean;
  onDone: () => void;
  onSkip: () => void;
};

export function ProfileTutorialModal({ visible, onDone, onSkip }: ProfileTutorialModalProps) {
  const { t } = useTranslation();

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onSkip}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalEyebrow}>{t('tutorialProfileEyebrow', 'My Profile')}</Text>
            <Pressable onPress={onSkip} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Text style={styles.modalSkipText}>{t('skipTutorial', 'Skip tutorial')}</Text>
            </Pressable>
          </View>
          <Text style={styles.modalTitle}>{t('tutorialProfilePortfolioTitle', 'Your player portfolio lives here')}</Text>
          <Text style={styles.modalBody}>
            {t(
              'tutorialProfilePortfolioBody',
              'You can see the players you added to your portfolio here, filter that portfolio, and create scouting reports by pressing the report icon on a player.',
            )}
          </Text>
          <Pressable onPress={onDone} style={({ pressed }) => [styles.modalButton, pressed && styles.pressed]}>
            <Text style={styles.modalButtonText}>{t('next', 'Next')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  hintWrap: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 2,
  },
  hintCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.38)',
    backgroundColor: '#142019',
    padding: 14,
  },
  hintTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8,
  },
  hintBadge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(22, 163, 74, 0.16)',
    color: ACCENT,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: 'uppercase',
  },
  hintSkipText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '900',
  },
  hintTitle: {
    color: ACCENT,
    fontSize: 15,
    fontWeight: '900',
  },
  hintBody: {
    marginTop: 6,
    color: TEXT,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 21,
  },
  hintBodyStrong: {
    color: ACCENT,
    fontWeight: '900',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 10,
  },
  targetText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '900',
  },
  hintButton: {
    alignSelf: 'flex-start',
    marginTop: 12,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
  },
  hintButtonText: {
    color: '#07110B',
    fontSize: 13,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  embeddedGuideCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,.5)',
    backgroundColor: '#131D17',
    padding: 11,
    gap: 8,
  },
  guidePausedCard: { width: '100%', minHeight: 58, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(22,163,74,.36)', backgroundColor: '#131D17', paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 9 },
  guidePausedIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,163,74,.12)' },
  guidePausedCopy: { flex: 1, minWidth: 0, gap: 1 },
  guidePausedLabel: { color: MUTED, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  guidePausedTitle: { color: TEXT, fontSize: 13, lineHeight: 17, fontWeight: '800' },
  guideResume: { minHeight: 34, borderRadius: 11, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: ACCENT },
  guideResumeText: { color: '#07110B', fontSize: 10, fontWeight: '900' },
  guideCloseButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 9, borderWidth: 1, borderColor: 'rgba(248,113,113,.42)', backgroundColor: 'rgba(248,113,113,.09)' },
  guideTrack: { height: 3, borderRadius: 3, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.07)' },
  guideTrackFill: { height: '100%', borderRadius: 3, backgroundColor: ACCENT },
  guideIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  guideIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(22,163,74,.38)', backgroundColor: 'rgba(22,163,74,.11)' },
  guideTitleWrap: { flex: 1, minWidth: 0, gap: 1 },
  guideTitle: { color: TEXT, fontSize: 15, lineHeight: 19, fontWeight: '900' },
  guideFrameCount: { color: ACCENT, fontSize: 9, fontWeight: '800' },
  guideSummary: { color: '#DCE5DF', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  guideActions: { flexDirection: 'row', alignItems: 'stretch', gap: 6 },
  guideBack: { width: 36, minHeight: 35, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE, borderRadius: 11 },
  guideSkip: { flex: 1, minHeight: 35, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(22,163,74,.5)', borderRadius: 11, paddingHorizontal: 5, backgroundColor: 'rgba(22,163,74,.1)' },
  guideSkipText: { color: '#B8C9BE', fontSize: 9, fontWeight: '900' },
  guidePrimary: { flex: 1, minHeight: 35, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 11, paddingHorizontal: 6, backgroundColor: ACCENT },
  guidePrimaryText: { color: '#07110B', fontSize: 10, fontWeight: '900' },
  guideDisabled: { opacity: .35 },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 20,
  },
  introCard: {
    width: '100%',
    maxWidth: 430,
    overflow: 'hidden',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.42)',
    backgroundColor: '#101815',
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 24,
  },
  introGlow: {
    position: 'absolute',
    top: -54,
    right: -42,
    width: 142,
    height: 142,
    borderRadius: 999,
    backgroundColor: 'rgba(22, 163, 74, 0.18)',
  },
  introEyebrow: {
    marginTop: 12,
    alignSelf: 'flex-start',
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(22, 163, 74, 0.16)',
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: 'uppercase',
  },
  introTitle: {
    marginTop: 14,
    color: TEXT,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '900',
  },
  introWise: { color: ACCENT },
  introGuideIconLarge: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,.52)',
    backgroundColor: 'rgba(22,163,74,.14)',
  },
  introBody: {
    marginTop: 10,
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  introGuideHint: {
    marginTop: 17,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(126,148,135,.22)',
    backgroundColor: 'rgba(255,255,255,.025)',
    padding: 12,
  },
  introHeaderGuideIcon: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,.62)',
    backgroundColor: 'rgba(22,163,74,.14)',
  },
  introGuideHintText: {
    flex: 1,
    color: '#DCE5DF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  introWelcomeButton: {
    minHeight: 48,
    marginTop: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
  },
  introActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  introSecondaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    paddingHorizontal: 12,
  },
  introPrimaryButton: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: ACCENT,
    paddingHorizontal: 12,
  },
  introSecondaryText: {
    color: TEXT,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  introPrimaryText: {
    color: '#07110B',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalEyebrow: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  modalSkipText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '900',
  },
  modalTitle: {
    marginTop: 10,
    color: TEXT,
    fontSize: 23,
    fontWeight: '900',
  },
  modalBody: {
    marginTop: 10,
    color: MUTED,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  modalButton: {
    alignSelf: 'flex-end',
    marginTop: 20,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: ACCENT,
    paddingHorizontal: 18,
  },
  modalButtonText: {
    color: '#07110B',
    fontSize: 14,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.9,
  },
});
