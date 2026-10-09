import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { useFocusEffect } from '@react-navigation/native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert,Pressable,Text } from 'react-native';
import { AdsConsent } from 'react-native-google-mobile-ads';

import { invalidateAdvertisingConsent } from './initialization';
import { invalidateInterstitial } from './interstitial';
import { acquireAdPresentation,releaseAdPresentation } from './presentation';

export default function AdPrivacyOptions() {
  const themed = useThemedStyles(getModuleTheme);
  const {MUTED} = themed;

  const { i18n } = useTranslation(), tr = i18n.language.startsWith('tr');
  const [required, setRequired] = React.useState(false), [busy, setBusy] = React.useState(false);
  useFocusEffect(React.useCallback(() => {
    let alive = true;
    void AdsConsent.getConsentInfo().then(info => {
      if (alive) setRequired(info.privacyOptionsRequirementStatus === 'REQUIRED');
    }).catch(() => {});
    return () => { alive = false; };
  }, []));
  async function open() {
    if (busy) return;
    const lease = acquireAdPresentation();
    if (!lease) return;
    setBusy(true);
    try { invalidateInterstitial(); await AdsConsent.showPrivacyOptionsForm(); }
    catch { Alert.alert(tr ? 'Reklam Gizliliği' : 'Ad Privacy', tr ? 'Seçenekler açılamadı. Lütfen yeniden dene.' : 'Could not open privacy options. Please retry.'); }
    finally { invalidateInterstitial(); invalidateAdvertisingConsent(); releaseAdPresentation(lease); setBusy(false); }
  }
  return required ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void open()} style={{ padding: 16, alignSelf: 'center' }}>
    <Text style={{ color: MUTED, textDecorationLine: 'underline', textAlign: 'center' }}>{tr ? 'Reklam Gizliliği Seçenekleri' : 'Ad Privacy Options'}</Text>
  </Pressable> : null;
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {MUTED, themeColor} = colors;


  return {MUTED, themeColor};
});
