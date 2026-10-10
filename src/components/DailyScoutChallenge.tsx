import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Target,X } from "lucide-react-native";
import React from "react";
import { useTranslation } from "react-i18next";
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
} from "react-native";

import DailyScoutPlayerCard from "@/components/DailyScoutPlayerCard";
import {
getDailyScoutChallenge,
setDailyScoutNickname,
skipDailyScoutChallenge,
submitDailyScoutAnswer,
type DailyScoutChallenge,
} from "@/services/api";


type ChallengeModalProps = {
  embedded?: boolean;
  header?: React.ReactNode;
  refreshKey?: number;
  onUpdated?: () => void;
  visible?: boolean;
  autoOpen?: boolean;
  onClose?: () => void;
};

function useLocalizedText() {
  const { i18n } = useTranslation();
  return React.useCallback(
    (value?: { en: string; tr: string } | null) =>
      i18n.language?.startsWith("tr")
        ? value?.tr || value?.en || ""
        : value?.en || value?.tr || "",
    [i18n.language],
  );
}

function isNicknameTakenError(message: string) {
  return message.toLowerCase().includes("nickname is already taken");
}

export function DailyScoutChallengeModal({
  visible,
  embedded = false,
  header, refreshKey, onUpdated,
  autoOpen = false,
  onClose,
}: ChallengeModalProps) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, DANGER, MUTED, TEXT} = themed;

  const { t } = useTranslation();
  const localized = useLocalizedText();
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [challenge, setChallenge] = React.useState<DailyScoutChallenge | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState(false);
  const [submittingId, setSubmittingId] = React.useState<string | null>(null);
  const [savingNickname, setSavingNickname] = React.useState(false);
  const [nickname, setNickname] = React.useState("");
  const controlled = typeof visible === "boolean";
  const open = controlled ? !!visible : internalOpen;

  const close = React.useCallback(() => {
    if (!controlled) setInternalOpen(false);
    onClose?.();
  }, [controlled, onClose]);

  const loadChallenge = React.useCallback(async (shouldAutoOpen: boolean) => {
    try {
      setLoading(true);
      setLoadError(false);
      const next = await getDailyScoutChallenge();
      setChallenge(next);
      if (shouldAutoOpen && next.attempt.status === "available") {
        setInternalOpen(true);
      }
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (autoOpen) loadChallenge(true);
  }, [autoOpen, loadChallenge]);

  React.useEffect(() => {
    if (visible) loadChallenge(false);
  }, [loadChallenge, visible, refreshKey]);

  const completed = challenge?.attempt.status === "completed";
  const skipped = challenge?.attempt.status === "skipped";
  const needsNickname = completed && challenge?.attempt.needsNickname;

  const handleSkip = async () => {
    try {
      setLoading(true);
      const next = await skipDailyScoutChallenge();
      setChallenge(next);
      close();
    } catch (err: any) {
      Alert.alert(
        t("dailyScoutErrorTitle", "Challenge failed"),
        String(err?.message || err),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async () => {
    if (loading || submittingId || savingNickname) return;
    if (challenge?.attempt.status === "available") {
      await handleSkip();
      return;
    }
    close();
  };

  const handleAnswer = async (choiceId: string) => {
    if (!challenge || completed || submittingId || loading) return;

    try {
      setSubmittingId(choiceId);
      const next = await submitDailyScoutAnswer(
        challenge.challengeId,
        choiceId,
      );
      setChallenge(next);
      onUpdated?.();
    } catch (err: any) {
      Alert.alert(
        t("dailyScoutErrorTitle", "Challenge failed"),
        String(err?.message || err).includes('DAILY_CHALLENGE_EXPIRED')
          ? t('dailyScoutExpired', 'Today’s question has changed. Loading the new question…')
          : String(err?.message || err),
      );
      if (String(err?.message || err).includes('DAILY_CHALLENGE_EXPIRED')) { void loadChallenge(false); onUpdated?.(); }
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
      setNickname("");
      onUpdated?.();
    } catch (err: any) {
      const message = String(err?.message || err);
      Alert.alert(
        t("dailyScoutNicknameFailed", "Nickname failed"),
        isNicknameTakenError(message)
          ? t(
              "dailyScoutNicknameTaken",
              "This nickname is already taken for this week.",
            )
          : message,
      );
    } finally {
      setSavingNickname(false);
    }
  };

  const challengeHeader = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <View style={styles.iconBubble}>
          <Target size={18} color={ACCENT} strokeWidth={2.4} />
        </View>
        <View style={styles.titleTextWrap}>
          <Text style={styles.title}>
            {embedded ? t("dailyScoutTodayQuestion", "Today’s Question") : t("dailyScoutChallengeTitle", "Player Discovery League")}
          </Text>
          <Text style={styles.subtitle}>
            {t(
              "dailyScoutChallengeSubtitle",
              "Pick the best scouting profile from today's trio.",
            )}
          </Text>
        </View>
      </View>
      {!embedded && (
        <Pressable
          onPress={handleDismiss}
          hitSlop={10}
          style={styles.closeButton}
        >
          <X size={18} color={DANGER} />
        </Pressable>
      )}
    </View>
  );
  const content = (
    <View style={embedded ? { flex: 1 } : styles.backdrop}>
      <View style={embedded ? { flex: 1 } : styles.modal}>
        {!embedded && challengeHeader}
        <ScrollView
          contentContainerStyle={
            embedded ? styles.embeddedScrollContent : styles.scrollContent
          }
        >
          {header}
          <View
            testID="daily-scout-question-frame"
            style={embedded ? styles.questionFrame : undefined}
          >
            {embedded && challengeHeader}
            <View style={embedded ? styles.questionBody : { gap: 12 }}>
              <Text style={styles.question}>
                {t(
                  "dailyScoutFixedQuestion",
                  "Which player best fits today's scouting strategy?",
                )}
              </Text>

              {!!localized(challenge?.strategy) && (
                <View style={styles.strategyBox}>
                  <Text style={styles.strategyLabel}>
                    {t("dailyScoutStrategyLabel", "Today's strategy")}
                  </Text>
                  <Text style={styles.strategyText}>
                    {localized(challenge?.strategy)}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {loadError ? (
            <Pressable
              onPress={() => loadChallenge(false)}
              style={styles.skipButton}
            >
              <Text style={styles.skipButtonText}>
                {t("portfolioRetry", "Try again")}
              </Text>
            </Pressable>
          ) : loading && !challenge ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : (
            <>
              {completed && (
                <View
                  style={[
                    styles.resultBox,
                    challenge.attempt.isCorrect
                      ? styles.resultGood
                      : styles.resultBad,
                  ]}
                >
                  <Text style={styles.resultTitle}>
                    {challenge.attempt.isCorrect
                      ? t("dailyScoutCorrect", "Correct pick")
                      : t("dailyScoutWrong", "Wrong pick")}
                  </Text>
                  <Text style={styles.resultText}>
                    {localized(challenge.explanation)}
                  </Text>
                  <Text style={styles.scoreText}>
                    {t("dailyScoutScoreEarned", "{{score}} pts earned", {
                      score: challenge.attempt.score ?? 0,
                    })}
                  </Text>

                  {needsNickname && (
                    <View style={styles.nicknameBoxInline}>
                      <Text style={styles.nicknameTitle}>
                        {t(
                          "dailyScoutNicknameTitle",
                          "Choose your scoreboard name",
                        )}
                      </Text>
                      <Text style={styles.nicknameText}>
                        {t(
                          "dailyScoutNicknameBody",
                          "Set it once for this week so your score can appear on the board.",
                        )}
                      </Text>
                      <TextInput
                        value={nickname}
                        onChangeText={setNickname}
                        maxLength={24}
                        placeholder={t(
                          "dailyScoutNicknamePlaceholder",
                          "Nickname",
                        )}
                        placeholderTextColor={MUTED}
                        style={styles.nicknameInput}
                      />
                      <Pressable
                        disabled={savingNickname || nickname.trim().length < 2}
                        onPress={handleNickname}
                        style={({ pressed }) => [
                          styles.primaryButton,
                          (savingNickname || nickname.trim().length < 2) &&
                            styles.disabledButton,
                          pressed && styles.pressed,
                        ]}
                      >
                        {savingNickname ? (
                          <ActivityIndicator size="small" color={TEXT} />
                        ) : (
                          <Text style={styles.primaryButtonText}>
                            {t("dailyScoutSaveNickname", "Save nickname")}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>
              )}

              {challenge?.choices.map((choice, index) => {
                const isWinner =
                  completed &&
                  String(choice.id) === String(challenge.winnerPlayerId);
                const isChosen =
                  completed &&
                  String(choice.id) ===
                    String(challenge.attempt.chosenPlayerId);
                const wrongChosen = isChosen && !isWinner;
                const optionLetter =
                  ["A", "B", "C"][index] ?? String(index + 1);

                return (
                  <View
                    key={choice.id}
                    testID={`daily-scout-option-${index + 1}`}
                    style={[
                      styles.choice,
                      embedded && styles.embeddedChoice,
                      isWinner && styles.choiceCorrect,
                      wrongChosen && styles.choiceWrong,
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      disabled={completed || !!submittingId || loading}
                      onPress={() => handleAnswer(choice.id)}
                      style={[
                        styles.optionHeader,
                        isWinner && styles.optionHeaderCorrect,
                        wrongChosen && styles.optionHeaderWrong,
                      ]}
                    >
                      <View style={styles.optionBadge}>
                        <Text style={styles.optionBadgeText}>
                          {optionLetter}
                        </Text>
                      </View>
                      <Text style={styles.optionHeaderText}>
                        {completed
                          ? isWinner
                            ? t("dailyScoutCorrectOption", "Correct option")
                            : isChosen
                              ? t("dailyScoutYourPick", "Your pick")
                              : t("dailyScoutOption", "Option {{letter}}", {
                                  letter: optionLetter,
                                })
                          : t(
                              "dailyScoutTapOption",
                              "Tap to choose Option {{letter}}",
                              { letter: optionLetter },
                            )}
                      </Text>
                    </Pressable>
                    <DailyScoutPlayerCard
                      id={choice.id}
                      player={choice.player}
                      onNavigate={close}
                    />
                    {submittingId === choice.id && (
                      <View style={styles.choiceLoader}>
                        <ActivityIndicator color={ACCENT} />
                      </View>
                    )}
                  </View>
                );
              })}

              {!completed && !skipped && (
                <Pressable
                  disabled={loading}
                  onPress={handleSkip}
                  style={styles.skipButton}
                >
                  <Text style={styles.skipButtonText}>
                    {t("dailyScoutSkipToday", "Skip today")}
                  </Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
  return embedded ? (
    content
  ) : (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      {content}
    </Modal>
  );
}

const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT, themeColor} = colors;

  const styles = StyleSheet.create({
  embeddedScrollContent: { gap: 16, paddingBottom: 24 },
  questionFrame: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 20,
    backgroundColor: PANEL,
    overflow: "hidden",
  },
  questionBody: { padding: 14, gap: 12 },
  embeddedChoice: { borderColor: ACCENT },

  backdrop: {
    flex: 1,
    backgroundColor: themeColor("rgba(0,0,0,0.72)", 'surface'),
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingTop: 48,
    paddingBottom: 26,
  },
  modal: {
    maxHeight: "88%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: themeColor("rgba(22, 163, 74, 0.09)", 'surface'),
  },
  titleRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: themeColor("rgba(22, 163, 74, 0.13)", 'surface'),
  },
  titleTextWrap: { flex: 1, minWidth: 0 },
  title: { color: TEXT, fontSize: 18, fontWeight: "900" },
  subtitle: { color: MUTED, marginTop: 3, fontSize: 12, fontWeight: "700" },
  closeButton: { padding: 4 },
  loadingWrap: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: { padding: 14, gap: 12 },
  question: { color: TEXT, fontSize: 16, fontWeight: "900", lineHeight: 22 },
  strategyBox: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: themeColor("rgba(22, 163, 74, 0.10)", 'surface'),
    padding: 12,
    gap: 4,
  },
  strategyLabel: { color: ACCENT, fontWeight: "900", fontSize: 12 },
  strategyText: { color: TEXT, fontWeight: "800", lineHeight: 19 },
  choice: {
    borderWidth: 2,
    borderColor: LINE,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: CARD,
  },
  choiceCorrect: {
    borderColor: ACCENT,
    backgroundColor: themeColor("rgba(22, 163, 74, 0.10)", 'surface'),
  },
  choiceWrong: {
    borderColor: DANGER,
    backgroundColor: themeColor("rgba(229, 72, 77, 0.10)", 'surface'),
  },
  choiceLoader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: themeColor("rgba(0,0,0,0.28)", 'surface'),
  },
  optionHeader: {
    minHeight: 40,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: themeColor("rgba(255,255,255,0.035)", 'surface'),
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  optionHeaderCorrect: {
    borderBottomColor: ACCENT,
    backgroundColor: themeColor("rgba(22, 163, 74, 0.16)", 'surface'),
  },
  optionHeaderWrong: {
    borderBottomColor: DANGER,
    backgroundColor: themeColor("rgba(229, 72, 77, 0.14)", 'surface'),
  },
  optionBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  optionBadgeText: { color: themeColor(TEXT, 'onAccent'), fontWeight: "900", fontSize: 13 },
  optionHeaderText: { color: TEXT, fontWeight: "900", fontSize: 13 },
  resultBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  resultGood: {
    borderColor: ACCENT,
    backgroundColor: themeColor("rgba(22, 163, 74, 0.12)", 'surface'),
  },
  resultBad: {
    borderColor: DANGER,
    backgroundColor: themeColor("rgba(229, 72, 77, 0.11)", 'surface'),
  },
  resultTitle: { color: TEXT, fontWeight: "900", fontSize: 15 },
  resultText: { color: MUTED, lineHeight: 19, fontWeight: "600" },
  scoreText: { color: ACCENT, fontWeight: "900" },
  nicknameBoxInline: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 10,
    gap: 8,
  },
  nicknameTitle: { color: TEXT, fontWeight: "900", fontSize: 15 },
  nicknameText: { color: MUTED, lineHeight: 18 },
  nicknameInput: {
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT,
    backgroundColor: BG,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: ACCENT,
  },
  primaryButtonText: { color: themeColor(TEXT, 'onAccent'), fontWeight: "900" },
  disabledButton: { opacity: 0.45 },
  skipButton: {
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  skipButtonText: { color: MUTED, fontWeight: "800" },
  pressed: { opacity: 0.86 },
});
  return {ACCENT, BG, CARD, DANGER, LINE, MUTED, PANEL, TEXT, styles, themeColor};
});
