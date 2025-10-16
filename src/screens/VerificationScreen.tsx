// src/screens/VerificationScreen.tsx
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList } from '@/types';
import { verifyResetCode, verifySignupCode} from '@/services/api';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Verification'>;
type Route = RouteProp<RootStackParamList, 'Verification'>;


export default function VerificationScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>(); // { email, context: 'signup' | 'reset' }
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSixDigits = useMemo(() => /^\d{6}$/.test(code), [code]);

  const handleVerify = async () => {
    if (!isSixDigits || submitting) return;
    try {
      setError(null);
      setSubmitting(true);

      if (params.context === 'reset') {
        await verifyResetCode(params.email, code);
        navigation.replace('NewPassword', { email: params.email });
        return
      } else {
        await verifySignupCode(params.email, code); 
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    } catch (e: any) {
      setError(e?.message || 'Verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    params.context === 'signup' ? 'Verify your email' : 'Verify your reset request';

  const subtitle =
    params.context === 'signup'
      ? `Enter the 6-digit code we sent to ${params.email}.`
      : `Enter the 6-digit code sent to ${params.email} to continue resetting your password.`;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: BG }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.wrap}>
        <Text style={styles.appName}>ScoutIQ</Text>

        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Verification code</Text>
            <TextInput
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              placeholderTextColor={MUTED}
              keyboardType="number-pad"
              style={styles.input}
              maxLength={6}
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={handleVerify}
            disabled={!isSixDigits || submitting}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: pressed ? ACCENT_DARK : ACCENT,
                opacity: !isSixDigits || submitting ? 0.6 : 1,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.primaryBtnText}>Verify</Text>
            )}
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
  title: { color: TEXT, fontSize: 20, fontWeight: '700', textAlign: 'center',},
  subtitle: { color: MUTED, marginTop: 6, marginBottom: 12, lineHeight: 20, textAlign: 'center',},

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
    fontSize: 18,
    letterSpacing: 4,
    textAlign: 'center',
  },
 
  error: { color: '#F87171', marginTop: 12, fontWeight: '600' },

  primaryBtn: { marginTop: 16, borderRadius: 14, alignItems: 'center', paddingVertical: 14 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },
});
