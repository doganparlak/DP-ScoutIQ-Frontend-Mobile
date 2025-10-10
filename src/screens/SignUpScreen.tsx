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
  Switch,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { signUp, requestSignupCode } from '@/services/api';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SignUp'>;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export default function SignUpScreen() {
  const navigation = useNavigation<Nav>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');       // e.g., 1998-04-21
  const [country, setCountry] = useState('');
  const [agree, setAgree] = useState(false);
  const [newsletter, setNewsletter] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => {
    return (
      emailRegex.test(email) &&
      password.length >= 6 &&
      dateRegex.test(dob) &&
      country.trim().length >= 2 &&
      agree
    );
  }, [email, password, dob, country, agree]);

  const goToLogin = () => navigation.replace('Login');

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    try {
      setError(null);
      setSubmitting(true);

      await signUp({ email, password, dob, country, plan: 'Free', favorite_players: [], newsletter });
      await requestSignupCode(email);
      // Your Verification screen expects: { email, context: 'signup' }
      navigation.replace('Verification', { email, context: 'signup' });
    } catch {
      setError('Sign up failed. Please try again.');
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
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Join the scouting revolution.</Text>

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
              returnKeyType="next"
            />
            <Text style={styles.hint}>Min 6 characters</Text>
          </View>

          <View style={styles.row2}>
            <View style={[styles.fieldBlock, { flex: 1, marginRight: 6 }]}>
              <Text style={styles.label}>Date of birth</Text>
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={MUTED}
                style={styles.input}
                returnKeyType="next"
              />
            </View>
            <View style={[styles.fieldBlock, { flex: 1, marginLeft: 6 }]}>
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
          </View>

          <View style={[styles.switchRow, { marginTop: 12 }]}>
            <Text style={styles.switchLabel}>Subscribe to newsletter</Text>
            <Switch value={newsletter} onValueChange={setNewsletter} />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>I agree to the Terms & Privacy</Text>
            <Switch value={agree} onValueChange={setAgree} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
            {submitting ? <ActivityIndicator /> : <Text style={styles.primaryBtnText}>Sign up</Text>}
          </Pressable>

          <Pressable
            onPress={goToLogin}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
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
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  appName: { color: TEXT, fontSize: 28, fontWeight: '800', marginBottom: 14, letterSpacing: 0.5 },
  card: { width: '100%', maxWidth: 560, backgroundColor: PANEL, borderRadius: 20, borderWidth: 1, borderColor: LINE, padding: 18 },
  title: { color: TEXT, fontSize: 20, fontWeight: '700' },
  subtitle: { color: MUTED, marginTop: 6, marginBottom: 12, lineHeight: 20 },

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

  row2: { flexDirection: 'row', alignItems: 'center' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  switchLabel: { color: TEXT },

  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: { marginTop: 16, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
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