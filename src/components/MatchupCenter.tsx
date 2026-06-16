import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowDownCircle, Radar, Swords, X } from 'lucide-react-native';

import { TutorialHint, type PlayerPoolTutorialStep } from '@/components/Tutorial';
import { ROLE_LONG_TO_SHORT } from '@/services/api';
import { ACCENT, CARD, DANGER, DANGER_DARK, LINE, MUTED, PANEL, TEXT } from '@/theme';
import type { SearchResultRow } from '@/components/CandidatePlayers';

type PlayerPoolComponentTheme = {
  panel: string;
  card: string;
  line: string;
  accent: string;
  accent2: string;
  accentSoft: string;
  muted: string;
};

const COL = {
  index: 0.45,
  name: 0.93,
  nat: 0.93,
  league: 0.95,
  team: 1.0,
  age: 0.8,
  roles: 0.8,
  action: 0.52,
} as const;

type MatchupSlot = SearchResultRow | null;

type Props = {
  selectedPlayer: SearchResultRow | null;
  row1: MatchupSlot;
  row2: MatchupSlot;
  onAddSelectedPlayer: () => void;
  onLaunchMatchup: () => void;
  launchDisabled?: boolean;
  launchLoading?: boolean;
  onRemoveRow1: () => void;
  onRemoveRow2: () => void;
  tutorialStep?: PlayerPoolTutorialStep | null;
  onTutorialSkipAll?: () => void;
  tutorialActive?: boolean;
  theme?: PlayerPoolComponentTheme;
  worldCupMode?: boolean;
};

function shortNationality(value?: string) {
  if (!value) return '-';

  return (
    value
      .normalize('NFKD')
      .replace(/[^\p{Letter}\s]/gu, '')
      .trim()
      .split(/\s+/)[0]
      ?.slice(0, 3)
      .toUpperCase() || '-'
  );
}

function shortLeague(value?: string) {
  if (!value) return '-';

  return (
    value
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 5)
      .toUpperCase() || value
  );
}

function roleLabel(value?: string) {
  if (!value) return '-';
  return ROLE_LONG_TO_SHORT[value] || value;
}

function matchupNameLabel(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return name;
  return parts.filter((part) => !part.includes('.')).at(-1) || parts.at(-1) || parts[0];
}

export default function MatchupCenter({
  selectedPlayer,
  row1,
  row2,
  onAddSelectedPlayer,
  onLaunchMatchup,
  launchDisabled = false,
  launchLoading = false,
  onRemoveRow1,
  onRemoveRow2,
  tutorialStep = null,
  onTutorialSkipAll,
  tutorialActive = false,
  theme,
  worldCupMode = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const isFull = !!row1 && !!row2;
  const isSelectedAlreadyInMatchup =
    !!selectedPlayer && (row1?.id === selectedPlayer.id || row2?.id === selectedPlayer.id);
  const canAdd = !!selectedPlayer && !isFull && !isSelectedAlreadyInMatchup;
  const addEnabled =
    !tutorialActive ||
    tutorialStep === 'addYamalToMatchup' ||
    tutorialStep === 'addViniciusToMatchup';
  const launchEnabled = !tutorialActive || tutorialStep === 'launchMatchup';
  const addBridgeDisabled = !canAdd || !addEnabled;
  const themedMutedAccent = theme ? 'rgba(227, 0, 11, 0.42)' : MUTED;
  const themedMutedAccentBg = theme ? 'rgba(227, 0, 11, 0.08)' : undefined;
  const themedMutedAccentBorder = theme ? 'rgba(227, 0, 11, 0.28)' : undefined;
  const player1Label = row1
    ? matchupNameLabel(row1.player.name)
    : t('matchupPlayer1Placeholder', 'Player 1');
  const player2Label = row2
    ? matchupNameLabel(row2.player.name)
    : t('matchupPlayer2Placeholder', 'Player 2');
  const addPlayerLabel = t('addPlayerToMatchupCenter', 'Add player to Matchup Center');
  const addPlayerLabelUpper = addPlayerLabel.toLocaleUpperCase(
    i18n.language?.startsWith('tr') ? 'tr-TR' : undefined,
  );
  const launchMatchupLabel = t('launchMatchup', 'Launch Matchup');
  const launchMatchupLabelUpper = launchMatchupLabel.toLocaleUpperCase(
    i18n.language?.startsWith('tr') ? 'tr-TR' : undefined,
  );

  const renderSlot = React.useCallback((
    label: string,
    row: MatchupSlot,
    onRemove: () => void,
  ) => {
    if (!row) {
      return (
        <View style={[styles.row, styles.emptySlot, theme && { backgroundColor: theme.card }]}>
          <Text style={[styles.td, styles.slotLabel, { flex: COL.index }]}>{label}</Text>
          <View style={styles.vsep} />
          <Text style={[styles.emptyText, theme && { color: theme.muted }]} numberOfLines={1}>
            {t('matchupCenterEmptySlot', 'Player slot')}
          </Text>
          <View style={styles.vsep} />
          <View style={[styles.cell, styles.actionCell, { flex: COL.action }]} />
        </View>
      );
    }

    const roleValue = row.player.meta?.roles?.[0];

    return (
      <View style={styles.row}>
        <Text style={[styles.td, styles.slotLabel, theme && { color: theme.accent }, { flex: COL.index }]}>{label}</Text>
        <View style={styles.vsep} />
        <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.name, textAlign: 'center' }]}>
          {matchupNameLabel(row.player.name)}
        </Text>
        {!worldCupMode ? (
          <>
            <View style={styles.vsep} />
            <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.nat, textAlign: 'center' }]}>
              {shortNationality(row.player.meta?.nationality)}
            </Text>
            <View style={styles.vsep} />
            <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.league, textAlign: 'center' }]}>
              {shortLeague(row.player.meta?.league)}
            </Text>
          </>
        ) : null}
        <View style={styles.vsep} />
        <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.team, textAlign: 'center' }]}>
          {row.player.meta?.team || '-'}
        </Text>
        <View style={styles.vsep} />
        <Text style={[styles.td, styles.cell, { flex: COL.age, textAlign: 'center' }]}>
          {row.player.meta?.age ?? '-'}
        </Text>
        <View style={styles.vsep} />
        <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.roles, textAlign: 'center' }]}>
          {roleLabel(roleValue)}
        </Text>
        <View style={styles.vsep} />
        <Pressable
          onPress={onRemove}
          disabled={tutorialActive}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          style={({ pressed }) => [
            styles.actionCell,
            { flex: COL.action },
            tutorialActive && styles.lockedAction,
            pressed && styles.pressed,
          ]}
          accessibilityLabel={t('removeMatchupPlayer', 'Remove comparison player')}
        >
          {({ pressed }) => (
            <X size={17} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.3} />
          )}
        </Pressable>
      </View>
    );
  }, [t, theme, tutorialActive, worldCupMode]);

  return (
    <>
      <TutorialHint
        visible={tutorialStep === 'addYamalToMatchup'}
        title={t('tutorialAddYamalMatchupTitle', 'Add a player to Matchup Center')}
        body={t(
          'tutorialAddYamalMatchupBody',
          'Tap this to place a player in the Matchup Center.',
        )}
        onSkipAll={onTutorialSkipAll}
        targetLabel={t('tutorialPressAddMatchup', 'Press Add player')}
        arrow="down"
      />

      <TutorialHint
        visible={tutorialStep === 'addViniciusToMatchup'}
        title={t('tutorialAddViniciusMatchupTitle', 'Add a player to Matchup Center')}
        body={t(
          'tutorialAddViniciusMatchupBody',
          'Tap this to place a player in the Matchup Center.',
        )}
        onSkipAll={onTutorialSkipAll}
        targetLabel={t('tutorialPressAddMatchup', 'Press Add player')}
        arrow="down"
      />

      <Pressable
        onPress={onAddSelectedPlayer}
        disabled={!canAdd || !addEnabled}
        style={({ pressed }) => [
          styles.addBridge,
          theme && { backgroundColor: theme.accentSoft, borderColor: theme.line },
          addBridgeDisabled && styles.addBridgeMuted,
          addBridgeDisabled && theme && { backgroundColor: themedMutedAccentBg, borderColor: themedMutedAccentBorder },
          pressed && styles.pressed,
        ]}
        accessibilityLabel={t('addPlayerToMatchupCenter', 'Add player to Matchup Center')}
      >
        <ArrowDownCircle
          size={24}
          color={addBridgeDisabled ? themedMutedAccent : (theme?.accent ?? ACCENT)}
          strokeWidth={2.2}
        />
        <Text
          style={[
            styles.addBridgeText,
            theme && { color: theme.accent },
            addBridgeDisabled && (theme ? { color: themedMutedAccent } : styles.addBridgeTextMuted),
          ]}
        >
          {addPlayerLabelUpper}
        </Text>
        <ArrowDownCircle
          size={24}
          color={addBridgeDisabled ? themedMutedAccent : (theme?.accent ?? ACCENT)}
          strokeWidth={2.2}
        />
      </Pressable>

      <View style={[styles.panel, theme && { backgroundColor: theme.panel, borderColor: theme.line }]}>
        <View style={[styles.worldCupTopStripe, { backgroundColor: theme?.accent ?? ACCENT }]} />
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, theme && { color: theme.accent }]}>
            {t('matchupCenterTitle', 'Matchup Center')}
          </Text>
          <View
            style={[
              styles.capacityPill,
              theme && { backgroundColor: theme.card, borderColor: theme.line },
              isFull && (theme ? { backgroundColor: theme.accentSoft, borderColor: theme.accent } : styles.capacityPillFull),
            ]}
          >
            <Text style={[styles.capacityText, theme && { color: theme.muted }, isFull && (theme ? { color: theme.accent } : styles.capacityTextFull)]}>
              {(row1 ? 1 : 0) + (row2 ? 1 : 0)}/2
            </Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={[styles.tableTopBorder, theme && { backgroundColor: theme.line }]} />
          <View style={styles.tableHeaderWrap}>
            <View style={styles.row}>
              <View style={[styles.cell, { flex: COL.index }]}>
                <Text style={[styles.thText, styles.indexCell]}>#</Text>
              </View>
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.name }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblName', 'Name')}</Text>
              </View>
              {!worldCupMode ? (
                <>
                  <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
                  <View style={[styles.cell, { flex: COL.nat }]}>
                    <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblNat', 'Nat.')}</Text>
                  </View>
                  <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
                  <View style={[styles.cell, { flex: COL.league }]}>
                    <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblLeagueShort', 'Lg.')}</Text>
                  </View>
                </>
              ) : null}
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.team }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblTeam', 'Team')}</Text>
              </View>
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.age }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblAge', 'Age')}</Text>
              </View>
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.roles }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblRoles', 'Role')}</Text>
              </View>
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.action }]} />
            </View>
            <View style={[styles.hsepThick, theme && { backgroundColor: theme.line }]} />
          </View>

          {renderSlot('1', row1, onRemoveRow1)}
          <View style={[styles.hsepThick, theme && { backgroundColor: theme.line }]} />

          <View style={[styles.vsBand, theme && { backgroundColor: theme.accentSoft }]}>
            <View style={[styles.vsLine, theme && { backgroundColor: theme.line }]} />
            <View style={[styles.vsBadge, theme && { backgroundColor: theme.card, borderColor: theme.accent2 }]}>
              <Swords size={15} color={theme?.accent ?? ACCENT} strokeWidth={2.2} />
              <Text style={styles.vsText}>
                {player1Label} <Text style={[styles.vsAccent, theme && { color: theme.accent }]}>{t('matchupVs', 'vs')}</Text> {player2Label}
              </Text>
              <Swords size={15} color={theme?.accent ?? ACCENT} strokeWidth={2.2} />
            </View>
            <View style={[styles.vsLine, theme && { backgroundColor: theme.line }]} />
          </View>

          <View style={[styles.hsepThick, theme && { backgroundColor: theme.line }]} />
          {renderSlot('2', row2, onRemoveRow2)}
          <View style={[styles.tableBottomBorder, theme && { backgroundColor: theme.line }]} />
        </View>

        <TutorialHint
          visible={tutorialStep === 'launchMatchup'}
          title={t('tutorialLaunchMatchupTitle', 'Launch the matchup')}
          body={t(
            'tutorialLaunchMatchupBody',
            'Both players are ready. Launch the comparison.',
          )}
          onSkipAll={onTutorialSkipAll}
          targetLabel={t('tutorialPressLaunchMatchup', 'Press Launch Matchup')}
          arrow="down"
        />

        <Pressable
          onPress={onLaunchMatchup}
          disabled={!launchEnabled || launchDisabled || launchLoading}
          style={({ pressed }) => [
            styles.launchButton,
            theme && { backgroundColor: theme.accentSoft, borderColor: theme.accent },
            (!launchEnabled || launchDisabled || launchLoading) && styles.launchButtonMuted,
            pressed && styles.pressed,
          ]}
          accessibilityLabel={t('launchMatchup', 'Launch Matchup')}
        >
          {launchLoading ? (
            <ActivityIndicator size="small" color={theme?.accent ?? ACCENT} />
          ) : (
            <Radar size={17} color={launchDisabled ? MUTED : (theme?.accent ?? ACCENT)} strokeWidth={2.2} />
          )}
          <Text style={[styles.launchButtonText, theme && { color: theme.accent }, launchDisabled && styles.launchButtonTextMuted]}>
            {launchMatchupLabelUpper}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  addBridge: {
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.36)',
    backgroundColor: 'rgba(22, 163, 74, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  addBridgeMuted: {
    borderColor: ACCENT,
    backgroundColor: CARD,
    opacity: 0.7,
  },
  addBridgeText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  addBridgeTextMuted: {
    color: MUTED,
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    color: ACCENT,
    fontSize: 16,
    fontWeight: '800',
  },
  worldCupTopStripe: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#FF3D00',
    marginBottom: 10,
  },
  capacityPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  capacityPillFull: {
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
  },
  capacityText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '800',
  },
  capacityTextFull: {
    color: ACCENT,
  },
  table: { marginTop: 2 },
  tableTopBorder: { height: 1, backgroundColor: LINE },
  tableBottomBorder: { height: 1, backgroundColor: LINE },
  tableHeaderWrap: {
    paddingRight: 0,
  },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  hsepThick: { height: 2, backgroundColor: LINE },
  cell: { paddingVertical: 10, justifyContent: 'center' },
  thText: { color: TEXT, fontWeight: '700', fontSize: 12 },
  td: { color: TEXT, flex: 1, fontSize: 12.5 },
  indexCell: { textAlign: 'center' },
  slotLabel: {
    color: ACCENT,
    fontWeight: '900',
    textAlign: 'center',
  },
  vsep: { width: 1, alignSelf: 'stretch', backgroundColor: LINE, opacity: 0.9 },
  actionCell: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedAction: {
    opacity: 0.45,
  },
  emptySlot: {
    backgroundColor: 'rgba(31, 34, 32, 0.58)',
  },
  emptyText: {
    color: MUTED,
    flex: COL.name + COL.nat + COL.league + COL.team + COL.age + COL.roles,
    fontSize: 12.5,
    textAlign: 'center',
  },
  vsBand: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(22, 163, 74, 0.06)',
  },
  vsLine: {
    flex: 1,
    height: 1,
    backgroundColor: LINE,
  },
  vsBadge: {
    minHeight: 30,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: CARD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  vsText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  vsAccent: {
    color: ACCENT,
  },
  launchButton: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  launchButtonMuted: {
    borderColor: LINE,
    backgroundColor: CARD,
    opacity: 0.72,
  },
  launchButtonText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  launchButtonTextMuted: {
    color: MUTED,
  },
  pressed: {
    opacity: 0.9,
  },
});
