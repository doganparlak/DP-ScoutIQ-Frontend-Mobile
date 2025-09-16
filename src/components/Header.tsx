import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrainCog } from 'lucide-react-native'; // 👈 brain-like icon
import { ACCENT, BG, MUTED } from '@/theme';

export default function Header() {
  return (
    <View style={styles.wrap}>
      <View style={styles.logoRow}>
        <BrainCog size={20} color="red" style={{ marginTop: 10 }} />
        <Text style={styles.title}>DP-ScoutIQ</Text>
      </View>
      <Text style={styles.subtitle}>AI-Powered Scouting & Recruitment Intelligence</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: BG,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',            // ⬅️ center everything
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginTop: 10
  },
  subtitle: {
    color: MUTED,
    marginTop: 5,
    textAlign: 'center',
  },
});