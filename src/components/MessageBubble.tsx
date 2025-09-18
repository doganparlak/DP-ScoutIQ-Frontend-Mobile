import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { User, HatGlasses } from 'lucide-react-native';
import { ACCENT, PANEL, MUTED, CARD } from '@/theme';

type Props = { role: 'user' | 'assistant'; content: string; createdAt: number };

export default function MessageBubble({ role, content }: Props) {
  const isUser = role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowEnd : styles.rowStart]}>
      {/* Assistant avatar (overlay) */}
      {!isUser && (
        <View style={styles.assistantAvatarWrap}>
          <View style={[styles.avatar, { backgroundColor: CARD }]}>
            <HatGlasses size={18} color={ACCENT} />
          </View>
        </View>
      )}

      {/* Bubble */}
      <View
        style={[
          styles.bubble,
          isUser ? styles.user : styles.assistant,
          !isUser && styles.assistantFullWidth,       // make assistant bubble full width
          !isUser && styles.assistantPadForAvatar,    // add inner padding so text doesn't overlap avatar
        ]}
      >
        <Text style={styles.text}>{content}</Text>
      </View>

      {/* User avatar (inline on the right) */}
      {isUser && (
        <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
          <User size={18} color="white" />
        </View>
      )}
    </View>
  );
}

const AVATAR = 34;
const GAP = 8; // space between avatar and bubble text

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 12,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    position: 'relative',
  },
  rowEnd: { justifyContent: 'flex-end' },
  rowStart: { justifyContent: 'flex-start' },

  assistantAvatarWrap: {
    position: 'absolute',
    left: 12, // aligns with list padding
    top: 4,
    zIndex: 1,
  },

  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '78%',     // default cap for user bubble
    flexShrink: 1,
  },

  // Assistant bubble spans the full list width (same “frame” as PlayerCard/SpiderChart/interpretation)
  assistantFullWidth: {
    maxWidth: '100%',
    flex: 1,
    alignSelf: 'stretch',
  },
  // Add inner padding so text doesn’t sit under the overlaid avatar
  assistantPadForAvatar: {
    paddingLeft: 12 + AVATAR + GAP, // base padding + avatar + gap
  },

  user: { backgroundColor: ACCENT, borderTopRightRadius: 4 },
  assistant: { backgroundColor: PANEL, borderTopLeftRadius: 4 },

  text: { color: 'white', fontSize: 15, lineHeight: 21 },
  time: { color: MUTED, fontSize: 11, marginTop: 6, alignSelf: 'flex-end' },
});
