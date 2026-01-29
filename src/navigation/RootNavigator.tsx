// src/navigation/RootNavigator.tsx
import React, { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import MainTabs from '@/navigation/MainTabs';
import WelcomeScreen from '@/screens/WelcomeScreen';
import LoginScreen from '@/screens/LoginScreen';
import SignUpScreen from '@/screens/SignUpScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import VerificationScreen from '@/screens/VerificationScreen';
import NewPasswordScreen from '@/screens/NewPasswordScreen';
import { restoreSubscriptionIfAny } from '@/subscriptions/restore';

import { View, ActivityIndicator, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { BG, ACCENT } from '@/theme';
import { getMe } from '@/services/api';

// We intentionally don't type these stacks with your RootStackParamList
// because we introduce two new, top-level routes: "Auth" and "App".
const Root = createNativeStackNavigator();
const Auth = createNativeStackNavigator();
const App = createNativeStackNavigator();

function Splash() {
  return (
    <View style={{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color={ACCENT} />
    </View>
  );
}

function AuthStack() {
  return (
    <Auth.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
      <Auth.Screen name="Welcome" component={WelcomeScreen} />
      <Auth.Screen name="Login" component={LoginScreen} />
      <Auth.Screen name="SignUp" component={SignUpScreen} />
      <Auth.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Auth.Screen name="Verification" component={VerificationScreen} />
      <Auth.Screen name="NewPassword" component={NewPasswordScreen} />
      {/* You can still navigate to MainTabs from Auth if you want,
          but typically you'll reset to 'App' after login */}
      <Auth.Screen name="MainTabs" component={MainTabs} />
    </Auth.Navigator>
  );
}

function AppStack() {
  React.useEffect(() => {
    (async () => {
      try {
        await restoreSubscriptionIfAny();
      } catch {}
    })();
  }, []);
  
  return (
    <App.Navigator screenOptions={{ headerShown: false }}>
      <App.Screen name="MainTabs" component={MainTabs} />
    </App.Navigator>
  );
}

export default function RootNavigator() {
  const [booting, setBooting] = useState(true);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        setIsAuthed(false);
        return;
      }
      // Validate with backend; if the session was revoked/expired, this should 401.
      await getMe();

     

      setIsAuthed(true);
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      // Only wipe token on real auth errors; network hiccups shouldn't delete it.
      if (msg.includes('401') || msg.includes('403')) {
        await AsyncStorage.removeItem('auth_token');
      }
      setIsAuthed(false);
    } finally {
      setBooting(false);
    }
  }, []);

  // Run once at startup
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Re-check whenever the app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') checkAuth();
    });
    return () => sub.remove();
  }, [checkAuth]);

  if (booting || isAuthed === null) return <Splash />;

  return (
    <NavigationContainer>
      <Root.Navigator
        screenOptions={{ headerShown: false }}
        initialRouteName={isAuthed ? 'App' : 'Auth'}
      >
        <Root.Screen name="Auth" component={AuthStack} />
        <Root.Screen name="App" component={AppStack} />
      </Root.Navigator>
    </NavigationContainer>
  );
}
