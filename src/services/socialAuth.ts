import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, TurboModuleRegistry } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { API_BASE_URL } from '@/config';
import type { Profile, UILang } from './api';

export type SocialProvider = 'apple' | 'google';
export type SocialPending = { status: 'pending'; challenge: string; provider: SocialProvider; email?: string | null };
export type SocialResult = SocialPending | { status: 'connected' } | { status: 'authenticated'; token: string; user: Profile };
export type SocialConfig = {
  appleIOS: boolean; appleAndroid: boolean; googleIOS: boolean; googleAndroid: boolean;
  googleWebClientId: string; googleIOSClientId: string;
};
const EMPTY: SocialConfig = { appleIOS: false, appleAndroid: false, googleIOS: false, googleAndroid: false, googleWebClientId: '', googleIOSClientId: '' };
let configCache: { value: SocialConfig; expires: number } | null = null;
let configRequest: Promise<SocialConfig> | null = null;

export class SocialAuthError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function request<T>(path: string, body?: unknown, authenticated = false): Promise<T> {
  const token = authenticated ? await AsyncStorage.getItem('auth_token') : null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new SocialAuthError(typeof data.detail === 'string' ? data.detail : 'Sign-in failed', response.status);
    return data as T;
  } finally { clearTimeout(timeout); }
}

export function getSocialConfig(): Promise<SocialConfig> {
  if (configCache && configCache.expires > Date.now()) return Promise.resolve(configCache.value);
  if (!configRequest) configRequest = request<SocialConfig>('/auth/social/config').catch(() => EMPTY).then(value => {
    configCache = { value, expires: Date.now() + 60000 };
    return value;
  }).finally(() => { configRequest = null; });
  return configRequest;
}

export function appleModule(): typeof import('expo-apple-authentication') | null {
  if (Platform.OS !== 'ios' || !requireOptionalNativeModule('ExpoAppleAuthentication')) return null;
  return require('expo-apple-authentication');
}

export function googleAvailable() {
  // An older installed binary keeps email login working until rebuilt with the SDK.
  return !!TurboModuleRegistry.get('RNGoogleSignin');
}

export async function startSocialSignIn(provider: SocialProvider, intent: 'signin' | 'connect', language: UILang): Promise<SocialResult | null> {
  const config = await getSocialConfig();
  const start = await request<{ challenge: string; nonce: string; authorizationUrl?: string }>('/auth/social/start', {
    provider, platform: Platform.OS, intent,
  }, intent === 'connect');
  if (provider === 'apple' && Platform.OS === 'android') {
    const browser = require('expo-web-browser') as typeof import('expo-web-browser');
    if (!start.authorizationUrl) throw new Error('Apple sign-in unavailable');
    const result = await browser.openAuthSessionAsync(start.authorizationUrl, 'dpscoutiq://auth/apple');
    if (result.type !== 'success' || result.url.includes('cancelled=1')) return null;
    if (result.url.includes('failed=1')) throw new SocialAuthError('Apple sign-in failed', 401);
    return request<SocialResult>('/auth/social/finish', { challenge: start.challenge, uiLanguage: language });
  }
  let idToken: string | null = null;
  let authorizationCode: string | null = null;
  if (provider === 'apple') {
    const apple = appleModule();
    if (!apple) throw new Error('Apple sign-in unavailable');
    try {
      const credential = await apple.signInAsync({
        requestedScopes: [apple.AppleAuthenticationScope.EMAIL, apple.AppleAuthenticationScope.FULL_NAME], nonce: start.nonce,
      });
      idToken = credential.identityToken;
      authorizationCode = credential.authorizationCode;
    } catch (error) {
      if ((error as { code?: string }).code === 'ERR_REQUEST_CANCELED') return null;
      throw error;
    }
  } else {
    if (!googleAvailable()) throw new Error('Google sign-in unavailable');
    const google = require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin');
    google.GoogleSignin.configure({ webClientId: config.googleWebClientId, iosClientId: config.googleIOSClientId || undefined });
    try {
      if (Platform.OS === 'android') await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Always let the user choose the account, especially when linking an identity.
      await google.GoogleSignin.signOut();
      const result = await google.GoogleSignin.signIn();
      if (!google.isSuccessResponse(result)) return null;
      idToken = result.data.idToken;
    } catch (error) {
      if ((error as { code?: string }).code === google.statusCodes.SIGN_IN_CANCELLED) return null;
      throw error;
    }
  }
  if (!idToken) throw new Error('No identity token received');
  return request<SocialResult>('/auth/social/exchange', { challenge: start.challenge, idToken, authorizationCode, uiLanguage: language });
}

export async function saveSocialSession(result: SocialResult) {
  if (result.status !== 'authenticated') throw new Error('Sign-in incomplete');
  await AsyncStorage.setItem('auth_token', result.token);
  await AsyncStorage.removeItem('reachout_sent_this_login').catch(() => {});
  return result.user;
}

export function linkSocialAccount(challenge: string, email: string, password: string, uiLanguage: UILang) {
  return request<SocialResult>('/auth/social/link', { challenge, email, password, uiLanguage });
}

export function registerSocialAccount(body: {
  challenge: string; dob: string | null; country: string; newsletter: boolean;
  privacyAccepted: boolean; termsAccepted: boolean; dataUsageAccepted: boolean; uiLanguage: UILang;
}) { return request<SocialResult>('/auth/social/register', body); }

export function getConnectedProviders() {
  return request<{ providers: SocialProvider[] }>('/me/identities', undefined, true);
}
