import { ThemeColorsContext,ThemePreferenceContext,themePalettes,type ThemeMode } from '@/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { Appearance,StatusBar,View } from 'react-native';

const STORAGE_KEY = 'scoutwise.appearance.v1';

export function ThemeProvider({children}: {children: React.ReactNode}) {
  const [mode, updateMode] = React.useState<ThemeMode>('dark');
  const [ready, setReady] = React.useState(false);
  const persistence = React.useRef<Promise<unknown>>(Promise.resolve());
  React.useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (active && (saved === 'light' || saved === 'dark')) updateMode(saved);
    }).catch(() => {}).finally(() => {if (active) setReady(true);});
    return () => {active = false;};
  }, []);
  const setMode = React.useCallback((next: ThemeMode) => {
    updateMode(next);
    // Keep rapid taps ordered so the last choice is also the persisted choice.
    persistence.current = persistence.current.catch(() => {}).then(() => AsyncStorage.setItem(STORAGE_KEY, next));
    void persistence.current.catch(() => {});
  }, []);
  React.useEffect(() => {Appearance.setColorScheme(mode);}, [mode]);
  const preference = React.useMemo(() => ({mode, setMode}), [mode, setMode]);
  const colors = themePalettes[mode];
  return <ThemePreferenceContext.Provider value={preference}><ThemeColorsContext.Provider value={colors}>
    <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.BG}/>
    <View style={{flex: 1, backgroundColor: colors.BG}}>{ready ? children : null}</View>
  </ThemeColorsContext.Provider></ThemePreferenceContext.Provider>;
}
