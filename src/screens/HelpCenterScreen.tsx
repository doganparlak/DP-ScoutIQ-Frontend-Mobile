import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2 } from 'lucide-react-native';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import {
  BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE, DANGER, DANGER_DARK,
} from '@/theme';
import type { RootStackParamList } from '@/types';
import { deleteAccount as apiDeleteAccount } from '@/services/api';
import { sendReachOut } from '@/services/api';

type RootNav = NativeStackNavigationProp<RootStackParamList>;
type TabKey = 'how' | 'reach' | 'account';

const PRIVACY_URL = 'https://scoutwise.ai/docs/PRIVACY%20POLICY.pdf';
const TERMS_URL = 'https://scoutwise.ai/docs/TERMS%20OF%20USE%20%26%20EULA.pdf';

export default function HelpCenter() {
  const nav = useNavigation<RootNav>();
  const { t } = useTranslation();

  const [selected, setSelected] = useState<TabKey>('how');
  const [message, setMessage] = useState('');
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [hasSentThisLogin, setHasSentThisLogin] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const v = await AsyncStorage.getItem('reachout_sent_this_login');
      setHasSentThisLogin(!!v);
    })();
  }, []);

  const openUrl = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert(
          t('cannotOpenLink', 'Cannot open link'),
          t('cannotOpenLinkDesc', 'Your device cannot open this link right now.'),
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert(
        t('cannotOpenLink', 'Cannot open link'),
        String(e?.message || t('tryAgain', 'Please try again.')),
      );
    }
  };

  const onPressDelete = () => {
    Alert.alert(
      t('deleteAccountTitle', 'Delete account'),
      t('deleteAccountConfirm', 'Are you sure you want to permanently delete your account and all data? This cannot be undone.'),
      [
        { text: t('no', 'No'), style: 'cancel' },
        {
          text: t('yes', 'Yes'),
          style: 'destructive',
          onPress: async () => {
            if (deleting) return;
            try {
              setDeleting(true);
              await apiDeleteAccount();
              await AsyncStorage.multiRemove(['auth_token', 'reachout_sent_this_login']);

              Alert.alert(
                t('accountDeletedTitle', 'Account deleted'),
                t('accountDeletedDesc', 'We lost a valuable scout and a tactician.'),
                [
                  {
                    text: t('ok', 'OK'),
                    onPress: () =>
                      nav.reset({
                        index: 0,
                        routes: [{ name: 'Auth' }], // <-- reset to top-level Auth (not Welcome)
                      }),
                  },
                ],
              );
            } catch (e: any) {
              Alert.alert(t('deleteFailed', 'Delete failed'), e?.message || t('tryAgain', 'Please try again.'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  const onSendMessage = async () => {
    if (hasSentThisLogin) {
      Alert.alert(t('limitReached', 'Limit reached'), t('oneMsgPerLogin', 'You can send one message per login.'));
      return;
    }
    const clean = message.trim();
    if (!clean) {
      Alert.alert(t('messageRequired', 'Message required'), t('pleaseWriteMessage', 'Please write a brief message so we can help.'));
      return;
    }
    try {
      await sendReachOut(clean);
      Alert.alert(t('messageSent', 'Message sent'), t('weWillFollowUp', 'We will get back to you shortly.'));
      setSentMessage(clean);
      setMessage('');
      inputRef.current?.blur();
      setHasSentThisLogin(true);
      await AsyncStorage.setItem('reachout_sent_this_login', '1');
    } catch (e: any) {
      Alert.alert(t('sendFailed', 'Send failed'), String(e?.message || t('tryAgain', 'Please try again.')));
    }
  };

  const tabs = useMemo(
    () => [
      { key: 'how' as const, label: t('tabHowTo', 'How to use') },
      { key: 'reach' as const, label: t('tabReachOut', 'Reach out') },
      { key: 'account' as const, label: t('tabSettings', 'Settings') },
    ],
    [t],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => nav.goBack()}
          style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityLabel={t('backToProfile', 'Back to Profile')}
        >
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>{t('myProfile', 'My Profile')}</Text>
        </Pressable>
        <Text style={styles.title}>{t('helpCenter', 'Help Center')}</Text>
      </View>

      {/* Segmented top options */}
      <View style={styles.segmentWrap}>
        {tabs.map(ti => {
          const active = selected === ti.key;
          return (
            <Pressable
              key={ti.key}
              onPress={() => setSelected(ti.key)}
              style={({ pressed }) => [
                styles.segmentBtn,
                active ? styles.segmentBtnActive : styles.segmentBtnIdle,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
              accessibilityLabel={ti.label}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{ti.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HOW TO USE */}
        {selected === 'how' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('guidebook', 'Guidebook')}</Text>

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howStrategyTitle', 'Team strategy & scouting philosophy')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howStrategy1', 'Start with an optional strategy screen to define your tactical approach and the idea behind your scouting philosophy.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howStrategy2', 'ScoutWise uses this information to align its suggestions and interpretations.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howStrategy3', 'You can skip this step and return to it anytime.')}
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howChatTitle', 'Chat')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howChat1', 'Chat with ScoutWise to discover the best-fit players for your needs—just as you would with a regular chatbot.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howChat2', 'All responses are data-driven and interpreted through your defined preferences.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howChat3', 'Ask for filters on the fly (age, role, nationality, stats, tactical fit, etc.), find players, and add favorites to your ')}
                <Text style={styles.bold}>{t('playerPortfolio', 'Player Portfolio')}</Text>
                <Text>{t('howChat5', '')}.</Text>{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howChat4', 'When requested, ScoutWise will introduce a player. Each introduction includes a ')}
                <Text style={styles.bold}>{t('playerCard', 'Player Card')}</Text>, <Text style={styles.bold}>{t('metricVisualizations', 'Metric Visualizations')}</Text> {t('and', 'and')} <Text style={styles.bold}>{t('scoutwiseInsights', 'ScoutWise Insights')}</Text> {t('ofPerformanceAndFit', 'of the player’s performance and fit.') }
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howCardTitle', 'Player Card')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howCard1', 'Each Player Card encapsulates essential identity (age, nationality, role) and a Potential value.')}
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howPotentialTitle', 'Potential')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howPotential1', 'ScoutWise assigns a Potential score (0–100) based on metadata and historical stats—representing projected ceiling and development outlook.')}
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howMetricTitle', 'Metric Visualizations')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howRadar1', 'For each suggested player, ScoutWise visualizes metrics via Radar Chart and Horizontal Bar Chart for a clear statistical profile.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howRadar2', 'Charts are grouped as')} <Text style={styles.bold}>{t('goalkeeping', 'Goalkeeping')}</Text>, <Text style={styles.bold}>{t('shooting', 'Shooting')}</Text>, <Text style={styles.bold}>{t('passing', 'Passing')}</Text>, <Text style={styles.bold}>{t('defending', 'Defending')}</Text>, <Text style={styles.bold}>{t('contribution_impact', 'Contribution & Impact')}</Text>, <Text style={styles.bold}>{t('errors_discipline', 'Errors & Discipline')}</Text>.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howRadar3', 'Values are aggregated from recent matches for context and clarity.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howRadar4', 'Shown metrics are the per game averages based on available data.')}
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howRadarTitle', 'Radar Charts')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('RadarDefinition', 'A radar chart is a circular chart that shows multiple values at once by plotting them along spokes that extend from a central point, making it easy to see strengths and weaknesses at a glance.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('RadarDefinition2', 'The values shown represent performance metrics, such as different aspects of a player’s play, displayed together to give an overall profile.')}
              </Text>
            </View>

            <View style={styles.line} />
            <View style={styles.block}>
              <Text style={styles.h3}>{t('howHorizontalBar', 'Horizontal Bar Charts')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('HorizontalBarDefinition', 'A horizontal bar chart is a chart that displays data in horizontal bars, making it easy to compare values and see trends.')}
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howInterpTitle', 'ScoutWise Insights')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howInterp1', 'ScoutWise analyzes performance within role context and your criteria, highlighting the most relevant statistics.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howInterp2', 'Each interpretation concisely explains past performances and tactical fit across systems.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howInterp3', 'If no custom strategy is defined, a balanced, general scouting perspective is applied.')}
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howPlayerPortfolio', 'Player Portfolio')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text>{' '}
                {t('howPlayerPortfolio1', 'The Player Portfolio is a watch list of players you have added for closer evaluation.')}
                {'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text>{' '}
                {t('howPlayerPortfolio2', 'Each row represents a player and displays key details such as name, gender, country, team, age, role, and potential.')}
                {'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text>{' '}
                {t('howPlayerPortfolio3', 'The report icon at the start of each row allows you to generate a scouting report, and players can be filtered using player card attributes.')}
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howScoutReportTitle', 'Scouting Report')}</Text>

              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text>{' '}
                {t('howScoutReport1', 'Scouting Report includes the player card and all available statistics from the last 365 days, plus Strengths, Weakness & Concerns, and a Conclusion section.')}
                {'\n'}

                <Text style={styles.bullet}>{'\u2022'}</Text>{' '}
                {t('howScoutReport2', 'Interpretations are detailed and consider physical identity, stats, age, nationality, and role.')}
                {'\n'}

                <Text style={styles.bullet}>{'\u2022'}</Text>{' '}
                {t('howScoutReport3', 'This helps you quickly evaluate the fit, upside, and risks of a player already in your portfolio.')}
              </Text>
            </View>
          </View>
        )}

        {/* REACH OUT */}
        {selected === 'reach' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('getInTouch', 'Get In Touch')}</Text>
            <Text style={[styles.p, { marginBottom: 10 }]}>
              {t('reachDesc', 'Send us a message—questions, feedback, or feature requests. We will follow up via your email.')}
            </Text>
            <TextInput
              ref={inputRef}
              value={hasSentThisLogin ? (sentMessage ?? '') : message}
              onChangeText={setMessage}
              multiline
              placeholder={t('typeMessage', 'Type your message…')}
              placeholderTextColor={MUTED}
              style={[styles.input, hasSentThisLogin && { opacity: 0.75 }]}
              editable={!hasSentThisLogin}
              accessibilityLabel={t('typeMessage', 'Type your message…')}
            />
            <Pressable
              onPress={onSendMessage}
              disabled={hasSentThisLogin}
              style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: hasSentThisLogin ? MUTED : (pressed ? ACCENT_DARK : ACCENT) },
                hasSentThisLogin && { opacity: 0.7 },
              ]}
              accessibilityLabel={hasSentThisLogin ? t('sent', 'Sent') : t('send', 'Send')}
            >
              <Text style={styles.sendText}>{hasSentThisLogin ? t('sent', 'Sent') : t('send', 'Send')}</Text>
            </Pressable>

            <Pressable
              onPress={() => Linking.openURL('https://scoutwise.ai')}
              accessibilityRole="link"
              style={({ pressed }) => [{ marginTop: 12, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.footerLink}>scoutwise.ai</Text>
            </Pressable>

            {hasSentThisLogin && (
              <Text style={styles.sentNote}>{t('msgHasBeenSent', 'Your message has been sent.')}</Text>
            )}
          </View>
        )}

        {/* SETTINGS (ACCOUNT TAB) */}
        {selected === 'account' && (
          <>
            {/* Account Settings frame */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('accountSettings', 'Account Settings')}</Text>
              <Text style={[styles.p, { marginBottom: 12 }]}>
                {t('deleteIrreversible', 'Proceeding here will permanently remove your account and all associated data. This is irreversible.')}
              </Text>
              <Pressable
                onPress={onPressDelete}
                style={({ pressed }) => [styles.deleteBtn, { backgroundColor: pressed ? DANGER_DARK : DANGER }]}
                accessibilityRole="button"
                accessibilityLabel={t('deleteAccount', 'Delete account')}
              >
                <View style={styles.deleteContent}>
                  <Trash2 size={20} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.deleteText}>{t('deleteAccount', 'Delete account')}</Text>
                </View>
              </Pressable>
            </View>

            {/* ✅ Separate Legal frame */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('legal', 'Legal')}</Text>

              <Pressable
                onPress={() => openUrl(PRIVACY_URL)}
                accessibilityRole="link"
                style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.linkText}>{t('privacyPolicy', 'Privacy Policy')}</Text>
                <Text style={styles.chev}>›</Text>
              </Pressable>

              <View style={styles.rowLine} />

              <Pressable
                onPress={() => openUrl(TERMS_URL)}
                accessibilityRole="link"
                style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.linkText}>{t('termsOfUse', 'Terms of Use & EULA')}</Text>
                <Text style={styles.chev}>›</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backIcon: { color: TEXT, fontSize: 18, fontWeight: '800', marginRight: 2 },
  backText: { color: TEXT, fontWeight: '700' },
  title: { color: TEXT, fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center' },

  segmentWrap: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: 12, marginBottom: 14 },
  segmentBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  segmentBtnIdle: { backgroundColor: CARD, borderColor: LINE },
  segmentBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  segmentText: { fontWeight: '800', color: TEXT },
  segmentTextActive: { color: '#fff' },

  card: {
    backgroundColor: PANEL, borderRadius: 20, borderWidth: 1, borderColor: LINE,
    padding: 16, marginHorizontal: 16, marginTop: 12,
  },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  block: { gap: 6 },
  h3: { color: ACCENT, fontSize: 14, fontWeight: '800' },
  p: { color: TEXT, opacity: 0.9, lineHeight: 20 },
  justify: { textAlign: 'left' },
  bold: { fontWeight: '700', color: TEXT },
  line: { height: 1, backgroundColor: LINE, marginVertical: 12 },

  input: {
    minHeight: 120, textAlignVertical: 'top', color: TEXT, backgroundColor: CARD,
    borderColor: LINE, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  sendBtn: { marginTop: 10, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  sendText: { color: '#fff', fontWeight: '800' },
  sentNote: { color: MUTED, marginTop: 8, textAlign: 'center' },

  deleteBtn: { marginTop: 6, borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  deleteText: { color: '#fff', fontWeight: '800' },
  deleteContent: { flexDirection: 'row', alignItems: 'center' },

  bullet: { color: ACCENT, fontWeight: '800' },
  footerLink: {
    color: MUTED,
    textAlign: 'center',
    textDecorationLine: 'underline',
    fontWeight: '700',
  },

  // ✅ Legal link rows (separate frame)
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  linkText: {
    color: ACCENT_DARK,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  chev: { color: MUTED, fontSize: 18, fontWeight: '800', marginLeft: 10 },
  rowLine: { height: 1, backgroundColor: LINE },
});
