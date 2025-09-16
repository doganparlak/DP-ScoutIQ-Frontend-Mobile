import * as React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StrategyScreen from '@/screens/StrategyScreen';
import ChatScreen from '@/screens/ChatScreen';
import { BG } from '@/theme';
import { StatusBar } from 'react-native';

const Stack = createNativeStackNavigator();

export default function App() {
    return (
    <NavigationContainer theme={{ ...DarkTheme, colors: { ...DarkTheme.colors, background: BG } }}>
        <StatusBar barStyle="light-content" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Strategy" component={StrategyScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
    </NavigationContainer>
    );
}