import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2 } from 'lucide-react-native';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert,
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
                [{ text: t('ok', 'OK'), onPress: () => nav.reset({ index: 0, routes: [{ name: 'Welcome' }] }) }],
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
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howChat3', 'Ask for filters on the fly (age, role, nationality, stats, tactical fit, etc.), compare players, and add favorites to your ')}
                <Text style={styles.bold}>{t('playerPortfolio', 'Player Portfolio')}</Text>.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howChat4', 'When requested, ScoutWise will introduce a player. Each introduction includes a ')}
                <Text style={styles.bold}>{t('playerCard', 'Player Card')}</Text>, <Text style={styles.bold}>{t('radarCharts', 'Radar Charts')}</Text> {t('and', 'and')} <Text style={styles.bold}>{t('interpretation', 'Interpretation')}</Text> {t('ofPerformanceAndFit', 'of the player’s performance and fit.') }
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
              <Text style={styles.h3}>{t('howRadarTitle', 'Radar Charts')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howRadar1', 'For each suggested player, ScoutWise visualizes metrics via Radar Chart for a clear statistical profile.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howRadar2', 'Charts are grouped as')} <Text style={styles.bold}>{t('inPossession', 'In-possession')}</Text>, <Text style={styles.bold}>{t('outOfPossession', 'Out-of-possession')}</Text> {t('and', 'and')} <Text style={styles.bold}>{t('goalkeeping', 'Goalkeeping')}</Text> {t('forGKs', '(for GKs).')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howRadar3', 'Values are aggregated from recent matches for context and clarity.')}
              </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
              <Text style={styles.h3}>{t('howInterpTitle', 'Interpretations')}</Text>
              <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howInterp1', 'ScoutWise analyzes performance within role context and your criteria, highlighting the most relevant stats.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howInterp2', 'Each interpretation concisely explains past performances and tactical fit across systems.')}{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> {t('howInterp3', 'If no custom strategy is defined, a balanced, general scouting perspective is applied.')}
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

            {hasSentThisLogin && (
              <Text style={styles.sentNote}>{t('msgHasBeenSent', 'Your message has been sent.')}</Text>
            )}
          </View>
        )}

        {/* ACCOUNT SETTINGS */}
        {selected === 'account' && (
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
});


