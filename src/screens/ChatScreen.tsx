// src/screens/ChatScreen.tsx
import ChatAccessModal from '@/components/ChatAccessModal';
import { canUseChat } from '@/utils/chatAccess';
import * as React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  TouchableOpacity,
  Text,
  KeyboardAvoidingView,
  Platform,
  AppState,
  AppStateStatus,
  Keyboard,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Header from '@/components/Header';
import ChatInput from '@/components/ChatInput';
import MessageBubble from '@/components/MessageBubble';
import WelcomeCard from '@/components/WelcomeCard';
import ChatVisualsBlock from '@/components/ChatVisualsBlock';
import { TutorialHint, TutorialPageGuide, useTutorial } from '@/components/Tutorial';

import { getMe, healthcheck, sendChat, resetSession, type Profile } from '@/services/api';
import { ACCENT, BG } from '@/theme';
import { getSessionId, loadHistory, saveHistory, loadStrategy } from '@/storage';
import type { ChatMessage, PlayerData } from '@/types';
import { useTranslation } from 'react-i18next';


const { useState, useEffect, useRef } = React;

// Extend ChatMessage locally to support "visuals" items that carry players
type ChatVisualKind = 'playerCard' | 'pitchMap' | 'metrics';

type ChatMessageExt = ChatMessage & {
  kind?: 'text' | 'visuals';
  visualKind?: ChatVisualKind;
  players?: PlayerData[];
  pending?: boolean;
};

// Only the roles your backend endpoint expects from the chat payload
type ChatPayloadRole = 'user' | 'assistant';
type ChatPayloadItem = { role: ChatPayloadRole; content: string };

const TUTORIAL_GYOKERES_INTERPRETATION =
  'Viktor Gyokeres is a strong center-forward profile for a team that wants a direct outlet, penalty-box presence, and repeated threat in transition. His scoring output, carrying power, and ability to attack space make him especially useful when your strategy asks the striker to stretch the back line while still receiving under pressure. The main scouting question is how cleanly that physical dominance translates against deeper blocks, but his recent data suggests a forward who can turn volume into high-impact chances.';

function formatScoutWiseNarrative(text: string) {
  const initialPlaceholders: string[] = [];
  const cleaned = text
    .split(/\n+/)
    .map((line) =>
      line
        .trim()
        .replace(/^([•*-]|\d+[.)])\s+/, '')
        .replace(/^#+\s*/, ''),
    )
    .filter(Boolean);

  const paragraph = cleaned
    .join(' ')
    .replace(/\b([A-ZÇĞİÖŞÜ])\.(?=\s+[A-ZÇĞİÖŞÜ][\p{L}'-]+)/gu, (match) => {
      const token = `__INITIAL_${initialPlaceholders.length}__`;
      initialPlaceholders.push(match);
      return token;
    });

  const sentences = paragraph
    .split(/(?<=[.!?])\s+|(?<=[.!?])(?=[A-ZÇĞİÖŞÜa-zçğıöşü])/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) =>
      sentence.replace(/__INITIAL_(\d+)__/g, (_, index) => initialPlaceholders[Number(index)] || ''),
    );

  const bulletItems = sentences.length ? sentences : cleaned;
  return bulletItems.map((sentence) => `• ${sentence}`).join('\n');
}

function hasPitchMapData(player: PlayerData) {
  const meta = player.meta as (PlayerData['meta'] & Record<string, unknown>) | undefined;
  if (!meta) return false;
  const counts = meta.positionCounts ?? meta.position_counts;
  const names = meta.positionNamesSeen ?? meta.position_names_seen;
  return Boolean(
    (counts && typeof counts === 'object' && !Array.isArray(counts) && Object.keys(counts).length) ||
      (Array.isArray(names) && names.length),
  );
}

export default function ChatScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const tutorial = useTutorial();
  const isScoutWiseTutorial = tutorial.active && tutorial.stage === 'scoutwise';
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accessModal, setAccessModal] = useState<'tutorial' | 'exhausted' | null>(null);
  useFocusEffect(React.useCallback(() => {
    let active = true;
    getMe().then(me => {
      if (!active) return;
      setProfile(me);
      if (!tutorial.active && !canUseChat(me)) navigation.navigate('ProHome');
    }).catch(() => {});
    return () => { active = false; };
  }, [navigation, tutorial.active]));
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessageExt[]>([]);
  const [sending, setSending] = useState(false);
  const [strategy, setStrategy] = useState('');
  const [sessionId, setSessionId] = useState<string>('');

  // The drawer header places this screen below window Y=0. Keyboard coordinates
  // are window-based, so measure that offset instead of assuming a header height.
  const keyboardFrameRef = useRef<View>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const measureKeyboardOffset = React.useCallback(() => {
    keyboardFrameRef.current?.measureInWindow((_x, y) => {
      setKeyboardOffset(Math.max(0, y));
    });
  }, []);
  useFocusEffect(React.useCallback(() => {
    const frame = requestAnimationFrame(measureKeyboardOffset);
    return () => cancelAnimationFrame(frame);
  }, [measureKeyboardOffset]));

  const flatRef = useRef<FlatList<ChatMessageExt>>(null);
  const pendingIdRef = React.useRef<string | null>(null);
  const tutorialPreviewWasActive = React.useRef(false);

  React.useEffect(() => {
    const previewActive = tutorial.active && tutorial.activePage === 'pro';
    if (previewActive) {
      tutorialPreviewWasActive.current = true;
      return;
    }
    if (!tutorialPreviewWasActive.current) return;
    tutorialPreviewWasActive.current = false;
    getMe().then(me => {
      if (!canUseChat(me)) {
        navigation.navigate('ProHome');
      }
    }).catch(() => navigation.navigate('ProHome'));
  }, [navigation, tutorial.active, tutorial.activePage]);

  React.useEffect(() => {
    if (tutorial.active && tutorial.activePage === 'pro' && tutorial.activeFrame === 0) {
      navigation.navigate('LegacyStrategy');
    }
  }, [navigation, tutorial.active, tutorial.activeFrame, tutorial.activePage]);

  // AppState + retry bookkeeping
  const appStateRef = React.useRef<AppStateStatus>(AppState.currentState);
  const sendingRef = React.useRef<boolean>(false);

  // ---- IMPORTANT: per-attempt tracking to avoid "2nd switch alerts"
  const attemptSeqRef = React.useRef<number>(0);                 // increments every attempt
  const inFlightAttemptRef = React.useRef<number>(0);            // the latest attempt key
  const bgDuringAttemptRef = React.useRef<Record<number, boolean>>({}); // attemptKey -> backgrounded?

  // Keep the last request so we can retry it when coming back to foreground
  const pendingRequestRef = React.useRef<{
    payload: ChatPayloadItem[];
    sessionId: string;
    requestId: string;
  } | null>(null);

  // Keep sendingRef in sync (so AppState listener can read it without stale closures)
  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  // boot
  useEffect(() => {
    (async () => {
      const sid = await getSessionId();
      const hist = await loadHistory();
      const strat = await loadStrategy();

      setSessionId(sid);
      setMessages(hist as ChatMessageExt[]);
      setStrategy(strat);

      const ok = await healthcheck();
      if (!ok) {
        Alert.alert(
          t('backendUnreachable', 'Backend Unreachable'),
          t('checkApiBaseUrl', 'Check your connection'),
        );
      }

      // If no local history, clear server memory so "seen players" is empty
      if ((hist || []).length === 0) {
        try {
          await resetSession(sid);
        } catch {}
      }

    })();
  }, [t]);

  useEffect(() => {
    if (isScoutWiseTutorial && tutorial.scoutWiseStep === 'chatInput') {
      setInputText(t('tutorialChatSampleQuery', 'find me a center forward'));
    }
  }, [isScoutWiseTutorial, t, tutorial.scoutWiseStep]);

  // persist chat locally
  useEffect(() => {
    const id = setTimeout(() => {
      saveHistory(messages as ChatMessage[]);
    }, 1000); // 300–1000ms is fine

    return () => clearTimeout(id);
  }, [messages]);

  function append(msg: Omit<ChatMessageExt, 'id' | 'createdAt'> & { id?: string }) {
    const withMeta: ChatMessageExt = {
      id: msg.id || Math.random().toString(36).slice(2),
      createdAt: Date.now(),
      ...msg,
    };
    setMessages((m) => [...m, withMeta]);
    return withMeta.id;
  }

  function removePendingBubbleIfCurrentAttempt(attemptKey: number) {
    // Only the latest in-flight attempt is allowed to mutate the UI.
    if (attemptKey !== inFlightAttemptRef.current) return;

    const pendingId = pendingIdRef.current;
    if (pendingId) {
      // React may run this updater after the ref is cleared or reused.
      setMessages((m) => m.filter((x) => x.id !== pendingId));
      pendingIdRef.current = null;
    }
  }

  function clearAttemptFlags(attemptKey: number) {
    // best-effort cleanup to avoid unbounded growth
    const flags = bgDuringAttemptRef.current;
    delete flags[attemptKey];

    // also prune old ones sometimes
    const keys = Object.keys(flags).map((k) => Number(k)).sort((a, b) => a - b);
    if (keys.length > 10) {
      for (const k of keys.slice(0, keys.length - 10)) delete flags[k];
    }
  }

  async function performChatRequest(payload: ChatPayloadItem[], sid: string, attemptKey: number, requestId: string) {
    const currentStrategy = await loadStrategy();
    const res = await sendChat(payload, sid, currentStrategy, false, requestId);
    if (typeof res.freeChatMessagesRemaining === 'number') {
      setProfile(previous => previous ? { ...previous, freeChatMessagesRemaining: res.freeChatMessagesRemaining as number } : previous);
    }

    // If a newer attempt started while we were waiting, ignore this result completely.
    if (attemptKey !== inFlightAttemptRef.current) {
      clearAttemptFlags(attemptKey);
      return res;
    }

    // Success: clear retry state
    pendingRequestRef.current = null;

    // Remove pending bubble BEFORE appending real content
    removePendingBubbleIfCurrentAttempt(attemptKey);

    const players = Array.isArray(res?.data?.players) ? (res.data.players as PlayerData[]) : [];
    const visualPlayers =
      isScoutWiseTutorial && tutorial.scoutWiseStep === 'chatInput'
        ? players.map((player) => {
            const normalizedName = player.name.toLocaleLowerCase('en-US');
            if (!normalizedName.includes('gyokeres') && !normalizedName.includes('gyökeres')) {
              return player;
            }

            return {
              ...player,
              meta: {
                ...player.meta,
                potential: 82,
                form: 78,
              },
            };
          })
        : players;
    const narrative =
      isScoutWiseTutorial && tutorial.scoutWiseStep === 'chatInput'
        ? t('tutorialGyokeresInterpretation', TUTORIAL_GYOKERES_INTERPRETATION)
        : String(res?.response ?? '');

    // 1) Append the player card, pitch map, and metric visuals as dedicated history items.
    if (visualPlayers.length > 0) {
      append({ role: 'assistant', content: '', kind: 'visuals', visualKind: 'playerCard', players: visualPlayers });

      if (visualPlayers.some(hasPitchMapData)) {
        append({ role: 'assistant', content: '', kind: 'visuals', visualKind: 'pitchMap', players: visualPlayers });
      }

      append({ role: 'assistant', content: '', kind: 'visuals', visualKind: 'metrics', players: visualPlayers });
    }

    // 2) Keep the interpretation in one ScoutWise bubble with bullet lines.
    const formattedNarrative = formatScoutWiseNarrative(narrative.trim());
    if (formattedNarrative.trim()) {
      append({ role: 'assistant', content: formattedNarrative, kind: 'text' });
    }

    clearAttemptFlags(attemptKey);
    if (isScoutWiseTutorial && tutorial.scoutWiseStep === 'chatInput') {
      tutorial.setScoutWiseStep('chatResponse');
    }
    return res;
  }

  async function runAttempt(payload: ChatPayloadItem[], sid: string, requestId: string) {
    // Create a NEW attempt key for this network attempt
    const attemptKey = ++attemptSeqRef.current;
    inFlightAttemptRef.current = attemptKey;
    bgDuringAttemptRef.current[attemptKey] = false;

    sendingRef.current = true;
    setSending(true);

    try {
      await performChatRequest(payload, sid, attemptKey, requestId);
    } catch (err: any) {
      // If a newer attempt started, ignore this failure (don't alert, don't clean UI)
      if (attemptKey !== inFlightAttemptRef.current) {
        clearAttemptFlags(attemptKey);
        return;
      }

      const suppress = !!bgDuringAttemptRef.current[attemptKey];
      const activeNow = appStateRef.current === 'active';

      if (!suppress && activeNow) {
        // Real foreground error: remove pending + alert + clear retry state
        removePendingBubbleIfCurrentAttempt(attemptKey);
        pendingRequestRef.current = null;
        if (String(err?.message).includes('CHAT_TRIAL_EXHAUSTED')) {
          setProfile(previous => previous ? { ...previous, freeChatMessagesRemaining: 0 } : previous);
          setAccessModal('exhausted');
        } else if (String(err?.message).includes('CHAT_REQUEST_PENDING')) {
          // Keep the same request ID; retry explicitly without spending again.
          pendingRequestRef.current = { payload, sessionId: sid, requestId };
          Alert.alert(t('chatFailedTitle', 'Chat'), i18n.language.startsWith('tr') ? 'Mesajın hâlâ işleniyor. Biraz sonra tekrar dene.' : 'Your message is still processing. Try again shortly.', [
            { text: t('notNow', 'Not now') },
            { text: t('retry', 'Retry'), onPress: () => { if (!sendingRef.current) void runAttempt(payload, sid, requestId); } },
          ]);
        } else {
          // Failed or interrupted responses can be safely retried with the original ID.
          getMe().then(setProfile).catch(() => {});
          Alert.alert(t('chatFailedTitle', 'Chat failed'), String(err?.message || err), [
            { text: t('notNow', 'Not now') },
            { text: t('retry', 'Retry'), onPress: () => { if (!sendingRef.current) void runAttempt(payload, sid, requestId); } },
          ]);
        }
      } else {
        // Background/inactive (or backgrounded during attempt):
        // keep pending bubble + pendingRequestRef, so it retries on resume.
      }

      clearAttemptFlags(attemptKey);
    } finally {
      // Only the latest attempt is allowed to end "sending"
      if (attemptKey === inFlightAttemptRef.current) {
        sendingRef.current = false;
        setSending(false);
      }
    }
  }

  // AppState listener: mark backgrounding + retry on resume
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;

      // If we background while a request is in-flight, mark it for the CURRENT attempt key.
      if ((nextState === 'background' || nextState === 'inactive') && sendingRef.current) {
        const k = inFlightAttemptRef.current;
        if (k) bgDuringAttemptRef.current[k] = true;
      }

      // Retry pending chat when returning to active
      if (nextState === 'active' && pendingRequestRef.current && !sendingRef.current) {
        const req = pendingRequestRef.current;
        if (!req) return;

        // Start a brand-new attempt (new attemptKey)
        runAttempt(req.payload, req.sessionId, req.requestId);
      }
    });

    return () => sub.remove();
  }, []);

  async function send(text: string) {
    if (!text.trim() || sendingRef.current) return;
    if (tutorial.active) {
      Keyboard.dismiss();
      setAccessModal('tutorial');
      return;
    }
    sendingRef.current = true;
    let currentProfile: Profile;
    try {
      currentProfile = await getMe();
      setProfile(currentProfile);
    } catch (error) {
      sendingRef.current = false;
      Alert.alert(t('chatFailedTitle', 'Chat failed'), String(error));
      return;
    }
    if (!canUseChat(currentProfile)) {
      sendingRef.current = false;
      Keyboard.dismiss();
      setAccessModal('exhausted');
      return;
    }

    // 1) Append the user's message
    setInputText('');
    const userMsg: Omit<ChatMessageExt, 'id' | 'createdAt'> = {
      role: 'user',
      content: text.trim(),
      kind: 'text',
    };
    append(userMsg);

    // 2) Add a temporary assistant bubble (pending)
    const pendingId = append({
      role: 'assistant',
      content: '',
      kind: 'text',
      pending: true,
      id: 'pending-' + Math.random().toString(36).slice(2),
    });
    pendingIdRef.current = pendingId;

    // 3) Build payload (text-only)
    const textOnly = messages
      .filter((m) => (m.kind ?? 'text') === 'text')
      .concat({ ...userMsg, id: 'temp', createdAt: Date.now() });

    // IMPORTANT: enforce payload role type to avoid Role including "system"
    const payload: ChatPayloadItem[] = textOnly
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as ChatPayloadRole, content: m.content }));

    // Save for retry if background kills the request
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    pendingRequestRef.current = { payload, sessionId, requestId };

    // Start attempt
    void runAttempt(payload, sessionId, requestId);
  }

  // Fresh conversation: clears server memory + local state (user action)
  async function startNewChat() {
    try {
      await resetSession(sessionId);
    } catch {}
    setMessages([]);
    pendingRequestRef.current = null;
    pendingIdRef.current = null;

    // reset attempt tracking
    attemptSeqRef.current = 0;
    inFlightAttemptRef.current = 0;
    bgDuringAttemptRef.current = {};

    setSending(false);
  }

  const empty = messages.length === 0;

  // Renders either a message bubble or a persisted visuals block
  const renderItem = React.useCallback(({ item }: { item: ChatMessageExt }) => {
    if (item.kind === 'visuals' && item.players?.length) {
      return <ChatVisualsBlock players={item.players} visualKind={item.visualKind} />;
    }

    return (
      <MessageBubble
        role={item.role === 'user' ? 'user' : 'assistant'}
        content={item.content}
        createdAt={item.createdAt}
        pending={item.pending}
      />
    );
  }, []);

  return (
    <View
      ref={keyboardFrameRef}
      style={styles.wrap}
      collapsable={false}
      onLayout={measureKeyboardOffset}
    >
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardOffset}
    >
      <View style={{ flex: 1 }}>
        <Header />

        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={startNewChat}
            disabled={sending}
            style={styles.newChatBtn}
            accessibilityRole="button"
            accessibilityLabel={t('newChat', 'New Chat')}
          >
            <Text style={styles.newChatText}>{t('newChat', 'New Chat')}</Text>
          </TouchableOpacity>

          {!tutorial.active && profile?.plan === 'Free' && (
            <View style={styles.creditSlot}>
              <View style={styles.creditBadge}>
                <Text accessibilityLiveRegion="polite" style={styles.creditText} numberOfLines={1} maxFontSizeMultiplier={1.3}>
                  <Text style={styles.creditCount}>{profile.freeChatMessagesRemaining ?? 0}</Text>
                  {(profile.freeChatMessagesRemaining ?? 0) === 1 ? ' credit' : ' credits'}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={() => navigation.navigate('LegacyStrategy')}
            disabled={isScoutWiseTutorial}
            style={[styles.strategyBtn, isScoutWiseTutorial && styles.toolbarBtnDisabled]}
            accessibilityRole="button"
            accessibilityState={{ disabled: isScoutWiseTutorial }}
            accessibilityLabel={t('tabStrategy', 'Strategy')}
          >
            <Text style={styles.strategyBtnText}>{t('tabStrategy', 'Strategy')}</Text>
          </TouchableOpacity>
        </View>

        <ChatAccessModal visible={accessModal !== null} tutorial={accessModal === 'tutorial'} onClose={() => setAccessModal(null)} onAction={() => {
          const preview = accessModal === 'tutorial';
          setAccessModal(null);
          if (preview) { tutorial.completeTutorial(); navigation.navigate('ProHome'); }
          else { navigation.getParent()?.navigate('Profile', { screen: 'ManagePlan' }); }
        }} />
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={<View style={styles.tutorialGuide}><TutorialPageGuide page="pro" frame={1} onShow={() => flatRef.current?.scrollToOffset({ offset: 0, animated: true })} /></View>}
          ListEmptyComponent={<WelcomeCard />}
          contentContainerStyle={
            empty
              ? { paddingTop: 12, paddingBottom: 24, gap: 8, flexGrow: 1 }
              : { paddingVertical: 8, paddingBottom: 24, flexGrow: 1 }
          }
          style={{ flex: 1 }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentInset={{ bottom: 140 }}
          scrollIndicatorInsets={{ bottom: 140 }}
          initialNumToRender={10}
          maxToRenderPerBatch={6}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          scrollEventThrottle={16}
        />

        <View style={styles.visualCardWidth}>
          <TutorialHint
            visible={isScoutWiseTutorial && tutorial.scoutWiseStep === 'chatResponse'}
            title={t('tutorialChatResponseTitle', 'Review the response')}
            body={t(
              'tutorialChatResponseBody',
              'Scroll through the player card, charts, and interpretation.',
            )}
            actionLabel={t('tutorialEndTutorial', 'End tutorial')}
            onAction={() => {
              tutorial.completeTutorial();
              navigation.navigate('Strategy');
            }}
            onSkipAll={() => {
              tutorial.skipTutorial();
              navigation.navigate('Strategy');
            }}
            arrow="down"
          />
        </View>

        <ChatInput
          value={inputText}
          onChangeText={setInputText}
          onSend={send}
          disabled={sending || (isScoutWiseTutorial && tutorial.scoutWiseStep === 'chatResponse')}
          tutorialActive={
            isScoutWiseTutorial &&
            (tutorial.scoutWiseStep === 'chatInput' || tutorial.scoutWiseStep === 'chatResponse')
          }
          tutorialVisible={isScoutWiseTutorial && tutorial.scoutWiseStep === 'chatInput'}
          onTutorialSkipAll={() => {
            tutorial.skipTutorial();
            navigation.navigate('Strategy');
          }}
        />
      </View>
    </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: BG },
  toolbar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  creditSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  creditBadge: {
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(36,245,166,0.24)',
    backgroundColor: 'rgba(36,245,166,0.09)',
  },
  creditText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  creditCount: {
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  visualCardWidth: {
    marginHorizontal: 12,
  },
  tutorialGuide: { marginHorizontal: 12, marginBottom: 8 },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'transparent',
  },
  newChatText: {
    color: ACCENT,
    fontWeight: '500',
    fontSize: 14,
  },
  strategyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'transparent',
  },
  toolbarBtnDisabled: { opacity: 0.45 },
  strategyBtnText: {
    color: ACCENT,
    fontWeight: '500',
    fontSize: 14,
  },
});
