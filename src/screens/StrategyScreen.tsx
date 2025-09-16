import * as React from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable } from 'react-native';
import Header from '@/components/Header';
import StrategyCard from '@/components/StrategyCard';
import { BG, ACCENT, MUTED } from '@/theme';

export default function StrategyScreen({ navigation }: any) {
    return (
    <View style={styles.wrap}>
        <Header />
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <StrategyCard />
            <View style={{ paddingHorizontal: 16 }}>
                <Pressable style={({ pressed }) => [{ backgroundColor: ACCENT, borderRadius: 12, padding: 14, opacity: pressed ? 0.9 : 1 }]}
                            onPress={() => navigation.navigate('Chat')}>
                    <Text style={{ color: 'white', fontWeight: '700', textAlign: 'center' }}>Start Chatting</Text>
                </Pressable>
                <Text style={{ color: MUTED, marginTop: 8, textAlign: 'center' }}>
                You can update your strategy anytime.
                </Text>
            </View>
        </ScrollView>
    </View>
    );
}

const styles = StyleSheet.create({
    wrap: { flex: 1, backgroundColor: BG },
});