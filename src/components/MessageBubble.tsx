// MessageBubble.tsx
import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, HatGlasses } from 'lucide-react-native';
import { ACCENT, PANEL, MUTED } from '@/theme';

type Props = { role: 'user' | 'assistant'; content: string; createdAt: number };

export default function MessageBubble({ role, content }: Props) {
  const isUser = role === 'user';

  if (isUser) {
    // USER: keep simple (pill optional)
    return (
      <View style={[styles.row, styles.rowEnd]}>
        <View style={[styles.bubble, styles.user]}>
          <Text style={styles.text}>{content}</Text>
        </View>
      </View>
    );
  }

  // ASSISTANT: pill lives INSIDE the bubble, text shifts down
  return (
    <View style={[styles.row, styles.rowStart]}>
      <View style={[styles.bubble, styles.assistant]}>
        <View style={styles.assistantTitleFrame}>
          <HatGlasses size={18} color="white" />
          <Text style={styles.assistantTitle}>Insights</Text>
        </View>

        <Text style={styles.text}>{content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  rowEnd: { justifyContent: 'flex-end' },
  rowStart: { justifyContent: 'flex-start' },

  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
    flexShrink: 1,
  },

  // Assistant bubble: column layout so chip sits on top, text below
  assistant: {
    backgroundColor: PANEL,
    borderTopLeftRadius: 4,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  // Pill INSIDE the bubble
  assistantTitleFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 8, // pushes text down so there’s no overlap
  },
  assistantTitle: { color: 'white', fontWeight: '700', fontSize: 16 },

  // User bubble (unchanged)
  user: { backgroundColor: ACCENT, borderTopRightRadius: 4 },

  text: { color: 'white', fontSize: 15, lineHeight: 21, textAlign: 'justify'},
  time: { color: MUTED, fontSize: 11, marginTop: 6, alignSelf: 'flex-end' },
});
