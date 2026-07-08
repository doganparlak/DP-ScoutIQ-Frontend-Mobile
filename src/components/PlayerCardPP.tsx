import React from 'react';
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import PlayerCard from '@/components/PlayerCard';
import { TutorialHint, TutorialStrong, type PlayerPoolTutorialStep } from '@/components/Tutorial';
import { TEXT, MUTED, LINE, ACCENT, CARD, PANEL } from '@/theme';
import type { PlayerData } from '@/types';

type PlayerPoolComponentTheme = {
  panel: string;
  card: string;
  line: string;
  accent: string;
  accentSoft: string;
  muted: string;
};

type Props = {
  selectedPlayer: PlayerData | null;
  selectedPlayerForCard: PlayerData | null;
  onRevealPotential: () => void;
  onRevealForm: () => void;
  onAddFavoriteSuccess?: () => void;
  onAddFavorite?: (p: PlayerData) => Promise<boolean>;
  onGenerateReport?: (p: PlayerData) => void | Promise<void>;
  reportState?: 'idle' | 'loading' | 'ready';
  reportDisabled?: boolean;
  selectedPlayerId?: string | null;
  revealingPotential: boolean;
  revealingForm: boolean;
  revealedPotentialForCard: boolean;
  revealedFormForCard: boolean;
  tutorialStep?: PlayerPoolTutorialStep | null;
  onTutorialContinue?: () => void;
  onTutorialSkipAll?: () => void;
  theme?: PlayerPoolComponentTheme;
  worldCupMode?: boolean;
};

export default function PlayerCardPP({
  selectedPlayer,
  selectedPlayerForCard,
  onRevealPotential,
  onRevealForm,
  onAddFavoriteSuccess,
  onAddFavorite,
  onGenerateReport,
  reportState = 'idle',
  reportDisabled = false,
  selectedPlayerId = null,
  revealingPotential,
  revealingForm,
  revealedPotentialForCard,
  revealedFormForCard,
  tutorialStep = null,
  onTutorialContinue,
  onTutorialSkipAll,
  theme,
  worldCupMode = false,
}: Props) {
  const { t } = useTranslation();
  const { width: windowWidth, fontScale } = useWindowDimensions();
  const androidCompact = Platform.OS === 'android' && (windowWidth < 390 || fontScale > 1.12);
  const androidTextScale = Platform.OS === 'android' ? 1.15 : undefined;
  const tutorialActive = !!tutorialStep;
  const canPressPotential = !tutorialActive || tutorialStep === 'revealPotential';
  const canPressForm = !tutorialActive || tutorialStep === 'revealForm';
  const canPressPortfolio = !tutorialActive || tutorialStep === 'addPortfolio';

  return (
    <View style={[styles.panel, androidCompact && styles.panelCompact, theme && { backgroundColor: theme.panel, borderColor: theme.line }]}>
      <View style={[styles.worldCupTopStripe, { backgroundColor: theme?.accent ?? ACCENT }]} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit={androidCompact}
        minimumFontScale={0.78}
        maxFontSizeMultiplier={androidTextScale}
        style={[styles.sectionTitle, androidCompact && styles.sectionTitleCompact, theme && { color: theme.accent }]}
      >
        {t('playerCard', 'Player Card')}
      </Text>
      <View style={[styles.curateRow, androidCompact && styles.curateRowCompact]}>
        <Ionicons
          name="person-circle-outline"
          size={22}
          color={theme?.accent ?? ACCENT}
          style={styles.curateProfileIcon}
        />
        <Text maxFontSizeMultiplier={androidTextScale} style={[styles.curateText, androidCompact && styles.curateTextCompact, theme && { color: theme.muted }]}>
          {t('wcCurate', 'Curate your dream squad in your portfolio.')}
        </Text>
      </View>
      {selectedPlayer ? (
        <>
          <TutorialHint
            visible={tutorialStep === 'card'}
            title={t('tutorialPlayerCardTitle', 'Player card')}
            body={t(
              'tutorialPlayerCardBody',
              'Review the selected player here. Potential and form can be revealed below.',
            )}
            actionLabel={t('tutorialContinueToPotential', 'Reveal potential next')}
            onAction={onTutorialContinue}
            onSkipAll={onTutorialSkipAll}
            arrow="none"
          />
          <PlayerCard
            player={selectedPlayerForCard ?? selectedPlayer}
            titleAlign="center"
            addFavoriteDisabled={!canPressPortfolio}
            onGenerateReport={onGenerateReport}
            reportState={reportState}
            reportDisabled={reportDisabled || tutorialActive}
            hideNationalityLeague={worldCupMode}
            visualTheme={theme ? {
              cardBackground: 'rgba(167, 132, 244, 0.16)',
              accent: theme.accent,
            } : undefined}
            onAddFavorite={async (player) => {
              try {
                const ok = onAddFavorite ? await onAddFavorite(player) : false;
                if (ok) {
                  onAddFavoriteSuccess?.();
                }
                return ok;
              } catch (e: any) {
                if (tutorialStep === 'addPortfolio') {
                  onAddFavoriteSuccess?.();
                  return true;
                }
                Alert.alert(t('addFavoriteFailed', 'Add failed'), String(e?.message || e));
                return false;
              }
            }}
          />
          <TutorialHint
            visible={tutorialStep === 'addPortfolio'}
            title={t('tutorialAddPortfolioTitle', 'Add to player portfolio')}
            body={t(
              'tutorialAddPortfolioBody',
              'Tap the plus button inside the player card, on the top right, to save this player to your portfolio.',
            )}
            onSkipAll={onTutorialSkipAll}
            targetContent={
              <View style={styles.plusTargetPill}>
                <Text style={styles.plusTargetText}>＋</Text>
              </View>
            }
            arrow="up"
          />
          <TutorialHint
            visible={!worldCupMode && tutorialStep === 'revealPotential'}
            title={t('tutorialRevealPotentialTitle', 'Reveal potential')}
            body={
              <>
                {t('tutorialRevealPotentialBodyLead', 'Potential projects future performance from the last one year’s match performance data, ')}
                <TutorialStrong>
                  {t('tutorialRelativeTeamLeague', 'relative to the player’s team and league')}
                </TutorialStrong>
                .
              </>
            }
            onSkipAll={onTutorialSkipAll}
            targetLabel={t('tutorialPressRevealPotential', 'Press Reveal Potential')}
            arrow="down"
          />
          <TutorialHint
            visible={tutorialStep === 'revealForm'}
            title={t('tutorialRevealFormTitle', 'Reveal form')}
            body={
              <>
                {t('tutorialRevealFormBodyLead', 'Form is the current performance score from the last one year’s match performance data, ')}
                <TutorialStrong>
                  {t('tutorialRelativeTeamLeague', 'relative to the player’s team and league')}
                </TutorialStrong>
                .
              </>
            }
            onSkipAll={onTutorialSkipAll}
            targetLabel={t('tutorialPressRevealForm', 'Press Reveal Form')}
            arrow="down"
          />
          <View style={styles.revealActionsRow}>
            {!worldCupMode ? (
              <Pressable
                onPress={onRevealPotential}
                disabled={!canPressPotential || revealingPotential || revealedPotentialForCard}
                style={({ pressed }) => [
                  styles.revealScoreButton,
                  theme && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
                  !canPressPotential && styles.revealScoreButtonLocked,
                  revealedPotentialForCard && (theme ? { backgroundColor: theme.card, borderColor: theme.line } : styles.revealScoreButtonMuted),
                  (pressed || revealingPotential) && styles.pressed,
                ]}
              >
                <Text
                  maxFontSizeMultiplier={androidTextScale}
                  style={[
                    styles.revealScoreButtonText,
                    theme && { color: theme.accent },
                    revealedPotentialForCard && styles.revealScoreButtonTextRevealed,
                  ]}
                >
                  {revealingPotential
                    ? t('revealingPotential', 'Revealing potential...')
                    : revealedPotentialForCard
                      ? t('potentialRevealed', 'Potential is Revealed')
                      : t('revealPotential', 'Reveal Potential')}
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onRevealForm}
              disabled={!canPressForm || revealingForm || revealedFormForCard}
              style={({ pressed }) => [
                styles.revealScoreButton,
                theme && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
                !canPressForm && styles.revealScoreButtonLocked,
                revealedFormForCard && (theme ? { backgroundColor: theme.card, borderColor: theme.line } : styles.revealScoreButtonMuted),
                (pressed || revealingForm) && styles.pressed,
              ]}
            >
              <Text
                maxFontSizeMultiplier={androidTextScale}
                style={[
                  styles.revealScoreButtonText,
                  theme && { color: theme.accent },
                  revealedFormForCard && (theme ? { color: theme.accent } : styles.revealScoreButtonTextRevealed),
                ]}
              >
                {revealingForm
                  ? t('revealingForm', 'Revealing form...')
                  : revealedFormForCard
                    ? t('formRevealed', 'Form is Revealed')
                    : t('revealForm', 'Reveal Form')}
              </Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={[styles.emptyCardState, theme && { backgroundColor: theme.card, borderColor: theme.line }]}>
          <Text maxFontSizeMultiplier={androidTextScale} style={[styles.emptyText, androidCompact && styles.emptyTextCompact, theme && { color: theme.muted }]}>
            {t(
              'playerPoolEmptyTitle',
              'Select a player from the search results to render the card here.',
            )}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    padding: 16,
  },
  panelCompact: {
    paddingHorizontal: 12,
  },
  sectionTitle: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  sectionTitleCompact: {
    fontSize: 15,
  },
  worldCupTopStripe: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E40000',
    marginBottom: 10,
  },
  curateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  curateRowCompact: {
    gap: 8,
  },
  curatePlusWrap: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  curatePlusText: {
    color: ACCENT,
    fontWeight: '800',
    fontSize: 14,
  },
  curateProfileIcon: {
    marginTop: -1,
  },
  plusTargetPill: {
    borderWidth: 1,
    borderColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  plusTargetText: {
    color: ACCENT,
    fontWeight: '800',
    fontSize: 14,
  },
  curateText: {
    color: MUTED,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
  curateTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.92,
  },
  emptyCardState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    padding: 18,
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revealActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 10,
  },
  revealScoreButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  revealScoreButtonMuted: {
    borderColor: LINE,
    backgroundColor: CARD,
  },
  revealScoreButtonLocked: {
    opacity: 0.45,
  },
  revealScoreButtonText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  revealScoreButtonTextRevealed: {
    color: ACCENT,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
});
