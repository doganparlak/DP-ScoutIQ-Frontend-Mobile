import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STRATEGY = 'strategy.v1';
const KEY_HISTORY = 'history.v1';

export async function saveStrategy(strategy: string) {
await AsyncStorage.setItem(KEY_STRATEGY, strategy);
}

export async function loadStrategy() {
return (await AsyncStorage.getItem(KEY_STRATEGY)) || '';
}

export async function saveHistory(messages: any) {
await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(messages));
}

export async function loadHistory() {
const raw = await AsyncStorage.getItem(KEY_HISTORY);
return raw ? JSON.parse(raw) : [];
}

export async function clearAll() {
await AsyncStorage.multiRemove([KEY_STRATEGY, KEY_HISTORY]);
}