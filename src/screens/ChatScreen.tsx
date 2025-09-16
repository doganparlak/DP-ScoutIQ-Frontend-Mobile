import * as React from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import Header from '@/components/Header';
import ChatInput from '@/components/ChatInput';
import MessageBubble from '@/components/MessageBubble';
import { BG } from '@/theme';
import { chatOnce, chatStream, healthcheck } from '@/services/api';
import { loadHistory, saveHistory, loadStrategy } from '@/storage';
import type { ChatMessage } from '@/types';

const { useState, useEffect, useRef } = React;
export default function ChatScreen() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [sending, setSending] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const flatRef = useRef<FlatList<ChatMessage>>(null);
    const [strategy, setStrategy] = useState('');

    useEffect(() => {
        (async () => {
            const ok = await healthcheck();
            if (!ok) Alert.alert('Backend Unreachable', 'Check API_BASE_URL in src/config.ts');
            setMessages(await loadHistory());
            setStrategy(await loadStrategy());
        })();
    }, []);

    useEffect(() => { saveHistory(messages); }, [messages]);

    function append(msg: Omit<ChatMessage, 'id'|'createdAt'>) {
        const withMeta: ChatMessage = { id: Math.random().toString(36).slice(2), createdAt: Date.now(), ...msg };
        setMessages((m) => [...m, withMeta]);
        requestAnimationFrame(() => flatRef.current?.scrollToEnd({ animated: true }));
    }

    async function send(text: string) {
        const userMsg: Omit<ChatMessage, 'id'|'createdAt'> = { role: 'user', content: text };
        append(userMsg);

        const payload = messages
            .concat({ ...userMsg, id: 'temp', createdAt: Date.now() })
            .map((m) => ({ role: m.role, content: m.content }));

        // Try streaming first; fallback to one-shot JSON
        try {
            setStreaming(true);
            let acc = '';
            append({ role: 'assistant', content: '' });
            const idx = messages.length + 1; // position of assistant placeholder

            await chatStream(payload, (tok) => {
                acc += tok;
                setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, content: acc } : m)));
          }, strategy);
            setStreaming(false);
          } catch (e) {
            setStreaming(false);
            try {
                setSending(true);
                const res = await chatOnce(payload, strategy);
                append({ role: 'assistant', content: res.message });
            } catch (err: any) {
                Alert.alert('Chat failed', String(err?.message || err));
            } finally {
                setSending(false);
            }
        }
    }


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
            contentContainerStyle={{ paddingVertical: 8 }}
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
        />
        {(sending || streaming) && <ActivityIndicator style={{ padding: 8 }} />}
        <ChatInput onSend={send} disabled={sending || streaming} />
    </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: BG },
});