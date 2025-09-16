import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACCENT, PANEL, BG, MUTED } from '@/theme';
import dayjs from 'dayjs';

export default function MessageBubble({ role, content, createdAt }: { role: 'user'|'assistant', content: string, createdAt: number }) {
    const isUser = role === 'user';
    return (
        <View style={[styles.row, isUser ? styles.rowEnd : styles.rowStart]}>
            <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
                <Text style={styles.text}>{content}</Text>
                <Text style={styles.time}>{dayjs(createdAt).format('HH:mm')}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    row: { paddingHorizontal: 12, marginVertical: 6, flexDirection: 'row' },
    rowEnd: { justifyContent: 'flex-end' },
    rowStart: { justifyContent: 'flex-start' },
    bubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
    user: { backgroundColor: ACCENT, borderTopRightRadius: 4 },
    assistant: { backgroundColor: PANEL, borderTopLeftRadius: 4 },
    text: { color: 'white', fontSize: 15 },
    time: { color: MUTED, fontSize: 11, marginTop: 6, alignSelf: 'flex-end' },
});