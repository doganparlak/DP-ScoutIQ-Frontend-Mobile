import React from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link2, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { createThemedStyles, useThemedStyles, type ThemeColors } from '@/theme';
import { appleModule, googleAvailable, getConnectedProviders, getSocialConfig, type SocialProvider } from '@/services/socialAuth';
import SocialAuthButtons from './SocialAuthButtons';

export default function ConnectedAccounts({ disabled = false }: { disabled?: boolean }) {
  const { styles, ACCENT, DANGER } = useThemedStyles(getStyles);
  const { t } = useTranslation();
  const [enabled, setEnabled] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [providers, setProviders] = React.useState<SocialProvider[]>([]);
  React.useEffect(() => {
    let alive = true;
    void getSocialConfig().then(async c => {
      const google = (Platform.OS === 'ios' ? c.googleIOS : c.googleAndroid) && googleAvailable();
      let apple = Platform.OS === 'android' && c.appleAndroid;
      if (Platform.OS === 'ios' && c.appleIOS) {
        try { apple = (await appleModule()?.isAvailableAsync()) ?? false; } catch {}
      }
      if (alive) setEnabled(apple || google);
    });
    return () => { alive = false; };
  }, []);
  const load = async () => {
    setLoading(true); setError(false);
    try { setProviders((await getConnectedProviders()).providers); } catch { setError(true); }
    finally { setLoading(false); }
  };
  if (!enabled) return null;
  return <>
    <Pressable disabled={disabled} accessibilityRole="button" onPress={() => { setVisible(true); void load(); }} style={styles.open}>
      <Link2 size={17} color={ACCENT} /><Text style={styles.openText}>{t('socialConnectedAccounts')}</Text>
    </Pressable>
    <Modal transparent animationType="fade" visible={visible} onRequestClose={() => { if (!busy) setVisible(false); }}>
      <View style={styles.backdrop}><View style={styles.card}>
        <View style={styles.header}><Link2 size={21} color={ACCENT} /><Text style={styles.title}>{t('socialConnectedAccounts')}</Text>
          <Pressable disabled={busy} accessibilityLabel={t('close')} hitSlop={12} onPress={() => setVisible(false)}><X color={DANGER} size={22} /></Pressable>
        </View>
        <Text style={styles.body}>{t('socialConnectedBody')}</Text>
        {loading ? <ActivityIndicator color={ACCENT} /> : error ? <Pressable onPress={() => { void load(); }}><Text style={styles.openText}>{t('tryAgain')}</Text></Pressable> : <SocialAuthButtons intent="connect" connected={providers} onConnected={() => { void load(); }} onBusyChange={setBusy} />}
      </View></View>
    </Modal>
  </>;
}
const getStyles = createThemedStyles((c: ThemeColors) => ({ ACCENT: c.ACCENT, DANGER: c.DANGER, styles: StyleSheet.create({
  open: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 40, paddingVertical: 8 },
  openText: { color: c.ACCENT, fontWeight: '700', fontSize: 13 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.55)', padding: 20 },
  card: { width: '100%', maxWidth: 480, borderRadius: 22, borderWidth: 1, borderColor: c.ACCENT, backgroundColor: c.PANEL, padding: 20, gap: 14 },
  header: { flexDirection: 'row', gap: 10, alignItems: 'center' }, title: { color: c.TEXT, flex: 1, fontSize: 20, fontWeight: '800' },
  body: { color: c.MUTED, lineHeight: 22, fontSize: 14 },
}) }));
