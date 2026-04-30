import React from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { incrementPotentialRevealCount, shouldShowPotentialInterstitial } from '@/ads/adGating';
import { showInterstitialSafely, setInterstitialFailureHandler } from '@/ads/interstitial';
import { ProNotReadyScreen } from '@/ads/pro';
import CandidatePlayers, {
  CANDIDATE_TABLE_VISIBLE_ROWS,
  ROW_HEIGHT,
  type CandidateSortKey,
  type SearchResultRow,
} from '@/components/CandidatePlayers';
import Header from '@/components/Header';
import PlayerCardPP from '@/components/PlayerCardPP';
import SearchFilters from '@/components/SearchFilters';
import { PLAYER_POOL_COUNTRIES, PLAYER_POOL_POSITION_OPTIONS, PLAYER_POOL_TEAM_NAMES } from '@/constants/playerPool';
import {
  ROLE_LONG_TO_SHORT,
  ROLE_SHORT_TO_LONG,
  getMe,
  getPlayerPoolOptions,
  revealPlayerPoolForm,
  revealPlayerPoolPotential,
  searchPlayerPool,
  type PlayerPoolSearchInput,
} from '@/services/api';
import { BG } from '@/theme';
import type { PlayerData } from '@/types';

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

        <SearchFilters
          name={name}
          setName={setName}
          gender={gender}
          renderGenderLabel={renderGenderLabel}
          cycleGender={cycleGender}
          nationality={nationality}
          setNationality={setNationality}
          selectedNationality={selectedNationality}
          setSelectedNationality={setSelectedNationality}
          nationalitySuggestions={nationalitySuggestions}
          league={league}
          setLeague={setLeague}
          selectedLeague={selectedLeague}
          setSelectedLeague={setSelectedLeague}
          leagueSuggestions={leagueSuggestions}
          team={team}
          setTeam={setTeam}
          selectedTeam={selectedTeam}
          setSelectedTeam={setSelectedTeam}
          teamSuggestions={teamSuggestions}
          position={position}
          setPosition={setPosition}
          positionOpen={positionOpen}
          setPositionOpen={setPositionOpen}
          positionOptionLabels={positionOptionLabels}
          roleDisplayLabel={roleDisplayLabel}
          minAge={minAge}
          setMinAge={setMinAge}
          maxAge={maxAge}
          setMaxAge={setMaxAge}
          minHeight={minHeight}
          setMinHeight={setMinHeight}
          maxHeight={maxHeight}
          setMaxHeight={setMaxHeight}
          clearFilters={clearFilters}
          onSearch={onSearch}
        />

        <CandidatePlayers
          results={results}
          sortedResults={sortedResults}
          selectedPlayer={selectedPlayer}
          searching={searching}
          error={error}
          candidateTableHeight={candidateTableHeight}
          sortLabel={sortLabel}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
          sortKey={sortKey}
          cycleSort={cycleSort}
          onSelectRow={(row) => {
            setRevealedPotentialForCard(false);
            setRevealedFormForCard(false);
            setSelectedPlayerId(row.id);
            setSelectedPlayer(row.player);
          }}
        />

        <PlayerCardPP
          selectedPlayer={selectedPlayer}
          selectedPlayerForCard={selectedPlayerForCard}
          onRevealPotential={onRevealPotential}
          onRevealForm={onRevealForm}
          revealingPotential={revealingPotential}
          revealingForm={revealingForm}
          revealedPotentialForCard={revealedPotentialForCard}
          revealedFormForCard={revealedFormForCard}
        />
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
});
