import React from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import PlayerCard from '@/components/PlayerCard';
import { addFavoritePlayer } from '@/services/api';
import { TEXT, MUTED, LINE, ACCENT, CARD, PANEL } from '@/theme';
import type { PlayerData } from '@/types';

type Props = {
  selectedPlayer: PlayerData | null;
  selectedPlayerForCard: PlayerData | null;
  onRevealPotential: () => void;
  onRevealForm: () => void;
  revealingPotential: boolean;
  revealingForm: boolean;
  revealedPotentialForCard: boolean;
  revealedFormForCard: boolean;
};

export default function PlayerCardPP({
  selectedPlayer,
  selectedPlayerForCard,
  onRevealPotential,
  onRevealForm,
  revealingPotential,
  revealingForm,
  revealedPotentialForCard,
  revealedFormForCard,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{t('playerCard', 'Player Card')}</Text>
      <View style={styles.curateRow}>
        <View style={styles.curatePlusWrap}>
          <Text style={styles.curatePlusText}>＋</Text>
        </View>
        <Text style={styles.curateText}>
          {t('wcCurate', 'Curate your dream squad in your portfolio.')}
        </Text>
      </View>
      {selectedPlayer ? (
        <>
          <PlayerCard
            player={selectedPlayerForCard ?? selectedPlayer}
            titleAlign="center"
            onAddFavorite={async (player) => {
              try {
                await addFavoritePlayer({
                  name: player.name,
                  nationality: player.meta?.nationality,
                  age: typeof player.meta?.age === 'number' ? player.meta.age : undefined,
                  potential:
                    typeof player.meta?.potential === 'number'
                      ? Math.round(player.meta.potential)
                      : undefined,
                  form:
                    typeof player.meta?.form === 'number'
                      ? Math.round(player.meta.form)
                      : undefined,
                  gender: player.meta?.gender,
                  height: typeof player.meta?.height === 'number' ? player.meta.height : undefined,
                  weight: typeof player.meta?.weight === 'number' ? player.meta.weight : undefined,
                  team: player.meta?.team,
                  league: player.meta?.league,
                  roles: player.meta?.roles ?? [],
                });
                return true;
              } catch (e: any) {
                Alert.alert(t('addFavoriteFailed', 'Add failed'), String(e?.message || e));
                return false;
              }
            }}
          />
          <View style={styles.revealActionsRow}>
            <Pressable
              onPress={onRevealPotential}
              disabled={revealingPotential || revealedPotentialForCard}
              style={({ pressed }) => [
                styles.revealScoreButton,
                revealedPotentialForCard && styles.revealScoreButtonMuted,
                (pressed || revealingPotential) && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.revealScoreButtonText,
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

            <Pressable
              onPress={onRevealForm}
              disabled={revealingForm || revealedFormForCard}
              style={({ pressed }) => [
                styles.revealScoreButton,
                revealedFormForCard && styles.revealScoreButtonMuted,
                (pressed || revealingForm) && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.revealScoreButtonText,
                  revealedFormForCard && styles.revealScoreButtonTextRevealed,
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
        <View style={styles.emptyCardState}>
          <Text style={styles.emptyText}>
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
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 16,
  },
  sectionTitle: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
  },
  curateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
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
  curateText: {
    color: MUTED,
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
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
});
