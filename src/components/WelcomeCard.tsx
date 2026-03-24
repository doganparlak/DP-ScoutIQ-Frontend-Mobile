import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import {
  SlidersHorizontal,
  UserRoundSearch,
  Database,
  Compass,
  SquareChevronUp,
  BarChart3,
  BookmarkPlus,
  GitCompareArrows,
  ShieldCheck,
} from 'lucide-react-native';
import { ACCENT, PANEL, MUTED, TEXT, LINE, ACCENT_DARK } from '@/theme';
import { useTranslation } from 'react-i18next';
import DataUsage from './DataUsage';

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
  const [dataUsageOpen, setDataUsageOpen] = React.useState(false);

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.titleWelcome}>{t('kickOff', 'Kick Off!')}</Text>
        <Text style={styles.subtitle}>
          {t('welcomeSubtitle', 'Your intelligent football scouting companion')}
        </Text>

        <View style={styles.coveragePill}>
          <Text style={styles.coverageText}>
            {t('wcCoverageLine', '113 leagues  •  52,000+ players  •  75+ stats')}
          </Text>
        </View>

        <View style={styles.divider} />

        <Row
          Icon={UserRoundSearch}
          text={t(
            'wcFind',
            'Find players based on your needs, with each response focused on a single player for maximum clarity.'
          )}
        />
        <Row
          Icon={GitCompareArrows}
          text={t(
            'wcCompare',
            'Compare players side by side to evaluate fit, strengths, and trade-offs.'
          )}
        />
        <Row
          Icon={SlidersHorizontal}
          text={t(
            'wcFilter',
            'Filter your search by age, nationality, role, stats, or tactical fit.'
          )}
        />
        <Row
          Icon={SquareChevronUp}
          text={t('wcPotential', 'Discover the quantified potential of players.')}
        />
        <Row
          Icon={Database}
          text={t('wcAnswers', 'Get instant, data-driven answers.')}
        />
        <Row
          Icon={BarChart3}
          text={t('wcVisualize', 'Visualize key stats with charts and summaries.')}
        />
        <Row
          Icon={Compass}
          text={t(
            'wcAdapt',
            'Adapt recommendations to your team’s identity and plans.'
          )}
        />
        <Row
          Icon={BookmarkPlus}
          text={t('wcCurate', 'Curate your dream squad in your portfolio.')}
        />

        <View style={styles.row}>
          <ShieldCheck size={16} color={ACCENT} />
          <Text style={styles.rowText}>
            {t('signupAgreePrefix', 'I agree to the ')}
            <Text style={styles.link} onPress={() => setDataUsageOpen(true)}>
              {t('dataUsageSignup', 'Data Usage')}
            </Text>
            {t('signupAgreeSuffix', '.')}
          </Text>
        </View>
      </View>

      <Modal
        visible={dataUsageOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setDataUsageOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.dataUsageModalCard]}>
            <View style={styles.dataUsageHeader}>
              <Text style={styles.modalTitle}>
                {t('dataUsageTitle', 'Data Usage')}
              </Text>

              <Pressable
                onPress={() => setDataUsageOpen(false)}
                hitSlop={8}
                style={styles.dataUsageCloseBtn}
              >
                <Text style={styles.dataUsageCloseText}>
                  {t('close', 'Close')}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.dataUsageScrollContent}
            >
              <DataUsage />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  coveragePill: {
    alignSelf: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
  },

  coverageText: {
    color: ACCENT,
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginHorizontal: 16,
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
    backgroundColor: LINE,
    marginVertical: 8,
  },

  link: {
    color: ACCENT_DARK,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: PANEL,
    borderRadius: 16,
    padding: 16,
  },

  dataUsageModalCard: {
    maxHeight: '85%',
    paddingBottom: 12,
  },

  dataUsageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
  },

  dataUsageCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  dataUsageCloseText: {
    color: ACCENT_DARK,
    fontWeight: '800',
  },

  dataUsageScrollContent: {
    paddingBottom: 8,
  },
});