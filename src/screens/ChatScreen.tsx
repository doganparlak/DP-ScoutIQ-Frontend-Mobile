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
} from 'react-native';
import Header from '@/components/Header';
import ChatInput from '@/components/ChatInput';
import MessageBubble from '@/components/MessageBubble';
import WelcomeCard from '@/components/WelcomeCard';
import ChatVisualsBlock from '@/components/ChatVisualsBlock';

import {
  healthcheck,
  sendChat,
  resetSession,
  getMe,
} from '@/services/api';

import { incrementChatQueryCount, shouldShowFullscreenAd } from '@/ads/adGating';
import { showInterstitialSafely } from '@/ads/interstitial';

import { ACCENT, BG } from '@/theme';
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
    setMessages(m => [...m, withMeta]);
    return withMeta.id;
  }

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
    try {
      const nextCount = await incrementChatQueryCount();
      if (!sending && plan === 'Free' && shouldShowFullscreenAd(nextCount)) {
        showInterstitialSafely();
      }
    } catch (e) {
    }

    // 4) Build payload
    const textOnly = messages
      .filter(m => (m.kind ?? 'text') === 'text')
      .concat({ ...userMsg, id: 'temp', createdAt: Date.now() });

    const payload = textOnly.map(m => ({ role: m.role, content: m.content }));

    try {
      setSending(true);
      const currentStrategy = await loadStrategy();
      const res = await sendChat(payload, sessionId, currentStrategy);

      // Remove pending bubble BEFORE appending real content
      if (pendingIdRef.current) {
        setMessages(m => m.filter(x => x.id !== pendingIdRef.current));
        pendingIdRef.current = null;
      }

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
    } catch (err: any) {
      // Remove pending on error too
      if (pendingIdRef.current) {
        setMessages(m => m.filter(x => x.id !== pendingIdRef.current));
        pendingIdRef.current = null;
      }
      Alert.alert(t('chatFailedTitle', 'Chat failed'), String(err?.message || err));
    } finally {
      setSending(false);
    }
  }

  // Fresh conversation: clears server memory + local state (user action)
  async function startNewChat() {
    try {
      await resetSession(sessionId);
    } catch {}
    setMessages([]);
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

      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={send}
        disabled={sending}
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
