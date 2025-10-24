import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SlidersHorizontal, Users, Database, Compass, SquareChevronUp, BarChart3, BookmarkPlus } from 'lucide-react-native';
import { ACCENT, PANEL, MUTED, TEXT, LINE } from '@/theme';
import { useTranslation } from 'react-i18next';

function Row({
  Icon,
  text,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  text: string;
}) {
  return (
    <View style={styles.row}>
      <Icon size={16} color={ACCENT} />
      <Text style={styles.rowText}>{text}</Text>
    </View>
  );
}

export default function WelcomeCard() {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <Text style={styles.titleWelcome}>{t('kickOff', 'Kick Off!')}</Text>
      <Text style={styles.subtitle}>{t('welcomeSubtitle', 'Your intelligent football scouting companion')}</Text>

      <View style={styles.divider} />
      <Row Icon={Users} text={t('wcFindCompare', 'Find and compare players based on your needs.')} />
      <Row Icon={SlidersHorizontal} text={t('wcFilter', 'Filter your search by age, nationality, role, stats, or tactical fit.')} />
      <Row Icon={SquareChevronUp} text={t('wcPotential', 'Discover the quantified potential of players.')} />
      <Row Icon={Database} text={t('wcAnswers', 'Get instant, data-driven answers.')} />
      <Row Icon={BarChart3} text={t('wcVisualize', 'Visualize key stats with charts and summaries.')} />
      <Row Icon={Compass} text={t('wcAdapt', 'Adapt recommendations to your team’s identity and plans.')} />
      <Row Icon={BookmarkPlus} text={t('wcCurate', 'Curate your dream squad in your portfolio.')} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
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
    fontSize: 14,
    lineHeight: 21,
  },
  titleWelcome: {
    color: ACCENT,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: MUTED,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    borderColor: LINE,
    marginVertical: 8,
  },
});
