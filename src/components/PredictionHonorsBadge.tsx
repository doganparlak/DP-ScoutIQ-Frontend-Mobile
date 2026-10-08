import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Award } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function PredictionHonorsBadge({ wins, secondPlaces = 0, thirdPlaces = 0 }: { wins: number; secondPlaces?: number; thirdPlaces?: number }) {
  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const awards = [
    { count: wins, minimum: 2, label: tr ? 'Birincilik' : 'First Place', color: '#CDB57A' },
    { count: secondPlaces, minimum: 1, label: tr ? 'İkincilik' : 'Second Place', color: '#B5C0CD' },
    { count: thirdPlaces, minimum: 1, label: tr ? 'Üçüncülük' : 'Third Place', color: '#C09578' },
  ].filter(award => award.count >= award.minimum);
  if (!awards.length) return null;
  return <View style={s.row}>
    {awards.map(award => <View key={award.label} style={[s.badge, { backgroundColor: award.color + '0A' }]} accessibilityLabel={`${tr ? 'Skor Tahmin Ligi' : 'Score Prediction League'} · ${award.label}: ${award.count}`}>
      <Award size={15} color={award.color} strokeWidth={1.5} />
      <Text style={[s.title, { color: award.color }]}>{award.count}× {award.label}</Text>
    </View>)}
  </View>;
}
const s = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  badge: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },
  title: { fontSize: 11, lineHeight: 16, fontWeight: '600', flexShrink: 1 },
});
