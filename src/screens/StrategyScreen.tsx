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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import Header from '@/components/Header';
import StrategyCard from '@/components/StrategyCard';
import DataUsage from '@/components/DataUsage';
import { BG, ACCENT, ACCENT_DARK, MUTED, TEXT, PANEL, LINE } from '@/theme';
import type { MainTabsParamList } from '@/types';
import { useTranslation } from 'react-i18next';

type Nav = BottomTabNavigationProp<MainTabsParamList, 'Strategy'>;

const AI_CONSENT_KEY = 'ai_data_usage_consent_v1';

export default function StrategyScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useTranslation();

  const [dataUsageOpen, setDataUsageOpen] = React.useState(false);
  const [aiConsent, setAiConsent] = React.useState(false);
  const [loadingConsent, setLoadingConsent] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(AI_CONSENT_KEY);
        setAiConsent(saved === 'true');
      } finally {
        setLoadingConsent(false);
      }
    })();
  }, []);

  const handleConsentToggle = async () => {
    if (aiConsent) return;

    setAiConsent(true);
    await AsyncStorage.setItem(AI_CONSENT_KEY, 'true');
  };

  const handleStart = () => {
    if (loadingConsent) return;
    if (!aiConsent) return;
    navigation.navigate('Chat');
  };

  const buttonsDisabled = loadingConsent || !aiConsent;
  const showConsentUI = !loadingConsent && !aiConsent;

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
            <StrategyCard disabled={buttonsDisabled} />

            <View style={{ paddingHorizontal: 16 }}>
              {showConsentUI && (
                <View style={styles.consentCard}>
                  <Pressable
                    onPress={handleConsentToggle}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: aiConsent }}
                    style={styles.checkboxRow}
                  >
                    <View style={[styles.checkbox, aiConsent && styles.checkboxChecked]}>
                      {aiConsent ? <Text style={styles.checkmark}>✓</Text> : null}
                    </View>

                    <Text style={styles.checkboxText}>
                      {t('aiConsentPrefix')}
                      <Text style={styles.link} onPress={() => setDataUsageOpen(true)}>
                        {t('dataUsageSignup', 'Data Usage')}
                      </Text>
                      {t('aiConsentSuffix', ' before continuing.')}
                    </Text>
                  </Pressable>
                </View>
              )}

              <Pressable
                onPress={handleStart}
                disabled={buttonsDisabled}
                accessibilityRole="button"
                accessibilityLabel={t('startChatting', 'Start Chatting')}
                style={({ pressed }) => [
                  styles.startBtn,
                  buttonsDisabled && styles.startBtnDisabled,
                  pressed && !buttonsDisabled ? styles.startBtnPressed : null,
                ]}
              >
                <Text style={styles.startBtnText}>
                  {t('startChatting', 'Start Chatting')}
                </Text>
              </Pressable>

              {showConsentUI && (
                <Text style={styles.aiDisclosureText}>
                  {t(
                    'aiDisclosureInline',
                    'By continuing, you confirm that your chat messages, strategy inputs, and search queries will be sent to OpenAI and DeepSeek to generate AI responses.'
                  )}
                </Text>
              )}

              <Text style={styles.hintText}>
                {buttonsDisabled
                  ? t(
                      'consentRequiredHint',
                      'Please accept data usage to enable strategy and chat.'
                    )
                  : t('updateStrategyHint', 'You can update your strategy anytime.')}
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
                  <Text style={styles.modalTitle}>
                    {t('dataUsageTitle', 'Data Usage')}
                  </Text>

                  <Pressable
                    onPress={() => setDataUsageOpen(false)}
                    hitSlop={8}
                    style={styles.dataUsageCloseBtn}
                  >
                    <Text style={styles.dataUsageCloseText}>
                      {t('close', 'Close')}
                    </Text>
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

  aiDisclosureText: {
    color: TEXT,
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },

  consentCard: {
    marginTop: 12,
    marginBottom: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LINE,
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: ACCENT_DARK,
    marginRight: 10,
    marginTop: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },

  checkboxChecked: {
    backgroundColor: ACCENT_DARK,
  },

  checkmark: {
    color: 'white',
    fontWeight: '800',
    fontSize: 14,
    lineHeight: 16,
  },

  checkboxText: {
    flex: 1,
    color: TEXT,
    fontSize: 14,
    lineHeight: 20,
  },

  dataUsageText: {
    color: TEXT,
    marginTop: 10,
    fontSize: 14,
    textAlign: 'left',
  },

  link: {
    color: ACCENT_DARK,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },

  startBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    padding: 14,
  },

  startBtnPressed: {
    backgroundColor: ACCENT_DARK,
  },

  startBtnDisabled: {
    opacity: 0.45,
  },

  startBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },

  hintText: {
    color: MUTED,
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
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