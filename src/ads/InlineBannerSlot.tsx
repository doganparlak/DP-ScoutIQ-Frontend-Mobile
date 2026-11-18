import { useThemedStyles, createThemedStyles, type ThemeColors } from '@/theme';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { initializeAdvertising } from './initialization';

const INITIAL_BANNER_HEIGHT = 50;
const MAX_BANNER_HEIGHT = 100;
const UNIT_ID = __DEV__ ? TestIds.BANNER : Platform.OS === 'ios'
  ? 'ca-app-pub-2754612075301490/5426442177'
  : 'ca-app-pub-2754612075301490/2478000155';

export default function InlineBannerSlot({ canLoad, tr, onClose }: {
  canLoad: boolean;
  tr: boolean;
  onClose: () => void;
}) {
  const {styles, DANGER} = useThemedStyles(getStyles);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(INITIAL_BANNER_HEIGHT);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!canLoad) return;
    let active = true;
    void initializeAdvertising().then(allowed => {
      if (!active) return;
      setReady(allowed);
      setUnavailable(!allowed);
    });
    return () => { active = false; };
  }, [canLoad]);

  const updateBannerHeight = ({height}: {height: number}) => {
    if (Number.isFinite(height) && height > 0) setBannerHeight(Math.ceil(height));
  };

  if (unavailable) return null;
  return <View style={styles.container}>
    <View style={styles.header}>
      {loaded && <>
        <Text style={styles.label}>{tr ? 'Reklam' : 'Advertisement'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={tr ? 'Reklamı kapat' : 'Close ad'}
          onPress={onClose} style={({pressed}) => [styles.close, pressed && styles.pressed]}>
          <View style={styles.closeFrame}><X size={13} color={DANGER} strokeWidth={2}/></View>
        </Pressable>
      </>}
    </View>
    <View style={[styles.slot, {height: bannerHeight}]} onLayout={event => {
      const next = Math.floor(event.nativeEvent.layout.width);
      if (next !== width) {
        setLoaded(false);
        setBannerHeight(INITIAL_BANNER_HEIGHT);
        setWidth(next);
      }
    }}>
      {canLoad && ready && width > 0 && <BannerAd key={width} unitId={UNIT_ID}
        size={BannerAdSize.INLINE_ADAPTIVE_BANNER} width={width} maxHeight={MAX_BANNER_HEIGHT}
        onAdLoaded={dimensions => {
          updateBannerHeight(dimensions);
          setLoaded(true);
        }}
        onSizeChange={updateBannerHeight} onAdFailedToLoad={() => setUnavailable(true)}/>}
    </View>
  </View>;
}

const getStyles = createThemedStyles(({DANGER, LINE, MUTED}: ThemeColors) => ({
  DANGER,
  styles: StyleSheet.create({
    container: { marginVertical: 8 },
    header: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingLeft: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE, marginBottom: 6 },
    label: { color: MUTED, fontSize: 11, fontWeight: '700' },
    close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    closeFrame: { width: 22, height: 22, borderWidth: 1, borderColor: DANGER, borderRadius: 5,
      alignItems: 'center', justifyContent: 'center' },
    pressed: { opacity: .65 },
    slot: { alignItems: 'center', justifyContent: 'center' },
  }),
}));
