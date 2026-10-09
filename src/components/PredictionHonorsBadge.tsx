import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';
import { Award } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet,Text,View } from 'react-native';

export default function PredictionHonorsBadge({ wins, secondPlaces = 0, thirdPlaces = 0 }: { wins: number; secondPlaces?: number; thirdPlaces?: number }) {
  const themed = useThemedStyles(getModuleTheme);
  const {themeColor} = themed;

  const { i18n } = useTranslation();
  const tr = i18n.language.startsWith('tr');
  const awards = [
    { count: wins, minimum: 2, label: tr ? 'Birincilik' : 'First Place', color: themeColor('#CDB57A', 'text') },
    { count: secondPlaces, minimum: 1, label: tr ? 'İkincilik' : 'Second Place', color: themeColor('#B5C0CD', 'text') },
    { count: thirdPlaces, minimum: 1, label: tr ? 'Üçüncülük' : 'Third Place', color: themeColor('#C09578', 'text') },
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


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {themeColor} = colors;


  return {themeColor};
});
