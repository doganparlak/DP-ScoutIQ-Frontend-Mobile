import * as React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ACCENT, BG, TEXT, LINE } from '@/theme';
import { useTranslation } from 'react-i18next';

const scoutwiseLogo = require('../../assets/scoutwise_logo.png');

type HeaderProps = {
  subtitle?: string;
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
  lineColor?: string;
};

export default function Header({
  subtitle,
  backgroundColor = BG,
  textColor = TEXT,
  accentColor = ACCENT,
  lineColor = LINE,
}: HeaderProps) {
  const { t } = useTranslation();

  return (
    <View
      style={[styles.wrap, { backgroundColor }]}
      accessible
      accessibilityRole="header"
      accessibilityLabel={t('appName', 'ScoutWise')}
    >
      {/* Logo row */}
      <View style={styles.logoRow}>

        <Image
          source={scoutwiseLogo}
          style={styles.logoIcon}
          resizeMode="contain"
          accessible
          accessibilityRole="image"
          accessibilityLabel={t('appName', 'ScoutWise')}
        />

        <Text style={styles.title}>
          <Text style={[styles.main, { color: textColor }]}>SCOUT</Text>
          <Text style={[styles.accent, { color: accentColor }]}>WISE</Text>
        </Text>
        
      </View>

      {/* Divider line */}
      <View style={[styles.divider, { backgroundColor: lineColor }]} />

      {/* Subtitle (localized) */}
      <Text style={[styles.subtitle, { color: accentColor }]}>
        {subtitle ?? t('tagline', 'AI-Powered Scouting & Recruitment Intelligence')}
      </Text>
    </View>
  );
}

const ICON_SIZE = 30;

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

  // EXACT same dimensions as <BrainCog size={22} />
  logoIcon: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },

  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: TEXT,
  },
  subtitle: {
    color: ACCENT,
    marginTop: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  divider: {
    width: '70%',
    height: 1,
    backgroundColor: LINE,
    marginVertical: 10,
  },
  main: { color: TEXT, opacity: 0.9 },
  accent: { color: ACCENT },
});
