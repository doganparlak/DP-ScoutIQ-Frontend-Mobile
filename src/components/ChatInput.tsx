// src/components/ChatInput.tsx
import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';
import { ACCENT, BG, PANEL, MUTED, LINE } from '@/theme';
import { useTranslation } from 'react-i18next';

type Props = {
  value: string;
  onChangeText: (t: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
};

export default function ChatInput({ value, onChangeText, onSend, disabled }: Props) {
  const { t } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const canSend = value.trim().length > 0 && !disabled;

  function handleSend() {
    const msg = value.trim();
    if (!msg || disabled) return;
    // Parent will clear value; we just call onSend
    onSend(msg);
    // Safety: clear native buffer & blur in case IME lags
    inputRef.current?.clear();
    inputRef.current?.blur();
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={t('chatPlaceholder', 'Type your message…')}
        placeholderTextColor={MUTED}
        style={styles.input}
        multiline
        editable={!disabled}
        accessibilityLabel={t('chatInputAL', 'Message input')}
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
      />
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel={t('send', 'Send')}
        style={({ pressed }) => [styles.btn, { opacity: canSend ? (pressed ? 0.9 : 1) : 0.5 }]}
      >
        <Text style={styles.btnText}>{t('send', 'Send')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // ⬇️ Add marginBottom to lift the bar up a bit, and slightly reduce padding
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 0,
    backgroundColor: BG,
    borderTopColor: LINE,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    color: 'white',
    backgroundColor: PANEL,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    maxHeight: 130,
    textAlign: 'left',
  },
  btn: {
    backgroundColor: ACCENT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
  },
  btnText: { color: 'white', fontWeight: '700' },
});
