import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ListOrdered, Target, Trophy, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import PlayerCard from '@/components/PlayerCard';
import {
  addFavoritePlayer,
  getDailyScoutChallenge,
  getDailyScoutLeaderboard,
  setDailyScoutNickname,
  skipDailyScoutChallenge,
  submitDailyScoutAnswer,
  type DailyScoutChallenge,
  type DailyScoutLeaderboard,
} from '@/services/api';
import { ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT } from '@/theme';
import type { PlayerData } from '@/types';

type ChallengeModalProps = {
  visible?: boolean;
  autoOpen?: boolean;
  onClose?: () => void;
};

export function DailyScoutChallengeFrame({
  onOpenChallenge,
  onOpenLeaderboard,
  navigationLocked = false,
}: {
  onOpenChallenge: () => void;
  onOpenLeaderboard: () => void;
  navigationLocked?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.profileFrame}>
      <View style={styles.challengeHeader}>
        <View style={styles.iconBubble}>
          <Trophy size={18} color={ACCENT} strokeWidth={2.5} />
        </View>
        <View style={styles.titleTextWrap}>
          <Text style={styles.profileFrameTitle}>
            {t('dailyScoutChallengeTitle', 'Daily Scout Challenge')}
          </Text>
          <Text style={styles.subtitle}>
            {t('dailyScoutAccountBody', 'Play today or check this week\'s scoreboard.')}
          </Text>
        </View>
      </View>

      <View style={styles.frameActions}>
        <Pressable
          onPress={onOpenChallenge}
          disabled={navigationLocked}
          style={({ pressed }) => [
            styles.framePrimary,
            navigationLocked && styles.disabledButton,
            pressed && !navigationLocked && styles.pressed,
          ]}
        >
          <Target size={15} color={ACCENT} strokeWidth={2.5} />
          <Text style={styles.framePrimaryText}>
            {t('dailyScoutOpenChallenge', 'Open Challenge')}
          </Text>
        </Pressable>

        <Pressable
          onPress={onOpenLeaderboard}
          disabled={navigationLocked}
          style={({ pressed }) => [
            styles.frameSecondary,
            navigationLocked && styles.disabledButton,
            pressed && !navigationLocked && styles.pressed,
          ]}
        >
          <ListOrdered size={15} color={TEXT} strokeWidth={2.4} />
          <Text style={styles.frameSecondaryText}>
            {t('dailyScoutWeeklyScoreboard', 'Weekly Scoreboard')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function useLocalizedText() {
  const { i18n } = useTranslation();
  return React.useCallback(
    (value?: { en: string; tr: string } | null) =>
      i18n.language?.startsWith('tr') ? value?.tr || value?.en || '' : value?.en || value?.tr || '',
    [i18n.language],
  );
}

function favoriteInputFromPlayer(player: PlayerData) {
  return {
    name: player.name,
    nationality: player.meta?.nationality,
    age: player.meta?.age,
    potential: player.meta?.potential,
    form: player.meta?.form,
    gender: player.meta?.gender,
    height: player.meta?.height,
    weight: player.meta?.weight,
    team: player.meta?.team,
    league: player.meta?.league,
    formRevealed: true,
    roles: player.meta?.roles ?? [],
  };
}

export function DailyScoutChallengeModal({
  visible,
  autoOpen = false,
  onClose,
}: ChallengeModalProps) {
  const { t } = useTranslation();
  const localized = useLocalizedText();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [challenge, setChallenge] = React.useState<DailyScoutChallenge | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);
  const [savingNickname, setSavingNickname] = React.useState(false);
  const [nickname, setNickname] = React.useState('');
  const controlled = typeof visible === 'boolean';
  const open = controlled ? !!visible : internalOpen;

  const close = React.useCallback(() => {
    if (!controlled) setInternalOpen(false);
    onClose?.();
  }, [controlled, onClose]);

  const loadChallenge = React.useCallback(
    async (shouldAutoOpen: boolean) => {
      try {
        setLoading(true);
        const next = await getDailyScoutChallenge();
        setChallenge(next);
        if (shouldAutoOpen && next.attempt.status === 'available') {
          setInternalOpen(true);
        }
      } catch {
        // The challenge should never block Player Pool.
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    if (autoOpen) loadChallenge(true);
  }, [autoOpen, loadChallenge]);

  React.useEffect(() => {
    if (visible) loadChallenge(false);
  }, [loadChallenge, visible]);

  const completed = challenge?.attempt.status === 'completed';
  const skipped = challenge?.attempt.status === 'skipped';
  const needsNickname = completed && challenge?.attempt.needsNickname;

  const handleSkip = async () => {
    try {
      setLoading(true);
      const next = await skipDailyScoutChallenge();
      setChallenge(next);
      close();
    } catch (err: any) {
      Alert.alert(t('dailyScoutErrorTitle', 'Challenge failed'), String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (loading || submittingId || savingNickname) return;
    if (challenge?.attempt.status === 'available') {
      await handleSkip();
      return;
    }
    close();
  };

  const handleAnswer = async (choiceId: string) => {
    if (!challenge || completed || submittingId) return;

    try {
      setSubmittingId(choiceId);
      const next = await submitDailyScoutAnswer(challenge.challengeId, choiceId);
      setChallenge(next);
    } catch (err: any) {
      Alert.alert(t('dailyScoutErrorTitle', 'Challenge failed'), String(err?.message || err));
    } finally {
      setSubmittingId(null);
    }
  };

  const handleNickname = async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;

    try {
      setSavingNickname(true);
      await setDailyScoutNickname(trimmed);
      setChallenge((current) =>
        current
          ? {
              ...current,
              attempt: { ...current.attempt, needsNickname: false },
            }
          : current,
      );
      setNickname('');
    } catch (err: any) {
      Alert.alert(t('dailyScoutNicknameFailed', 'Nickname failed'), String(err?.message || err));
    } finally {
      setSavingNickname(false);
    }
  };

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconBubble}>
                <Trophy size={18} color={ACCENT} strokeWidth={2.4} />
              </View>
              <View style={styles.titleTextWrap}>
                <Text style={styles.title}>{t('dailyScoutChallengeTitle', 'Daily Scout Challenge')}</Text>
                <Text style={styles.subtitle}>
                  {t('dailyScoutChallengeSubtitle', 'Pick the best scouting profile from today\'s trio.')}
                </Text>
              </View>
            </View>
            <Pressable onPress={handleDismiss} hitSlop={10} style={styles.closeButton}>
              <X size={18} color={DANGER} />
            </Pressable>
          </View>

          {loading && !challenge ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.scrollContent}>
              <Text style={styles.question}>
                {t('dailyScoutFixedQuestion', "Which player best fits today's scouting strategy?")}
              </Text>

              {!!localized(challenge?.strategy) && (
                <View style={styles.strategyBox}>
                  <Text style={styles.strategyLabel}>
                    {t('dailyScoutStrategyLabel', "Today's strategy")}
                  </Text>
                  <Text style={styles.strategyText}>{localized(challenge?.strategy)}</Text>
                </View>
              )}

              {completed && (
                <View style={[styles.resultBox, challenge.attempt.isCorrect ? styles.resultGood : styles.resultBad]}>
                  <Text style={styles.resultTitle}>
                    {challenge.attempt.isCorrect
                      ? t('dailyScoutCorrect', 'Correct pick')
                      : t('dailyScoutWrong', 'Wrong pick')}
                  </Text>
                  <Text style={styles.resultText}>{localized(challenge.explanation)}</Text>
                  <Text style={styles.scoreText}>
                    {t('dailyScoutScoreEarned', '{{score}} pts earned', {
                      score: challenge.attempt.score ?? 0,
                    })}
                  </Text>

                  {needsNickname && (
                    <View style={styles.nicknameBoxInline}>
                      <Text style={styles.nicknameTitle}>
                        {t('dailyScoutNicknameTitle', 'Choose your scoreboard name')}
                      </Text>
                      <Text style={styles.nicknameText}>
                        {t('dailyScoutNicknameBody', 'Set it once for this week so your score can appear on the board.')}
                      </Text>
                      <TextInput
                        value={nickname}
                        onChangeText={setNickname}
                        maxLength={24}
                        placeholder={t('dailyScoutNicknamePlaceholder', 'Nickname')}
                        placeholderTextColor={MUTED}
                        style={styles.nicknameInput}
                      />
                      <Pressable
                        disabled={savingNickname || nickname.trim().length < 2}
                        onPress={handleNickname}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          (savingNickname || nickname.trim().length < 2) && styles.disabledButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        {savingNickname ? (
                          <ActivityIndicator size="small" color={TEXT} />
                        ) : (
                          <Text style={styles.primaryButtonText}>
                            {t('dailyScoutSaveNickname', 'Save nickname')}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {challenge?.choices.map((choice, index) => {
                const isWinner = completed && String(choice.id) === String(challenge.winnerPlayerId);
                const isChosen = completed && String(choice.id) === String(challenge.attempt.chosenPlayerId);
                const wrongChosen = isChosen && !isWinner;
                const optionLetter = ['A', 'B', 'C'][index] ?? String(index + 1);

                return (
                  <Pressable
                    key={choice.id}
                    disabled={completed || !!submittingId}
                    onPress={() => handleAnswer(choice.id)}
                    style={({ pressed }) => [
                      styles.choice,
                      isWinner && styles.choiceCorrect,
                      wrongChosen && styles.choiceWrong,
                      pressed && !completed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.optionHeader,
                        isWinner && styles.optionHeaderCorrect,
                        wrongChosen && styles.optionHeaderWrong,
                      ]}
                    >
                      <View style={styles.optionBadge}>
                        <Text style={styles.optionBadgeText}>{optionLetter}</Text>
                      </View>
                      <Text style={styles.optionHeaderText}>
                        {completed
                          ? isWinner
                            ? t('dailyScoutCorrectOption', 'Correct option')
                            : isChosen
                              ? t('dailyScoutYourPick', 'Your pick')
                              : t('dailyScoutOption', 'Option {{letter}}', { letter: optionLetter })
                          : t('dailyScoutTapOption', 'Tap to choose Option {{letter}}', { letter: optionLetter })}
                      </Text>
                    </View>
                    <PlayerCard
                      player={choice.player}
                      onAddFavorite={async (player) => {
                        await addFavoritePlayer(favoriteInputFromPlayer(player));
                        return true;
                      }}
                      visualTheme={{ cardBackground: CARD, accent: ACCENT }}
                    />
                    {submittingId === choice.id && (
                      <View style={styles.choiceLoader}>
                        <ActivityIndicator color={ACCENT} />
                      </View>
                    )}
                  </Pressable>
                );
              })}

              {!completed && (
                <Pressable disabled={loading} onPress={handleSkip} style={styles.skipButton}>
                  <Text style={styles.skipButtonText}>{t('dailyScoutSkipToday', 'Skip today')}</Text>
                </Pressable>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export function DailyScoutLeaderboardModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [leaderboard, setLeaderboard] = React.useState<DailyScoutLeaderboard | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!visible) return;

    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const next = await getDailyScoutLeaderboard(20);
        if (alive) setLeaderboard(next);
      } catch (err: any) {
        Alert.alert(t('dailyScoutLeaderboardFailed', 'Scoreboard failed'), String(err?.message || err));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [t, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.iconBubble}>
                <Trophy size={18} color={ACCENT} strokeWidth={2.4} />
              </View>
              <View>
                <Text style={styles.title}>{t('dailyScoutLeaderboardTitle', 'Weekly Scoreboard')}</Text>
                <Text style={styles.subtitle}>
                  {t('dailyScoutLeaderboardWeek', 'Week of {{week}}', {
                    week: leaderboard?.weekStart ?? '-',
                  })}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeButton}>
              <X size={18} color={MUTED} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.leaderboardContent}>
              {(leaderboard?.rows ?? []).length === 0 ? (
                <Text style={styles.emptyText}>
                  {t('dailyScoutLeaderboardEmpty', 'No scores yet this week.')}
                </Text>
              ) : (
                leaderboard?.rows.map((row, index) => (
                  <View key={`${row.nickname}-${index}`} style={styles.leaderboardRow}>
                    <Text style={styles.rank}>{index + 1}</Text>
                    <Text style={styles.nickname}>{row.nickname}</Text>
                    <View style={styles.scoreBlock}>
                      <Text style={styles.scoreNumber}>{row.score}</Text>
                      <Text style={styles.scoreLabel}>{t('dailyScoutPoints', 'pts')}</Text>
                    </View>
                    <Text style={styles.recordText}>
                      {row.correct}/{row.played}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingTop: 48,
    paddingBottom: 26,
  },
  modal: {
    maxHeight: '88%',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    overflow: 'hidden',
  },
  profileFrame: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    padding: 16,
    gap: 12,
  },
  profileFrameTitle: { color: ACCENT, fontSize: 16, fontWeight: '900' },
  challengeHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  frameActions: { flexDirection: 'row', gap: 10 },
  framePrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 8,
  },
  framePrimaryText: { color: ACCENT, fontWeight: '900', fontSize: 13 },
  frameSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 8,
  },
  frameSecondaryText: { color: TEXT, fontWeight: '800', fontSize: 13 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: 'rgba(22, 163, 74, 0.09)',
  },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.13)',
  },
  titleTextWrap: { flex: 1, minWidth: 0 },
  title: { color: TEXT, fontSize: 18, fontWeight: '900' },
  subtitle: { color: MUTED, marginTop: 3, fontSize: 12, fontWeight: '700' },
  closeButton: { padding: 4 },
  loadingWrap: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { padding: 14, gap: 12 },
  question: { color: TEXT, fontSize: 16, fontWeight: '900', lineHeight: 22 },
  strategyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
    padding: 12,
    gap: 4,
  },
  strategyLabel: { color: ACCENT, fontWeight: '900', fontSize: 12 },
  strategyText: { color: TEXT, fontWeight: '800', lineHeight: 19 },
  choice: {
    borderWidth: 2,
    borderColor: LINE,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: CARD,
  },
  choiceCorrect: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
  },
  choiceWrong: {
    borderColor: DANGER,
    backgroundColor: 'rgba(229, 72, 77, 0.10)',
  },
  choiceLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  optionHeader: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: 'rgba(255,255,255,0.035)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionHeaderCorrect: {
    borderBottomColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.16)',
  },
  optionHeaderWrong: {
    borderBottomColor: DANGER,
    backgroundColor: 'rgba(229, 72, 77, 0.14)',
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  optionBadgeText: { color: TEXT, fontWeight: '900', fontSize: 13 },
  optionHeaderText: { color: TEXT, fontWeight: '900', fontSize: 13 },
  resultBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  resultGood: { borderColor: ACCENT, backgroundColor: 'rgba(22, 163, 74, 0.12)' },
  resultBad: { borderColor: DANGER, backgroundColor: 'rgba(229, 72, 77, 0.11)' },
  resultTitle: { color: TEXT, fontWeight: '900', fontSize: 15 },
  resultText: { color: MUTED, lineHeight: 19, fontWeight: '600' },
  scoreText: { color: ACCENT, fontWeight: '900' },
  nicknameBox: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 16,
    padding: 12,
    gap: 8,
    backgroundColor: CARD,
  },
  nicknameBoxInline: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 10,
    gap: 8,
  },
  nicknameTitle: { color: TEXT, fontWeight: '900', fontSize: 15 },
  nicknameText: { color: MUTED, lineHeight: 18 },
  nicknameInput: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT,
    backgroundColor: BG,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  primaryButtonText: { color: TEXT, fontWeight: '900' },
  disabledButton: { opacity: 0.45 },
  skipButton: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  skipButtonText: { color: MUTED, fontWeight: '800' },
  pressed: { opacity: 0.86 },
  leaderboardContent: { padding: 14, gap: 8 },
  leaderboardRow: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  rank: { width: 26, color: ACCENT, fontWeight: '900', fontSize: 16 },
  nickname: { flex: 1, color: TEXT, fontWeight: '900' },
  scoreBlock: { alignItems: 'flex-end' },
  scoreNumber: { color: TEXT, fontWeight: '900', fontSize: 16 },
  scoreLabel: { color: MUTED, fontWeight: '700', fontSize: 11 },
  recordText: { width: 44, textAlign: 'right', color: MUTED, fontWeight: '800' },
  emptyText: { color: MUTED, textAlign: 'center', paddingVertical: 30, fontWeight: '700' },
});
