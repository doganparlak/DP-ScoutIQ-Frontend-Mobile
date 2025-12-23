import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { User, HatGlasses } from 'lucide-react-native';
import { ACCENT, PANEL, MUTED, CARD } from '@/theme';
import { useTranslation } from 'react-i18next';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  pending?: boolean;
};

const AVATAR = 34;
const GAP = 8;

export default function MessageBubble({ role, content, pending }: Props) {
  const isUser = role === 'user';
  const { t } = useTranslation();

  return (
    <View style={[styles.row, isUser ? styles.rowEnd : styles.rowStart]}>
      {/* Assistant icon (left) */}
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: CARD }]} accessibilityLabel={t('assistantAL', 'Assistant')}>
          <HatGlasses size={18} color={ACCENT} />
        </View>
      )}

      {/* Bubble */}
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        {pending && !isUser ? (
          <View style={styles.pendingRow}>
            <ActivityIndicator size="small" color={MUTED} />
            <Text style={styles.pendingText}>
              {t('assistantPending', 'Unveiling insights')}
            </Text>
          </View>
        ) : (
          <Text style={styles.text}>{content}</Text>
        )}
      </View>

      {/* User icon (right) */}
      {isUser && (
        <View style={[styles.avatar, { backgroundColor: ACCENT }]} accessibilityLabel={t('youAL', 'You')}>
          <User size={18} color="white" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  rowEnd: { justifyContent: 'flex-end' },
  rowStart: { justifyContent: 'flex-start' },

  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: GAP,
  },

  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
    flexShrink: 1,
  },

  assistant: {
    backgroundColor: PANEL,
    borderTopLeftRadius: 4,
  },
  user: {
    backgroundColor: ACCENT,
    borderTopRightRadius: 4,
  },

  text: {
    color: 'white',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'left',
  },

  pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pendingText: { color: MUTED, fontSize: 15, lineHeight: 21 },
});
