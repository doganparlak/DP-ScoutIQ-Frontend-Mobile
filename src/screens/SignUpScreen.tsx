// src/screens/SignUpScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignUpScreen() {
  const navigation = useNavigation<Nav>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [dob, setDob] = useState('');       // e.g., 1998-04-21
  const [country, setCountry] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwStrongEnough = password.length >= 6;
  const pwMatch = password === repeat;

  const isValid = useMemo(() => {
    return (
      emailRegex.test(email) &&
      pwStrongEnough &&
      pwMatch &&
      !!country.trim() &&
      !!dob.trim() &&
      agreeTerms // Terms must be accepted
    );
  }, [email, pwStrongEnough, pwMatch, country, dob, agreeTerms]);

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    try {
      setError(null);
      setSubmitting(true);
      // TODO: Hook to your real signup service (services/)
      await new Promise((r) => setTimeout(r, 700));

      // If success → go to Login page
      navigation.replace('Verification', { email, context: 'signup' });
    } catch {
      setError('Sign up failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const goToLogin = () => navigation.replace('Login');

  const openTerms = () => {
    // Replace with your real terms URL
    Linking.openURL('https://example.com/terms');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.wrap}>
        <Text style={styles.appName}>Sign-up</Text>

        <View style={styles.card}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join ScoutIQ and elevate your talent discovery.</Text>

          {/* Email */}
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

          {/* Password */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="next"
            />
            <Text style={styles.hint}>Minimum 6 characters</Text>
          </View>

          {/* Repeat Password */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Repeat Password</Text>
            <TextInput
              value={repeat}
              onChangeText={setRepeat}
              placeholder="••••••••"
              placeholderTextColor={MUTED}
              secureTextEntry
              style={styles.input}
              returnKeyType="next"
            />
            {!pwMatch ? <Text style={styles.errorTextInline}>Passwords don’t match.</Text> : null}
          </View>

          {/* Date of Birth */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              value={dob}
              onChangeText={setDob}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={MUTED}
              style={styles.input}
              returnKeyType="next"
            />
          </View>

          {/* Country */}
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Country</Text>
            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder="e.g., Türkiye"
              placeholderTextColor={MUTED}
              style={styles.input}
              returnKeyType="done"
            />
          </View>

          {/* Checkboxes */}
          <Pressable onPress={() => setAgreeTerms((v) => !v)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, agreeTerms && styles.checkboxChecked]} />
            <Text style={styles.checkboxText}>
              I have read and accept the{' '}
              <Text style={styles.link} onPress={openTerms}>
                Terms of Use
              </Text>
              .
            </Text>
          </Pressable>

          <Pressable onPress={() => setNewsletter((v) => !v)} style={styles.checkboxRow}>
            <View style={[styles.checkbox, newsletter && styles.checkboxChecked]} />
            <Text style={styles.checkboxText}>
              I would like to receive news and performance insights from ScoutIQ.
            </Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
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
              <Text style={styles.primaryBtnText}>Sign up</Text>
            )}
          </Pressable>

          {/* Already have an account? Log in */}
          <Pressable onPress={goToLogin} style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={styles.secondaryBtnText}>
              Already have an account? <Text style={{ fontWeight: '700' }}>Log in</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const BOX_SIZE = 18;

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 8 },
  appName: { color: TEXT, fontSize: 28, fontWeight: '800', marginBottom: 14, letterSpacing: 0.5 },
  card: { width: '100%', maxWidth: 560, backgroundColor: PANEL, borderRadius: 20, borderWidth: 1, borderColor: LINE, padding: 18 },
  title: { color: TEXT, fontSize: 20, fontWeight: '700' },
  subtitle: { color: MUTED, marginTop: 6, marginBottom: 12 },

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

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  checkbox: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  checkboxChecked: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  checkboxText: { color: TEXT, flex: 1, lineHeight: 20 },
  link: { color: ACCENT, fontWeight: '700' },

  errorTextInline: { color: '#F87171', marginTop: 6, fontSize: 12 },
  errorText: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: { marginTop: 18, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
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
  secondaryBtnText: { color: MUTED, fontSize: 14, textAlign: 'center' },
});
