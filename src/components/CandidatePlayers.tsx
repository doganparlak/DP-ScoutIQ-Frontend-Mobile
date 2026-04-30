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

import { ROLE_LONG_TO_SHORT } from '@/services/api';
import { TEXT, MUTED, LINE, ACCENT, CARD, DANGER, DANGER_DARK, PANEL } from '@/theme';
import type { PlayerData } from '@/types';

export const ROW_HEIGHT = 48;
export const CANDIDATE_TABLE_VISIBLE_ROWS = 5;

const COL = {
  name: 0.93,
  gen: 0.9,
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

export type CandidateSortKey = 'name' | 'gender' | 'nationality' | 'league' | 'team' | 'age' | 'role';

type Props = {
  results: SearchResultRow[];
  sortedResults: SearchResultRow[];
  selectedPlayer: PlayerData | null;
  searching: boolean;
  error: string | null;
  candidateTableHeight: number;
  sortLabel: string;
  sortOpen: boolean;
  setSortOpen: (value: boolean) => void;
  sortKey: CandidateSortKey;
  cycleSort: (key: CandidateSortKey) => void;
  onSelectRow: (row: SearchResultRow) => void;
};

export default function CandidatePlayers({
  results,
  sortedResults,
  selectedPlayer,
  searching,
  error,
  candidateTableHeight,
  sortLabel,
  sortOpen,
  setSortOpen,
  sortKey,
  cycleSort,
  onSelectRow,
}: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.panel}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{t('playerPoolCandidates', 'Candidate players')}</Text>
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
              <View style={[styles.cell, { flex: COL.name }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblName', 'Name')}</Text>
              </View>
              <View style={styles.vsep} />
              <View style={[styles.cell, { flex: COL.gen }]}>
                <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblGender', 'Gen.')}</Text>
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
              showsVerticalScrollIndicator
            >
              {results.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>
                    {t('playerPoolEmptyBody', 'Run a search to see matching players from your database.')}
                  </Text>
                </View>
              ) : (
                sortedResults.map((row) => {
                  const genderValue = row.player.meta?.gender?.toLowerCase();
                  const genderLabel =
                    genderValue === 'male'
                      ? t('genderMaleShort', 'M')
                      : genderValue === 'female'
                        ? t('genderFemaleShort', 'F')
                        : '—';
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

                  return (
                    <View key={row.id}>
                      <Pressable
                        onPress={() => onSelectRow(row)}
                        style={({ pressed }) => [
                          styles.row,
                          selectedPlayer?.name === row.player.name && styles.dataRowActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.name, textAlign: 'center' }]}>
                          {row.player.name.split(/\s+/)[0] || row.player.name}
                        </Text>
                        <View style={styles.vsep} />
                        <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.gen, textAlign: 'center' }]}>
                          {genderLabel}
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
                      </Pressable>
                      <View style={styles.hsepThick} />
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>

          <View style={styles.tableBottomBorder} />
        </View>
      )}

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
                ['gender', t('tblGender', 'Gen.')],
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
  hsepThick: { height: 2, backgroundColor: LINE },
  cell: { paddingVertical: 10, justifyContent: 'center' },
  thText: { color: TEXT, fontWeight: '700' },
  td: { color: TEXT, flex: 1, fontSize: 12.5 },
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
