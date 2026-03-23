import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { TEXT, MUTED } from '@/theme';

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.bulletRow}>
      <Text style={styles.bullet}>{'\u2022  '}</Text>
      <Text style={styles.text}>{children}</Text>
    </Text>
  );
}

export default function DataUsage() {
  const { t } = useTranslation();

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      <Text style={styles.sectionTitle}>{t('dataUsageSection2Title')}</Text>
      <Text style={styles.text}>{t('dataUsageSection2Intro')}</Text>
      <Bullet>{t('dataUsageSection2Item1')}</Bullet>
      <Bullet>{t('dataUsageSection2Item2')}</Bullet>
      <Bullet>{t('dataUsageSection2Item3')}</Bullet>

      <Text style={styles.sectionTitle}>{t('dataUsageSection3Title')}</Text>
      <Text style={styles.text}>{t('dataUsageSection3Body')}</Text>

      <Text style={styles.sectionTitle}>{t('dataUsageSection8Title')}</Text>
      <Bullet>{t('dataUsageSection8Item1')}</Bullet>
      <Bullet>{t('dataUsageSection8Item2')}</Bullet>
      <Bullet>{t('dataUsageSection8Item3')}</Bullet>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
  },
  content: {
    paddingBottom: 8,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  text: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
  },
  bulletRow: {
    marginTop: 8,
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
  },
  bullet: {
    color: TEXT,
  },
});