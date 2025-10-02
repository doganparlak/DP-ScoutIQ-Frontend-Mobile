import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BG, TEXT, ACCENT, ACCENT_DARK, LINE, PANEL } from '@/theme';
import { RootStackParamList } from '@/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'Login'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={styles.wrap}>
      <Text style={styles.appName}>ScoutIQ</Text>

      <Pressable
        onPress={() => navigation.navigate('Login')}
        style={({ pressed }) => [
          styles.primaryBtn,
          { backgroundColor: pressed ? ACCENT_DARK : ACCENT },
        ]}
      >
        <Text style={styles.primaryBtnText}>Log in</Text>
      </Pressable>

      <Pressable
        onPress={() => navigation.navigate('SignUp')}
        style={({ pressed }) => [
          styles.secondaryBtn,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <Text style={styles.secondaryBtnText}>Sign up</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  appName: {
    color: TEXT,
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 40,
  },
  primaryBtn: {
    width: '80%',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
  },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    width: '80%',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
  },
  secondaryBtnText: { color: TEXT, fontWeight: '600', fontSize: 15 },
});
