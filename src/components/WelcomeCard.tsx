import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SlidersHorizontal, Users, Database, Compass, User, BarChart3} from 'lucide-react-native';
import { ACCENT, PANEL, MUTED } from '@/theme';

function Row({
  Icon,
  text,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <Icon size={18} color={ACCENT} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

export default function WelcomeCard() {
  return (
    <View style={styles.card}>
      <View style={{ height: 8 }} />
      <Row Icon={Users} text="Find and compare players based on your needs." />
      <Row Icon={Database} text="Get instant, data-based answers." />
      <Row Icon={Compass} text="Adapt recommendations to your team’s identity and plans." />
      <Row Icon={SlidersHorizontal} text="Filter by age, nationality, role, stats, or tactical fit." />
      <Row Icon={BarChart3} text="Visualize key stats with charts, comparisons, and summaries." />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2c',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginHorizontal: 16,
  },
  titleRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  title: {
    color: ACCENT,
    fontSize: 18,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 9,
  },
  rowText: {
    color: MUTED,
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
  },
});
