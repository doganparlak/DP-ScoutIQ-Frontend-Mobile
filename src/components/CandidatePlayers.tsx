import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, X } from 'lucide-react-native';

import PlayerCard from '@/components/PlayerCard';
import { TutorialHint } from '@/components/Tutorial';
import { ROLE_LONG_TO_SHORT } from '@/services/api';
import { TEXT, MUTED, LINE, ACCENT, CARD, DANGER, DANGER_DARK, PANEL } from '@/theme';
import type { PlayerData } from '@/types';

export const ROW_HEIGHT = 48;
export const CANDIDATE_TABLE_VISIBLE_ROWS = 5;

const COL = {
  index: 0.45,
  name: 0.93,
  nat: 0.93,
  team: 1.0,
  league: 0.95,
  age: 0.8,
  roles: 0.8,
} as const;

export type SearchResultRow = {
  id: string;
  player: PlayerData;
};

export type CandidateSortKey = 'name' | 'nationality' | 'league' | 'team' | 'age' | 'role';

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
  tutorialStep?: 'candidates' | 'viniciusReady' | null;
  onTutorialContinue?: () => void;
  onTutorialSkipAll?: () => void;
  rowsLocked?: boolean;
  scrollLocked?: boolean;
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
  tutorialStep = null,
  onTutorialContinue,
  onTutorialSkipAll,
  rowsLocked = false,
  scrollLocked = false,
}: Props) {
  const { t } = useTranslation();
  const [popularPreviewPlayer, setPopularPreviewPlayer] = React.useState<PlayerData | null>(null);

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
  ) => {
    const displayEmptyMessage =
      emptyMessage ?? t('playerPoolEmptyBody', 'Run a search to see matching players from your database.');

    if (rows.length === 0) {
      return (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>{displayEmptyMessage}</Text>
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
      const roleValue = row.player.meta?.roles?.[0];
      const roleShort =
        (roleValue && ROLE_LONG_TO_SHORT[roleValue]) ||
        roleValue ||
        '—';
      const leagueShort = row.player.meta?.league
        ? row.player.meta.league
            .split(/\s+/)
            .map((part) => part[0])
            .join('')
            .slice(0, 5)
            .toUpperCase() || row.player.meta.league
        : '—';
      const rowContent = (
        <>
          <Text style={[styles.td, styles.cell, styles.indexCell, { flex: COL.index }]}>
            {index + 1}
          </Text>
          <View style={styles.vsep} />
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.name, textAlign: 'center' }]}>
            {row.player.name.split(/\s+/)[0] || row.player.name}
          </Text>
          <View style={styles.vsep} />
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.nat, textAlign: 'center' }]}>
            {nationalityShort}
          </Text>
          <View style={styles.vsep} />
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.league, textAlign: 'center' }]}>
            {leagueShort}
          </Text>
          <View style={styles.vsep} />
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.team, textAlign: 'center' }]}>
            {row.player.meta?.team || '—'}
          </Text>
          <View style={styles.vsep} />
          <Text style={[styles.td, styles.cell, { flex: COL.age, textAlign: 'center' }]}>
            {row.player.meta?.age ?? '—'}
          </Text>
          <View style={styles.vsep} />
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.roles, textAlign: 'center' }]}>
            {roleShort}
          </Text>
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
                activeId === row.id && styles.dataRowActive,
                rowsLocked && styles.rowLocked,
                pressed && styles.pressed,
              ]}
            >
              {rowContent}
            </Pressable>
          ) : (
            <View style={[styles.row, activeId === row.id && styles.dataRowActive]}>
              {rowContent}
            </View>
          )}
          <View style={styles.hsepThick} />
        </View>
      );
    });
  }, [t]);

  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t('playerPoolCandidates', 'Candidate players')}</Text>
        <View>
          <Pressable
            onPress={() => setSortOpen(true)}
            style={({ pressed }) => [styles.sortByButton, pressed && styles.pressed]}
          >
            <Text style={styles.sortByButtonText}>
              {t('sortBy', 'Sort by')}: {sortLabel}
            </Text>
            <ChevronDown size={15} color={MUTED} strokeWidth={2.2} />
          </Pressable>
        </View>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {searching ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={ACCENT} />
        </View>
      ) : (
        <View style={styles.table}>
          <View style={styles.tableTopBorder} />

          <View style={styles.tableHeaderWrap}>
            <View style={styles.row}>
              <View style={[styles.cell, { flex: COL.index }]}>
                <Text style={[styles.thText, styles.indexCell]}>#</Text>
              </View>
              <View style={styles.vsep} />
              <View style={[styles.cell, { flex: COL.name }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblName', 'Name')}</Text>
              </View>
              <View style={styles.vsep} />
              <View style={[styles.cell, { flex: COL.nat }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblNat', 'Nat.')}</Text>
              </View>
              <View style={styles.vsep} />
              <View style={[styles.cell, { flex: COL.league }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblLeagueShort', 'Lg.')}</Text>
              </View>
              <View style={styles.vsep} />
              <View style={[styles.cell, { flex: COL.team }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblTeam', 'Team')}</Text>
              </View>
              <View style={styles.vsep} />
              <View style={[styles.cell, { flex: COL.age }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblAge', 'Age')}</Text>
              </View>
              <View style={styles.vsep} />
              <View style={[styles.cell, { flex: COL.roles }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblRoles', 'Role')}</Text>
              </View>
            </View>
            <View style={styles.hsepThick} />
          </View>

          <View style={[styles.tableScrollWrap, { minHeight: candidateTableHeight }]}>
            <ScrollView
              style={{ maxHeight: candidateTableHeight }}
              contentContainerStyle={{ paddingRight: 5 }}
              scrollIndicatorInsets={Platform.OS === 'ios' ? { right: -5 } : undefined}
              nestedScrollEnabled
              bounces={false}
              scrollEnabled={!scrollLocked}
              showsVerticalScrollIndicator
            >
              {renderRows(sortedResults, onSelectRow, selectedPlayerId)}
            </ScrollView>
          </View>

          <View style={styles.tableBottomBorder} />
        </View>
      )}

      <TutorialHint
        visible={tutorialStep === 'candidates'}
        title={t('tutorialCandidatesTitle', 'Candidate players')}
        body={t(
          'tutorialCandidatesBody',
          'Search results appear here. The first player is selected automatically.',
        )}
        actionLabel={t('tutorialContinueToCard', 'Continue to player card')}
        onAction={onTutorialContinue}
        onSkipAll={onTutorialSkipAll}
        targetLabel={t('tutorialPressContinue', 'Press continue')}
        arrow="down"
      />

      <TutorialHint
        visible={tutorialStep === 'viniciusReady'}
        title={t('tutorialViniciusReadyTitle', 'Second player found')}
        body={t(
          'tutorialViniciusReadyBody',
          'Vinicius Junior is selected. Add him as the second matchup player.',
        )}
        actionLabel={t('tutorialShowMatchupCenter', 'Show Matchup Center')}
        onAction={onTutorialContinue}
        onSkipAll={onTutorialSkipAll}
        targetLabel={t('tutorialPressShowMatchup', 'Press Show Matchup Center')}
        arrow="down"
      />

      <Modal
        transparent
        visible={sortOpen}
        animationType="fade"
        onRequestClose={() => setSortOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
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
                ['nationality', t('tblNat', 'Nat.')],
                ['league', t('tblLeague', 'League')],
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
          <View style={styles.popularModalCard}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, styles.popularModalTitle]}>
                {t('weeklyPopularPlayers', "This week's popular players")}
              </Text>
              <Pressable onPress={onCloseWeeklyPopular}>
                {({ pressed }) => (
                  <X size={18} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>

            {weeklyPopularLoading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={ACCENT} />
              </View>
            ) : (
              <View style={styles.table}>
                <View style={styles.tableTopBorder} />
                <View style={styles.tableHeaderWrap}>
                  <View style={styles.row}>
                    <View style={[styles.cell, { flex: COL.index }]}>
                      <Text style={[styles.thText, styles.indexCell]}>#</Text>
                    </View>
                    <View style={styles.vsep} />
                    <View style={[styles.cell, { flex: COL.name }]}>
                      <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblName', 'Name')}</Text>
                    </View>
                    <View style={styles.vsep} />
                    <View style={[styles.cell, { flex: COL.nat }]}>
                      <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblNat', 'Nat.')}</Text>
                    </View>
                    <View style={styles.vsep} />
                    <View style={[styles.cell, { flex: COL.league }]}>
                      <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblLeagueShort', 'Lg.')}</Text>
                    </View>
                    <View style={styles.vsep} />
                    <View style={[styles.cell, { flex: COL.team }]}>
                      <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblTeam', 'Team')}</Text>
                    </View>
                    <View style={styles.vsep} />
                    <View style={[styles.cell, { flex: COL.age }]}>
                      <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblAge', 'Age')}</Text>
                    </View>
                    <View style={styles.vsep} />
                    <View style={[styles.cell, { flex: COL.roles }]}>
                      <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblRoles', 'Role')}</Text>
                    </View>
                  </View>
                  <View style={styles.hsepThick} />
                </View>
                <ScrollView
                  style={styles.popularScroll}
                  contentContainerStyle={{ paddingRight: 5 }}
                  nestedScrollEnabled
                  bounces={false}
                  showsVerticalScrollIndicator
                >
                  {renderRows(
                    weeklyPopularRows,
                    (row) => setPopularPreviewPlayer(row.player),
                    undefined,
                    t('weeklyPopularEmpty', 'No popular players have been recorded this week yet.'),
                  )}
                </ScrollView>
                <View style={styles.tableBottomBorder} />
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
                <PlayerCard player={popularPreviewPlayer} titleAlign="center" />
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
  sortByButtonText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  rowLocked: { opacity: 0.62 },
  hsepThick: { height: 2, backgroundColor: LINE },
  cell: { paddingVertical: 10, justifyContent: 'center' },
  thText: { color: TEXT, fontWeight: '700' },
  td: { color: TEXT, flex: 1, fontSize: 12.5 },
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
