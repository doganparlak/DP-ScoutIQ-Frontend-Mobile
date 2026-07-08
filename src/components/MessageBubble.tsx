import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { User, HatGlasses, Copy } from 'lucide-react-native';
import { ACCENT, PANEL, MUTED, CARD, LINE } from '@/theme';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  pending?: boolean;
};

const AVATAR = 34;
const GAP = 8;

function splitBulletContent(content: string) {
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const bulletLines = lines
    .map((line) => line.match(/^[•*-]\s*(.+)$/)?.[1]?.trim())
    .filter((line): line is string => Boolean(line));

  return bulletLines.length === lines.length && bulletLines.length > 0 ? bulletLines : null;
}

export default function MessageBubble({ role, content, pending }: Props) {
  const isUser = role === 'user';
  const { t } = useTranslation();
  const bulletLines = !isUser && !pending ? splitBulletContent(content) : null;

  const bubbleRef = React.useRef<View>(null);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState({ top: 0, left: 0 });

  const openMenu = () => {
    if (pending) return;

    bubbleRef.current?.measureInWindow((x, y, width) => {
      const menuWidth = 120;
      const left = isUser
        ? Math.max(8, x + width - menuWidth)
        : Math.max(8, x);

      const top = Math.max(8, y - 44);

      setMenuPos({ top, left });
      setMenuVisible(true);
    });
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(content);
    setMenuVisible(false);
  };

  return (
    <>
      <View style={[styles.row, isUser ? styles.rowEnd : styles.rowStart]}>
        {!isUser && (
          <View
            style={[styles.avatar, { backgroundColor: CARD }]}
            accessibilityLabel={t('assistantAL', 'Assistant')}
          >
            <HatGlasses size={18} color={ACCENT} />
          </View>
        )}

        <Pressable
          ref={bubbleRef}
          onLongPress={openMenu}
          delayLongPress={250}
          style={({ pressed }) => [
            styles.bubble,
            isUser ? styles.user : styles.assistant,
            pressed && !pending ? styles.bubblePressed : null,
          ]}
        >
          {pending && !isUser ? (
            <View style={styles.pendingRow}>
              <ActivityIndicator size="small" color={MUTED} />
              <Text style={styles.pendingText}>
                {t('assistantPending', 'Unveiling insights')}
              </Text>
            </View>
          ) : bulletLines ? (
            <View style={styles.bulletList}>
              {bulletLines.map((line, index) => (
                <View key={`${index}-${line}`} style={[styles.bulletRow, index === bulletLines.length - 1 && styles.bulletRowLast]}>
                  <Text style={styles.bulletMark}>•</Text>
                  <Text style={styles.bulletText}>{line}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.text}>{content}</Text>
          )}
        </Pressable>

        {isUser && (
          <View
            style={[styles.avatar, { backgroundColor: ACCENT }]}
            accessibilityLabel={t('youAL', 'You')}
          >
            <User size={18} color="white" />
          </View>
        )}
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={styles.overlay}>
            <View
              style={[
                styles.popupMenu,
                {
                  top: menuPos.top,
                  left: menuPos.left,
                },
              ]}
            >
              <Pressable style={styles.popupButton} onPress={handleCopy}>
                <Copy size={16} color={ACCENT} />
                <Text style={styles.popupButtonText}>
                  {t('copy', 'Copy')}
                </Text>
              </Pressable>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
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
    maxWidth: '84%',
    flexShrink: 1,
  },

  bubblePressed: {
    opacity: 0.9,
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

  bulletList: {
    gap: 10,
  },

  bulletRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },

  bulletRowLast: {
    marginBottom: 0,
  },

  bulletMark: {
    width: 14,
    color: ACCENT,
    fontSize: 18,
    lineHeight: 21,
    fontWeight: '900',
  },

  bulletText: {
    color: 'white',
    flexShrink: 1,
    flexGrow: 1,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'left',
  },

  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  pendingText: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 21,
  },

  overlay: {
    flex: 1,
  },

  popupMenu: {
    position: 'absolute',
    minWidth: 110,
    backgroundColor: CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  popupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  popupButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
  },
});