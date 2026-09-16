import { FRAME_TITLE, FRAME_STRIPE, FRAME_HEADING } from '@/theme';
import React from 'react';
import { shortSeason, shortPlayer, shortTeam } from '@/utils/seasonTableLabels';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Radar, X, GitCompareArrows } from 'lucide-react-native';

import { TutorialHint, type PlayerPoolTutorialStep } from '@/components/Tutorial';
import { rolePickerCode } from '@/services/api';
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
  name: 0.95,
  nat: 0.75,
  team: 0.95,
  age: 0.65,
  roles: 1.25,
  action: 0.52,
} as const;

type MatchupSlot = SearchResultRow | null;

type Props = {
  row1: MatchupSlot;
  row2: MatchupSlot;
  row3?: MatchupSlot;
  row4?: MatchupSlot;
  matchupMode?: 2 | 3 | 4;
  hideModeSwitch?: boolean;
  onMatchupModeChange?: (mode: 2 | 3 | 4) => void;
  onLaunchMatchup: () => void;
  launchDisabled?: boolean;
  launchLoading?: boolean;
  onRemoveRow1: () => void;
  onRemoveRow2: () => void;
  onRemoveRow3?: () => void;
  onRemoveRow4?: () => void;
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

function roleLabel(value?: string) {
  return rolePickerCode(value);
}

function rolePreviewLabels(row: SearchResultRow) {
  const meta = row.player.meta;
  const counts: Record<string, number> = {};
  for (const [role, count] of Object.entries(meta?.positionCounts ?? {})) {
    const label = roleLabel(role);
    if (label) counts[label] = (counts[label] ?? 0) + count;
  }
  const roles = Array.from(new Set([
    ...(meta?.positionNamesSeen ?? []), ...(meta?.roles ?? []),
    ...Object.keys(counts), ...(meta?.primaryPositionCode ? [meta.primaryPositionCode] : []),
  ].map(roleLabel).filter(Boolean)));
  const primary = roleLabel(meta?.primaryPositionCode);
  roles.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0)
    || Number(b === primary) - Number(a === primary) || a.localeCompare(b));
  return roles.length > 1 ? [roles[0], `+${roles.length - 1}`] : roles;
}

const matchupNameLabel = shortPlayer;

function isValidScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function scoreColor(value: number) {
  if (value < 50) return DANGER;
  if (value < 70) return '#F59E0B';
  return ACCENT;
}

function formatScore(value: number) {
  const rounded = Math.round(value);
  return Number.isInteger(value) ? String(rounded) : String(rounded);
}

export default function MatchupCenter({
  row1,
  row2,
  row3 = null,
  row4 = null,
  matchupMode = 2,
  hideModeSwitch = false,
  onMatchupModeChange,
  onLaunchMatchup,
  launchDisabled = false,
  launchLoading = false,
  onRemoveRow1,
  onRemoveRow2,
  onRemoveRow3,
  onRemoveRow4,
  tutorialStep = null,
  onTutorialSkipAll,
  tutorialActive = false,
  theme,
  worldCupMode = false,
}: Props) {
  const { t, i18n } = useTranslation();
  const launchEnabled = !tutorialActive || tutorialStep === 'launchMatchup';
  const player1Label = row1
    ? matchupNameLabel(row1.player.name)
    : t('matchupPlayer1Placeholder', 'Player 1');
  const player2Label = row2
    ? matchupNameLabel(row2.player.name)
    : t('matchupPlayer2Placeholder', 'Player 2');
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
        <View style={[
          styles.row,
          styles.slotCard,
          styles.emptySlot,
          theme && { borderColor: theme.line, backgroundColor: 'rgba(22, 163, 74, 0.06)' },
        ]}>
          <Text style={[styles.td, styles.slotLabel, { flex: COL.index }]}>{label}</Text>
          <View style={styles.vsep} />
          <Text style={[styles.emptyText, theme && { color: theme.muted }]} numberOfLines={1}>
            {i18n.language.startsWith('tr') ? 'Eşleşme alanı' : 'Comparison slot'}
          </Text>
          <View style={styles.vsep} />
          <View style={[styles.cell, styles.actionCell, { flex: COL.action }]} />
        </View>
      );
    }

    const roles = rolePreviewLabels(row);
    const entityAccent = row.player.entityType === 'league' ? '#38BDF8' : row.player.entityType === 'season' ? '#C084FC' : undefined;
    const entityStyle = entityAccent ? { borderColor: entityAccent, backgroundColor: `${entityAccent}1A` } : undefined;
    const fullPotentialLabel = i18n.language?.startsWith('tr') ? 'POTANSİYEL' : t('potential', 'Potential');
    const scores = [
      isValidScore(row.player.meta?.potential)
        ? { label: fullPotentialLabel, value: row.player.meta.potential }
        : null,
      isValidScore(row.player.meta?.form)
        ? { label: t('form', 'Form'), value: row.player.meta.form }
        : null,
    ].filter(Boolean) as Array<{ label: string; value: number }>;

    return (
      <View style={[styles.slotWrap, styles.slotCard, theme && { borderColor: theme.line, backgroundColor: 'rgba(22, 163, 74, 0.06)' }, entityStyle]}>
        <View style={styles.row}>
        <Text style={[styles.td, styles.slotLabel, theme && { color: theme.accent }, entityAccent && { color: entityAccent }, { flex: COL.index }]}>{label}</Text>
        <View style={styles.vsep} />
        <Text numberOfLines={row.player.entityType === 'league' ? 3 : 1} style={[styles.td, styles.cell, { flex: COL.name, textAlign: 'center' }]}>
          {row.player.entityType === 'league' ? row.player.name : matchupNameLabel(row.player.name)}
        </Text>
        {!worldCupMode ? (
          <>
            <View style={styles.vsep} />
            <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.nat, textAlign: 'center' }]}>
              {shortNationality(row.player.meta?.nationality)}
            </Text>
          </>
        ) : null}
        <View style={styles.vsep} />
        <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.team, textAlign: 'center' }]}>
          {row.player.entityType === 'league' ? row.player.meta?.teamCount ?? '—' : shortTeam(row.player.meta?.team || '')}
        </Text>
        <View style={styles.vsep} />
        <Text style={[styles.td, styles.cell, { flex: COL.age, textAlign: 'center' }]}>
          {row.player.meta?.age ?? '-'}
        </Text>
        <View style={styles.vsep} />
        <View style={[styles.cell, styles.rolePillGroup, { flex: COL.roles }]}>
          {roles.length ? roles.map((role) => (
            <View
              key={role}
              style={[
                styles.rolePill,
                worldCupMode && styles.rolePillWorldCup,
                theme && { backgroundColor: theme.accentSoft, borderColor: theme.line },
                entityStyle,
              ]}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit={!worldCupMode}
                minimumFontScale={!worldCupMode ? 0.72 : undefined}
                style={[styles.rolePillText, theme && { color: theme.accent }, entityAccent && { color: entityAccent }]}
              >
                {role}
              </Text>
            </View>
          )) : (
            <Text style={[styles.td, styles.roleDash]}>-</Text>
          )}
        </View>
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
        {row.player.entityType === 'season' && <View style={{ padding: 8, borderTopWidth: 1, borderTopColor: 'rgba(192,132,252,.3)' }}><Text style={{ color: '#C084FC', fontSize: 11, fontWeight: '700' }}>{i18n.language.startsWith('tr') ? 'Sezon Verileri' : 'Season Data'} · {shortSeason(row.player.meta?.seasonName || '')} · {row.player.meta?.league}</Text></View>}
        {row.player.entityType === 'league' && <View style={{ padding: 8, borderTopWidth: 1, borderColor: '#38BDF84D', gap: 4 }}>
          <Text style={{ color: '#38BDF8', fontSize: 11 }}>{i18n.language.startsWith('tr') ? 'Lig ortalaması' : 'League average'} · {row.player.meta?.playerCount ?? 0} {i18n.language.startsWith('tr') ? 'oyuncu' : 'players'}</Text>
        </View>}
        {scores.length ? (
          <View style={[styles.slotScoreStrip, theme && { borderTopColor: theme.line }]}>
            {scores.map((score) => (
              <View key={score.label} style={[styles.slotScoreCard, theme && { backgroundColor: theme.card, borderColor: theme.line }]}>
                <View style={styles.slotScoreTopLine}>
                  <Text numberOfLines={1} style={[styles.slotScoreLabel, theme && { color: theme.muted }]}>
                    {score.label}
                  </Text>
                  <Text style={[styles.slotScoreValue, { color: scoreColor(score.value) }]}>
                    {formatScore(score.value)}
                  </Text>
                </View>
                <View style={styles.slotScoreTrack}>
                  <View
                    style={[
                      styles.slotScoreFill,
                      { width: `${Math.max(0, Math.min(100, Math.round(score.value)))}%`, backgroundColor: scoreColor(score.value) },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    );
  }, [t, theme, tutorialActive, worldCupMode]);

  return (
    <>
      <View style={[styles.panel, theme && { backgroundColor: theme.panel, borderColor: theme.line }]}>
        <View style={[styles.worldCupTopStripe, { backgroundColor: theme?.accent ?? ACCENT }]} />
        <View style={[styles.sectionHeaderRow, FRAME_HEADING]}>
          <GitCompareArrows size={20} color={theme?.accent ?? ACCENT} />
          <Text style={[styles.sectionTitle, theme && { color: theme.accent }]}>
            {t('matchupCenterTitle', 'Matchup Center')}
          </Text>
          {!hideModeSwitch && <View style={[styles.modeSwitch, theme && { backgroundColor: theme.card, borderColor: theme.line }]}>
            {([2, 3, 4] as const).map((mode) => {
              const active = matchupMode === mode;
              return (
                <Pressable
                  key={mode}
                  testID={`matchup-mode-${mode}`}
                  accessibilityRole="button"
                  accessibilityLabel={String(mode)}
                  accessibilityState={{ selected: active, disabled: tutorialActive }}
                  onPress={() => onMatchupModeChange?.(mode)}
                  disabled={tutorialActive}
                  style={[
                    styles.modeButton,
                    active && (theme ? { backgroundColor: theme.accentSoft } : styles.modeButtonActive),
                  ]}
                >
                  <Text style={[styles.modeButtonText, theme && { color: theme.muted }, active && { color: theme?.accent ?? ACCENT }]}>
                    {mode}
                  </Text>
                </Pressable>
              );
            })}
          </View>}
        </View>

        <View style={styles.table}>
          <View style={[styles.tableTopBorder, theme && { backgroundColor: theme.line }]} />
          <View style={styles.tableHeaderWrap}>
            <View style={[styles.row, styles.slotHeaderRow, theme && { borderColor: theme.line, backgroundColor: 'rgba(22, 163, 74, 0.09)' }]}>
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
            <View style={styles.slotRowGap} />
          </View>

          {renderSlot('1', row1, onRemoveRow1)}
          <View style={styles.slotRowGap} />

          <View style={[styles.vsBand, theme && { borderColor: theme.line }]}>
            <View style={[styles.vsLine, theme && { backgroundColor: theme.line }]} />
            <View style={[styles.vsBadge, theme && { backgroundColor: theme.card, borderColor: theme.accent2 }]}>
              <Text style={[styles.vsText, theme && { color: theme.accent }]}>
                {t('matchupVs', 'VS').toLocaleUpperCase(i18n.language?.startsWith('tr') ? 'tr-TR' : undefined)}
              </Text>
            </View>
            <View style={[styles.vsLine, theme && { backgroundColor: theme.line }]} />
          </View>

          <View style={styles.slotRowGap} />
          {renderSlot('2', row2, onRemoveRow2)}

          {matchupMode >= 3 ? (
            <>
              <View style={styles.slotRowGap} />
              <View style={[styles.vsBand, theme && { borderColor: theme.line }]}>
                <View style={[styles.vsLine, theme && { backgroundColor: theme.line }]} />
                <View style={[styles.vsBadge, theme && { backgroundColor: theme.card, borderColor: theme.accent2 }]}>
                  <Text style={[styles.vsText, theme && { color: theme.accent }]}>
                    {t('matchupVs', 'VS').toLocaleUpperCase(i18n.language?.startsWith('tr') ? 'tr-TR' : undefined)}
                  </Text>
                </View>
                <View style={[styles.vsLine, theme && { backgroundColor: theme.line }]} />
              </View>
              <View style={styles.slotRowGap} />
              {renderSlot('3', row3 ?? null, onRemoveRow3 ?? (() => undefined))}
            </>
          ) : null}
          {matchupMode === 4 && <><View style={styles.slotRowGap} />
            <View style={[styles.vsBand, theme && { borderColor: theme.line }]}>
              <View style={[styles.vsLine, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.vsBadge, theme && { backgroundColor: theme.card, borderColor: theme.accent2 }]}><Text style={[styles.vsText, theme && { color: theme.accent }]}>VS</Text></View>
              <View style={[styles.vsLine, theme && { backgroundColor: theme.line }]} />
            </View><View style={styles.slotRowGap} />{renderSlot("4", row4, onRemoveRow4 ?? (() => undefined))}</>}
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
  sectionTitle: { ...FRAME_TITLE, flex: 1, minWidth: 0, marginBottom: 0 },
  worldCupTopStripe: { ...FRAME_STRIPE },
  modeSwitch: {
    minHeight: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    flexDirection: 'row',
    padding: 3,
    gap: 3,
  },
  modeButton: {
    minWidth: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  modeButtonText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '900',
  },
  table: { marginTop: 2 },
  tableTopBorder: { height: 1, backgroundColor: LINE },
  tableBottomBorder: { height: 1, backgroundColor: LINE },
  tableHeaderWrap: {
    paddingRight: 0,
  },
  row: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  slotHeaderRow: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.22)',
    backgroundColor: 'rgba(22, 163, 74, 0.09)',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  slotCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.16)',
    backgroundColor: 'rgba(22, 163, 74, 0.055)',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  slotRowGap: { height: 8 },
  slotWrap: {
    width: '100%',
  },
  slotScoreStrip: {
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
  },
  slotScoreCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(255,255,255,0.025)',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 6,
  },
  slotScoreTopLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 6,
  },
  slotScoreLabel: {
    flex: 1,
    minWidth: 0,
    color: MUTED,
    fontSize: 9.5,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  slotScoreValue: {
    fontSize: 12,
    fontWeight: '900',
  },
  slotScoreTrack: {
    height: 5,
    borderRadius: 999,
    backgroundColor: '#272a2a',
    overflow: 'hidden',
  },
  slotScoreFill: {
    height: '100%',
    borderRadius: 999,
  },
  hsepThick: { height: 2, backgroundColor: LINE },
  cell: { minWidth: 0, paddingVertical: 10, justifyContent: 'center' },
  thText: { color: TEXT, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  td: { minWidth: 0, color: TEXT, flex: 1, fontSize: 12.5 },
  roleCellText: {
    color: ACCENT,
    fontWeight: '800',
    lineHeight: 16,
  },
  rolePillGroup: {
    minWidth: 0,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 0,
  },
  rolePill: {
    minWidth: 30,
    maxWidth: 46,
    flexShrink: 1,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.22)',
    backgroundColor: 'rgba(22, 163, 74, 0.13)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  rolePillWorldCup: {
    minWidth: 38,
    flexShrink: 0,
  },
  rolePillText: {
    minWidth: 0,
    color: ACCENT,
    fontSize: 10.5,
    fontWeight: '700',
    lineHeight: 13,
  },
  roleDash: {
    color: MUTED,
    textAlign: 'center',
  },
  indexCell: { textAlign: 'center' },
  slotLabel: {
    color: ACCENT,
    fontWeight: '700',
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
    backgroundColor: 'rgba(22, 163, 74, 0.055)',
  },
  emptyText: {
    color: MUTED,
    flex: COL.name + COL.nat + COL.team + COL.age + COL.roles,
    fontSize: 12.5,
    textAlign: 'center',
  },
  vsBand: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.018)',
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
    paddingHorizontal: 16,
  },
  vsText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '700',
    textAlign: 'center',
  },
  launchButtonTextMuted: {
    color: MUTED,
  },
  pressed: {
    opacity: 0.9,
  },
});
