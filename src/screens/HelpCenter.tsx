// src/screens/HelpCenter.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trash2 } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE, DANGER, DANGER_DARK,
} from '@/theme';
import type { RootStackParamList } from '@/types';

type RootNav = NativeStackNavigationProp<RootStackParamList>;
type TabKey = 'how' | 'reach' | 'account';

export default function HelpCenter() {
  const nav = useNavigation<RootNav>();
  const [selected, setSelected] = useState<TabKey>('how');
  const [message, setMessage] = useState('');
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [hasSentThisLogin, setHasSentThisLogin] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
     const v = await AsyncStorage.getItem('reachout_sent_this_login');
     setHasSentThisLogin(!!v);
    })();
  }, []);

  const onPressDelete = () => {
    Alert.alert(
      'Delete account',
      'Are you sure you want to permanently delete your account and all data? This cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            // TODO: Hook up to your API (e.g., await api.deleteAccount())
            Alert.alert('Account deleted', 'We lost a valuable scout and a tactician.');
            nav.reset({ index: 0, routes: [{ name: 'Login' }] });
          },
        },
      ],
    );
  };

  const onSendMessage = () => {
    if (hasSentThisLogin) {
        Alert.alert('Limit reached', 'You can send one message per login.');
        return;
    }
    if (!message.trim()) {
        Alert.alert('Message required', 'Please write a brief message so we can help.');
        return;
    }
    // TODO: send via your API
    Alert.alert('Message sent', 'We will get back to you shortly.');
    // Preserve what was sent and lock editing
    setSentMessage(message);
    setMessage('');
    inputRef.current?.blur();
    setHasSentThisLogin(true);
    AsyncStorage.setItem('reachout_sent_this_login', '1').catch(() => {});
  };

  const tabs = useMemo(
    () => [
      { key: 'how' as const, label: 'How to use' },
      { key: 'reach' as const, label: 'Reach out' },
      { key: 'account' as const, label: 'Settings' },
    ],
    [],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>My Profile</Text>
        </Pressable>
        <Text style={styles.title}>Help Center</Text>
      </View>

      {/* Segmented top options */}
      <View style={styles.segmentWrap}>
        {tabs.map(t => {
          const active = selected === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setSelected(t.key)}
              style={({ pressed }) => [
                styles.segmentBtn,
                active ? styles.segmentBtnActive : styles.segmentBtnIdle,
                pressed && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* HOW TO USE */}
        {selected === 'how' && (
        <View style={styles.card}>
            <Text style={styles.sectionTitle}>Guidebook</Text>

            <View style={styles.block}>
            <Text style={styles.h3}>Team strategy & scouting philosophy</Text>
            <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> Start with an optional strategy screen to define your tactical approach and the thinking behind your scouting.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> ScoutIQ uses this information to align its suggestions, interpretations, and how it evaluates player fit.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> You can skip this step and return to it anytime.
            </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
            <Text style={styles.h3}>Chat</Text>
            <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> Chat with ScoutIQ to discover the best-fit players for your needs—just as you would with a regular chatbot.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> All responses are data-driven and interpreted through your defined preferences.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> Ask for filters on the fly (age, role, nationality, potential, stats, tactical fit, etc.), compare players, and add favorites to your <Text style={styles.bold}>Player Portfolio</Text>.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> When requested, ScoutIQ will introduce a player. Each introduction includes a <Text style={styles.bold}>Player Card</Text>, <Text style={styles.bold}>Radar Charts</Text>, and an <Text style={styles.bold}>Interpretation</Text> of the player’s performance and fit.
            </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
            <Text style={styles.h3}>Player Card</Text>
            <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> Each <Text style={styles.bold}>Player Card</Text> encapsulates the essential identity of a player, showcasing key information such as age, nationality, role, and assigned <Text style={styles.bold}>Potential</Text> value.
            </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
            <Text style={styles.h3}>Potential</Text>
            <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> ScoutIQ assigns each player a <Text style={styles.bold}>Potential</Text> score from 0 to 100, calculated using their metadata and historical match statistics. This score represents the player’s projected performance ceiling and long-term development outlook.
            </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
            <Text style={styles.h3}>Radar Charts</Text>
            <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> For each suggested player, ScoutIQ visualizes performance metrics through a <Text style={styles.bold}>Radar Chart</Text>, providing a clear overview of their statistical profile.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> Charts are categorized into three analytical groups:
                <Text style={styles.bold}> In-possession</Text>, 
                <Text style={styles.bold}> Out-of-possession</Text>, and 
                <Text style={styles.bold}> Goalkeeping</Text> (for GKs).{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> All values are aggregated from recent matches to ensure contextual accuracy and clarity.
            </Text>
            </View>

            <View style={styles.line} />

            <View style={styles.block}>
            <Text style={styles.h3}>Interpretations</Text>
            <Text style={[styles.p, styles.justify]}>
                <Text style={styles.bullet}>{'\u2022'}</Text> ScoutIQ analyzes a player’s performance through the context of their role and your specific scouting criteria, selecting the most relevant statistics for meaningful insights.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> Each interpretation provides a concise explanation of past performances and how the player aligns within different tactical systems.{'\n'}
                <Text style={styles.bullet}>{'\u2022'}</Text> When no custom strategy is defined, ScoutIQ applies a balanced, general scouting perspective by default.
            </Text>
            </View>
        </View>
        )}


        {/* REACH OUT */}
        {selected === 'reach' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Get In Touch</Text>
            <Text style={[styles.p, { marginBottom: 10 }]}>
              Send us a message—questions, feedback, or feature requests. We will follow up via your email.
            </Text>
            <TextInput
              ref={inputRef}
              value={hasSentThisLogin ? (sentMessage ?? '') : message}
              onChangeText={setMessage}
              multiline
              placeholder="Type your message…"
              placeholderTextColor={MUTED}
              style={[styles.input, hasSentThisLogin && { opacity: 0.75 }]}
              editable={!hasSentThisLogin}
            />
            <Pressable
               onPress={onSendMessage}
               disabled={hasSentThisLogin}
               style={({ pressed }) => [
                styles.sendBtn,
                { backgroundColor: hasSentThisLogin ? MUTED : (pressed ? ACCENT_DARK : ACCENT) },
                hasSentThisLogin && { opacity: 0.7 },
               ]}
            >
               <Text style={styles.sendText}>{hasSentThisLogin ? 'Sent' : 'Send'}</Text>
            </Pressable>

            {hasSentThisLogin && (
               <Text style={styles.sentNote}>
                 Your message has been sent.
               </Text>
            )}
          </View>
        )}

        {/* ACCOUNT SETTINGS */}
        {selected === 'account' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}> Account Settings</Text>
            <Text style={[styles.p, { marginBottom: 12 }]}>
              Proceeding here will permanently remove your account and all associated data. This is irreversible.
            </Text>
            <Pressable
                onPress={onPressDelete}
                style={({ pressed }) => [
                    styles.deleteBtn,
                    { backgroundColor: pressed ? DANGER_DARK : DANGER },
                ]}
                accessibilityRole="button"
                accessibilityLabel="Delete account"
            >
                <View style={styles.deleteContent}>
                    <Trash2 size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.deleteText}>Delete account</Text>
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
  title: { color: TEXT, fontSize: 22, fontWeight: '800', marginTop: 8, textAlign: 'center'},

  segmentWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 14
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  segmentBtnIdle: { backgroundColor: CARD, borderColor: LINE },
  segmentBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  segmentText: { fontWeight: '800', color: TEXT },
  segmentTextActive: { color: '#fff' },

  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center', },
  block: { gap: 6 },
  h3: { color: ACCENT, fontSize: 14, fontWeight: '800' },
  p: { color: TEXT, opacity: 0.9, lineHeight: 20 },
  justify: { textAlign: 'left' },
  bold: { fontWeight: '700', color: TEXT},
  line: { height: 1, backgroundColor: LINE, marginVertical: 12 },

  input: {
    minHeight: 120,
    textAlignVertical: 'top',
    color: TEXT,
    backgroundColor: CARD,
    borderColor: LINE,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  sendBtn: { marginTop: 10, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  sendText: { color: '#fff', fontWeight: '800' },
  sentNote: { color: MUTED, marginTop: 8, textAlign: 'center' },

  deleteBox: {
    backgroundColor: CARD,
    borderColor: LINE,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
  },
  deleteBtn: {
    marginTop: 6,
    borderRadius: 10,
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteText: { color: '#fff', fontWeight: '800' },
  warningTitle: {
  color: DANGER,
  textAlign: 'center',
  fontSize: 16,
  fontWeight: '800',
  marginBottom: 10,
},
deleteContent: {
  flexDirection: 'row',
  alignItems: 'center',
},
bullet: {
  color: ACCENT,
  fontWeight: '800',
},

});
