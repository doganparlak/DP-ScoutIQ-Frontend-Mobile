// src/screens/ChatScreen.tsx
import * as React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
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
import PlayerCard from '@/components/PlayerCard';
import SpiderChart from '@/components/SpiderChart';
import { addFavoritePlayer, healthcheck, sendChat, resetSession } from '@/services/api';
import { GK_METRICS, IN_POS_METRICS, OUT_POS_METRICS, toSpiderPoints } from '@/components/spiderRanges';
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

  const flatRef = useRef<FlatList<ChatMessageExt>>(null);

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
      if (!ok) Alert.alert(t('backendUnreachable', 'Backend Unreachable'), t('checkApiBaseUrl', 'Check your connection'));

      // If no local history, clear server memory so "seen players" is empty
      if ((hist || []).length === 0) {
        try { await resetSession(sid); } catch {}
      }
    })();
  }, [t]);

  // persist chat locally
  useEffect(() => { saveHistory(messages as ChatMessage[]); }, [messages]);

  const pendingIdRef = React.useRef<string | null>(null);

  function append(msg: Omit<ChatMessageExt, 'id' | 'createdAt'> & { id?: string }) {
    const id = msg.id || Math.random().toString(36).slice(2);
    const withMeta: ChatMessageExt = {
      id: Math.random().toString(36).slice(2),
      createdAt: Date.now(),
      ...msg,
    };
    setMessages(m => [...m, withMeta]);
    return id;
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

    // 3) Build payload
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
    try { await resetSession(sessionId); } catch (e) { console.warn('resetSession failed', e); }
    setMessages([]);
  }

  const empty = messages.length === 0;

  // Renders either a message bubble or a persisted visuals block
  function renderItem({ item }: { item: ChatMessageExt }) {
    if (item.kind === 'visuals' && item.players && item.players.length > 0) {
      return (
        <View style={{ paddingHorizontal: 12, marginBottom: 12, gap: 10 }}>
          {item.players.map(p => {
            const gk = toSpiderPoints(p.stats, GK_METRICS);
            const inpos = toSpiderPoints(p.stats, IN_POS_METRICS);
            const outpos = toSpiderPoints(p.stats, OUT_POS_METRICS);
            const hasAny = gk.length || inpos.length || outpos.length;

            return (
              <View key={p.name} style={{ gap: 10 }}>
                <PlayerCard
                  player={p}
                  onAddFavorite={async (player) => {
                    try {
                      await addFavoritePlayer({
                        name: player.name,
                        nationality: player.meta?.nationality,
                        age: typeof player.meta?.age === 'number' ? player.meta.age : undefined,
                        potential: typeof player.meta?.potential === 'number' ? Math.round(player.meta.potential) : undefined,
                        roles: player.meta?.roles ?? [], // short codes; API converts to LONG
                      });
                      return true;   // keep the button disabled (✓)
                    } catch (e: any) {
                      Alert.alert(t('addFavoriteFailed', 'Add failed'), String(e?.message || e));
                      return false;  // let PlayerCard re-enable the button
                    }
                  }}
                />
                {hasAny && (
                  <View style={{ gap: 10 }}>
                    {gk.length > 0 && <SpiderChart title={t('chartGK', 'Goalkeeper')} points={gk} />}
                    {inpos.length > 0 && <SpiderChart title={t('chartInPos', 'In Possession')} points={inpos} />}
                    {outpos.length > 0 && <SpiderChart title={t('chartOutPos', 'Out of Possession')} points={outpos} />}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      );
    }

    // default: text bubble
    return (
      <MessageBubble
        role={item.role === 'user' ? 'user' : 'assistant'}
        content={item.content}
        createdAt={item.createdAt}
        pending={item.pending}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
      keyboardVerticalOffset={Platform.select({ ios: 60, android: 0 })}
    >
      <Header />

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity onPress={startNewChat} style={styles.newChatBtn} accessibilityRole="button" accessibilityLabel={t('newChat', 'New Chat')}>
          <Text style={styles.newChatText}>{t('newChat', 'New Chat')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<WelcomeCard />}
        contentContainerStyle={
          empty
            ? { paddingTop: 12, paddingBottom: 220, gap: 8, flexGrow: 1 }
            : { paddingVertical: 8, paddingBottom: 220, flexGrow: 1 }
        }
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1 }}
        contentInset={{ bottom: 140 }}
        scrollIndicatorInsets={{ bottom: 140 }}
      />

      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={send}
        disabled={sending}
      />
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
