import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrainCog } from 'lucide-react-native';
import { ACCENT, BG, MUTED, TEXT, LINE } from '@/theme';
import { useTranslation } from 'react-i18next';

export default function Header() {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap} accessible accessibilityRole="header" accessibilityLabel={t('appName', 'ScoutIQ')}>
      {/* Logo row */}
      <View style={styles.logoRow}>
        <BrainCog size={22} color={ACCENT} />
        <Text style={styles.title}>
          <Text style={styles.main}>SCOUT</Text>
          <Text style={styles.accent}>IQ</Text>
        </Text>
      </View>

      {/* Divider line */}
      <View style={styles.divider} />

      {/* Subtitle (localized) */}
      <Text style={styles.subtitle}>
        {t('tagline', 'AI-Powered Scouting & Recruitment Intelligence')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: BG,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: TEXT,
  },
  subtitle: {
    color: ACCENT,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  divider: {
    width: '70%',
    height: 1,
    backgroundColor: LINE,
    marginVertical: 10,
  },
  dim:   { color: TEXT, opacity: 0.9 },
  main:  { color: TEXT, opacity: 0.9 },
  accent:{ color: ACCENT },
});
