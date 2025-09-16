import * as React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import Header from '@/components/Header';
import ChatInput from '@/components/ChatInput';
import MessageBubble from '@/components/MessageBubble';
import WelcomeCard from '@/components/WelcomeCard';   // <-- add
import { BG } from '@/theme';
import { healthcheck, sendChat } from '@/services/api';
import { getSessionId, loadHistory, saveHistory, loadStrategy } from '@/storage';
import type { ChatMessage } from '@/types';

const { useState, useEffect, useRef } = React;

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const flatRef = useRef<FlatList<ChatMessage>>(null);
  const [strategy, setStrategy] = useState('');
  const [sessionId, setSessionId] = useState<string>('');

  useEffect(() => {
    (async () => {
      setSessionId(await getSessionId());
      setMessages(await loadHistory());
      setStrategy(await loadStrategy());
      const ok = await healthcheck();
      if (!ok) Alert.alert('Backend Unreachable', 'Check API_BASE_URL in src/config.ts');
    })();
  }, []);

  useEffect(() => { saveHistory(messages); }, [messages]);

  function append(msg: Omit<ChatMessage, 'id'|'createdAt'>) {
    const withMeta: ChatMessage = { id: Math.random().toString(36).slice(2), createdAt: Date.now(), ...msg };
    setMessages((m) => [...m, withMeta]);
    requestAnimationFrame(() => flatRef.current?.scrollToEnd({ animated: true }));
  }

  async function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Omit<ChatMessage, 'id'|'createdAt'> = { role: 'user', content: text.trim() };
    append(userMsg);

    const payload = messages
      .concat({ ...userMsg, id: 'temp', createdAt: Date.now() })
      .map((m) => ({ role: m.role, content: m.content }));

    try {
      setSending(true);
      const res = await sendChat(payload, sessionId, strategy);
      append({ role: 'assistant', content: String(res.response ?? '') });
    } catch (err: any) {
      Alert.alert('Chat failed', String(err?.message || err));
    } finally {
      setSending(false);
    }
  }

  const empty = messages.length === 0;

  return (
    <View style={styles.wrap}>
      <Header />
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble role={item.role === 'user' ? 'user' : 'assistant'} content={item.content} createdAt={item.createdAt} />
        )}
        ListEmptyComponent={<WelcomeCard />}          // <-- shows until first message
        contentContainerStyle={empty ? { paddingTop: 12, paddingBottom: 6, gap: 8 } : { paddingVertical: 8, paddingBottom: 6 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        keyboardShouldPersistTaps="handled"
      />
      {sending && <ActivityIndicator style={{ paddingVertical: 4 }} />}
      <ChatInput onSend={send} disabled={sending} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: BG },
});
