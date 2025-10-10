// src/screens/NewPassword.tsx
import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, KeyboardAvoidingView,
  Platform, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { setNewPassword } from '@/services/api';

type Nav = NativeStackNavigationProp<RootStackParamList, 'NewPassword'>;
type Route = RouteProp<RootStackParamList, 'NewPassword'>;

/**
 * Make sure your RootStackParamList has:
 *   NewPassword: { email: string }
 */

export default function NewPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>(); // { email }
  const email = params.email;

  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minLen = 6;
  const isValid = useMemo(() => {
    return password.length >= minLen && again.length >= minLen && password === again;
  }, [password, again]);

  const handleSave = async () => {
    if (!isValid || submitting) return;
    try {
      setError(null);
      setSubmitting(true);

      await setNewPassword({ email, new_password: password });

      // done → back to Login
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e: any) {
      setError(e?.message || 'Could not set your new password. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.wrap}>
        <Text style={styles.appName}>ScoutIQ</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Create a new password</Text>
          <Text style={styles.subtitle}>
            Set a new password for <Text style={{ fontWeight: '700' }}>{email}</Text>.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>New password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="next"
            />
            <Text style={styles.hint}>Minimum {minLen} characters</Text>
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Re-enter new password</Text>
            <TextInput
              value={again}
              onChangeText={setAgain}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          {password && again && password !== again ? (
            <Text style={styles.error}>Passwords do not match.</Text>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleSave}
            disabled={!isValid || submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: pressed ? ACCENT_DARK : ACCENT, opacity: !isValid || submitting ? 0.6 : 1 },
            ]}
          >
            {submitting ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Save password</Text>}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  appName: { color: TEXT, fontSize: 28, fontWeight: '800', marginBottom: 14, letterSpacing: 0.5 },

  card: { width: '100%', maxWidth: 560, backgroundColor: PANEL, borderRadius: 20, borderWidth: 1, borderColor: LINE, padding: 18 },
  title: { color: TEXT, fontSize: 20, fontWeight: '700' },
  subtitle: { color: MUTED, marginTop: 6, marginBottom: 12, lineHeight: 20 },

  fieldBlock: { marginTop: 12 },
  label: { color: TEXT, marginBottom: 6, fontWeight: '600' },
  input: {
    color: TEXT, backgroundColor: CARD, borderColor: LINE, borderWidth: 1.5,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16,
  },
  hint: { color: MUTED, marginTop: 6, fontSize: 12 },

  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: { marginTop: 16, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },
});
