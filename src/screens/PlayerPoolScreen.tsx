import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search, X } from 'lucide-react-native';

import { incrementPotentialRevealCount, shouldShowPotentialInterstitial } from '@/ads/adGating';
import { showInterstitialSafely, setInterstitialFailureHandler } from '@/ads/interstitial';
import { ProNotReadyScreen } from '@/ads/pro';
import Header from '@/components/Header';
import PlayerCard from '@/components/PlayerCard';
import { PLAYER_POOL_COUNTRIES, PLAYER_POOL_POSITION_OPTIONS, PLAYER_POOL_TEAM_NAMES } from '@/constants/playerPool';
import {
  ROLE_LONG_TO_SHORT,
  ROLE_SHORT_TO_LONG,
  addFavoritePlayer,
  getMe,
  getPlayerPoolOptions,
  revealPlayerPoolForm,
  revealPlayerPoolPotential,
  searchPlayerPool,
  type PlayerPoolSearchInput,
} from '@/services/api';
import { BG, PANEL, TEXT, MUTED, LINE, ACCENT, CARD, DANGER, DANGER_DARK } from '@/theme';
import type { PlayerData } from '@/types';

const ROW_HEIGHT = 48;
const CANDIDATE_TABLE_VISIBLE_ROWS = 5;
const COL = {
  name: 0.93,
  gen: 0.9,
  nat: 0.93,
  team: 1.0,
  league: 0.95,
  age: 0.8,
  roles: 0.8,
} as const;

type SearchResultRow = {
  id: string;
  player: PlayerData;
};

type CandidateSortKey = 'name' | 'gender' | 'nationality' | 'league' | 'team' | 'age' | 'role';
type SortDir = 'asc' | 'desc';

export default function PlayerPoolScreen() {
  const { t } = useTranslation();
  const [name, setName] = React.useState('');
  const [gender, setGender] = React.useState<'' | 'male' | 'female'>('');
  const [nationality, setNationality] = React.useState('');
  const [league, setLeague] = React.useState('');
  const [team, setTeam] = React.useState('');
  const [selectedNationality, setSelectedNationality] = React.useState<string | null>(null);
  const [selectedLeague, setSelectedLeague] = React.useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = React.useState<string | null>(null);
  const [position, setPosition] = React.useState('');
  const [minAge, setMinAge] = React.useState('');
  const [maxAge, setMaxAge] = React.useState('');
  const [minHeight, setMinHeight] = React.useState('');
  const [maxHeight, setMaxHeight] = React.useState('');
  const [results, setResults] = React.useState<SearchResultRow[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);
  const [selectedPlayer, setSelectedPlayer] = React.useState<PlayerData | null>(null);
  const [revealedPotentialForCard, setRevealedPotentialForCard] = React.useState(false);
  const [revealedFormForCard, setRevealedFormForCard] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [revealingPotential, setRevealingPotential] = React.useState(false);
  const [revealingForm, setRevealingForm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [positionOpen, setPositionOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [plan, setPlan] = React.useState<'Free' | 'Pro Monthly' | 'Pro Yearly'>('Free');
  const [proUpsellOpen, setProUpsellOpen] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<CandidateSortKey>('name');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const [countryOptions, setCountryOptions] = React.useState<string[]>([...PLAYER_POOL_COUNTRIES]);
  const [leagueOptions, setLeagueOptions] = React.useState<string[]>([]);
  const [teamOptions, setTeamOptions] = React.useState<string[]>([...PLAYER_POOL_TEAM_NAMES]);
  const [positionOptions, setPositionOptions] = React.useState<string[]>(
    [...PLAYER_POOL_POSITION_OPTIONS],
  );

  React.useEffect(() => {
    setInterstitialFailureHandler(() => setProUpsellOpen(true));
    return () => setInterstitialFailureHandler(null);
  }, []);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const me = await getMe();
        const currentPlan = me?.plan;
        setPlan(currentPlan === 'Pro Monthly' || currentPlan === 'Pro Yearly' ? currentPlan : 'Free');
      } catch {
        setPlan('Free');
      }

      try {
        const options = await getPlayerPoolOptions();
        if (!alive) return;

        const nationalityFromBackend = Array.isArray(options.nationalities) && options.nationalities.length > 0;
        const leagueFromBackend = Array.isArray(options.leagues) && options.leagues.length > 0;
        const teamFromBackend = Array.isArray(options.teams) && options.teams.length > 0;

        if (nationalityFromBackend) {
          setCountryOptions(options.nationalities);
        }
        if (leagueFromBackend) {
          setLeagueOptions(options.leagues);
        }
        if (teamFromBackend) {
          setTeamOptions(options.teams);
        }
        if (Array.isArray(options.positions) && options.positions.length > 0) {
          setPositionOptions(options.positions);
        }

      } catch (error) {
        // Keep local fallback lists when the backend options endpoint is unavailable.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const nationalitySuggestions = React.useMemo(() => {
    const q = nationality.trim().toLowerCase();
    if (!q) return [];
    const matches = countryOptions.filter((item) => item.toLowerCase().includes(q));
    const exactMatch = matches.find((item) => item.toLowerCase() === q);
    if (exactMatch) return [exactMatch];
    return matches.slice(0, 6);
  }, [countryOptions, nationality]);

  const teamSuggestions = React.useMemo(() => {
    const q = team.trim().toLowerCase();
    if (!q) return [];
    const matches = teamOptions.filter((item) => item.toLowerCase().includes(q));
    const exactMatch = matches.find((item) => item.toLowerCase() === q);
    if (exactMatch) return [exactMatch];
    return matches.slice(0, 6);
  }, [team, teamOptions]);

  const leagueSuggestions = React.useMemo(() => {
    const q = league.trim().toLowerCase();
    if (!q) return [];
    const matches = leagueOptions.filter((item) => item.toLowerCase().includes(q));
    const exactMatch = matches.find((item) => item.toLowerCase() === q);
    if (exactMatch) return [exactMatch];
    return matches.slice(0, 6);
  }, [league, leagueOptions]);

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
    setLeague('');
    setTeam('');
    setSelectedNationality(null);
    setSelectedLeague(null);
    setSelectedTeam(null);
    setPosition('');
    setMinAge('');
    setMaxAge('');
    setMinHeight('');
    setMaxHeight('');
    setResults([]);
    setSelectedPlayerId(null);
    setSelectedPlayer(null);
    setRevealedPotentialForCard(false);
    setRevealedFormForCard(false);
    setError(null);
  }, []);

  const onSearch = React.useCallback(async () => {
    const isShortRoleSelection = !!ROLE_SHORT_TO_LONG[position];
    const payload: PlayerPoolSearchInput = {
      name: name.trim() || undefined,
      gender: gender || undefined,
      nationality: nationality.trim() || undefined,
      nationalityExact:
        !!selectedNationality &&
        selectedNationality.trim().toLowerCase() === nationality.trim().toLowerCase(),
      league: league.trim() || undefined,
      leagueExact: !!selectedLeague && selectedLeague.trim().toLowerCase() === league.trim().toLowerCase(),
      team: team.trim() || undefined,
      teamExact: !!selectedTeam && selectedTeam.trim().toLowerCase() === team.trim().toLowerCase(),
      position: isShortRoleSelection ? undefined : position || undefined,
      minAge: minAge ? Number(minAge) : undefined,
      maxAge: maxAge ? Number(maxAge) : undefined,
      minHeight: minHeight ? Number(minHeight) : undefined,
      maxHeight: maxHeight ? Number(maxHeight) : undefined,
    };

    try {
      setSearching(true);
      setError(null);
      const next = await searchPlayerPool(payload);
      const filteredNext =
        isShortRoleSelection
          ? next.filter((row) =>
              (row.player.meta?.roles ?? []).some(
                (role) => (ROLE_LONG_TO_SHORT[role] || role) === position,
              ),
            )
          : next;
      setRevealedPotentialForCard(false);
      setRevealedFormForCard(false);
      setResults(filteredNext);
      setSelectedPlayerId(filteredNext[0]?.id ?? null);
      setSelectedPlayer(filteredNext[0]?.player ?? null);
    } catch (err: any) {
      setResults([]);
      setSelectedPlayerId(null);
      setSelectedPlayer(null);
      setRevealedPotentialForCard(false);
      setRevealedFormForCard(false);
      setError(err?.message ?? t('favoritesError', 'Favorites error'));
    } finally {
      setSearching(false);
    }
  }, [
    gender,
    maxAge,
    maxHeight,
    minAge,
    minHeight,
    name,
    nationality,
    league,
    selectedLeague,
    selectedNationality,
    selectedTeam,
    position,
    t,
    team,
  ]);

  const onRevealPotential = React.useCallback(async () => {
    if (!selectedPlayerId || !selectedPlayer || revealingPotential) return;

    try {
      setRevealingPotential(true);

      if (plan === 'Free') {
        const nextCount = await incrementPotentialRevealCount();
        if (shouldShowPotentialInterstitial(nextCount)) {
          const ok = showInterstitialSafely();
          if (!ok) {
            setProUpsellOpen(true);
          }
        }
      }

      const revealed = await revealPlayerPoolPotential(selectedPlayerId);
      const potential = Math.round(revealed.potential);
      setRevealedPotentialForCard(true);

      setResults((current) =>
        current.map((row) =>
          row.id === selectedPlayerId
            ? {
                ...row,
                player: {
                  ...row.player,
                  meta: {
                    ...(row.player.meta ?? {}),
                    potential,
                  },
                },
              }
            : row,
        ),
      );

      setSelectedPlayer((current) =>
        current
          ? {
              ...current,
              meta: {
                ...(current.meta ?? {}),
                potential,
              },
            }
          : current,
      );
    } catch (err: any) {
      Alert.alert(t('potentialRevealFailed', 'Potential reveal failed'), String(err?.message || err));
    } finally {
      setRevealingPotential(false);
    }
  }, [plan, revealingPotential, selectedPlayer, selectedPlayerId, t]);

  const onRevealForm = React.useCallback(async () => {
    if (!selectedPlayerId || !selectedPlayer || revealingForm) return;

    try {
      setRevealingForm(true);

      if (plan === 'Free') {
        const nextCount = await incrementPotentialRevealCount();
        if (shouldShowPotentialInterstitial(nextCount)) {
          const ok = showInterstitialSafely();
          if (!ok) {
            setProUpsellOpen(true);
          }
        }
      }

      const revealed = await revealPlayerPoolForm(selectedPlayerId);
      const form = Math.round(revealed.form);
      setRevealedFormForCard(true);

      setResults((current) =>
        current.map((row) =>
          row.id === selectedPlayerId
            ? {
                ...row,
                player: {
                  ...row.player,
                  meta: {
                    ...(row.player.meta ?? {}),
                    form,
                  },
                },
              }
            : row,
        ),
      );

      setSelectedPlayer((current) =>
        current
          ? {
              ...current,
              meta: {
                ...(current.meta ?? {}),
                form,
              },
            }
          : current,
      );
    } catch (err: any) {
      Alert.alert(t('formRevealFailed', 'Form reveal failed'), String(err?.message || err));
    } finally {
      setRevealingForm(false);
    }
  }, [plan, revealingForm, selectedPlayer, selectedPlayerId, t]);

  const selectedPlayerForCard = React.useMemo(() => {
    if (!selectedPlayer) return null;

    return {
      ...selectedPlayer,
      meta: selectedPlayer.meta
        ? {
            ...selectedPlayer.meta,
            potential: revealedPotentialForCard ? selectedPlayer.meta.potential : undefined,
            form: revealedFormForCard ? selectedPlayer.meta.form : undefined,
          }
        : selectedPlayer.meta,
    };
  }, [revealedFormForCard, revealedPotentialForCard, selectedPlayer]);

  const candidateTableHeight = React.useMemo(() => {
    if (results.length === 0) {
      return ROW_HEIGHT * 3;
    }

    const visibleRows = Math.min(results.length, CANDIDATE_TABLE_VISIBLE_ROWS);
    return ROW_HEIGHT * (visibleRows + 1) + 2;
  }, [results.length]);

  const roleDisplayLabel = React.useCallback((value: string) => {
    return ROLE_LONG_TO_SHORT[value] || value;
  }, []);

  const positionOptionLabels = React.useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];

    for (const item of positionOptions) {
      const short = roleDisplayLabel(item);
      if (seen.has(short)) continue;
      seen.add(short);
      out.push(short);
    }

    return out;
  }, [positionOptions, roleDisplayLabel]);

  const cycleSort = React.useCallback((key: CandidateSortKey) => {
    setSortKey((current) => {
      if (current === key) {
        setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'));
        return current;
      }
      setSortDir('asc');
      return key;
    });
  }, []);

  const sortLabel = React.useMemo(() => {
    const base =
      sortKey === 'name'
        ? t('tblName', 'Name')
        : sortKey === 'gender'
          ? t('tblGender', 'Gen.')
            : sortKey === 'nationality'
              ? t('tblNat', 'Nat.')
              : sortKey === 'league'
                ? t('tblLeague', 'League')
                : sortKey === 'team'
                  ? t('tblTeam', 'Team')
                  : sortKey === 'age'
                    ? t('tblAge', 'Age')
                    : t('tblRoles', 'Role');
    return `${base} (${sortDir === 'asc' ? 'A-Z' : 'Z-A'})`;
  }, [sortDir, sortKey, t]);

  const sortedResults = React.useMemo(() => {
    const list = [...results];
    const dir = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (sortKey === 'age') {
        const aAge = a.player.meta?.age;
        const bAge = b.player.meta?.age;
        const aMissing = typeof aAge !== 'number';
        const bMissing = typeof bAge !== 'number';

        if (aMissing && bMissing) return 0;
        if (aMissing) return 1;
        if (bMissing) return -1;

        return (aAge - bAge) * dir;
      }

      const aVal =
        sortKey === 'name'
          ? a.player.name
          : sortKey === 'gender'
            ? a.player.meta?.gender ?? ''
            : sortKey === 'role'
              ? a.player.meta?.roles?.[0] ?? ''
              : sortKey === 'nationality'
                ? a.player.meta?.nationality ?? ''
                : sortKey === 'league'
                  ? a.player.meta?.league ?? ''
                  : a.player.meta?.team ?? '';

      const bVal =
        sortKey === 'name'
          ? b.player.name
          : sortKey === 'gender'
            ? b.player.meta?.gender ?? ''
            : sortKey === 'role'
              ? b.player.meta?.roles?.[0] ?? ''
              : sortKey === 'nationality'
                ? b.player.meta?.nationality ?? ''
                : sortKey === 'league'
                  ? b.player.meta?.league ?? ''
                  : b.player.meta?.team ?? '';

      const aMissing = !aVal.trim();
      const bMissing = !bVal.trim();
      if (aMissing && bMissing) return 0;
      if (aMissing) return 1;
      if (bMissing) return -1;

      return aVal.localeCompare(bVal) * dir;
    });

    return list;
  }, [results, sortDir, sortKey]);

  return (
    <KeyboardAvoidingView
      style={styles.safe}
      behavior={Platform.select({ ios: 'padding', android: 'padding' })}
      keyboardVerticalOffset={0}
    >
      <View style={styles.screen}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Header
            subtitle={t(
              'playerPoolHeaderSubtitle',
              'Discover 52,000+ players from 113 leagues worldwide.',
            )}
          />

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
              <Text style={styles.filterLabel}>{t('fltNationality', 'Country')}</Text>
              <TextInput
                value={nationality}
                onChangeText={(value) => {
                  setNationality(value);
                  setSelectedNationality(
                    selectedNationality && selectedNationality === value ? selectedNationality : null,
                  );
                }}
                placeholder={t('phSearchNationality', 'Search nationality')}
                placeholderTextColor={MUTED}
                style={styles.input}
              />
              {nationalitySuggestions.length > 0 && nationality.trim().toLowerCase() !== selectedNationality?.trim().toLowerCase() ? (
                <View style={styles.suggestions}>
                  {nationalitySuggestions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setNationality(item);
                        setSelectedNationality(item);
                      }}
                      style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('fltLeague', 'League')}</Text>
              <TextInput
                value={league}
                onChangeText={(value) => {
                  setLeague(value);
                  setSelectedLeague(selectedLeague && selectedLeague === value ? selectedLeague : null);
                }}
                placeholder={t('phSearchLeague', 'Search league')}
                placeholderTextColor={MUTED}
                style={styles.input}
              />
              {leagueSuggestions.length > 0 && league.trim().toLowerCase() !== selectedLeague?.trim().toLowerCase() ? (
                <View style={styles.suggestions}>
                  {leagueSuggestions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setLeague(item);
                        setSelectedLeague(item);
                      }}
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
                onChangeText={(value) => {
                  setTeam(value);
                  setSelectedTeam(selectedTeam && selectedTeam === value ? selectedTeam : null);
                }}
                placeholder={t('phSearchTeam', 'Search team')}
                placeholderTextColor={MUTED}
                style={styles.input}
              />
              {teamSuggestions.length > 0 && team.trim().toLowerCase() !== selectedTeam?.trim().toLowerCase() ? (
                <View style={styles.suggestions}>
                  {teamSuggestions.map((item) => (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setTeam(item);
                        setSelectedTeam(item);
                      }}
                      style={({ pressed }) => [styles.suggestionChip, pressed && styles.pressed]}
                    >
                      <Text style={styles.suggestionText}>{item}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('tblRoles', 'Role')}</Text>
              <Pressable
                onPress={() => setPositionOpen(true)}
                style={({ pressed }) => [styles.input, styles.dropdownInput, pressed && styles.pressed]}
              >
                <Text style={{ color: position ? TEXT : MUTED, fontSize: 14 }}>
                  {position ? roleDisplayLabel(position) : t('tblRoles', 'Role')}
                </Text>
                <ChevronDown size={16} color={MUTED} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>{t('fltAge', 'Age (min / max)')}</Text>
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
              <Text style={styles.filterLabel}>{t('fltHeight', 'Height (min / max)')}</Text>
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
                            onPress={() => {
                              setRevealedPotentialForCard(false);
                              setRevealedFormForCard(false);
                              setSelectedPlayerId(row.id);
                              setSelectedPlayer(row.player);
                            }}
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
        </View>

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

                {positionOptionLabels.map((item) => (
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
        <ProNotReadyScreen
          visible={proUpsellOpen}
          onClose={() => setProUpsellOpen(false)}
        />
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  screen: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  content: {
    paddingTop: 0,
    paddingBottom: 32,
    gap: 16,
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
  dataRow: {
    minHeight: ROW_HEIGHT,
  },
  dataRowActive: {
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
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
  revealScoreButtonTextMuted: {
    color: MUTED,
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
