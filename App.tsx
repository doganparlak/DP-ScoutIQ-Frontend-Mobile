import * as React from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'react-native';
import StrategyScreen from '@/screens/StrategyScreen';
import ChatScreen from '@/screens/ChatScreen';
import LoginScreen from '@/screens/LoginScreen';
import WelcomeScreen from '@/screens/WelcomeScreen';
import SignUpScreen from '@/screens/SignUpScreen';
import ResetPasswordScreen from '@/screens/ResetPasswordScreen';
import VerificationScreen from '@/screens/VerificationScreen';
import MainTabs from '@/navigation/MainTabs'; 
import MyProfileScreen from '@/screens/MyProfileScreen';
import { BG } from '@/theme';
import { RootStackParamList } from '@/types';
import NewPasswordScreen from '@/screens/NewPasswordScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: BG } }}>
      <StatusBar barStyle="light-content" />
      <Stack.Navigator initialRouteName="Welcome" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        <Stack.Screen name="Verification" component={VerificationScreen} />
        <Stack.Screen name="NewPassword" component={NewPasswordScreen} />
        {/*<Stack.Screen name="Profile" component={MyProfileScreen} /> 
        <Stack.Screen name="Strategy" component={StrategyScreen} />
        <Stack.Screen name="Chat" component={ChatScreen} />*/}
        <Stack.Screen name="MainTabs" component={MainTabs} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
