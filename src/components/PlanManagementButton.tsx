import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ACCENT, CARD } from '@/theme';

export default function PlanManagementButton({onPress, label}: {onPress: () => void; label?: string}) {
  const {t} = useTranslation();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [styles.button, pressed && {opacity: .8}]}><Text style={styles.label}>{label ?? t('managePlan', 'Manage Plan')}</Text></Pressable>;
}
const styles = StyleSheet.create({
  button: {flex: 1, minHeight: 44, backgroundColor: CARD, borderWidth: 1, borderColor: ACCENT, borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center'},
  label: {color: ACCENT, fontSize: 14, fontWeight: '800'},
});
