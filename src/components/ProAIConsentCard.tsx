import DataUsage from '@/components/DataUsage';
import {createThemedStyles, useThemedStyles, type ThemeColors} from '@/theme';
import {ShieldCheck, X} from 'lucide-react-native';
import React from 'react';
import {useTranslation} from 'react-i18next';
import {ActivityIndicator, Modal, Pressable, StyleSheet, Text, View} from 'react-native';

export default function ProAIConsentCard({saving, onAccept}: {
  saving: boolean; onAccept: () => void;
}) {
  const {styles, ACCENT} = useThemedStyles(getModuleTheme);
  const {t} = useTranslation();
  const [detailsOpen, setDetailsOpen] = React.useState(false);
  return <>
    <View style={styles.card}>
      <View style={styles.heading}>
        <ShieldCheck size={20} color={ACCENT}/>
        <Text style={styles.title}>{t('proAIConsentTitle')}</Text>
      </View>
      <Pressable accessibilityRole="checkbox" accessibilityLabel={t('proAIConsentTitle')}
        accessibilityState={{checked: false, disabled: saving, busy: saving}}
        disabled={saving} onPress={onAccept} style={styles.row}>
        <View style={styles.checkbox}>
          {saving ? <ActivityIndicator size="small" color={ACCENT}/>
            : null}
        </View>
        <Text style={styles.body}>{t('proAIConsentBody')}</Text>
      </Pressable>
      <Pressable accessibilityRole="link" onPress={() => setDetailsOpen(true)} style={styles.details}>
        <Text style={styles.link}>{t('dataUsageTitle')}</Text>
      </Pressable>
    </View>
    <Modal visible={detailsOpen} transparent animationType="fade" onRequestClose={() => setDetailsOpen(false)}>
      <View style={styles.backdrop}>
        <View style={styles.modal}>
          <View style={styles.heading}>
            <Text style={styles.title}>{t('dataUsageTitle')}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t('close')}
              onPress={() => setDetailsOpen(false)} style={styles.close}>
              <X size={22} color={ACCENT}/>
            </Pressable>
          </View>
          <DataUsage/>
        </View>
      </View>
    </Modal>
  </>;
}

const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {ACCENT, CARD, PANEL, TEXT, MUTED, LINE} = colors;
  return {ACCENT, styles: StyleSheet.create({
    card: {borderWidth: 1, borderColor: LINE, backgroundColor: CARD, borderRadius: 16, padding: 16, gap: 12},
    heading: {flexDirection: 'row', alignItems: 'center', gap: 9},
    title: {flex: 1, minWidth: 0, color: TEXT, fontSize: 14, lineHeight: 21, fontWeight: '800'},
    row: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44},
    checkbox: {width: 26, height: 26, borderWidth: 1.5, borderColor: ACCENT, borderRadius: 7, alignItems: 'center', justifyContent: 'center'},
    body: {flex: 1, minWidth: 0, color: MUTED, fontSize: 13, lineHeight: 21},
    details: {alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, marginLeft: 34},
    link: {color: ACCENT, fontSize: 13, fontWeight: '700', textDecorationLine: 'underline'},
    backdrop: {flex: 1, backgroundColor: 'rgba(0,0,0,.55)', justifyContent: 'center', alignItems: 'center', padding: 20},
    modal: {width: '100%', maxWidth: 560, maxHeight: '85%', backgroundColor: PANEL, borderRadius: 20, borderWidth: 1, borderColor: LINE, padding: 18, gap: 12},
    close: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center'},
  })};
});
