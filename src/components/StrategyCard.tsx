import * as React from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { ACCENT, BG, MUTED, PANEL, shadows } from '@/theme';
import { loadStrategy, saveStrategy } from '@/storage';

interface Props { onSaved?: (value: string) => void }
const { useState, useEffect } = React;

export default function StrategyCard({ onSaved }: Props) {
    const [text, setText] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
    (async () => { setText(await loadStrategy()); })();
    }, []);

    async function handleSave() {
        await saveStrategy(text.trim());
        setSaved(true);
        onSaved?.(text.trim());
        setTimeout(() => setSaved(false), 1500);
    }

    return (
        <View style={[styles.card, shadows.card]}>
            <Text style={styles.title}>Team Strategy / Scouting Philosophy (optional)</Text>
            <Text style={styles.hint}>
                Add principles, roster notes, playstyle, constraints, or scouting goals. The assistant will use it as context.
            </Text>
            <TextInput
                style={styles.input}
                placeholder="e.g. High press, verticality, prioritize left flank; cap minutes for U21; favor 4-3-3"
                placeholderTextColor={MUTED}
                value={text}
                onChangeText={setText}
                multiline
            />
            <Pressable onPress={handleSave} style={({ pressed }) => [styles.btn, { opacity: pressed ? 0.9 : 1 }] }>
                <Text style={styles.btnText}>{saved ? 'Saved' : 'Save Strategy'}</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: { backgroundColor: PANEL, borderRadius: 16, padding: 16, margin: 16 },
    title: { color: 'white', fontSize: 16, fontWeight: '700' },
    hint: { color: MUTED, marginTop: 4, marginBottom: 12 },
    input: {
        color: 'white',
        borderColor: '#2a2a2c',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        minHeight: 90,
        backgroundColor: BG,
    },
    btn: {
        marginTop: 12,
        backgroundColor: ACCENT,
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    btnText: { color: 'white', fontWeight: '700' },
});