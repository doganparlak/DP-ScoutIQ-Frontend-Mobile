import {createContext, useContext} from 'react';

export type ThemeMode = 'dark' | 'light';
const dark = {
  BG: '#111315', PANEL: '#1A1D1A', CARD: '#1F2220', TEXT: '#FFFFFF', MUTED: '#7A7A85',
  LINE: '#1F2937', ACCENT: '#16A34A', ACCENT_DARK: '#15803D', DANGER: '#E5484D', DANGER_DARK: '#C43C42',
  FEATURE_COLORS: {pro: '#FBBF24', scorePrediction: '#60A5FA'},
};
const light: typeof dark = {
  BG: '#F3F6F4', PANEL: '#FFFFFF', CARD: '#EAF0EC', TEXT: '#17271E', MUTED: '#59685F',
  LINE: '#CFDCD3', ACCENT: '#137A3A', ACCENT_DARK: '#166534', DANGER: '#C92A35', DANGER_DARK: '#A61F2A',
  FEATURE_COLORS: {pro: '#855E00', scorePrediction: '#1D4ED8'},
};

export const WORLD_CUP_COLORS = {
  darkGreen: '#004C3F',
  mint: '#62F6D2',
  purple: '#5C00E6',
  lime: '#B6F000',
  orange: '#FF3D00',
  blue: '#3157F6',
  lavender: '#A784F4',
  red: '#E40000',
  burgundy: '#7A0D0D',
  yellow: '#F4FF2F',
  coral: '#FF8F91',
  text: '#FFFFFF',
  panel: '#0B2F2A',
  card: '#103D35',
  accent: '#F4FF2F',
  accentDark: '#B6F000',
  muted: '#86AAA2',
  line: '#62F6D2',
  glow: 'rgba(98, 246, 210, 0.16)',
  palette: [
    '#004C3F',
    '#62F6D2',
    '#5C00E6',
    '#B6F000',
    '#FF3D00',
    '#3157F6',
    '#A784F4',
    '#E40000',
    '#7A0D0D',
    '#F4FF2F',
    '#FF8F91',
  ],
};


// Historic chart/action tones keep their meaning, with readable equivalents on white surfaces.
const lightTones: Record<string, string> = {
  '#16a34a': '#137A3A', '#34d399': '#087F67', '#86efac': '#137A3A', '#b7f7c8': '#137A3A', '#ef4444': '#C92A35', '#fca5a5': '#C92A35',
  '#22c55e': '#137A3A', '#4ade80': '#137A3A', '#24f5a6': '#137A3A', '#62f6d2': '#087F67',
  '#38bdf8': '#086A9E', '#60a5fa': '#1D4ED8', '#8eb7cf': '#346A89', '#93c5fd': '#1D4ED8',
  '#2dd4bf': '#0F766E', '#14b8a6': '#0F766E', '#22d3ee': '#087E96',
  '#b4a3d3': '#71529C', '#c084fc': '#8247AF', '#a78bfa': '#7550B5', '#c4b5fd': '#7550B5',
  '#fbbf24': '#855E00', '#f59e0b': '#A86600', '#facc15': '#855E00', '#fcd34d': '#855E00',
  '#f87171': '#C92A35', '#fb7185': '#BE3458', '#f472b6': '#B62F77', '#fb923c': '#AC5513',
};
const neutralBackgrounds = new Set(['#000', '#000000', '#111315', '#1a1d1a', '#1f2220', '#0b1114', '#101214', '#0f1115', '#111827', '#0b1220', '#0b0f14', '#101214', '#121212', '#121416', '#151719', '#18181b', '#1c1f1d', '#202421', '#242826', '#252a27', '#1c1c1e', '#181b19', '#0f1210']);
const mutedNeutrals = new Set(['#7a7a85', '#9ca3af', '#94a3b8', '#9ca3b0', '#b6c5bc', '#a9b9af', '#b7c4bb', '#a7b9ad', '#cbd5e1', '#d1d5db', '#e5e7eb', '#e5ebe7', '#aab5ae', '#a3b8ac', '#90a99b', '#b5c8bd', '#8ca99a']);

type ColorRole = 'text' | 'surface' | 'border' | 'fixed' | 'onAccent';
function resolveColor(value: string, mode: ThemeMode, role?: ColorRole): string {
  if (mode === 'dark' || role === 'fixed') return value;
  if (role === 'onAccent') return '#FFFFFF';
  const key = value.toLowerCase().replace(/\s/g, '');
  const rgb = /^#([a-f0-9]{6})$/.exec(key);
  if (rgb && role) {
    const channels = [0, 2, 4].map(i => parseInt(rgb[1].slice(i,i+2),16));
    const max = Math.max(...channels), min = Math.min(...channels);
    if (role === 'surface') {
      if (min > 245) return light.PANEL;
      if (max-min <= 24) return light.CARD;
      if (max > 120) return lightTones[key] || value;
      return '#' + channels.map(c => Math.round(c*.09 + 255*.91).toString(16).padStart(2,'0')).join('');
    }
    if (role === 'border' && max-min <= 24) return light.LINE;
    if (role === 'text' && max-min <= 24) return max < 85 || min > 245 ? light.TEXT : light.MUTED;
  }
  if (key === 'white' || key === '#fff' || key === '#ffffff') return light.TEXT;
  if (neutralBackgrounds.has(key)) return key === '#111315' ? light.BG : light.CARD;
  if (mutedNeutrals.has(key)) return light.MUTED;
  if (key === '#1f2937' || key === '#374151' || key === '#334155') return light.LINE;
  if (lightTones[key]) return lightTones[key];
  const hexAlpha = /^#([a-f0-9]{6})([a-f0-9]{2})$/.exec(key);
  if (hexAlpha) {
    const base = resolveColor('#' + hexAlpha[1], mode);
    return `${base}${hexAlpha[2]}`;
  }
  const whiteAlpha = /^rgba\(255,255,255,([.\d]+)\)$/.exec(key);
  if (whiteAlpha) return `rgba(23,39,30,${whiteAlpha[1]})`;
  // Other neutral greys are surfaces when dark, and secondary text when light.
  const hex = /^#([a-f0-9]{6})$/.exec(key);
  if (hex) {
    const r = parseInt(hex[1].slice(0,2),16), g = parseInt(hex[1].slice(2,4),16), b = parseInt(hex[1].slice(4,6),16);
    if (Math.max(r,g,b)-Math.min(r,g,b) <= 22) return (r+g+b)/3 < 85 ? light.CARD : light.MUTED;
  }
  if (rgb && role === 'text') {
    let channels = [0, 2, 4].map(i => parseInt(rgb[1].slice(i,i+2),16));
    const luminance = (cs: number[]) => cs.map(c => {const v=c/255;return v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4);}).reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
    while ((1.05/(luminance(channels)+.05)) < 4.5) channels = channels.map(c => Math.floor(c*.92));
    return '#' + channels.map(c => c.toString(16).padStart(2,'0')).join('');
  }
  return value;
}

function palette(mode: ThemeMode) {
  const colors = mode === 'dark' ? dark : light;
  const resolvedColors = new Map<string, string>();
  const themeColor = (value: string, role?: ColorRole) => {
    const key = `${role || ''}:${value}`;
    if (!resolvedColors.has(key)) resolvedColors.set(key, resolveColor(value, mode, role));
    return resolvedColors.get(key)!;
  };
  return {
    ...colors, mode,
    PITCH_COLORS: mode === 'light' ? {
      edge: '#E3F1E7', center: '#D4E9DC', line: 'rgba(40,83,55,.55)',
      label: '#193C27', percent: '#285038', inactive: 'rgba(255,255,255,.08)',
      active: (intensity: number) => `rgba(19,122,58,${.10 + intensity * .28})`,
    } : {
      edge: '#0A371E', center: '#082616', line: 'rgba(215,239,219,.36)',
      label: 'rgba(255,255,255,.93)', percent: '#D1FAE5', inactive: 'rgba(6,16,11,.24)',
      active: (intensity: number) => `rgba(32,201,151,${.06 + intensity * .62})`,
    },
    WORLD_CUP_COLORS: mode === 'dark' ? WORLD_CUP_COLORS : {
      ...WORLD_CUP_COLORS, panel: colors.PANEL, card: colors.CARD, text: colors.TEXT,
      accent: colors.ACCENT, accentDark: colors.ACCENT_DARK, muted: colors.MUTED,
      mint: '#0F766E', lime: '#557A00', yellow: '#855E00', lavender: '#7550B5',
      line: '#91BAA2', glow: 'rgba(19,122,58,0.08)',
      palette: WORLD_CUP_COLORS.palette.map(value => themeColor(value, 'text')),
    },
    themeColor,
    shadows: {card: {shadowColor: '#000', shadowOpacity: mode === 'dark' ? 0.2 : 0.08,
      shadowRadius: 8, shadowOffset: {width: 0, height: 2}, elevation: 4}},
    FRAME_TITLE: {color: colors.ACCENT, fontSize: 16, fontWeight: '800' as const},
    FRAME_STRIPE: {height: 4, borderRadius: 999, backgroundColor: colors.ACCENT, marginBottom: 10},
    FRAME_HEADING: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8},
  };
}
export const themePalettes = {dark: palette('dark'), light: palette('light')};
export type ThemeColors = ReturnType<typeof palette>;
export type ThemePreference = {mode: ThemeMode; setMode: (mode: ThemeMode) => void};
export const ThemeColorsContext = createContext<ThemeColors>(themePalettes.dark);
export const ThemePreferenceContext = createContext<ThemePreference>({mode: 'dark', setMode: () => {}});
export const useThemeColors = () => useContext(ThemeColorsContext);
export const useThemePreference = () => useContext(ThemePreferenceContext);

// Stable factories keep styles cached per palette, including shared tables and chart styles.
export function createThemedStyles<T>(factory: (colors: ThemeColors) => T): (colors: ThemeColors) => T {
  const cache = new WeakMap<ThemeColors, T>();
  return colors => {
    if (!cache.has(colors)) cache.set(colors, factory(colors));
    return cache.get(colors)!;
  };
}
export function useThemedStyles<T>(factory: (colors: ThemeColors) => T): T {
  return factory(useThemeColors());
}
