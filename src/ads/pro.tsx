// src/ads/pro.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BG, PANEL, TEXT, ACCENT, MUTED, LINE, ACCENT_DARK } from '../theme';
import { useTranslation } from 'react-i18next';

type ProNotReadyProps = {
  visible: boolean;
  onClose: () => void;
};

export function ProNotReadyScreen({ visible, onClose }: ProNotReadyProps) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          {/* Close */}
          <View style={styles.topBar}>
            <View style={styles.topBarSpacer} />
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>
          </View>

          {/* Logo (no frame) */}
          <View style={styles.logoWrap}>
            <Image
              source={require('../../assets/scoutwise_logo.png')}
              style={styles.logo}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>

          {/* Title */}
          <View style={styles.titleWrap}>
            <Text style={styles.title}>
              <Text style={styles.titleScout}>SCOUT</Text>
              <Text style={styles.titleWise}>WISE</Text>
              <Text style={styles.titlePro}> PRO</Text>
            </Text>
          </View>

          {/* Mid CTA */}
          <View style={styles.midWrap}>
            <Text style={styles.upgradeNow}>
              {t('goProCta', 'Upgrade to Pro now')}
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>
              {t('proBenefitsTitle', 'Pro Benefits')}
            </Text>
            <View style={styles.divider} />

            <View style={styles.bullets}>
              <Benefit text={t('proBenefit1', 'A focused, ad-free experience')} />
              <Benefit text={t('proBenefit2', 'Priority customer support')} />
              <Benefit text={t('proBenefit3', 'Support the development of new features')} />
            </View>
          </View>

          {/* Slogan */}
          <View style={styles.sloganWrap}>
            <Text style={styles.slogan}>
              {t('goProSloganLine', 'Enhanced player scouting — seamless, sharper, and built for your next decision.')}
            </Text>
            <Text style={styles.sloganCta}>
              {t('goProSloganCta', 'Go Pro. Stay in flow.')}
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Benefit({ text }: { text: string }) {
  const { i18n } = useTranslation();

  const renderRich = () => {
    let out: React.ReactNode[] = [text];

    const apply = (needle: string) => {
      if (!needle) return;

      out = out.flatMap((chunk, idx) => {
        if (typeof chunk !== 'string') return [chunk];

        const i = chunk.indexOf(needle);
        if (i === -1) return [chunk];

        const before = chunk.slice(0, i);
        const match = chunk.slice(i, i + needle.length);
        const after = chunk.slice(i + needle.length);

        return [
          before,
          <Text key={`${needle}-${idx}`} style={styles.bulletAccent}>
            {match}
          </Text>,
          after,
        ].filter(Boolean);
      });
    };

    // Highlight terms based on active language + your actual strings
    if (i18n.language?.startsWith('tr')) {
      apply('Reklamsız');
      apply('Öncelikli');
      apply('Yeni özelliklerin');
    } else {
      apply('ad-free');
      apply('Priority');
      apply('new features');
    }

    return out;
  };

  return (
    <View style={styles.bulletRow}>
      <View style={styles.bulletDotOuter}>
        <View style={styles.bulletDotInner} />
      </View>

      <Text style={styles.bulletText}>{renderRich()}</Text>
    </View>
  );
}



const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  container: {
    flex: 1,
    backgroundColor: BG,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
  },

  topBar: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  topBarSpacer: { width: 44, height: 44 },

  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LINE,
  },
  closeIcon: {
    color: TEXT,
    fontSize: 28,
    lineHeight: 28,
  },

  logoWrap: {
    alignItems: 'center',
    marginTop: 18,
  },
  logo: {
    width: 126,
    height: 126,
  },

  titleWrap: {
    marginTop: 86, // ✅ more space between logo and title
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  titleScout: { color: TEXT },
  titleWise: { color: ACCENT },
  titlePro: { color: TEXT },

  midWrap: {
    marginTop: 16,
    alignItems: 'center',
  },
  upgradeNow: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },

  panel: {
    marginTop: 32,
    borderRadius: 20,
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: LINE,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  panelTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: LINE,
    marginTop: 12,
    marginBottom: 18,
  },

  // ✅ more breathing room for bullets
  bullets: { gap: 24, paddingVertical: 6 },

  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bulletDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  bulletDotInner: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: ACCENT,
  },
  bulletText: {
    flex: 1,
    color: TEXT,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },

  sloganWrap: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 22,
  },
  slogan: {
    color: MUTED,
    fontSize: 13.5,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 520,
  },
  sloganAccent: {
    color: ACCENT,
    fontWeight: '900',
  },
  sloganCta: {
    marginTop: 8,
    color: TEXT,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  bulletAccent: {
    color: ACCENT,
    fontWeight: '900',
  },

});
