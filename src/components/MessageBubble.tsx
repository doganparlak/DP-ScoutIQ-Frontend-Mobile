import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, HatGlasses } from 'lucide-react-native';
import { ACCENT, PANEL, MUTED, CARD } from '@/theme';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  pending?: boolean;
};

export default function MessageBubble({ role, content, pending }: Props) {
  const isUser = role === 'user';

  // Animate dots for pending
  const [dots, setDots] = React.useState('.');
  React.useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => {
      setDots(d => (d.length >= 5 ? '.' : d + '.'));
    }, 500);
    return () => clearInterval(interval);
  }, [pending]);

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowEnd : styles.rowStart,
      ]}
    >
      {/* Assistant icon (left) */}
      {!isUser && (
        <View style={[styles.avatar, { backgroundColor: CARD }]}>
          <HatGlasses size={18} color={ACCENT} />
        </View>
      )}

      {/* Bubble */}
      <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
        {pending && !isUser ? (
          <View style={styles.pendingRow}>
            <Text style={styles.pendingText}>Unveiling insights{dots}</Text>
          </View>
        ) : (
          <Text style={styles.text}>{content}</Text>
        )}
      </View>

      {/* User icon (right) */}
      {isUser && (
        <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
          <User size={18} color="white" />
        </View>
      )}
    </View>
  );
}

const AVATAR = 34;
const GAP = 8;

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
    backgroundColor: ACCENT, // softer red
    borderTopRightRadius: 4,
  },

  text: {
    color: 'white',
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'left',
  },

  pendingRow: { flexDirection: 'row', alignItems: 'center' },
  pendingText: { color: MUTED, fontSize: 15, lineHeight: 21 },
});
