import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_STRATEGY = 'strategy.v1';
const KEY_HISTORY = 'history.v1';
const KEY_SESSION = 'session.v1';

export async function saveStrategy(strategy: string) {
await AsyncStorage.setItem(KEY_STRATEGY, strategy);
}

export async function loadStrategy() {
return (await AsyncStorage.getItem(KEY_STRATEGY)) || '';
}

// Loading placeholders belong only to the active request, never saved history.
function completedHistory(messages: any) {
  return Array.isArray(messages) ? messages.filter(message => message && !message.pending) : [];
}

export async function saveHistory(messages: any) {
  await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(completedHistory(messages)));
}

export async function loadHistory() {
  const raw = await AsyncStorage.getItem(KEY_HISTORY);
  if (!raw) return [];
  const history = JSON.parse(raw);
  const completed = completedHistory(history);
  // Clean up placeholders saved by older app versions as well.
  if (!Array.isArray(history) || completed.length !== history.length) {
    await AsyncStorage.setItem(KEY_HISTORY, JSON.stringify(completed));
  }
  return completed;
}

export async function clearAll() {
await AsyncStorage.multiRemove([KEY_STRATEGY, KEY_HISTORY]);
}

export async function getSessionId() {
  let id = await AsyncStorage.getItem(KEY_SESSION);
  if (!id) {
    id = Math.random().toString(36).slice(2);
    await AsyncStorage.setItem(KEY_SESSION, id);
  }
  return id;
}