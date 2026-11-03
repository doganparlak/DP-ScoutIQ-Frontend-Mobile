import React from 'react';
import {ActivityIndicator, Alert, AppState, Modal, Platform, Pressable, Text, View} from 'react-native';
import {ArrowUpRight, Download, X} from 'lucide-react-native';
import {useTranslation} from 'react-i18next';
import {createThemedStyles, useThemedStyles, type ThemeColors} from '@/theme';
import {acquireAdPresentation, releaseAdPresentation} from '@/ads/presentation';
import {acknowledgeStoreUpdate, availableStoreUpdate, installedStoreVersion, isExistingStoreUpdateInstall, openStoreUpdate, type StoreUpdate} from '@/services/storeUpdates';
import {STORE_UPDATE_URLS} from '@/utils/storeUpdatePolicy';
import ScoutWiseBrandMark from './ScoutWiseBrandMark';

type Notice = StoreUpdate & {preview?: boolean};

/** Optional store update. OTA updates continue to use their own update flow. */
export default function StoreUpdatePrompt({ready}: {ready: boolean}) {
  const {s, ACCENT, MUTED} = useThemedStyles(getTheme);
  const {i18n} = useTranslation();
  const [notice, setNotice] = React.useState<Notice | null>(null);
  const [opening, setOpening] = React.useState(false), [error, setError] = React.useState(false);
  const noticeRef = React.useRef<Notice | null>(null), lease = React.useRef<symbol | null>(null);
  const closingTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = React.useRef(true);
  const tr = notice?.preview || i18n.language.startsWith('tr');
  const store = Platform.OS === 'android' ? 'Google Play' : 'App Store';

  const present = React.useCallback((value: Notice) => {
    if (!mounted.current || AppState.currentState !== 'active' || noticeRef.current) return false;
    const owner = acquireAdPresentation();
    if (!owner) return false;
    clearTimeout(closingTimer.current); lease.current = owner;
    noticeRef.current = value; setError(false); setOpening(false); setNotice(value);
    return true;
  }, []);

  const close = React.useCallback(() => {
    const value = noticeRef.current;
    noticeRef.current = null; setNotice(null); setError(false);
    if (value && !value.preview) void acknowledgeStoreUpdate(value.version).catch(() => {});
    // Keep other fullscreen presentations out until the native modal dismisses.
    const owner = lease.current;
    closingTimer.current = setTimeout(() => {
      if (owner) releaseAdPresentation(owner);
      if (lease.current === owner) lease.current = null;
    }, 400);
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false; clearTimeout(closingTimer.current);
      if (lease.current) releaseAdPresentation(lease.current);
      lease.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!ready || __DEV__) return; // Real store notices are release-only.
    let alive = true, checking = false, lastCheck = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const eligible = isExistingStoreUpdateInstall().catch(() => false);
    const check = async () => {
      if (!alive || checking || noticeRef.current || AppState.currentState !== 'active' || Date.now() - lastCheck < 3600000) return;
      checking = true; lastCheck = Date.now();
      try {
        if (!await eligible || !alive) return;
        const value = await availableStoreUpdate();
        if (!alive || !value) return;
        let attempts = 0;
        const show = () => {
          if (!alive || AppState.currentState !== 'active') return;
          if (!present(value) && ++attempts < 20) timer = setTimeout(show, 1500);
        };
        show();
      } catch { /* Store availability must never interrupt access to the app. */ }
      finally {checking = false;}
    };
    timer = setTimeout(() => void check(), 1500);
    const subscription = AppState.addEventListener('change', state => {if (state === 'active') void check();});
    return () => {alive = false; clearTimeout(timer); subscription.remove();};
  }, [ready, present]);

  React.useEffect(() => {
    if (!__DEV__) return;
    const controls = {
      showPreview: () => {
        const installed = installedStoreVersion() || '2.2.1';
        const parts = installed.split('.').map(Number); parts[parts.length - 1]++;
        return present({version: parts.join('.'), installedVersion: installed,
          url: Platform.OS === 'android' ? STORE_UPDATE_URLS.android : STORE_UPDATE_URLS.ios, preview: true});
      },
      dismiss: close,
    };
    Object.assign(globalThis, {scoutwiseStoreUpdateTest: controls});
    return () => {
      const globals = globalThis as typeof globalThis & {scoutwiseStoreUpdateTest?: typeof controls};
      if (globals.scoutwiseStoreUpdateTest === controls) delete globals.scoutwiseStoreUpdateTest;
    };
  }, [present, close]);

  async function update() {
    if (!noticeRef.current || opening) return;
    const value = noticeRef.current;
    if (__DEV__ && value.preview && Platform.OS === 'ios') {
      Alert.alert(tr ? 'App Store bağlantısı' : 'App Store link', tr
        ? 'iOS simülatöründe App Store kullanılamaz. Gerçek cihazda Güncelle düğmesi ScoutWise’ın mağaza sayfasını açar.'
        : 'The App Store is unavailable in the iOS simulator. On a real device, Update opens ScoutWise’s store page.');
      return;
    }
    setOpening(true); setError(false);
    try {await openStoreUpdate(value); if (mounted.current && noticeRef.current === value) close();}
    catch {if (mounted.current && noticeRef.current === value) setError(true);}
    finally {if (mounted.current) setOpening(false);}
  }

  return <Modal transparent visible={!!notice} animationType="fade" statusBarTranslucent onRequestClose={close}>
    <View style={s.backdrop}>
      <View style={s.card} accessibilityViewIsModal>
        <View style={s.brandRow}>
          <View style={s.brand}><ScoutWiseBrandMark style={s.logo}/><Text style={s.brandName}>SCOUTWISE</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={tr ? 'Kapat' : 'Close'} onPress={close} style={s.close}><X size={21} color={MUTED}/></Pressable>
        </View>
        <View style={s.titleRow}>
          <View style={s.icon}><Download size={19} color={ACCENT} strokeWidth={1.8}/></View>
          <Text accessibilityRole="header" style={s.title}>{tr ? 'Yeni sürüm mevcut' : 'A new version is available'}</Text>
        </View>
        <Text style={s.body}>{tr ? 'ScoutWise’ın yeni sürümü hazır. En güncel deneyim için uygulamanı güncelleyebilirsin.' : 'A new version of ScoutWise is ready. Update your app for the latest experience.'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={tr ? `${store} üzerinden güncelle` : `Update on ${store}`} disabled={opening} onPress={() => void update()} style={({pressed}) => [s.primary, pressed && s.pressed, opening && s.busy]}>
          {opening ? <ActivityIndicator color="#FFFFFF"/> : <><Text style={s.primaryText}>{tr ? 'Güncelle' : 'Update'}</Text><ArrowUpRight size={19} color="#FFFFFF"/></>}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={close} style={({pressed}) => [s.later, pressed && s.pressed]}><Text style={s.laterText}>{tr ? 'Daha sonra' : 'Later'}</Text></Pressable>
        {error && <Text accessibilityLiveRegion="polite" style={s.error}>{tr ? 'Mağaza açılamadı. Lütfen tekrar dene.' : 'Could not open the store. Please try again.'}</Text>}
        <Text style={s.footnote}>{tr ? 'Dilediğin zaman güncelleyebilirsin.' : 'You can update whenever you’re ready.'}</Text>
      </View>
    </View>
  </Modal>;
}

const getTheme = createThemedStyles((c: ThemeColors) => {
  const {ACCENT, CARD, TEXT, MUTED, LINE, DANGER, themeColor} = c;
  const s = {
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,.65)', alignItems: 'center' as const, justifyContent: 'center' as const, padding: 24},
    card: {width: '100%' as const, maxWidth: 380, borderRadius: 25, borderWidth: 1, borderColor: `${ACCENT}55`, backgroundColor: CARD, padding: 23, gap: 17},
    brandRow: {flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const},
    brand: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 9}, logo: {width: 30, height: 30}, brandName: {fontSize: 11, letterSpacing: 1.8, fontWeight: '900' as const, color: TEXT},
    close: {width: 40, height: 40, alignItems: 'center' as const, justifyContent: 'center' as const},
    icon: {width: 40, height: 40, borderRadius: 12, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: themeColor('rgba(22,163,74,.12)', 'surface'), borderWidth: 1, borderColor: `${ACCENT}35`},
    titleRow: {flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12},
    title: {flex: 1, minWidth: 0, color: TEXT, fontSize: 22, lineHeight: 29, fontWeight: '900' as const}, body: {color: MUTED, fontSize: 14, lineHeight: 23},
    primary: {minHeight: 51, borderRadius: 14, backgroundColor: '#15803D', flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: 9, marginTop: 4},
    primaryText: {color: '#FFFFFF', fontSize: 15, fontWeight: '800' as const}, later: {minHeight: 46, alignItems: 'center' as const, justifyContent: 'center' as const, borderRadius: 14, borderWidth: 1, borderColor: LINE, marginTop: -7},
    laterText: {color: TEXT, fontSize: 14, fontWeight: '700' as const}, footnote: {color: MUTED, fontSize: 11, lineHeight: 17, textAlign: 'center' as const}, error: {color: DANGER, fontSize: 12, lineHeight: 18}, pressed: {opacity: .8}, busy: {opacity: .7},
  };
  return {s, ACCENT, MUTED};
});
