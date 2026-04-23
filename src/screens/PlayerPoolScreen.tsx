import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search, X } from 'lucide-react-native';

import PlayerCard from '@/components/PlayerCard';
import { PLAYER_POOL_COUNTRIES, PLAYER_POOL_POSITION_OPTIONS, PLAYER_POOL_TEAM_NAMES } from '@/constants/playerPool';
import { searchPlayerPool, type PlayerPoolSearchInput } from '@/services/api';
import { BG, PANEL, TEXT, MUTED, LINE, ACCENT, CARD, DANGER, DANGER_DARK } from '@/theme';
import type { PlayerData } from '@/types';

const ROW_HEIGHT = 48;

type SearchResultRow = {
  id: string;
  player: PlayerData;
};

export default function PlayerPoolScreen() {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [gender, setGender] = React.useState<'' | 'male' | 'female'>('');
  const [nationality, setNationality] = React.useState('');
  const [team, setTeam] = React.useState('');
  const [position, setPosition] = React.useState('');
  const [minAge, setMinAge] = React.useState('');
  const [maxAge, setMaxAge] = React.useState('');
  const [minHeight, setMinHeight] = React.useState('');
  const [maxHeight, setMaxHeight] = React.useState('');
  const [minWeight, setMinWeight] = React.useState('');
  const [maxWeight, setMaxWeight] = React.useState('');
  const [results, setResults] = React.useState<SearchResultRow[]>([]);
  const [selectedPlayer, setSelectedPlayer] = React.useState<PlayerData | null>(null);
  const [searching, setSearching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [positionOpen, setPositionOpen] = React.useState(false);

  const nationalitySuggestions = React.useMemo(() => {
    const q = nationality.trim().toLowerCase();
    if (!q) return [];
    return PLAYER_POOL_COUNTRIES.filter((item) => item.toLowerCase().includes(q)).slice(0, 6);
  }, [nationality]);

  const teamSuggestions = React.useMemo(() => {
    const q = team.trim().toLowerCase();
    if (!q) return [];
    return PLAYER_POOL_TEAM_NAMES.filter((item) => item.toLowerCase().includes(q)).slice(0, 6);
  }, [team]);

  const renderGenderLabel = React.useCallback(() => {
    if (gender === 'male') return t('genderMale', 'Male');
    if (gender === 'female') return t('genderFemale', 'Female');
    return t('gender', 'Gender');
  }, [gender, t]);

  const cycleGender = React.useCallback(() => {
    setGender((current) => {
      if (current === '') return 'male';
      if (current === 'male') return 'female';
      return '';
    });
  }, []);

  const clearFilters = React.useCallback(() => {
    setName('');
    setGender('');
    setNationality('');
    setTeam('');
    setPosition('');
    setMinAge('');
    setMaxAge('');
    setMinHeight('');
    setMaxHeight('');
    setMinWeight('');
    setMaxWeight('');
    setResults([]);
    setSelectedPlayer(null);
    setError(null);
  }, []);

  const sanitizedSelectedPlayer = React.useMemo(() => {
    if (!selectedPlayer) return null;
    return {
      ...selectedPlayer,
      meta: selectedPlayer.meta
        ? {
            ...selectedPlayer.meta,
            potential: undefined,
          }
        : undefined,
    };
  }, [selectedPlayer]);

  const onSearch = React.useCallback(async () => {
    const payload: PlayerPoolSearchInput = {
      name: name.trim() || undefined,
      gender: gender || undefined,
      nationality: nationality.trim() || undefined,
      team: team.trim() || undefined,
      position: position || undefined,
      minAge: minAge ? Number(minAge) : undefined,
      maxAge: maxAge ? Number(maxAge) : undefined,
      minHeight: minHeight ? Number(minHeight) : undefined,
      maxHeight: maxHeight ? Number(maxHeight) : undefined,
      minWeight: minWeight ? Number(minWeight) : undefined,
      maxWeight: maxWeight ? Number(maxWeight) : undefined,
    };

    try {
      setSearching(true);
      setError(null);
      const next = await searchPlayerPool(payload);
      setResults(next);
      setSelectedPlayer(next[0]?.player ?? null);
    } catch (err: any) {
      setResults([]);
      setSelectedPlayer(null);
      setError(err?.message ?? t('favoritesError', 'Favorites error'));
    } finally {
      setSearching(false);
    }
  }, [
    gender,
    maxAge,
    maxHeight,
    maxWeight,
    minAge,
    minHeight,
    minWeight,
    name,
    nationality,
    position,
    t,
    team,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>{t('playerPoolEyebrow', 'ScoutWise')}</Text>
          <Text style={styles.title}>{t('playerPoolTitle', 'Player Pool')}</Text>
          <Text style={styles.subtitle}>
            {t(
              'playerPoolSubtitle',
              'Search your player database by identity, club, profile, and position in one focused scouting workspace.',
            )}
          </Text>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t('playerPoolFilters', 'Search filters')}</Text>

          <View style={styles.filters}>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('fltName', 'Name')}</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder={t('phSearchName', 'Search name')}
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('fltGender', 'Gender')}</Text>
              <Pressable
                onPress={cycleGender}
                style={({ pressed }) => [styles.input, styles.centeredInput, pressed && styles.pressed]}
              >
                <Text style={{ color: gender ? TEXT : MUTED, fontSize: 14 }}>{renderGenderLabel()}</Text>
              </Pressable>
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('fltNationality', 'Nationality')}</Text>
              <TextInput
                value={nationality}
                onChangeText={setNationality}
                placeholder={t('phSearchNationality', 'Search nationality')}
                placeholderTextColor={MUTED}
                style={styles.input}
              />
              {nationalitySuggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {nationalitySuggestions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => setNationality(item)}
                      style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('fltTeam', 'Team')}</Text>
              <TextInput
                value={team}
                onChangeText={setTeam}
                placeholder={t('phSearchTeam', 'Search team')}
                placeholderTextColor={MUTED}
                style={styles.input}
              />
              {teamSuggestions.length > 0 ? (
                <View style={styles.suggestions}>
                  {teamSuggestions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => setTeam(item)}
                      style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('age', 'Age')} (min / max)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  value={minAge}
                  onChangeText={(value) => setMinAge(value.replace(/[^\d]/g, ''))}
                  keyboardType="numeric"
                  placeholder={t('phMin', 'Min')}
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.rangeInput]}
                />
                <TextInput
                  value={maxAge}
                  onChangeText={(value) => setMaxAge(value.replace(/[^\d]/g, ''))}
                  keyboardType="numeric"
                  placeholder={t('phMax', 'Max')}
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.rangeInput]}
                />
              </View>
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('height', 'Height')} (min / max)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  value={minHeight}
                  onChangeText={(value) => setMinHeight(value.replace(/[^\d.]/g, ''))}
                  keyboardType="numeric"
                  placeholder={t('phMin', 'Min')}
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.rangeInput]}
                />
                <TextInput
                  value={maxHeight}
                  onChangeText={(value) => setMaxHeight(value.replace(/[^\d.]/g, ''))}
                  keyboardType="numeric"
                  placeholder={t('phMax', 'Max')}
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.rangeInput]}
                />
              </View>
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('weight', 'Weight')} (min / max)</Text>
              <View style={styles.rangeRow}>
                <TextInput
                  value={minWeight}
                  onChangeText={(value) => setMinWeight(value.replace(/[^\d.]/g, ''))}
                  keyboardType="numeric"
                  placeholder={t('phMin', 'Min')}
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.rangeInput]}
                />
                <TextInput
                  value={maxWeight}
                  onChangeText={(value) => setMaxWeight(value.replace(/[^\d.]/g, ''))}
                  keyboardType="numeric"
                  placeholder={t('phMax', 'Max')}
                  placeholderTextColor={MUTED}
                  style={[styles.input, styles.rangeInput]}
                />
              </View>
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('tblRoles', 'Role')}</Text>
              <Pressable
                onPress={() => setPositionOpen(true)}
                style={({ pressed }) => [styles.input, styles.dropdownInput, pressed && styles.pressed]}
              >
                <Text style={{ color: position ? TEXT : MUTED, fontSize: 14 }}>
                  {position || t('tblRoles', 'Role')}
                </Text>
                <ChevronDown size={16} color={MUTED} strokeWidth={2.2} />
              </Pressable>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={clearFilters}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>{t('clearFilters', 'Clear filters')}</Text>
            </Pressable>

            <Pressable
              onPress={onSearch}
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            >
              <Search size={16} color={TEXT} strokeWidth={2.2} />
              <Text style={styles.primaryButtonText}>{t('playerPoolSearchButton', 'Search')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t('playerPoolCandidates', 'Candidate players')}</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {searching ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={ACCENT} />
            </View>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerText, styles.colName]}>{t('tblName', 'Name')}</Text>
                <Text style={[styles.headerText, styles.colGender]}>{t('gender', 'Gender')}</Text>
                <Text style={[styles.headerText, styles.colNationality]}>{t('tblNat', 'Nat.')}</Text>
                <Text style={[styles.headerText, styles.colTeam]}>{t('team', 'Team')}</Text>
                <Text style={[styles.headerText, styles.colAge]}>{t('tblAge', 'Age')}</Text>
                <Text style={[styles.headerText, styles.colRole]}>{t('tblRoles', 'Role')}</Text>
              </View>

              <ScrollView style={{ maxHeight: ROW_HEIGHT * 3 }} nestedScrollEnabled showsVerticalScrollIndicator>
                {results.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={styles.emptyText}>
                      {t('playerPoolEmptyBody', 'Run a search to see matching players from your database.')}
                    </Text>
                  </View>
                ) : (
                  results.map((row) => {
                    const genderValue = row.player.meta?.gender?.toLowerCase();
                    const genderLabel =
                      genderValue === 'male'
                        ? t('genderMaleShort', 'M')
                        : genderValue === 'female'
                          ? t('genderFemaleShort', 'F')
                          : '—';
                    return (
                      <Pressable
                        key={row.id}
                        onPress={() => setSelectedPlayer(row.player)}
                        style={({ pressed }) => [
                          styles.dataRow,
                          selectedPlayer?.name === row.player.name && styles.dataRowActive,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text numberOfLines={1} style={[styles.rowText, styles.colName]}>
                          {row.player.name}
                        </Text>
                        <Text numberOfLines={1} style={[styles.rowText, styles.colGender]}>
                          {genderLabel}
                        </Text>
                        <Text numberOfLines={1} style={[styles.rowText, styles.colNationality]}>
                          {row.player.meta?.nationality ?? '—'}
                        </Text>
                        <Text numberOfLines={1} style={[styles.rowText, styles.colTeam]}>
                          {row.player.meta?.team ?? '—'}
                        </Text>
                        <Text numberOfLines={1} style={[styles.rowText, styles.colAge]}>
                          {row.player.meta?.age ?? '—'}
                        </Text>
                        <Text numberOfLines={1} style={[styles.rowText, styles.colRole]}>
                          {row.player.meta?.roles?.[0] ?? '—'}
                        </Text>
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            </View>
          )}
        </View>

        <View style={styles.panel}>
          <Text style={styles.sectionTitle}>{t('playerCard', 'Player Card')}</Text>
          {sanitizedSelectedPlayer ? (
            <PlayerCard player={sanitizedSelectedPlayer} titleAlign="center" />
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

        <Modal
          transparent
          visible={positionOpen}
          animationType="fade"
          onRequestClose={() => setPositionOpen(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t('tblRoles', 'Role')}</Text>
                <Pressable onPress={() => setPositionOpen(false)}>
                  {({ pressed }) => (
                    <X size={18} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
                  )}
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Pressable
                  onPress={() => {
                    setPosition('');
                    setPositionOpen(false);
                  }}
                  style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
                >
                  <Text style={[styles.optionText, !position && styles.optionTextActive]}>
                    {t('clearFilters', 'Clear filters')}
                  </Text>
                </Pressable>

                {PLAYER_POOL_POSITION_OPTIONS.map((item) => (
                  <Pressable
                    key={item}
                    onPress={() => {
                      setPosition(item);
                      setPositionOpen(false);
                    }}
                    style={({ pressed }) => [styles.optionRow, pressed && styles.pressed]}
                  >
                    <Text style={[styles.optionText, position === item && styles.optionTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  hero: {
    marginBottom: 2,
  },
  eyebrow: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: TEXT,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 10,
    color: MUTED,
    fontSize: 15,
    lineHeight: 22,
  },
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
    marginBottom: 12,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  filterCol: {
    flexBasis: '48%',
    flexGrow: 1,
    gap: 6,
  },
  filterLabel: {
    color: MUTED,
    fontSize: 12,
  },
  input: {
    color: TEXT,
    backgroundColor: CARD,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  centeredInput: {
    justifyContent: 'center',
  },
  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  suggestionChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionText: {
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rangeInput: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1.25,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
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
  table: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: LINE,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    paddingHorizontal: 4,
  },
  headerText: {
    color: TEXT,
    fontSize: 12,
    fontWeight: '800',
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ROW_HEIGHT,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  dataRowActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
  },
  rowText: {
    color: TEXT,
    fontSize: 12.5,
  },
  colName: {
    flex: 1.4,
    paddingRight: 8,
  },
  colGender: {
    flex: 0.7,
    paddingRight: 8,
  },
  colNationality: {
    flex: 1,
    paddingRight: 8,
  },
  colTeam: {
    flex: 1.25,
    paddingRight: 8,
  },
  colAge: {
    flex: 0.65,
    paddingRight: 8,
  },
  colRole: {
    flex: 0.85,
  },
  emptyRow: {
    minHeight: ROW_HEIGHT * 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
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
