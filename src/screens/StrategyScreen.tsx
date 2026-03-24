// src/screens/StrategyScreen.tsx
import * as React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Header from '@/components/Header';
import StrategyCard from '@/components/StrategyCard';
import DataUsage from '@/components/DataUsage';
import { BG, ACCENT, ACCENT_DARK, MUTED, TEXT, PANEL } from '@/theme';
import type { MainTabsParamList } from '@/types';
import { useTranslation } from 'react-i18next';

type Nav = BottomTabNavigationProp<MainTabsParamList, 'Strategy'>;

export default function StrategyScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();
  const [dataUsageOpen, setDataUsageOpen] = React.useState(false);

  const handleStart = () => navigation.navigate('Chat');

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={styles.wrap}>
          <Header />
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <StrategyCard />
            <View style={{ paddingHorizontal: 16 }}>
              <Pressable
                onPress={handleStart}
                accessibilityRole="button"
                accessibilityLabel={t('startChatting', 'Start Chatting')}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? ACCENT_DARK : ACCENT,
                  borderRadius: 12,
                  padding: 14,
                })}
              >
                <Text style={{ color: 'white', fontWeight: '700', fontSize: 18, textAlign: 'center' }}>
                  {t('startChatting', 'Start Chatting')}
                </Text>
              </Pressable>

              <Text style={{ color: MUTED, marginTop: 8, fontSize: 14, textAlign: 'center' }}>
                {t('updateStrategyHint', 'You can update your strategy anytime.')}
              </Text>

              <Text style={styles.dataUsageText}>
                {t('signupAgreePrefix', 'I agree to the ')}
                <Text style={styles.link} onPress={() => setDataUsageOpen(true)}>
                  {t('dataUsageSignup', 'Data Usage')}
                </Text>
                {t('signupAgreeSuffix', '.')}
              </Text>
            </View>
          </ScrollView>

          <Modal
            visible={dataUsageOpen}
            animationType="slide"
            transparent
            onRequestClose={() => setDataUsageOpen(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalCard, styles.dataUsageModalCard]}>
                <View style={styles.dataUsageHeader}>
                  <Text style={styles.modalTitle}>{t('dataUsageTitle', 'Data Usage')}</Text>

                  <Pressable
                    onPress={() => setDataUsageOpen(false)}
                    hitSlop={8}
                    style={styles.dataUsageCloseBtn}
                  >
                    <Text style={styles.dataUsageCloseText}>{t('close', 'Close')}</Text>
                  </Pressable>
                </View>

                <DataUsage />
              </View>
            </View>
          </Modal>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: BG },

  dataUsageText: {
    color: TEXT,
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },

  link: {
    color: ACCENT_DARK,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  modalCard: {
    width: '100%',
    maxWidth: 560,
    backgroundColor: PANEL,
    borderRadius: 16,
    padding: 16,
  },

  dataUsageModalCard: {
    maxHeight: '85%',
    paddingBottom: 12,
  },

  dataUsageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '700',
  },

  dataUsageCloseBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  dataUsageCloseText: {
    color: ACCENT_DARK,
    fontWeight: '800',
  },
});