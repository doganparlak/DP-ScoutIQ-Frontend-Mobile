import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BarChart3, BookMarked, BookOpenCheck, CalendarSearch, ChevronDown, CircleHelp,
  ClipboardList, CreditCard, Database, GitCompareArrows, LayoutDashboard,
  MessageSquareText, Search, Shield, Target, Trash2, Trophy, UserRound,
} from 'lucide-react-native';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Linking, Platform
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

const LEGAL_URLS = {
  en: {
    privacy: 'https://scoutwise.ai/legal/privacy/en',
    terms: 'https://scoutwise.ai/legal/terms/en',
  },
  tr: {
    privacy: 'https://scoutwise.ai/legal/privacy/tr',
    terms: 'https://scoutwise.ai/legal/terms/tr',
  },
  iosTerms: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
} as const;


export default function HelpCenter() {
  const nav = useNavigation<RootNav>();
  const { t, i18n } = useTranslation();
  const lang = (i18n.language || 'en').toLowerCase().startsWith('tr') ? 'tr' : 'en';
  const privacyUrl = LEGAL_URLS[lang].privacy;
  const termsUrl =
  Platform.OS === 'ios' ? LEGAL_URLS.iosTerms : LEGAL_URLS[lang].terms;

  const [selected, setSelected] = useState<TabKey>('how');
  const [expandedGuide, setExpandedGuide] = useState('panel');
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

  const guides = useMemo(() => [
    { key: 'panel', group: t('navigationWorkspace', 'YOUR WORKSPACE'), title: t('tabProfile', 'Panel'), Icon: LayoutDashboard, summary: t('helpGuidePanelSummary'), steps: [t('helpGuidePanel1'), t('helpGuidePanel2'), t('helpGuidePanel3')] },
    { key: 'pro', group: t('navigationWorkspace', 'YOUR WORKSPACE'), title: t('tabScoutWisePro', 'ScoutWise Pro'), Icon: MessageSquareText, summary: t('helpGuideProSummary'), steps: [t('helpGuidePro1'), t('helpGuidePro2'), t('helpGuidePro3')] },
    { key: 'weekly', group: t('interactionCenter', 'INTERACTION CENTER'), title: t('tabWeeklySearches', 'Weekly Searches'), Icon: Search, summary: t('helpGuideWeeklySummary'), steps: [t('helpGuideWeekly1'), t('helpGuideWeekly2')] },
    { key: 'daily', group: t('interactionCenter', 'INTERACTION CENTER'), title: t('dailyScoutChallengeTitle', 'Daily Scout Challenge'), Icon: Target, summary: t('helpGuideDailySummary'), steps: [t('helpGuideDaily1'), t('helpGuideDaily2'), t('helpGuideDaily3')] },
    { key: 'playerPool', group: t('dataCenter', 'DATA CENTER'), title: t('tabPlayerPool', 'Player Pool'), Icon: UserRound, summary: t('helpGuidePlayerPoolSummary'), steps: [t('helpGuidePlayerPool1'), t('helpGuidePlayerPool2'), t('helpGuidePlayerPool3')] },
    { key: 'teamPool', group: t('dataCenter', 'DATA CENTER'), title: t('teamPoolWorkspace', 'Team Pool'), Icon: Shield, summary: t('helpGuideTeamPoolSummary'), steps: [t('helpGuideTeamPool1'), t('helpGuideTeamPool2'), t('helpGuideTeamPool3')] },
    { key: 'leaguePool', group: t('dataCenter', 'DATA CENTER'), title: t('leaguePoolWorkspace', 'League Pool'), Icon: Trophy, summary: t('helpGuideLeaguePoolSummary'), steps: [t('helpGuideLeaguePool1'), t('helpGuideLeaguePool2'), t('helpGuideLeaguePool3')] },
    { key: 'matchPool', group: t('dataCenter', 'DATA CENTER'), title: t('matchPoolWorkspace', 'Match Pool'), Icon: CalendarSearch, summary: t('helpGuideMatchPoolSummary'), steps: [t('helpGuideMatchPool1'), t('helpGuideMatchPool2'), t('helpGuideMatchPool3')] },
    { key: 'seasonData', group: t('dataCenter', 'DATA CENTER'), title: t('seasonDataWorkspace', 'Season Data'), Icon: Database, summary: t('helpGuideSeasonSummary'), steps: [t('helpGuideSeason1'), t('helpGuideSeason2'), t('helpGuideSeason3')] },
    { key: 'playerPortfolio', group: t('portfolioCenter', 'PORTFOLIO CENTER'), title: t('portfolioWorkspace', 'Player Portfolio'), Icon: ClipboardList, summary: t('helpGuidePlayerPortfolioSummary'), steps: [t('helpGuidePlayerPortfolio1'), t('helpGuidePlayerPortfolio2'), t('helpGuidePlayerPortfolio3')] },
    { key: 'matchPortfolio', group: t('portfolioCenter', 'PORTFOLIO CENTER'), title: t('matchPortfolioWorkspace', 'Match Portfolio'), Icon: BookMarked, summary: t('helpGuideMatchPortfolioSummary'), steps: [t('helpGuideMatchPortfolio1'), t('helpGuideMatchPortfolio2'), t('helpGuideMatchPortfolio3')] },
    { key: 'matchup', group: t('analysisCenter', 'ANALYSIS CENTER'), title: t('matchupWorkspace', 'Matchup Center'), Icon: GitCompareArrows, summary: t('helpGuideMatchupSummary'), steps: [t('helpGuideMatchup1'), t('helpGuideMatchup2'), t('helpGuideMatchup3')] },
    { key: 'teamAnalysis', group: t('analysisCenter', 'ANALYSIS CENTER'), title: t('teamAnalysisWorkspace', 'Team Analysis Center'), Icon: BarChart3, summary: t('helpGuideTeamAnalysisSummary'), steps: [t('helpGuideTeamAnalysis1'), t('helpGuideTeamAnalysis2'), t('helpGuideTeamAnalysis3')] },
    { key: 'plan', group: t('settingsGroup', 'SETTINGS'), title: t('managePlan', 'Manage Plan'), Icon: CreditCard, summary: t('helpGuidePlanSummary'), steps: [t('helpGuidePlan1'), t('helpGuidePlan2')] },
    { key: 'help', group: t('settingsGroup', 'SETTINGS'), title: t('helpCenter', 'Help Center'), Icon: CircleHelp, summary: t('helpGuideHelpSummary'), steps: [t('helpGuideHelp1'), t('helpGuideHelp2'), t('helpGuideHelp3')] },
  ], [t]);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (nav as any).navigate('Profile', { screen: 'MyProfile' })}
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
          <View style={styles.guideShell}>
            <View style={styles.guideHero}>
              <View style={styles.guideHeroIcon}><BookOpenCheck size={25} color={ACCENT} /></View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={styles.guideHeroTitle}>{t('helpGuideTitle', 'ScoutWise Guide')}</Text>
                <Text style={styles.guideHeroText}>{t('helpGuideIntro', 'Choose a page to learn what it does and the quickest way to use it.')}</Text>
              </View>
            </View>

            {guides.map((guide, index) => {
              const open = expandedGuide === guide.key;
              const showGroup = index === 0 || guides[index - 1].group !== guide.group;
              return <React.Fragment key={guide.key}>
                {showGroup && <Text style={styles.guideGroup}>{guide.group}</Text>}
                <View style={[styles.guideCard, open && styles.guideCardOpen]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setExpandedGuide(open ? '' : guide.key)}
                    style={({ pressed }) => [styles.guideHeader, pressed && { opacity: .72 }]}
                  >
                    <View style={[styles.guideIcon, open && styles.guideIconOpen]}><guide.Icon size={21} color={open ? '#4ADE80' : '#A8B4AC'} /></View>
                    <View style={styles.guideHeadingCopy}>
                      <Text style={[styles.guideTitle, open && { color: '#4ADE80' }]}>{guide.title}</Text>
                      {!open && <Text style={styles.guidePreview} numberOfLines={1}>{guide.summary}</Text>}
                    </View>
                    <ChevronDown size={19} color={open ? '#4ADE80' : MUTED} style={open ? { transform: [{ rotate: '180deg' }] } : undefined} />
                  </Pressable>
                  {open && <View style={styles.guideBody}>
                    <Text style={styles.guideSummary}>{guide.summary}</Text>
                    <View style={styles.guideSteps}>
                      {guide.steps.map((step, stepIndex) => <View key={`${guide.key}-${stepIndex}`} style={styles.guideStep}>
                        <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{stepIndex + 1}</Text></View>
                        <Text style={styles.stepText}>{step}</Text>
                      </View>)}
                    </View>
                  </View>}
                </View>
              </React.Fragment>;
            })}
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
                pressed && !hasSentThisLogin ? { opacity: 0.9 } : null,
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
                onPress={() => openUrl(privacyUrl)}
                accessibilityRole="link"
                style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.linkText}>
                  {t('privacyPolicy', 'Privacy Policy')}
                </Text>
                <Text style={styles.chev}>›</Text>
              </Pressable>

              <View style={styles.rowLine} />

              <Pressable
                onPress={() => openUrl(termsUrl)}
                accessibilityRole="link"
                style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.linkText}>
                  {t('termsOfUse', 'Terms of Use & EULA')}
                </Text>
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
  segmentBtnActive: { backgroundColor: 'rgba(22, 163, 74, 0.12)', borderColor: ACCENT },
  segmentText: { fontWeight: '800', color: TEXT },
  segmentTextActive: { color: ACCENT },

  card: {
    backgroundColor: PANEL, borderRadius: 20, borderWidth: 1, borderColor: ACCENT,
    padding: 16, marginHorizontal: 16, marginTop: 12,
  },

  guideShell: { marginHorizontal: 16, marginTop: 12, gap: 10 },
  guideHero: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderWidth: 1, borderColor: 'rgba(22,163,74,.72)', borderRadius: 20, backgroundColor: PANEL },
  guideHeroIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(22,163,74,.5)', backgroundColor: 'rgba(22,163,74,.13)' },
  guideHeroTitle: { color: TEXT, fontSize: 19, fontWeight: '900' },
  guideHeroText: { color: MUTED, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  guideGroup: { color: '#93A59A', fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 1.55, marginTop: 12, marginLeft: 3 },
  guideCard: { borderWidth: 1, borderColor: LINE, borderRadius: 17, backgroundColor: PANEL, overflow: 'hidden' },
  guideCardOpen: { borderColor: 'rgba(22,163,74,.68)', backgroundColor: 'rgba(19,31,23,.98)' },
  guideHeader: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12 },
  guideIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: LINE, backgroundColor: 'rgba(255,255,255,.025)' },
  guideIconOpen: { borderColor: 'rgba(22,163,74,.45)', backgroundColor: 'rgba(22,163,74,.12)' },
  guideHeadingCopy: { flex: 1, minWidth: 0, gap: 5 },
  guideTitle: { color: TEXT, fontSize: 15, fontWeight: '900' },
  guidePreview: { color: MUTED, fontSize: 11, lineHeight: 16 },
  guideBody: { gap: 14, borderTopWidth: 1, borderTopColor: LINE, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 15 },
  guideSummary: { color: '#DDE5E0', fontSize: 13, lineHeight: 21, fontWeight: '600' },
  guideSteps: { gap: 10 },
  guideStep: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 11, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(22,163,74,.25)', backgroundColor: 'rgba(22,163,74,.055)' },
  stepNumber: { width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(22,163,74,.17)', borderWidth: 1, borderColor: 'rgba(22,163,74,.48)' },
  stepNumberText: { color: '#4ADE80', fontSize: 11, fontWeight: '900' },
  stepText: { flex: 1, color: TEXT, fontSize: 12, lineHeight: 19, fontWeight: '600' },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  block: { gap: 6 },
  h3: { color: ACCENT, fontSize: 14, fontWeight: '800' },
  p: { color: TEXT, opacity: 0.9, lineHeight: 20, flexShrink: 1, width: '100%' },
  justify: { textAlign: 'left' },
  bold: { fontWeight: '700', color: TEXT },
  line: { height: 1, backgroundColor: LINE, marginVertical: 12 },

  input: {
    minHeight: 120, textAlignVertical: 'top', color: TEXT, backgroundColor: CARD,
    borderColor: LINE, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  sendBtn: {
    marginTop: 10,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  sendText: { color: ACCENT, fontWeight: '900' },
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
