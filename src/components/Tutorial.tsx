import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp } from 'lucide-react-native';

import { getMe, updateTutorialCompletion } from '@/services/api';
import { ACCENT, LINE, MUTED, PANEL, TEXT } from '@/theme';

export type PlayerPoolTutorialStep =
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

export type ProfileTutorialStep = 'intro' | 'watchlist' | 'filters';

type TutorialStage = 'playerPool' | 'profile' | 'scoutwise' | 'done';

type TutorialContextValue = {
  active: boolean;
  stage: TutorialStage;
  playerPoolStep: PlayerPoolTutorialStep;
  profileStep: ProfileTutorialStep;
  scoutWiseStep: ScoutWiseTutorialStep;
  setPlayerPoolStep: (step: PlayerPoolTutorialStep) => void;
  setProfileStep: (step: ProfileTutorialStep) => void;
  setScoutWiseStep: (step: ScoutWiseTutorialStep) => void;
  moveToProfile: () => void;
  moveToScoutWise: () => void;
  completeTutorial: () => Promise<void>;
  skipTutorial: () => Promise<void>;
};

const TutorialContext = React.createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState(false);
  const [introVisible, setIntroVisible] = React.useState(false);
  const [stage, setStage] = React.useState<TutorialStage>('done');
  const [playerPoolStep, setPlayerPoolStep] = React.useState<PlayerPoolTutorialStep>('weeklyPopularButton');
  const [profileStep, setProfileStep] = React.useState<ProfileTutorialStep>('intro');
  const [scoutWiseStep, setScoutWiseStep] = React.useState<ScoutWiseTutorialStep>('setStrategy');
  const loadedRef = React.useRef(false);
  const { t } = useTranslation();

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const me = await getMe();
        if (!alive || loadedRef.current) return;
        loadedRef.current = true;

        if (!me.tutorialCompleted) {
          setIntroVisible(true);
          setStage('done');
          setPlayerPoolStep('weeklyPopularButton');
        }
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, []);

  const finish = React.useCallback(async () => {
    setIntroVisible(false);
    setActive(false);
    setStage('done');
    loadedRef.current = true;

    try {
      await updateTutorialCompletion(true);
    } catch (e: any) {
      console.log('UPDATE TUTORIAL ERROR:', e?.message ?? e);
    }
  }, []);

  const startTutorial = React.useCallback(() => {
    setIntroVisible(false);
    setActive(true);
    setStage('playerPool');
    setPlayerPoolStep('weeklyPopularButton');
  }, []);

  const value = React.useMemo<TutorialContextValue>(
    () => ({
      active,
      stage,
      playerPoolStep,
      profileStep,
      scoutWiseStep,
      setPlayerPoolStep,
      setProfileStep,
      setScoutWiseStep,
      moveToProfile: () => {
        setStage('profile');
        setProfileStep('intro');
      },
      moveToScoutWise: () => {
        setStage('scoutwise');
        setScoutWiseStep('setStrategy');
      },
      completeTutorial: finish,
      skipTutorial: finish,
    }),
    [active, finish, playerPoolStep, profileStep, scoutWiseStep, stage],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
      <Modal transparent visible={introVisible} animationType="fade" onRequestClose={finish}>
        <View style={styles.modalBackdrop}>
          <View style={styles.introCard}>
            <View style={styles.introGlow} />
            <Text style={styles.introEyebrow}>{t('tutorialIntroEyebrow', 'Quick tour')}</Text>
            <Text style={styles.introTitle}>
              {t('tutorialIntroTitle', 'Want a guided ScoutWise walkthrough?')}
            </Text>
            <Text style={styles.introBody}>
              {t(
                'tutorialIntroBody',
                'We can show you how to search the player pool, read player cards, compare matchups, save players, create scouting reports, and ask ScoutWise for recommendations.',
              )}
            </Text>
            <View style={styles.introActions}>
              <Pressable
                onPress={finish}
                style={({ pressed }) => [styles.introSecondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.introSecondaryText}>{t('skipTutorial', 'Skip tutorial')}</Text>
              </Pressable>
              <Pressable
                onPress={startTutorial}
                style={({ pressed }) => [styles.introPrimaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.introPrimaryText}>{t('startTutorial', 'Start tutorial')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = React.useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used inside TutorialProvider');
  }
  return context;
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
  introBody: {
    marginTop: 10,
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
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
