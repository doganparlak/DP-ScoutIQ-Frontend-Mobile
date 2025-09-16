import * as React from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { ACCENT, BG, PANEL, MUTED } from '@/theme';

const { useState} = React;
export default function ChatInput({ onSend, disabled }: { onSend: (text: string) => void, disabled?: boolean }) {
const [text, setText] = useState('');
const canSend = text.trim().length > 0 && !disabled;

function handleSend() {
    if (!canSend) return;
        onSend(text.trim());
        setText('');
    }

    return (
        <View style={styles.wrap}>
            <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Type your message…"
                placeholderTextColor={MUTED}
                style={styles.input}
                multiline
            />
            <Pressable onPress={handleSend} disabled={!canSend} style={({ pressed }) => [styles.btn, { opacity: canSend ? (pressed ? 0.9 : 1) : 0.5 }]}>
                <Text style={styles.btnText}>Send</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, backgroundColor: BG, borderTopColor: '#1e1e20', borderTopWidth: 1 },
    input: { flex: 1, color: 'white', backgroundColor: PANEL, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 130 },
    btn: { backgroundColor: ACCENT, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
    btnText: { color: 'white', fontWeight: '700' },
});