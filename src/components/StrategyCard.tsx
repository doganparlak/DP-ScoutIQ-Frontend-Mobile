import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { Save, RotateCcw } from 'lucide-react-native';
import { ACCENT, BG, MUTED, PANEL, LINE, shadows } from '@/theme';
import { loadStrategy, saveStrategy } from '@/storage';

const INITIAL_PLACEHOLDER =
  'We play in a 4-3-3 formation with...';
const EMPTY_PLACEHOLDER = 'No strategy is set.';

const MIN_HEIGHT = 240;
const MAX_HEIGHT = 560;

interface Props { onSaved?: (value: string) => void }

export default function StrategyCard({ onSaved }: Props) {
  const [text, setText] = useState('');                 // empty => show placeholder
  const [placeholder, setPlaceholder] = useState(INITIAL_PLACEHOLDER);
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);
  const [showSetButton, setShowSetButton] = useState(true); // when false => locked (read-only)

  // locked == strategy area not editable
  const locked = !showSetButton;

  useEffect(() => {
    (async () => {
      const existing = (await loadStrategy()) ?? '';
      if (existing.trim().length) {
        setText(existing);
        setPlaceholder(INITIAL_PLACEHOLDER);
        setShowSetButton(false); // already set previously -> keep locked
      } else {
        setText('');
        setPlaceholder(INITIAL_PLACEHOLDER);
        setShowSetButton(true); // enable editing
      }
    })();
  }, []);

  async function handleSet() {
    const value = text.trim();
    if (!value) {
      // user left it empty (placeholder visible) -> save empty & show "No strategy is set."
      await saveStrategy('');
      setText('');
      setPlaceholder(EMPTY_PLACEHOLDER);
      onSaved?.('');
    } else {
      await saveStrategy(value);
      onSaved?.(value);
      setPlaceholder(INITIAL_PLACEHOLDER);
    }
    setShowSetButton(false); // lock editing, show only Reset
  }

  async function handleReset() {
    // unlock editing and restore initial placeholder; clear saved value
    setText('');
    setPlaceholder(INITIAL_PLACEHOLDER);
    await saveStrategy('');
    onSaved?.('');
    setShowSetButton(true); // unlock + restore two-button layout
  }

  return (
    <View style={[styles.card, shadows.card]}>
      <Text style={styles.title}>Team Strategy / Scouting Philosophy</Text>
      <Text style={styles.hint}>
        Add principles, roster notes, playstyle, constraints, or scouting goals. The assistant will use it as context.
      </Text>

      <TextInput
        style={[styles.input, locked && styles.inputDisabled, { height: inputHeight }]}
        value={text}
        onChangeText={setText}
        editable={!locked}                // 🔒 lock after Set; unlock after Reset
        selectTextOnFocus={!locked}
        placeholder={placeholder}
        placeholderTextColor={MUTED}
        multiline
        textAlignVertical="top"
        onContentSizeChange={(e) => {
          const h = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, e.nativeEvent.contentSize.height + 24));
          setInputHeight(h);
        }}
      />

      {showSetButton ? (
        // Two equal-width buttons (initial / unlocked)
        <View style={styles.actionsRow}>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.btnHalf, styles.btnOutline, pressed && styles.pressed]}
          >
            <RotateCcw size={18} color="white" />
            <Text style={styles.btnText}>Reset Strategy</Text>
          </Pressable>

          <Pressable
            onPress={handleSet}
            style={({ pressed }) => [styles.btnHalf, styles.btnPrimary, pressed && styles.pressed]}
          >
            <Save size={18} color="white" />
            <Text style={styles.btnText}>Set Strategy</Text>
          </Pressable>
        </View>
      ) : (
        // After Set (locked): single centered Reset
        <View style={styles.singleWrap}>
          <Pressable
            onPress={handleReset}
            style={({ pressed }) => [styles.singleBtn, styles.btnOutline, pressed && styles.pressed]}
          >
            <RotateCcw size={18} color="white" />
            <Text style={styles.btnText}>Reset Strategy</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: PANEL,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  title: { color: 'white', fontSize: 18, fontWeight: '800' },
  hint: { color: MUTED, marginTop: 6, marginBottom: 14, fontSize: 13 },

  input: {
    color: 'white',
    backgroundColor: BG,
    borderColor: LINE,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 22,
  },
  inputDisabled: {
    opacity: 0.7,         // subtle “read-only” look
  },

  // Two equal-width buttons
  actionsRow: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  btnHalf: {
    width: '48%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Single centered Reset button (locked)
  singleWrap: { marginTop: 14, alignItems: 'center' },
  singleBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  btnPrimary: { backgroundColor: ACCENT },
  btnOutline: { borderWidth: 1.5, borderColor: LINE, backgroundColor: 'transparent' },
  btnText: { color: 'white', fontWeight: '800', marginLeft: 8 },
  pressed: { opacity: 0.9 },
});
