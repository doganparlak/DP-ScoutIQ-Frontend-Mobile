import { Play } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';
import ActionSpinner from './ActionSpinner';

export default function RewardUnlockButton({ loading, disabled, onPress, label }: {
  label?: string;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const {t} = useTranslation();
  return <Pressable accessibilityRole="button" accessibilityState={{busy: loading, disabled}}
    disabled={disabled} onPress={onPress}
    style={({pressed}) => [styles.button, (pressed || disabled) && styles.dimmed]}>
    {loading ? <ActionSpinner size={15} color="#FFF"/> : <Play size={16} color="#FFF" strokeWidth={2.4}/>}
    <Text style={styles.label}>{loading ? t('scoutingRewardLoading') : label ?? t('scoutingRewardWatch')}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, padding: 10, borderRadius: 12, flexDirection: 'row', gap: 8,
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#166534' },
  label: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  dimmed: { opacity: .82 },
});
