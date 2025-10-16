// src/screens/LoginScreen.tsx
import React, { useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { login } from '@/services/api';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(
    () => emailRegex.test(email) && password.length >= 6,
    [email, password]
  );

  const goToMainTabs = () => navigation.replace('MainTabs', { screen: 'Strategy' });
  const handleForgotPassword = () => navigation.navigate('ResetPassword');
  const goToSignUp = () => navigation.navigate('SignUp');

  const handleLogin = async () => {
    if (!isValid || submitting) return;
    try {
      setError(null);
      setSubmitting(true);
      await login({ email, password });
      await AsyncStorage.removeItem('reachout_sent_this_login').catch(() => {});
      goToMainTabs();
    } catch {
      setError('Log in failed. Please check your credentials.');
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
        {/* App name above the frame */}
        <Text style={styles.appName}>Login</Text>

        {/* Login frame/card */}
        <View style={styles.card}>
          {/* Scouting-context greeting (centered) */}
          <Text style={styles.greeting}>
            Spot the next star before anyone else.
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@club.com"
              placeholderTextColor={MUTED}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <Text style={styles.hint}>Min 6 characters</Text>
          </View>

          {/* Forgot password link */}
          <Pressable onPress={handleForgotPassword} style={({ pressed }) => [{ alignSelf: 'flex-end', opacity: pressed ? 0.8 : 1 }]}>
            <Text style={styles.forgotLink}>Did you forget your password?</Text>
          </Pressable>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Log in */}
          <Pressable
            onPress={handleLogin}
            disabled={!isValid || submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: pressed ? ACCENT_DARK : ACCENT,
                opacity: !isValid || submitting ? 0.6 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryBtnText}>Log in</Text>
            )}
          </Pressable>

          {/* Sign up */}
          <Pressable
            onPress={goToSignUp}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.secondaryBtnText}>
              Don’t have an account yet? <Text style={{ fontWeight: '700' }}>Sign up</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  appName: {
    color: TEXT,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 14, // sits on top of the frame
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 18,
  },
  greeting: {
    color: TEXT,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  fieldBlock: { marginTop: 12 },
  label: { color: TEXT, marginBottom: 6, fontWeight: '600' },
  input: {
    color: TEXT,
    backgroundColor: CARD,
    borderColor: LINE,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  hint: { color: MUTED, marginTop: 6, fontSize: 12 },
  forgotLink: { color: ACCENT, fontWeight: '700', marginTop: 8 },
  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: {
    marginTop: 16,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },

  secondaryBtn: {
    marginTop: 12,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'transparent',
  },
  secondaryBtnText: { color: MUTED, fontSize: 14 },
});
