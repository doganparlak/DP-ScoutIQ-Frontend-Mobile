import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, X } from 'lucide-react-native';

import PlayerCard from '@/components/PlayerCard';
import { TutorialHint } from '@/components/Tutorial';
import { ROLE_LONG_TO_SHORT, ROLE_SHORT_TO_LONG } from '@/services/api';
import { TEXT, MUTED, LINE, ACCENT, CARD, DANGER, DANGER_DARK, PANEL } from '@/theme';
import type { PlayerData } from '@/types';

type PlayerPoolComponentTheme = {
  panel: string;
  card: string;
  line: string;
  accent: string;
  accentSoft: string;
  activeRow: string;
  muted: string;
};

export const ROW_HEIGHT = 48;
export const CANDIDATE_TABLE_VISIBLE_ROWS = 5;

const COL = {
  index: 0.45,
  name: 0.95,
  nat: 0.75,
  team: 0.95,
  age: 0.65,
  roles: 1.25,
} as const;

export type SearchResultRow = {
  id: string;
  player: PlayerData;
};

export type CandidateSortKey = 'name' | 'nationality' | 'team' | 'age' | 'role';

function hasAbbreviation(token: string) {
  return /[.]/.test(token);
}

function compactDisplayName(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return name;
  return parts.filter((part) => !hasAbbreviation(part)).at(-1) || parts.at(-1) || parts[0];
}

function normalizeRoleLabel(value?: string) {
  if (!value) return '';
  const upper = value.toUpperCase();
  if (ROLE_SHORT_TO_LONG[upper]) return upper;
  return ROLE_LONG_TO_SHORT[value] || value;
}

function roleLabels(player: PlayerData) {
  const fromSeen = player.meta?.positionNamesSeen ?? [];
  const fromRoles = player.meta?.roles ?? [];
  const labels = (fromSeen.length ? fromSeen : fromRoles)
    .map(normalizeRoleLabel)
    .filter(Boolean);
  return Array.from(new Set(labels));
}

function rolePreviewLabels(player: PlayerData) {
  return roleLabels(player).slice(0, 2);
}

type Props = {
  results: SearchResultRow[];
  sortedResults: SearchResultRow[];
  selectedPlayerId: string | null;
  searching: boolean;
  error: string | null;
  candidateTableHeight: number;
  sortLabel: string;
  sortOpen: boolean;
  setSortOpen: (value: boolean) => void;
  sortKey: CandidateSortKey;
  cycleSort: (key: CandidateSortKey) => void;
  onSelectRow: (row: SearchResultRow) => void;
  weeklyPopularRows: SearchResultRow[];
  weeklyPopularOpen: boolean;
  weeklyPopularLoading: boolean;
  onCloseWeeklyPopular: () => void;
  weeklyPopularTutorialVisible?: boolean;
  onWeeklyPopularTutorialSkipAll?: () => void;
  tutorialStep?: 'candidates' | 'viniciusReady' | null;
  onTutorialContinue?: () => void;
  onTutorialSkipAll?: () => void;
  rowsLocked?: boolean;
  scrollLocked?: boolean;
  theme?: PlayerPoolComponentTheme;
  weeklyPopularTheme?: PlayerPoolComponentTheme;
  previewPlayerCardTheme?: {
    cardBackground: string;
    accent: string;
  };
  worldCupMode?: boolean;
};

export default function CandidatePlayers({
  results,
  sortedResults,
  selectedPlayerId,
  searching,
  error,
  candidateTableHeight,
  sortLabel,
  sortOpen,
  setSortOpen,
  sortKey,
  cycleSort,
  onSelectRow,
  weeklyPopularRows,
  weeklyPopularOpen,
  weeklyPopularLoading,
  onCloseWeeklyPopular,
  weeklyPopularTutorialVisible = false,
  onWeeklyPopularTutorialSkipAll,
  tutorialStep = null,
  onTutorialContinue,
  onTutorialSkipAll,
  rowsLocked = false,
  scrollLocked = false,
  theme,
  weeklyPopularTheme,
  previewPlayerCardTheme,
  worldCupMode = false,
}: Props) {
  const { t } = useTranslation();
  const { height: windowHeight, width: windowWidth, fontScale } = useWindowDimensions();
  const [popularPreviewPlayer, setPopularPreviewPlayer] = React.useState<PlayerData | null>(null);
  const androidCompact = Platform.OS === 'android' && (windowWidth < 390 || fontScale > 1.12);
  const androidTextScale = Platform.OS === 'android' ? 1.15 : undefined;
  const popularTheme = weeklyPopularTheme ?? theme;
  const popularModalMaxHeight =
    weeklyPopularTutorialVisible && Platform.OS === 'android'
      ? windowHeight * 0.78 + ROW_HEIGHT / 2
      : undefined;

  React.useEffect(() => {
    if (!weeklyPopularOpen) {
      setPopularPreviewPlayer(null);
    }
  }, [weeklyPopularOpen]);

  const renderRows = React.useCallback((
    rows: SearchResultRow[],
    onPress?: (row: SearchResultRow) => void,
    activeId?: string | null,
    emptyMessage?: string,
    rowTheme?: PlayerPoolComponentTheme,
    nameFormatter?: (name: string) => string,
    clickableCards = false,
  ) => {
    const activeTheme = rowTheme ?? theme;
    const verticalSeparatorStyle = [styles.vsep, activeTheme && { backgroundColor: activeTheme.line }];
    const displayEmptyMessage =
      emptyMessage ?? t('playerPoolEmptyBody', 'Run a search to see matching players from your database.');

    if (rows.length === 0) {
      return (
        <View style={styles.emptyRow}>
          <Text maxFontSizeMultiplier={androidTextScale} style={[styles.emptyText, activeTheme && { color: activeTheme.muted }]}>
            {displayEmptyMessage}
          </Text>
        </View>
      );
    }

    return rows.map((row, index) => {
      const nationalityShort = row.player.meta?.nationality
        ? row.player.meta.nationality
            .normalize('NFKD')
            .replace(/[^\p{Letter}\s]/gu, '')
            .trim()
            .split(/\s+/)[0]
            ?.slice(0, 3)
            .toUpperCase() || '—'
        : '—';
      const roles = rolePreviewLabels(row.player);
      const rowContent = (
        <>
          <Text maxFontSizeMultiplier={androidTextScale} style={[
            styles.td,
            styles.cell,
            styles.indexCell,
            clickableCards && styles.clickableIndexText,
            activeTheme && clickableCards && { color: activeTheme.accent },
            androidCompact && styles.tdCompact,
            { flex: COL.index },
          ]}>
            {index + 1}
          </Text>
          <View style={verticalSeparatorStyle} />
          <Text maxFontSizeMultiplier={androidTextScale} numberOfLines={1} style={[styles.td, styles.cell, androidCompact && styles.tdCompact, { flex: COL.name, textAlign: 'center' }]}>
            {nameFormatter ? nameFormatter(row.player.name) : compactDisplayName(row.player.name)}
          </Text>
          {!worldCupMode ? (
            <>
              <View style={verticalSeparatorStyle} />
              <Text maxFontSizeMultiplier={androidTextScale} numberOfLines={1} style={[styles.td, styles.cell, androidCompact && styles.tdCompact, { flex: COL.nat, textAlign: 'center' }]}>
                {nationalityShort}
              </Text>
            </>
          ) : null}
          <View style={verticalSeparatorStyle} />
          <Text maxFontSizeMultiplier={androidTextScale} numberOfLines={1} style={[styles.td, styles.cell, androidCompact && styles.tdCompact, { flex: COL.team, textAlign: 'center' }]}>
            {row.player.meta?.team || '—'}
          </Text>
          <View style={verticalSeparatorStyle} />
          <Text maxFontSizeMultiplier={androidTextScale} style={[styles.td, styles.cell, androidCompact && styles.tdCompact, { flex: COL.age, textAlign: 'center' }]}>
            {row.player.meta?.age ?? '—'}
          </Text>
          <View style={verticalSeparatorStyle} />
          <View style={[styles.cell, styles.rolePillGroup, { flex: COL.roles }]}>
            {roles.length ? roles.map((role) => (
              <View
                key={role}
                style={[
                  styles.rolePill,
                  worldCupMode && styles.rolePillWorldCup,
                  activeTheme && { backgroundColor: activeTheme.accentSoft, borderColor: activeTheme.line },
                ]}
              >
                <Text
                  maxFontSizeMultiplier={androidTextScale}
                  numberOfLines={1}
                  adjustsFontSizeToFit={!worldCupMode}
                  minimumFontScale={!worldCupMode ? 0.72 : undefined}
                  style={[styles.rolePillText, activeTheme && { color: activeTheme.accent }]}
                >
                  {role}
                </Text>
              </View>
            )) : (
              <Text maxFontSizeMultiplier={androidTextScale} style={[styles.td, styles.roleDash, androidCompact && styles.tdCompact]}>—</Text>
            )}
          </View>
        </>
      );

      return (
        <View key={row.id}>
          {onPress ? (
            <Pressable
              onPress={() => {
                if (rowsLocked) return;
                onPress(row);
              }}
              disabled={rowsLocked}
              style={({ pressed }) => [
                styles.row,
                clickableCards && styles.clickableRow,
                clickableCards && activeTheme && { borderColor: activeTheme.line, backgroundColor: 'rgba(22, 163, 74, 0.06)' },
                activeId === row.id && (activeTheme ? { backgroundColor: activeTheme.activeRow } : styles.dataRowActive),
                rowsLocked && styles.rowLocked,
                pressed && (clickableCards ? styles.clickableRowPressed : styles.pressed),
              ]}
            >
              {rowContent}
            </Pressable>
          ) : (
            <View style={[styles.row, activeId === row.id && (activeTheme ? { backgroundColor: activeTheme.activeRow } : styles.dataRowActive)]}>
              {rowContent}
            </View>
          )}
          {clickableCards ? (
            <View style={styles.clickableRowGap} />
          ) : (
            <View style={[styles.hsepThick, activeTheme && { backgroundColor: activeTheme.line }]} />
          )}
        </View>
      );
    });
  }, [androidCompact, androidTextScale, t, theme, rowsLocked, worldCupMode]);

  const headerTextProps = androidCompact
    ? { adjustsFontSizeToFit: true, minimumFontScale: 0.58, numberOfLines: 1 as const, maxFontSizeMultiplier: 1.12 }
    : {};

  return (
    <View style={[styles.panel, androidCompact && styles.panelCompact, theme && { backgroundColor: theme.panel, borderColor: theme.line }]}>
      <View style={[styles.worldCupTopStripe, { backgroundColor: theme?.accent ?? ACCENT }]} />
      <View style={[styles.sectionHeaderRow, androidCompact && styles.sectionHeaderRowCompact]}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit={androidCompact}
          minimumFontScale={0.75}
          maxFontSizeMultiplier={Platform.OS === 'android' ? 1.15 : undefined}
          style={[styles.sectionTitle, androidCompact && styles.sectionTitleCompact, theme && { color: theme.accent }]}
        >
          {t('playerPoolCandidates', 'Candidate players')}
        </Text>
        <View>
          <Pressable
            onPress={() => setSortOpen(true)}
            style={({ pressed }) => [
              styles.sortByButton,
              androidCompact && styles.sortByButtonCompact,
              theme && { backgroundColor: theme.card, borderColor: theme.line },
              pressed && styles.pressed,
            ]}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={androidCompact}
              minimumFontScale={0.72}
              maxFontSizeMultiplier={Platform.OS === 'android' ? 1.1 : undefined}
              style={[styles.sortByButtonText, androidCompact && styles.sortByButtonTextCompact, theme && { color: theme.muted }]}
            >
              {t('sortBy', 'Sort by')}: {sortLabel}
            </Text>
            <ChevronDown size={15} color={theme?.muted ?? MUTED} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {error ? <Text maxFontSizeMultiplier={androidTextScale} style={styles.errorText}>{error}</Text> : null}

      {searching ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme?.accent ?? ACCENT} />
        </View>
      ) : (
        <View style={styles.table}>
          <View style={[styles.tableTopBorder, theme && { backgroundColor: theme.line }]} />

          <View style={styles.tableHeaderWrap}>
            <View style={[styles.row, styles.clickableHeaderRow, theme && { borderColor: theme.line, backgroundColor: 'rgba(22, 163, 74, 0.09)' }]}>
              <View style={[styles.cell, { flex: COL.index }]}>
                <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, styles.indexCell]}>#</Text>
              </View>
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.name }]}>
                <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblName', 'Name')}</Text>
              </View>
              {!worldCupMode ? (
                <>
                  <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
                  <View style={[styles.cell, { flex: COL.nat }]}>
                    <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblNat', 'Nat.')}</Text>
                  </View>
                </>
              ) : null}
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.team }]}>
                <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblTeam', 'Team')}</Text>
              </View>
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.age }]}>
                <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblAge', 'Age')}</Text>
              </View>
              <View style={[styles.vsep, theme && { backgroundColor: theme.line }]} />
              <View style={[styles.cell, { flex: COL.roles }]}>
                <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblRoles', 'Role')}</Text>
              </View>
            </View>
            <View style={styles.clickableRowGap} />
          </View>

          <View style={[styles.tableScrollWrap, { minHeight: candidateTableHeight }]}>
            <ScrollView
              style={{ maxHeight: candidateTableHeight }}
              contentContainerStyle={{ paddingRight: 5, paddingVertical: 4 }}
              scrollIndicatorInsets={Platform.OS === 'ios' ? { right: -5 } : undefined}
              nestedScrollEnabled
              bounces={false}
              scrollEnabled={!scrollLocked}
              showsVerticalScrollIndicator
            >
              {renderRows(
                sortedResults,
                onSelectRow,
                selectedPlayerId,
                undefined,
                theme,
                undefined,
                true,
              )}
            </ScrollView>
          </View>

          <View style={[styles.tableBottomBorder, theme && { backgroundColor: theme.line }]} />
        </View>
      )}

      <TutorialHint
        visible={tutorialStep === 'candidates'}
        title={t('tutorialCandidatesTitle', 'Candidate players')}
        body={t(
          'tutorialCandidatesBody',
          'Search results appear here. You can sort the candidate players however you prefer and select the player who interests you.',
        )}
        actionLabel={t('tutorialContinueToCard', 'Continue to player card')}
        onAction={onTutorialContinue}
        onSkipAll={onTutorialSkipAll}
        arrow="none"
      />

      <TutorialHint
        visible={tutorialStep === 'viniciusReady'}
        title={t('tutorialViniciusReadyTitle', 'Candidate players')}
        body={t(
          'tutorialViniciusReadyBody',
          'Search results appear here. You can sort the candidate players however you prefer and select the player who interests you. We selected Vinicius Junior as the second example.',
        )}
        actionLabel={t('tutorialShowMatchupCenter', 'Show Matchup Center')}
        onAction={onTutorialContinue}
        onSkipAll={onTutorialSkipAll}
        arrow="none"
      />

      <Modal
        transparent
        visible={sortOpen}
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, theme && { backgroundColor: theme.panel, borderColor: theme.line }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('sortBy', 'Sort by')}</Text>
              <Pressable onPress={() => setSortOpen(false)}>
                {({ pressed }) => (
                  <X size={18} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {([
                ['name', t('tblName', 'Name')],
                ...(worldCupMode ? [] : [
                  ['nationality', t('tblNat', 'Nat.')],
                ] as Array<[CandidateSortKey, string]>),
                ['team', t('tblTeam', 'Team')],
                ['age', t('tblAge', 'Age')],
                ['role', t('tblRoles', 'Role')],
              ] as Array<[CandidateSortKey, string]>).map(([key, label]) => (
                <Pressable
                  key={key}
                  onPress={() => {
                    cycleSort(key);
                    setSortOpen(false);
                  }}
                  style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
                >
                  <Text style={[styles.optionText, sortKey === key && styles.optionTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={weeklyPopularOpen}
        animationType="fade"
        onRequestClose={onCloseWeeklyPopular}
      >
        <View style={styles.modalBackdrop}>
          <View style={[
            styles.popularModalCard,
            popularTheme && { backgroundColor: popularTheme.panel, borderColor: popularTheme.line },
            popularModalMaxHeight ? { maxHeight: popularModalMaxHeight } : null,
          ]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, styles.popularModalTitle, popularTheme && { color: popularTheme.accent }]}>
                {worldCupMode
                  ? t('worldCupTopSearches', 'World Cup Top Searches')
                  : t('weeklyPopularPlayers', "This week's popular players")}
              </Text>
              <Pressable onPress={onCloseWeeklyPopular}>
                {({ pressed }) => (
                  <X size={18} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>
            <View style={weeklyPopularTutorialVisible && styles.weeklyTutorialGap}>
              <TutorialHint
                visible={weeklyPopularTutorialVisible}
                title={t('tutorialWeeklyPopularListTitle', 'Weekly popular players')}
                body={t(
                  'tutorialWeeklyPopularListBody',
                  'You can view the 10 most searched players each week. Close this list when you are done.',
                )}
                onSkipAll={onWeeklyPopularTutorialSkipAll}
                arrow="none"
              />
            </View>

            {weeklyPopularLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={popularTheme?.accent ?? ACCENT} />
              </View>
            ) : (
              <View style={styles.table}>
                <View style={[styles.tableTopBorder, popularTheme && { backgroundColor: popularTheme.line }]} />
                <View style={styles.tableHeaderWrap}>
                  <View style={[styles.row, styles.clickableHeaderRow, popularTheme && { borderColor: popularTheme.line, backgroundColor: 'rgba(22, 163, 74, 0.09)' }]}>
                    <View style={[styles.cell, { flex: COL.index }]}>
                      <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, styles.indexCell]}>#</Text>
                    </View>
                    <View style={[styles.vsep, popularTheme && { backgroundColor: popularTheme.line }]} />
                    <View style={[styles.cell, { flex: COL.name }]}>
                      <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblName', 'Name')}</Text>
                    </View>
                    {!worldCupMode ? (
                      <>
                        <View style={[styles.vsep, popularTheme && { backgroundColor: popularTheme.line }]} />
                        <View style={[styles.cell, { flex: COL.nat }]}>
                          <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblNat', 'Nat.')}</Text>
                        </View>
                      </>
                    ) : null}
                    <View style={[styles.vsep, popularTheme && { backgroundColor: popularTheme.line }]} />
                    <View style={[styles.cell, { flex: COL.team }]}>
                      <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblTeam', 'Team')}</Text>
                    </View>
                    <View style={[styles.vsep, popularTheme && { backgroundColor: popularTheme.line }]} />
                    <View style={[styles.cell, { flex: COL.age }]}>
                      <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblAge', 'Age')}</Text>
                    </View>
                    <View style={[styles.vsep, popularTheme && { backgroundColor: popularTheme.line }]} />
                    <View style={[styles.cell, { flex: COL.roles }]}>
                      <Text {...headerTextProps} style={[styles.thText, androidCompact && styles.thTextCompact, { textAlign: 'center' }]}>{t('tblRoles', 'Role')}</Text>
                    </View>
                  </View>
                  <View style={styles.clickableRowGap} />
                </View>
                <ScrollView
                  style={styles.popularScroll}
                  contentContainerStyle={{ paddingRight: 5, paddingVertical: 4 }}
                  nestedScrollEnabled
                  bounces={false}
                  showsVerticalScrollIndicator
                >
                  {renderRows(
                    weeklyPopularRows,
                    (row) => setPopularPreviewPlayer(row.player),
                    undefined,
                    worldCupMode
                      ? t('worldCupTopSearchesEmpty', 'No World Cup top searches have been recorded yet.')
                      : t('weeklyPopularEmpty', 'No popular players have been recorded this week yet.'),
                    popularTheme,
                    compactDisplayName,
                    true,
                  )}
                </ScrollView>
                <View style={[styles.tableBottomBorder, popularTheme && { backgroundColor: popularTheme.line }]} />
              </View>
            )}
          </View>
        </View>

        <Modal
          transparent
          visible={!!popularPreviewPlayer}
          animationType="fade"
          onRequestClose={() => setPopularPreviewPlayer(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardWrap}>
              {popularPreviewPlayer ? (
                <PlayerCard
                  player={popularPreviewPlayer}
                  titleAlign="center"
                  visualTheme={previewPlayerCardTheme}
                  hideNationalityLeague={worldCupMode}
                />
              ) : null}
              <Pressable
                onPress={() => setPopularPreviewPlayer(null)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                style={({ pressed }) => [styles.closeInsideCard, { opacity: pressed ? 0.9 : 1 }]}
                accessibilityLabel={t('closePlayerCard', 'Close player card')}
              >
                {({ pressed }) => (
                  <X size={22} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      </Modal>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  sectionHeaderRowCompact: {
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitleCompact: {
    flexShrink: 1,
    minWidth: 0,
    marginBottom: 0,
  },
  worldCupTopStripe: {
    height: 4,
    borderRadius: 999,
    backgroundColor: '#5C00E6',
    marginBottom: 10,
  },
  sortByButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortByButtonCompact: {
    maxWidth: 220,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  sortByButtonText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  sortByButtonTextCompact: {
    flexShrink: 1,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.92,
  },
  loadingWrap: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: DANGER,
    marginBottom: 12,
    fontSize: 13,
  },
  table: { marginTop: 10 },
  tableTopBorder: { height: 1, backgroundColor: LINE },
  tableBottomBorder: { height: 1, backgroundColor: LINE },
  tableHeaderWrap: {
    paddingRight: 5,
  },
  tableScrollWrap: {
    paddingRight: 1,
  },
  row: { width: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  clickableRow: {
    minHeight: ROW_HEIGHT + 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.16)',
    backgroundColor: 'rgba(22, 163, 74, 0.055)',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  clickableHeaderRow: {
    minHeight: ROW_HEIGHT + 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.22)',
    backgroundColor: 'rgba(22, 163, 74, 0.09)',
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  clickableRowPressed: {
    transform: [{ scale: 0.992 }],
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderColor: 'rgba(36, 245, 166, 0.42)',
  },
  clickableRowGap: { height: 8 },
  clickableIndexText: {
    color: ACCENT,
    fontWeight: '900',
  },
  rowLocked: { opacity: 0.62 },
  hsepThick: { height: 2, backgroundColor: LINE },
  cell: { minWidth: 0, paddingVertical: 10, justifyContent: 'center' },
  thText: { color: TEXT, fontSize: 12, lineHeight: 15, fontWeight: '800' },
  thTextCompact: { fontSize: 12, lineHeight: 15 },
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
  tdCompact: { fontSize: 11.2, lineHeight: 15 },
  indexCell: { textAlign: 'center' },
  vsep: { width: 1, alignSelf: 'stretch', backgroundColor: LINE, opacity: 0.9 },
  dataRowActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
  },
  emptyRow: {
    minHeight: ROW_HEIGHT * 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    maxHeight: '70%',
  },
  popularModalCard: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    maxHeight: '78%',
  },
  popularScroll: {
    maxHeight: ROW_HEIGHT * 8,
  },
  weeklyTutorialGap: {
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '800',
  },
  popularModalTitle: {
    color: ACCENT,
  },
  modalCardWrap: {
    width: '100%',
    maxWidth: 560,
    borderRadius: 16,
    overflow: 'visible',
    padding: 2,
    position: 'relative',
  },
  closeInsideCard: { position: 'absolute', top: 6, right: 6, zIndex: 10, padding: 6 },
  optionRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  optionText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '700',
  },
  optionTextActive: {
    color: ACCENT,
  },
});
