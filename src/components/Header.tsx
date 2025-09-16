import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ACCENT, BG, MUTED } from '@/theme';

export default function Header() {
return (
    <View style={styles.wrap}>
        <Text style={styles.title}>Scout.Chat</Text>
        <Text style={styles.subtitle}>Strategy + AI Assistant</Text>
    </View>
    );
}

const styles = StyleSheet.create({
wrap: { backgroundColor: BG, paddingTop: 50, paddingBottom: 16, paddingHorizontal: 16 },
title: { color: 'white', fontSize: 20, fontWeight: '700' },
subtitle: { color: MUTED, marginTop: 4 },
});