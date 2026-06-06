import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react-native';

import {
  incrementPotentialRevealCount,
  incrementMatchupLaunchCount,
  incrementWeeklyPopularRevealCount,
  shouldShowMatchupLaunchInterstitial,
  shouldShowPotentialInterstitial,
  shouldShowWeeklyPopularInterstitial,
} from '@/ads/adGating';
import { showInterstitialSafely, setInterstitialFailureHandler } from '@/ads/interstitial';
import { ProNotReadyScreen } from '@/ads/pro';
import CandidatePlayers, {
  CANDIDATE_TABLE_VISIBLE_ROWS,
  ROW_HEIGHT,
  type CandidateSortKey,
  type SearchResultRow,
} from '@/components/CandidatePlayers';
import ComparisonModal from '@/components/ComparisonModal';
import { DailyScoutChallengeModal } from '@/components/DailyScoutChallenge';
import Header from '@/components/Header';
import MatchupCenter from '@/components/MatchupCenter';
import PlayerCardPP from '@/components/PlayerCardPP';
import SearchFilters from '@/components/SearchFilters';
import { TutorialHint, useTutorial } from '@/components/Tutorial';
import { PLAYER_POOL_COUNTRIES, PLAYER_POOL_POSITION_OPTIONS, PLAYER_POOL_TEAM_NAMES } from '@/constants/playerPool';
import {
  ROLE_LONG_TO_SHORT,
  ROLE_SHORT_TO_LONG,
  getMatchupComparison,
  getMe,
  getPlayerPoolOptions,
  getWeeklyPopularPlayers,
  recordPlayerPoolSearchHit,
  revealPlayerPoolForm,
  revealPlayerPoolPotential,
  searchPlayerPool,
  type PlayerPoolSearchInput,
  type MatchupComparisonResponse,
} from '@/services/api';
import { ACCENT, BG, WORLD_CUP_COLORS } from '@/theme';
import type { PlayerData } from '@/types';

type SortDir = 'asc' | 'desc';

const ANDROID_REVEAL_FORM_EXTRA_SCROLL = 100;
const ANDROID_ADD_MATCHUP_EXTRA_SCROLL = 100;

export default function PlayerPoolScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const tutorial = useTutorial();
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
  const [weeklyPopularOpen, setWeeklyPopularOpen] = React.useState(false);
  const [weeklyPopularLoading, setWeeklyPopularLoading] = React.useState(false);
  const [weeklyPopularRows, setWeeklyPopularRows] = React.useState<SearchResultRow[]>([]);
  const [matchupRow1, setMatchupRow1] = React.useState<SearchResultRow | null>(null);
  const [matchupRow2, setMatchupRow2] = React.useState<SearchResultRow | null>(null);
  const [comparisonOpen, setComparisonOpen] = React.useState(false);
  const [comparisonLoading, setComparisonLoading] = React.useState(false);
  const [comparisonError, setComparisonError] = React.useState<string | null>(null);
  const [comparisonData, setComparisonData] = React.useState<MatchupComparisonResponse | null>(null);
  const [worldCupMode, setWorldCupMode] = React.useState(false);
  const [countryOptions, setCountryOptions] = React.useState<string[]>([...PLAYER_POOL_COUNTRIES]);
  const [leagueOptions, setLeagueOptions] = React.useState<string[]>([]);
  const [teamOptions, setTeamOptions] = React.useState<string[]>([...PLAYER_POOL_TEAM_NAMES]);
  const [positionOptions, setPositionOptions] = React.useState<string[]>(
    [...PLAYER_POOL_POSITION_OPTIONS],
  );
  const scrollRef = React.useRef<ScrollView | null>(null);
  const currentCardRenderIdRef = React.useRef<string | null>(null);
  const countedCardRenderIdRef = React.useRef<string | null>(null);
  const isPlayerPoolTutorialActive = tutorial.active && tutorial.stage === 'playerPool';

  const scrollToTutorialArea = React.useCallback((area: 'worldCup' | 'weekly' | 'filters' | 'candidates' | 'card' | 'form' | 'matchupAdd' | 'matchup') => {
    const y =
      area === 'worldCup'
        ? 60
        : area === 'weekly'
        ? 150
        : area === 'filters'
        ? 210
        : area === 'candidates'
          ? 600
          : area === 'form'
            ? 900 + (Platform.OS === 'android' ? ANDROID_REVEAL_FORM_EXTRA_SCROLL : 0)
          : area === 'card'
            ? 900
            : area === 'matchupAdd'
              ? 1240 + (Platform.OS === 'android' ? ANDROID_ADD_MATCHUP_EXTRA_SCROLL : 0)
            : 1240;
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y, animated: true });
    });
  }, []);

  React.useEffect(() => {
    if (!isPlayerPoolTutorialActive || tutorial.playerPoolStep !== 'filters') return;

    setName('Lamine Yamal');
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
    scrollToTutorialArea('filters');
  }, [isPlayerPoolTutorialActive, scrollToTutorialArea, tutorial.playerPoolStep]);

  React.useEffect(() => {
    if (!isPlayerPoolTutorialActive) return;

    if (tutorial.playerPoolStep === 'worldCupMode') {
      scrollToTutorialArea('worldCup');
    } else if (tutorial.playerPoolStep === 'weeklyPopularButton') {
      scrollToTutorialArea('weekly');
    } else if (tutorial.playerPoolStep === 'candidates' || tutorial.playerPoolStep === 'viniciusReady') {
      scrollToTutorialArea('candidates');
    } else if (
      tutorial.playerPoolStep === 'card' ||
      tutorial.playerPoolStep === 'revealPotential' ||
      tutorial.playerPoolStep === 'addPortfolio'
    ) {
      scrollToTutorialArea('card');
    } else if (tutorial.playerPoolStep === 'revealForm') {
      scrollToTutorialArea('form');
    } else if (
      tutorial.playerPoolStep === 'addYamalToMatchup' ||
      tutorial.playerPoolStep === 'addViniciusToMatchup'
    ) {
      scrollToTutorialArea('matchupAdd');
    } else if (tutorial.playerPoolStep === 'launchMatchup') {
      scrollToTutorialArea('matchup');
    }
  }, [isPlayerPoolTutorialActive, scrollToTutorialArea, tutorial.playerPoolStep]);

  React.useEffect(() => {
    setInterstitialFailureHandler(() => setProUpsellOpen(true));
    return () => setInterstitialFailureHandler(null);
  }, []);

  const skipPlayerPoolTutorial = React.useCallback(() => {
    setComparisonOpen(false);
    setWeeklyPopularOpen(false);
    setProUpsellOpen(false);
    tutorial.skipTutorial();
    navigation.navigate('Strategy');
  }, [navigation, tutorial]);

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
        const options = await getPlayerPoolOptions(worldCupMode);
        if (!alive) return;

        if (Array.isArray(options.nationalities)) {
          setCountryOptions(options.nationalities);
        }
        if (Array.isArray(options.leagues)) {
          setLeagueOptions(options.leagues);
        }
        if (Array.isArray(options.teams)) {
          setTeamOptions(options.teams);
        }
        if (Array.isArray(options.positions)) {
          setPositionOptions(options.positions);
        }

      } catch (error) {
        // Keep local fallback lists when the backend options endpoint is unavailable.
      }
    })();

    return () => {
      alive = false;
    };
  }, [worldCupMode]);

  React.useEffect(() => {
    if (!worldCupMode) return;
    setNationality('');
    setSelectedNationality(null);
    setLeague('');
    setSelectedLeague(null);
    setSortKey((current) => (current === 'nationality' || current === 'league' ? 'name' : current));
  }, [worldCupMode]);

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
    currentCardRenderIdRef.current = null;
    countedCardRenderIdRef.current = null;
    setRevealedPotentialForCard(false);
    setRevealedFormForCard(false);
    setError(null);
  }, []);

  const resetPlayerPoolState = React.useCallback(() => {
    clearFilters();
    setMatchupRow1(null);
    setMatchupRow2(null);
    setComparisonOpen(false);
    setComparisonLoading(false);
    setComparisonError(null);
    setComparisonData(null);
    setWeeklyPopularOpen(false);
    setWeeklyPopularRows([]);
    setWeeklyPopularLoading(false);
    setProUpsellOpen(false);
  }, [clearFilters]);

  const wasTutorialActiveRef = React.useRef(false);
  const handledTutorialActivationKeyRef = React.useRef(tutorial.activationKey);

  React.useEffect(() => {
    if (
      tutorial.active &&
      tutorial.stage === 'playerPool' &&
      handledTutorialActivationKeyRef.current !== tutorial.activationKey
    ) {
      handledTutorialActivationKeyRef.current = tutorial.activationKey;
      resetPlayerPoolState();
    }
  }, [resetPlayerPoolState, tutorial.activationKey, tutorial.active, tutorial.stage]);

  React.useEffect(() => {
    if (isPlayerPoolTutorialActive) {
      wasTutorialActiveRef.current = true;
      return;
    }

    if (wasTutorialActiveRef.current && !tutorial.active) {
      wasTutorialActiveRef.current = false;
      resetPlayerPoolState();
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      });
    }
  }, [isPlayerPoolTutorialActive, resetPlayerPoolState, tutorial.active]);

  const onSearch = React.useCallback(async (tutorialName?: string) => {
    const searchName = tutorialName ?? name;
    const isShortRoleSelection = !!ROLE_SHORT_TO_LONG[position];
    const payload: PlayerPoolSearchInput = {
      name: searchName.trim() || undefined,
      gender: gender || undefined,
      nationality: worldCupMode ? undefined : nationality.trim() || undefined,
      nationalityExact: worldCupMode
        ? undefined
        : !!selectedNationality &&
          selectedNationality.trim().toLowerCase() === nationality.trim().toLowerCase(),
      league: worldCupMode ? undefined : league.trim() || undefined,
      leagueExact: worldCupMode
        ? undefined
        : !!selectedLeague && selectedLeague.trim().toLowerCase() === league.trim().toLowerCase(),
      team: team.trim() || undefined,
      teamExact: !!selectedTeam && selectedTeam.trim().toLowerCase() === team.trim().toLowerCase(),
      position: isShortRoleSelection ? undefined : position || undefined,
      minAge: minAge ? Number(minAge) : undefined,
      maxAge: maxAge ? Number(maxAge) : undefined,
      minHeight: minHeight ? Number(minHeight) : undefined,
      maxHeight: maxHeight ? Number(maxHeight) : undefined,
      worldCupMode,
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
      const firstRow = filteredNext[0];
      currentCardRenderIdRef.current = firstRow ? `${firstRow.id}:${Date.now()}` : null;
      countedCardRenderIdRef.current = null;
      setResults(filteredNext);
      setSelectedPlayerId(firstRow?.id ?? null);
      setSelectedPlayer(firstRow?.player ?? null);

      if (isPlayerPoolTutorialActive) {
        if (tutorialName === 'Vinicius Junior') {
          tutorial.setPlayerPoolStep('viniciusReady');
        } else if (tutorial.playerPoolStep === 'filters' || tutorial.playerPoolStep === 'search') {
          tutorial.setPlayerPoolStep('candidates');
        }
      }
    } catch (err: any) {
      setResults([]);
      setSelectedPlayerId(null);
      setSelectedPlayer(null);
      currentCardRenderIdRef.current = null;
      countedCardRenderIdRef.current = null;
      setRevealedPotentialForCard(false);
      setRevealedFormForCard(false);
      setError(err?.message ?? t('favoritesError', 'Favorites error'));
    } finally {
      setSearching(false);
    }
  }, [
    gender,
    isPlayerPoolTutorialActive,
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
    tutorial,
    worldCupMode,
  ]);

  const recordSelectedCardInterestOnce = React.useCallback(() => {
    if (isPlayerPoolTutorialActive) return;

    const renderId = currentCardRenderIdRef.current;
    if (!selectedPlayerId || !renderId || countedCardRenderIdRef.current === renderId) return;

    countedCardRenderIdRef.current = renderId;
    recordPlayerPoolSearchHit(selectedPlayerId, worldCupMode).catch(() => {});
  }, [isPlayerPoolTutorialActive, selectedPlayerId, worldCupMode]);

  const onRevealPotential = React.useCallback(async () => {
    if (!selectedPlayerId || !selectedPlayer || revealingPotential) return;

    try {
      setRevealingPotential(true);

      if (plan === 'Free' && !isPlayerPoolTutorialActive) {
        const nextCount = await incrementPotentialRevealCount();
        if (shouldShowPotentialInterstitial(nextCount)) {
          const ok = showInterstitialSafely();
          if (!ok) {
            setProUpsellOpen(true);
          }
        }
      }

      const revealed = await revealPlayerPoolPotential(selectedPlayerId, worldCupMode);
      const potential = Math.round(revealed.potential);
      setRevealedPotentialForCard(true);
      recordSelectedCardInterestOnce();

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

      if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'revealPotential') {
        tutorial.setPlayerPoolStep('revealForm');
      }
    } catch (err: any) {
      Alert.alert(t('potentialRevealFailed', 'Potential reveal failed'), String(err?.message || err));
    } finally {
      setRevealingPotential(false);
    }
  }, [
    isPlayerPoolTutorialActive,
    plan,
    recordSelectedCardInterestOnce,
    revealingPotential,
    selectedPlayer,
    selectedPlayerId,
    t,
    tutorial,
    worldCupMode,
  ]);

  const onRevealForm = React.useCallback(async () => {
    if (!selectedPlayerId || !selectedPlayer || revealingForm) return;

    try {
      setRevealingForm(true);

      if (plan === 'Free' && !isPlayerPoolTutorialActive) {
        const nextCount = await incrementPotentialRevealCount();
        if (shouldShowPotentialInterstitial(nextCount)) {
          const ok = showInterstitialSafely();
          if (!ok) {
            setProUpsellOpen(true);
          }
        }
      }

      const revealed = await revealPlayerPoolForm(selectedPlayerId, worldCupMode);
      const form = Math.round(revealed.form);
      setRevealedFormForCard(true);
      recordSelectedCardInterestOnce();

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

      if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'revealForm') {
        tutorial.setPlayerPoolStep('addPortfolio');
      }
    } catch (err: any) {
      Alert.alert(t('formRevealFailed', 'Form reveal failed'), String(err?.message || err));
    } finally {
      setRevealingForm(false);
    }
  }, [
    isPlayerPoolTutorialActive,
    plan,
    recordSelectedCardInterestOnce,
    revealingForm,
    selectedPlayer,
    selectedPlayerId,
    t,
    tutorial,
    worldCupMode,
  ]);

  const onRevealWeeklyPopular = React.useCallback(async () => {
    if (weeklyPopularLoading) return;

    try {
      setWeeklyPopularLoading(true);
      setWeeklyPopularOpen(true);

      if (plan === 'Free' && !isPlayerPoolTutorialActive) {
        const nextCount = await incrementWeeklyPopularRevealCount();
        if (shouldShowWeeklyPopularInterstitial(nextCount)) {
          const ok = showInterstitialSafely();
          if (!ok) {
            setProUpsellOpen(true);
          }
        }
      }

      const nextRows = await getWeeklyPopularPlayers(10, worldCupMode);
      setWeeklyPopularRows(nextRows);
      if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'weeklyPopularButton') {
        tutorial.setPlayerPoolStep('weeklyPopularList');
      }
    } catch (err: any) {
      setWeeklyPopularOpen(false);
      Alert.alert(
        t('weeklyPopularRevealFailed', 'Popular players failed'),
        String(err?.message || err),
      );
    } finally {
      setWeeklyPopularLoading(false);
    }
  }, [isPlayerPoolTutorialActive, plan, t, tutorial, weeklyPopularLoading, worldCupMode]);

  const closeWeeklyPopular = React.useCallback(() => {
    setWeeklyPopularOpen(false);
    if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'weeklyPopularList') {
      tutorial.setPlayerPoolStep('filters');
    }
  }, [isPlayerPoolTutorialActive, tutorial]);

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

  const selectedPlayerForMatchup = React.useMemo<SearchResultRow | null>(() => {
    if (!selectedPlayerId || !selectedPlayerForCard) return null;

    return {
      id: selectedPlayerId,
      player: selectedPlayerForCard,
    };
  }, [selectedPlayerForCard, selectedPlayerId]);

  const addSelectedPlayerToMatchup = React.useCallback(() => {
    if (!selectedPlayerForMatchup) return;
    if (matchupRow1?.id === selectedPlayerForMatchup.id || matchupRow2?.id === selectedPlayerForMatchup.id) {
      return;
    }

    if (!matchupRow1) {
      setMatchupRow1(selectedPlayerForMatchup);
      recordSelectedCardInterestOnce();
      if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'addYamalToMatchup') {
        setName('Vinicius Junior');
        onSearch('Vinicius Junior');
      }
      return;
    }

    if (!matchupRow2) {
      setMatchupRow2(selectedPlayerForMatchup);
      recordSelectedCardInterestOnce();
      if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'addViniciusToMatchup') {
        tutorial.setPlayerPoolStep('launchMatchup');
      }
    }
  }, [
    isPlayerPoolTutorialActive,
    matchupRow1,
    matchupRow2,
    onSearch,
    recordSelectedCardInterestOnce,
    selectedPlayerForMatchup,
    tutorial,
  ]);

  const onLaunchMatchup = React.useCallback(async () => {
    if (!matchupRow1 || !matchupRow2 || comparisonLoading) return;

    try {
      setComparisonOpen(true);
      setComparisonLoading(true);
      setComparisonError(null);
      setComparisonData(null);

      if (plan === 'Free' && !isPlayerPoolTutorialActive) {
        const nextCount = await incrementMatchupLaunchCount();
        if (shouldShowMatchupLaunchInterstitial(nextCount)) {
          const ok = showInterstitialSafely();
          if (!ok) {
            setProUpsellOpen(true);
          }
        }
      }

      const nextComparison = await getMatchupComparison(matchupRow1.id, matchupRow2.id, worldCupMode);
      setComparisonData(nextComparison);
      if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'launchMatchup') {
        tutorial.setPlayerPoolStep('comparison');
      }
    } catch (err: any) {
      setComparisonError(err?.message ?? t('matchupComparisonFailed', 'Matchup comparison failed'));
    } finally {
      setComparisonLoading(false);
    }
  }, [comparisonLoading, isPlayerPoolTutorialActive, matchupRow1, matchupRow2, plan, t, tutorial, worldCupMode]);

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
    const effectiveSortKey =
      worldCupMode && (sortKey === 'nationality' || sortKey === 'league') ? 'name' : sortKey;
    const base =
      effectiveSortKey === 'name'
        ? t('tblName', 'Name')
        : effectiveSortKey === 'nationality'
          ? t('tblNat', 'Nat.')
          : effectiveSortKey === 'league'
            ? t('tblLeague', 'League')
            : effectiveSortKey === 'team'
              ? t('tblTeam', 'Team')
              : effectiveSortKey === 'age'
                ? t('tblAge', 'Age')
                : t('tblRoles', 'Role');
    return `${base} (${sortDir === 'asc' ? 'A-Z' : 'Z-A'})`;
  }, [sortDir, sortKey, t, worldCupMode]);

  const sortedResults = React.useMemo(() => {
    const list = [...results];
    const dir = sortDir === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      const effectiveSortKey =
        worldCupMode && (sortKey === 'nationality' || sortKey === 'league') ? 'name' : sortKey;

      if (effectiveSortKey === 'age') {
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
        effectiveSortKey === 'name'
          ? a.player.name
          : effectiveSortKey === 'role'
            ? a.player.meta?.roles?.[0] ?? ''
            : effectiveSortKey === 'nationality'
              ? a.player.meta?.nationality ?? ''
              : effectiveSortKey === 'league'
                ? a.player.meta?.league ?? ''
                : a.player.meta?.team ?? '';

      const bVal =
        effectiveSortKey === 'name'
          ? b.player.name
          : effectiveSortKey === 'role'
            ? b.player.meta?.roles?.[0] ?? ''
            : effectiveSortKey === 'nationality'
              ? b.player.meta?.nationality ?? ''
              : effectiveSortKey === 'league'
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
  }, [results, sortDir, sortKey, worldCupMode]);

  const weeklyPopularLabel = worldCupMode
    ? t('revealWorldCupTopSearches', 'Reveal World Cup Top Searches')
    : t('revealWeeklyPopularPlayers', 'Reveal Weekly Top Searches');
  const weeklyPopularLabelUpper = weeklyPopularLabel.toLocaleUpperCase(
    i18n.language?.startsWith('tr') ? 'tr-TR' : undefined,
  );
  const playerPoolTheme = React.useMemo(
    () =>
      worldCupMode
        ? {
            bg: BG,
            panel: WORLD_CUP_COLORS.panel,
            text: WORLD_CUP_COLORS.text,
            accent: WORLD_CUP_COLORS.mint,
            accentDark: WORLD_CUP_COLORS.lime,
            line: WORLD_CUP_COLORS.line,
            glow: WORLD_CUP_COLORS.glow,
          }
        : {
            bg: BG,
            panel: 'rgba(22, 163, 74, 0.12)',
            text: '#FFFFFF',
            accent: ACCENT,
            accentDark: '#15803D',
            line: ACCENT,
            glow: 'rgba(22, 163, 74, 0.12)',
          },
    [worldCupMode],
  );
  const worldCupTutorialStepActive =
    isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'worldCupMode';
  const worldCupSwitchLocked =
    isPlayerPoolTutorialActive && tutorial.playerPoolStep !== 'worldCupMode';

  return (
    <KeyboardAvoidingView
      style={[styles.safe, { backgroundColor: playerPoolTheme.bg }]}
      behavior={Platform.select({ ios: 'padding', android: 'padding' })}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.screen, { backgroundColor: playerPoolTheme.bg }]}>
        <ScrollView
          ref={scrollRef}
          style={styles.container}
          contentContainerStyle={styles.content}
          scrollEnabled
        >
          <Header
            backgroundColor={BG}
            textColor={playerPoolTheme.text}
            accentColor={ACCENT}
            lineColor={worldCupMode ? WORLD_CUP_COLORS.mint : playerPoolTheme.line}
            subtitle={t(
              'playerPoolHeaderSubtitle',
              'Discover 52,000+ players from 113 leagues worldwide.',
            )}
          />

        <TutorialHint
          visible={worldCupTutorialStepActive}
          title={t('tutorialWorldCupModeTitle', 'World Cup mode')}
          body={t(
            'tutorialWorldCupModeBody',
            'Enable this to use the World Cup data in the player pool section. You can switch it on or off here to decide the data to be used.',
          )}
          actionLabel={t('tutorialContinueToWeeklyPopular', 'Continue to Weekly Top Searches')}
          onAction={() => {
            setWorldCupMode(false);
            tutorial.setPlayerPoolStep('weeklyPopularButton');
          }}
          onSkipAll={skipPlayerPoolTutorial}
          arrow="none"
        />

        <Pressable
          onPress={() => {
            if (worldCupSwitchLocked) return;
            setWorldCupMode((value) => !value);
          }}
          disabled={worldCupSwitchLocked}
          accessibilityRole="switch"
          accessibilityState={{ checked: worldCupMode }}
          accessibilityLabel={t('worldCupMode', 'World Cup mode')}
          style={({ pressed }) => [
            styles.worldCupSwitch,
            worldCupMode && styles.worldCupSwitchActive,
            worldCupSwitchLocked && !worldCupMode && styles.worldCupSwitchMuted,
            {
              backgroundColor: worldCupMode ? WORLD_CUP_COLORS.panel : 'rgba(255,255,255,0.035)',
              borderColor: worldCupMode ? WORLD_CUP_COLORS.mint : ACCENT,
            },
            pressed && !worldCupSwitchLocked && styles.pressed,
          ]}
        >
          <View pointerEvents="none" style={styles.worldCupRibbon}>
            {WORLD_CUP_COLORS.palette.map((color, index) => (
              <View key={`${color}-${index}`} style={[styles.worldCupRibbonBand, { backgroundColor: color }]} />
            ))}
          </View>

          <View style={styles.worldCupTextWrap}>
            <View style={styles.worldCupBadgeRow}>
              <View style={[styles.worldCupDot, { backgroundColor: WORLD_CUP_COLORS.mint }]} />
              <View style={[styles.worldCupDot, { backgroundColor: WORLD_CUP_COLORS.lime }]} />
              <View style={[styles.worldCupDot, { backgroundColor: WORLD_CUP_COLORS.orange }]} />
              <View style={[styles.worldCupDot, { backgroundColor: WORLD_CUP_COLORS.blue }]} />
              <View style={[styles.worldCupDot, { backgroundColor: WORLD_CUP_COLORS.lavender }]} />
            </View>
            <Text
              style={[
                styles.worldCupTitle,
                worldCupMode && {
                  color: WORLD_CUP_COLORS.mint,
                  textShadowColor: 'rgba(98, 246, 210, 0.25)',
                  textShadowRadius: 8,
                },
              ]}
            >
              {t('worldCupModeTitle', 'World Cup Mode')}
            </Text>
            <Text style={[styles.worldCupSubtitle, { color: worldCupMode ? WORLD_CUP_COLORS.muted : '#7A7A85' }]}>
              {worldCupMode
                ? t('worldCupDataInPlace', 'World Cup data in place.')
                : t('clubDataInPlace', 'Club data in place.')}
            </Text>
          </View>

          <View
            style={[
              styles.worldCupStatusPill,
              {
                borderColor: worldCupMode ? WORLD_CUP_COLORS.purple : 'rgba(255,255,255,0.14)',
                backgroundColor: worldCupMode ? 'rgba(92, 0, 230, 0.22)' : 'rgba(255,255,255,0.05)',
              },
            ]}
          >
            <Text style={[styles.worldCupStatusText, { color: worldCupMode ? '#FFFFFF' : '#7A7A85' }]}>
              {worldCupMode ? t('worldCupModeOn', 'ON') : t('worldCupModeOff', 'OFF')}
            </Text>
          </View>

          <View
            style={[
              styles.worldCupTrack,
              {
                backgroundColor: worldCupMode ? WORLD_CUP_COLORS.purple : 'rgba(255,255,255,0.12)',
              },
            ]}
          >
            <View
              style={[
                styles.worldCupKnob,
                {
                  transform: [{ translateX: worldCupMode ? 24 : 0 }],
                  backgroundColor: worldCupMode ? WORLD_CUP_COLORS.darkGreen : '#FFFFFF',
                },
              ]}
            />
          </View>
        </Pressable>

        <TutorialHint
          visible={isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'weeklyPopularButton'}
          title={t('tutorialWeeklyPopularButtonTitle', 'Weekly popular players')}
          body={t(
            'tutorialWeeklyPopularButtonBody',
            'This button reveals the most searched players of the week.',
          )}
          targetLabel={t('tutorialPressWeeklyPopular', 'Press Weekly Top Searches')}
          onSkipAll={skipPlayerPoolTutorial}
          arrow="none"
        />

        <Pressable
          onPress={onRevealWeeklyPopular}
          disabled={isPlayerPoolTutorialActive && tutorial.playerPoolStep !== 'weeklyPopularButton'}
          style={({ pressed }) => [
            styles.popularButton,
            {
              borderColor: worldCupMode ? WORLD_CUP_COLORS.coral : playerPoolTheme.line,
              backgroundColor: worldCupMode ? 'rgba(255, 143, 145, 0.13)' : playerPoolTheme.glow,
            },
            isPlayerPoolTutorialActive &&
              tutorial.playerPoolStep !== 'weeklyPopularButton' &&
              styles.popularButtonLocked,
            pressed && styles.pressed,
          ]}
        >
          {weeklyPopularLoading ? (
            <ActivityIndicator size="small" color={playerPoolTheme.accent} />
          ) : (
            <Eye size={18} color={worldCupMode ? WORLD_CUP_COLORS.coral : playerPoolTheme.accent} strokeWidth={2.2} />
          )}
          <Text
            numberOfLines={2}
            style={[
              styles.popularButtonText,
              { color: worldCupMode ? WORLD_CUP_COLORS.coral : playerPoolTheme.accent },
            ]}
          >
            {weeklyPopularLabelUpper}
          </Text>
        </Pressable>

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
          onSearch={() => onSearch()}
          tutorialStep={
            isPlayerPoolTutorialActive &&
            (tutorial.playerPoolStep === 'filters' || tutorial.playerPoolStep === 'search')
              ? tutorial.playerPoolStep
              : null
          }
          onTutorialContinue={() => tutorial.setPlayerPoolStep('search')}
          onTutorialSkipAll={skipPlayerPoolTutorial}
          tutorialActive={isPlayerPoolTutorialActive}
          worldCupMode={worldCupMode}
          theme={worldCupMode ? {
            panel: WORLD_CUP_COLORS.panel,
            card: WORLD_CUP_COLORS.card,
            line: WORLD_CUP_COLORS.blue,
            accent: WORLD_CUP_COLORS.blue,
            accentSoft: 'rgba(49, 87, 246, 0.13)',
            muted: WORLD_CUP_COLORS.muted,
          } : undefined}
        />

        <CandidatePlayers
          results={results}
          sortedResults={sortedResults}
          selectedPlayerId={selectedPlayerId}
          searching={searching}
          error={error}
          candidateTableHeight={candidateTableHeight}
          sortLabel={sortLabel}
          sortOpen={sortOpen}
          setSortOpen={setSortOpen}
          sortKey={sortKey}
          cycleSort={cycleSort}
          weeklyPopularRows={weeklyPopularRows}
          weeklyPopularOpen={weeklyPopularOpen}
          weeklyPopularLoading={weeklyPopularLoading}
          onCloseWeeklyPopular={closeWeeklyPopular}
          weeklyPopularTutorialVisible={
            isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'weeklyPopularList'
          }
          onWeeklyPopularTutorialSkipAll={skipPlayerPoolTutorial}
          onSelectRow={(row) => {
            setRevealedPotentialForCard(false);
            setRevealedFormForCard(false);
            currentCardRenderIdRef.current = `${row.id}:${Date.now()}`;
            countedCardRenderIdRef.current = null;
            setSelectedPlayerId(row.id);
            setSelectedPlayer(row.player);
          }}
          tutorialStep={
            isPlayerPoolTutorialActive &&
            (tutorial.playerPoolStep === 'candidates' || tutorial.playerPoolStep === 'viniciusReady')
              ? tutorial.playerPoolStep
              : null
          }
          onTutorialContinue={() => {
            if (tutorial.playerPoolStep === 'candidates') {
              tutorial.setPlayerPoolStep('card');
            } else if (tutorial.playerPoolStep === 'viniciusReady') {
              tutorial.setPlayerPoolStep('addViniciusToMatchup');
            }
          }}
          onTutorialSkipAll={skipPlayerPoolTutorial}
          rowsLocked={isPlayerPoolTutorialActive}
          scrollLocked={false}
          worldCupMode={worldCupMode}
          theme={worldCupMode ? {
            panel: WORLD_CUP_COLORS.panel,
            card: WORLD_CUP_COLORS.card,
            line: WORLD_CUP_COLORS.mint,
            accent: WORLD_CUP_COLORS.mint,
            accentSoft: 'rgba(98, 246, 210, 0.13)',
            activeRow: 'rgba(182, 240, 0, 0.10)',
            muted: WORLD_CUP_COLORS.muted,
          } : undefined}
          weeklyPopularTheme={worldCupMode ? {
            panel: WORLD_CUP_COLORS.panel,
            card: WORLD_CUP_COLORS.card,
            line: WORLD_CUP_COLORS.coral,
            accent: WORLD_CUP_COLORS.coral,
            accentSoft: 'rgba(255, 143, 145, 0.13)',
            activeRow: 'rgba(255, 143, 145, 0.12)',
            muted: WORLD_CUP_COLORS.muted,
          } : undefined}
          previewPlayerCardTheme={worldCupMode ? {
            cardBackground: WORLD_CUP_COLORS.purple,
            accent: WORLD_CUP_COLORS.lavender,
          } : undefined}
        />

        <PlayerCardPP
          selectedPlayer={selectedPlayer}
          selectedPlayerForCard={selectedPlayerForCard}
          onRevealPotential={onRevealPotential}
          onRevealForm={onRevealForm}
          onAddFavoriteSuccess={() => {
            recordSelectedCardInterestOnce();
            if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'addPortfolio') {
              tutorial.setPlayerPoolStep('addYamalToMatchup');
            }
          }}
          revealingPotential={revealingPotential}
          revealingForm={revealingForm}
          revealedPotentialForCard={revealedPotentialForCard}
          revealedFormForCard={revealedFormForCard}
          tutorialStep={isPlayerPoolTutorialActive ? tutorial.playerPoolStep : null}
          onTutorialContinue={() => tutorial.setPlayerPoolStep('revealPotential')}
          onTutorialSkipAll={skipPlayerPoolTutorial}
          worldCupMode={worldCupMode}
          theme={worldCupMode ? {
            panel: WORLD_CUP_COLORS.panel,
            card: WORLD_CUP_COLORS.card,
            line: WORLD_CUP_COLORS.lavender,
            accent: WORLD_CUP_COLORS.lavender,
            accentSoft: 'rgba(167, 132, 244, 0.12)',
            muted: WORLD_CUP_COLORS.muted,
          } : undefined}
        />

        <MatchupCenter
          selectedPlayer={selectedPlayerForMatchup}
          row1={matchupRow1}
          row2={matchupRow2}
          onAddSelectedPlayer={addSelectedPlayerToMatchup}
          onLaunchMatchup={onLaunchMatchup}
          launchDisabled={!matchupRow1 || !matchupRow2}
          launchLoading={comparisonLoading}
          onRemoveRow1={() => setMatchupRow1(null)}
          onRemoveRow2={() => setMatchupRow2(null)}
          tutorialStep={isPlayerPoolTutorialActive ? tutorial.playerPoolStep : null}
          onTutorialSkipAll={skipPlayerPoolTutorial}
          tutorialActive={isPlayerPoolTutorialActive}
          worldCupMode={worldCupMode}
          theme={worldCupMode ? {
            panel: WORLD_CUP_COLORS.panel,
            card: WORLD_CUP_COLORS.card,
            line: WORLD_CUP_COLORS.red,
            accent: WORLD_CUP_COLORS.red,
            accent2: WORLD_CUP_COLORS.red,
            accentSoft: 'rgba(227, 0, 11, 0.13)',
            muted: WORLD_CUP_COLORS.muted,
          } : undefined}
        />
        <ComparisonModal
          visible={comparisonOpen}
          loading={comparisonLoading}
          error={comparisonError}
          player1={comparisonData?.player1 ?? (matchupRow1 ? { id: matchupRow1.id, player: matchupRow1.player } : null)}
          player2={comparisonData?.player2 ?? (matchupRow2 ? { id: matchupRow2.id, player: matchupRow2.player } : null)}
          onClose={() => {
            setComparisonOpen(false);
            if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'comparison') {
              tutorial.moveToProfile();
              navigation.navigate('Profile', { screen: 'MyProfile' });
            }
          }}
          tutorialVisible={isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'comparison'}
          onTutorialSkipAll={skipPlayerPoolTutorial}
          worldCupMode={worldCupMode}
          theme={worldCupMode ? {
            panel: WORLD_CUP_COLORS.panel,
            card: WORLD_CUP_COLORS.card,
            line: WORLD_CUP_COLORS.red,
            accent: WORLD_CUP_COLORS.red,
            accentSoft: 'rgba(227, 0, 11, 0.13)',
            winnerAccent: WORLD_CUP_COLORS.mint,
            winnerSoft: 'rgba(98, 246, 210, 0.13)',
            muted: WORLD_CUP_COLORS.muted,
          } : undefined}
        />
        <ProNotReadyScreen
          visible={proUpsellOpen}
          onClose={() => setProUpsellOpen(false)}
        />
        <DailyScoutChallengeModal autoOpen={tutorial.postTutorialReady} />
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
  worldCupSwitch: {
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    overflow: 'hidden',
  },
  worldCupSwitchActive: {
    shadowColor: '#62F6D2',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  worldCupSwitchMuted: {
    opacity: 0.55,
  },
  worldCupRibbon: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 10,
    flexDirection: 'row',
  },
  worldCupRibbonBand: {
    flex: 1,
  },
  worldCupTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  worldCupBadgeRow: {
    flexDirection: 'row',
    gap: 5,
    marginBottom: 7,
  },
  worldCupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  worldCupEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  worldCupTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  worldCupSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  worldCupStatusPill: {
    minWidth: 48,
    minHeight: 34,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  worldCupStatusText: {
    fontSize: 12,
    fontWeight: '900',
  },
  worldCupTrack: {
    width: 54,
    height: 30,
    borderRadius: 15,
    padding: 3,
    justifyContent: 'center',
  },
  worldCupKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  popularButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 8,
  },
  popularButtonLocked: {
    opacity: 0.45,
  },
  popularButtonText: {
    color: ACCENT,
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.92,
  },
});
