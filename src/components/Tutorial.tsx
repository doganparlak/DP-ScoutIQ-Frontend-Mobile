import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp } from 'lucide-react-native';

import { getMe, updateTutorialCompletion } from '@/services/api';
import { ACCENT, LINE, MUTED, PANEL, TEXT } from '@/theme';

export type PlayerPoolTutorialStep =
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
  | 'strategyIntro'
  | 'setStrategy'
  | 'startChat'
  | 'chatInput'
  | 'chatResponse';

type TutorialStage = 'playerPool' | 'profile' | 'scoutwise' | 'done';

type TutorialContextValue = {
  active: boolean;
  stage: TutorialStage;
  playerPoolStep: PlayerPoolTutorialStep;
  scoutWiseStep: ScoutWiseTutorialStep;
  setPlayerPoolStep: (step: PlayerPoolTutorialStep) => void;
  setScoutWiseStep: (step: ScoutWiseTutorialStep) => void;
  moveToProfile: () => void;
  moveToScoutWise: () => void;
  completeTutorial: () => Promise<void>;
  skipTutorial: () => Promise<void>;
};

const TutorialContext = React.createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = React.useState(false);
  const [stage, setStage] = React.useState<TutorialStage>('done');
  const [playerPoolStep, setPlayerPoolStep] = React.useState<PlayerPoolTutorialStep>('filters');
  const [scoutWiseStep, setScoutWiseStep] = React.useState<ScoutWiseTutorialStep>('strategyIntro');
  const loadedRef = React.useRef(false);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const me = await getMe();
        if (!alive || loadedRef.current) return;
        loadedRef.current = true;

        if (!me.tutorialCompleted) {
          setActive(true);
          setStage('playerPool');
          setPlayerPoolStep('filters');
        }
      } catch {}
    })();

    return () => {
      alive = false;
    };
  }, []);

  const finish = React.useCallback(async () => {
    setActive(false);
    setStage('done');
    loadedRef.current = true;

    try {
      await updateTutorialCompletion(true);
    } catch (e: any) {
      console.log('UPDATE TUTORIAL ERROR:', e?.message ?? e);
    }
  }, []);

  const value = React.useMemo<TutorialContextValue>(
    () => ({
      active,
      stage,
      playerPoolStep,
      scoutWiseStep,
      setPlayerPoolStep,
      setScoutWiseStep,
      moveToProfile: () => {
        setStage('profile');
      },
      moveToScoutWise: () => {
        setStage('scoutwise');
        setScoutWiseStep('strategyIntro');
      },
      completeTutorial: finish,
      skipTutorial: finish,
    }),
    [active, finish, playerPoolStep, scoutWiseStep, stage],
  );

  return <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>;
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
  arrow?: 'up' | 'down';
  targetLabel?: string;
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
}: TutorialHintProps) {
  if (!visible) return null;

  const ArrowIcon = arrow === 'up' ? ArrowUp : ArrowDown;

  return (
    <View style={styles.hintWrap}>
      <ArrowIcon size={24} color={ACCENT} strokeWidth={2.4} />
      <View style={styles.hintCard}>
        <View style={styles.hintTopRow}>
          <Text style={styles.hintBadge}>Tutorial</Text>
          {onSkipAll ? (
            <Pressable onPress={onSkipAll} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Text style={styles.hintSkipText}>Skip all</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.hintTitle}>{title}</Text>
        <Text style={styles.hintBody}>{body}</Text>
        {targetLabel ? (
          <View style={styles.targetRow}>
            <ArrowIcon size={18} color={ACCENT} strokeWidth={2.5} />
            <Text style={styles.targetText}>{targetLabel}</Text>
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
              <Text style={styles.modalSkipText}>{t('tutorialSkipAll', 'Skip all')}</Text>
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
            <Text style={styles.modalButtonText}>{t('tutorialFinish', 'Got it')}</Text>
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
    textTransform: 'uppercase',
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
