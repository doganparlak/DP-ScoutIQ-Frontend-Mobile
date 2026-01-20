// src/screens/ChatScreen.tsx
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
  InteractionManager,
} from 'react-native';
import Header from '@/components/Header';
import ChatInput from '@/components/ChatInput';
import MessageBubble from '@/components/MessageBubble';
import WelcomeCard from '@/components/WelcomeCard';
import ChatVisualsBlock from '@/components/ChatVisualsBlock';

import { healthcheck, sendChat, resetSession, getMe } from '@/services/api';
import { incrementChatQueryCount, shouldShowFullscreenAd } from '@/ads/adGating';
import { showInterstitialSafely, setInterstitialFailureHandler } from '@/ads/interstitial';
import { ACCENT, BG } from '@/theme';
import { ProNotReadyScreen } from '@/ads/pro';
import { getSessionId, loadHistory, saveHistory, loadStrategy } from '@/storage';
import type { ChatMessage, PlayerData } from '@/types';
import { useTranslation } from 'react-i18next';


const { useState, useEffect, useRef } = React;

// Extend ChatMessage locally to support "visuals" items that carry players
type ChatMessageExt = ChatMessage & {
  kind?: 'text' | 'visuals';
  players?: PlayerData[];
  pending?: boolean;
};

// Only the roles your backend endpoint expects from the chat payload
type ChatPayloadRole = 'user' | 'assistant';
type ChatPayloadItem = { role: ChatPayloadRole; content: string };

export default function ChatScreen() {
  const { t } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<ChatMessageExt[]>([]);
  const [sending, setSending] = useState(false);
  const [strategy, setStrategy] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [plan, setPlan] = useState<'Free' | 'Pro'>('Free');

  const flatRef = useRef<FlatList<ChatMessageExt>>(null);
  const pendingIdRef = React.useRef<string | null>(null);

  // Ads not ready / Pro upsell
  const [proUpsellOpen, setProUpsellOpen] = useState(false);
  const pendingSendRef = useRef<string | null>(null);

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
  } | null>(null);

  useEffect(() => {
    if (proUpsellOpen) return;

    const pendingText = pendingSendRef.current;
    if (!pendingText) return;

    pendingSendRef.current = null;

    // Wait for modal dismiss animation to finish
    InteractionManager.runAfterInteractions(() => {
      send(pendingText);
    });
  }, [proUpsellOpen]);


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

      // Get user plan once (ads only for Free)
      try {
        const me = await getMe();
        setPlan(me.plan === 'Pro' ? 'Pro' : 'Free');
      } catch {
        setPlan('Free');
      }
    })();
  }, [t]);

  useEffect(() => {
    setInterstitialFailureHandler(() => setProUpsellOpen(true));
    return () => setInterstitialFailureHandler(null);
  }, []);


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

    if (pendingIdRef.current) {
      setMessages((m) => m.filter((x) => x.id !== pendingIdRef.current));
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

  async function performChatRequest(payload: ChatPayloadItem[], sid: string, attemptKey: number) {
    const currentStrategy = await loadStrategy();
    const res = await sendChat(payload, sid, currentStrategy);

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
    const narrative = String(res?.response ?? '');

    // 1) Append visuals as a dedicated history item (persists forever)
    if (players.length > 0) {
      append({ role: 'assistant', content: '', kind: 'visuals', players });
    }

    // 2) Append the interpretation as a normal assistant bubble
    if (narrative.trim()) {
      append({ role: 'assistant', content: narrative.trim(), kind: 'text' });
    }

    clearAttemptFlags(attemptKey);
    return res;
  }

  async function runAttempt(payload: ChatPayloadItem[], sid: string) {
    // Create a NEW attempt key for this network attempt
    const attemptKey = ++attemptSeqRef.current;
    inFlightAttemptRef.current = attemptKey;
    bgDuringAttemptRef.current[attemptKey] = false;

    setSending(true);

    try {
      await performChatRequest(payload, sid, attemptKey);
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
        Alert.alert(t('chatFailedTitle', 'Chat failed'), String(err?.message || err));
      } else {
        // Background/inactive (or backgrounded during attempt):
        // keep pending bubble + pendingRequestRef, so it retries on resume.
      }

      clearAttemptFlags(attemptKey);
    } finally {
      // Only the latest attempt is allowed to end "sending"
      if (attemptKey === inFlightAttemptRef.current) {
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
        runAttempt(req.payload, req.sessionId);
      }
    });

    return () => sub.remove();
  }, []);

  async function send(text: string) {
    if (!text.trim()) return;

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

    // 3) Ad gating (NON-BLOCKING)
    ///** 
     
    try {
      const nextCount = await incrementChatQueryCount();

      if (!sending && plan === 'Free' && shouldShowFullscreenAd(nextCount)) {
        const ok = showInterstitialSafely();
        if (!ok) {
          setProUpsellOpen(true);
        }
      }
    } catch (e) {setProUpsellOpen(true);}
    //*/
    // 4) Build payload (text-only)
    const textOnly = messages
      .filter((m) => (m.kind ?? 'text') === 'text')
      .concat({ ...userMsg, id: 'temp', createdAt: Date.now() });

    // IMPORTANT: enforce payload role type to avoid Role including "system"
    const payload: ChatPayloadItem[] = textOnly
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as ChatPayloadRole, content: m.content }));

    // Save for retry if background kills the request
    pendingRequestRef.current = { payload, sessionId };

    // Start attempt
    runAttempt(payload, sessionId);
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
      return <ChatVisualsBlock players={item.players} />;
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
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={0}
    >
      <View style={{ flex: 1 }}>
        <Header />

        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={startNewChat}
            style={styles.newChatBtn}
            accessibilityRole="button"
            accessibilityLabel={t('newChat', 'New Chat')}
          >
            <Text style={styles.newChatText}>{t('newChat', 'New Chat')}</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<WelcomeCard />}
          contentContainerStyle={
            empty
              ? { paddingTop: 12, paddingBottom: 24, gap: 8, flexGrow: 1 }
              : { paddingVertical: 8, paddingBottom: 24, flexGrow: 1 }
          }
          style={{ flex: 1 }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'none'}
          contentInset={{ bottom: 140 }}
          scrollIndicatorInsets={{ bottom: 140 }}
          initialNumToRender={10}
          maxToRenderPerBatch={6}
          windowSize={7}
          updateCellsBatchingPeriod={50}
          scrollEventThrottle={16}
        />

        <ChatInput value={inputText} onChangeText={setInputText} onSend={send} disabled={sending} />
        <ProNotReadyScreen
          visible={proUpsellOpen}
          onClose={() => setProUpsellOpen(false)}
        />       
      </View>
    </KeyboardAvoidingView>
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
  },
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
});
