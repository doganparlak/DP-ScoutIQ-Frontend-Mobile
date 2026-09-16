import React from 'react';
import { useMatchup } from '@/context/MatchupContext';
import { getSharedMatchupComparison } from '@/services/leaguePool';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Check, Eye, Minus, X } from 'lucide-react-native';

import {
  incrementPotentialRevealCount,
  incrementMatchupMissingScoreAddCount,
  incrementPlayerPoolMissingScoreActionCount,
  incrementReportActionCount,
  incrementPlayerCardPlanNudgeCount,
  shouldShowMatchupMissingScoreInterstitial,
  shouldShowPlayerPoolMissingScoreActionInterstitial,
  shouldShowReportActionInterstitial,
  shouldShowPotentialInterstitial,
  shouldShowPlayerCardPlanNudge,
} from '@/ads/adGating';
import { showInterstitialAndWaitSafely } from '@/ads/interstitial';
import { PlusProUpsellScreen } from '@/ads/PlusProUpsellScreen';
import CandidatePlayers, {
  CANDIDATE_TABLE_VISIBLE_ROWS,
  ROW_HEIGHT,
  type CandidateSortKey,
  type SearchResultRow,
} from '@/components/CandidatePlayers';
import ComparisonModal from '@/components/ComparisonModal';
import { DailyScoutChallengeModal } from '@/components/DailyScoutChallenge';
import MatchupCenter from '@/components/MatchupCenter';
import PlayerCardPP from '@/components/PlayerCardPP';
import ScoutingReport from '@/components/ScoutingReport';
import SearchFilters from '@/components/SearchFilters';
import { TutorialHint, TutorialPageGuide, useTutorial } from '@/components/Tutorial';
import { PLAYER_POOL_COUNTRIES, PLAYER_POOL_POSITION_OPTIONS, PLAYER_POOL_TEAM_NAMES } from '@/constants/playerPool';
import {
  ROLE_LONG_TO_SHORT,
  ROLE_PICKER_ORDER,
  ROLE_SHORT_TO_LONG,
  rolePickerCode,
  addFavoritePlayer,
  getMatchupComparison,
  getMe,
  getPlayerPoolOptions,
  getPlayerPoolScoutingReportProgress,
  getPlayerPoolScoutingReportSection,
  recordPlayerPoolSearchHit,
  revealPlayerPoolForm,
  revealPlayerPoolPotential,
  searchPlayerPool,
  type PlayerPoolSearchInput,
  type MatchupComparisonResponse,
  type Plan,
  type ScoutingReportResponse,
  type PlayerIdentityPayload,
} from '@/services/api';
import { ACCENT, BG, PANEL, WORLD_CUP_COLORS } from '@/theme';
import type { PlayerData } from '@/types';

type SortDir = 'asc' | 'desc';

const ANDROID_REVEAL_FORM_EXTRA_SCROLL = 100;
const ANDROID_ADD_MATCHUP_EXTRA_SCROLL = 100;

function orderedRoleOptions(values: readonly string[]) {
  const available = new Set(values.map((value) => rolePickerCode(value)).filter(Boolean));
  return ROLE_PICKER_ORDER.filter((role) => available.has(role));
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeSearchText(value: string) {
  const folded = value
    .trim()
    .replace(/[ıİ]/g, (char) => (char === 'ı' ? 'i' : 'I'))
    .replace(/[áàâäãåāăą]/gi, 'a')
    .replace(/[éèêëēĕėęě]/gi, 'e')
    .replace(/[íìîïīĭį]/gi, 'i')
    .replace(/[óòôöõøōŏő]/gi, 'o')
    .replace(/[úùûüūŭůűų]/gi, 'u')
    .replace(/[ñń]/gi, 'n')
    .replace(/[ćčç]/gi, 'c')
    .replace(/[ğ]/gi, 'g')
    .replace(/[ł]/gi, 'l')
    .replace(/[ř]/gi, 'r')
    .replace(/[śšş]/gi, 's')
    .replace(/[ýÿ]/gi, 'y')
    .replace(/[žźż]/gi, 'z')
    .replace(/æ/gi, 'ae')
    .replace(/œ/gi, 'oe')
    .replace(/ß/g, 'ss');

  return folded
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function optionMatchesSearch(option: string, normalizedQuery: string) {
  const normalizedOption = normalizeSearchText(option);
  if (normalizedOption.includes(normalizedQuery)) return true;

  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (!queryTokens.length) return false;

  let searchFrom = 0;
  return queryTokens.every((token) => {
    const index = normalizedOption.indexOf(token, searchFrom);
    if (index === -1) return false;
    searchFrom = index + token.length;
    return true;
  });
}

function optionExactMatch(option: string | null | undefined, value: string) {
  return Boolean(option) && normalizeSearchText(option || '') === normalizeSearchText(value);
}

function PlayerCardPlanNudge({
  title,
  buttonLabel,
  onOpenPlans,
  onClose,
  worldCupMode,
  containerStyle,
}: {
  title: string;
  buttonLabel: string;
  onOpenPlans: () => void;
  onClose: () => void;
  worldCupMode: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { t } = useTranslation();
  const accent = worldCupMode ? WORLD_CUP_COLORS.lavender : ACCENT;
  const available = <Check size={14} color="#4ADE80" strokeWidth={3} />;
  const unavailable = <Minus size={14} color="#68736C" strokeWidth={2.5} />;
  const comparisonRows = [
    { label: t('planFeatures_NoAdsMonthly', 'Ad-free'), plus: available, pro: available },
    { label: t('planFeatures_DetailedReports', 'Detailed reports'), plus: available, pro: available },
    {
      label: t('plusProComparisonPlayers', 'Player comparison'),
      plus: <Text style={styles.playerCardPlanNudgeValueText}>{t('plusProThreePlayers', '3 players')}</Text>,
      pro: <Text style={styles.playerCardPlanNudgeValueText}>{t('plusProThreeOrFourPlayers', '3 or 4 players')}</Text>,
    },
    { label: t('planFeatures_CustomComparison', 'Customizable comparison'), plus: unavailable, pro: available },
    { label: t('plusProChatAccess', 'ScoutWise chat'), plus: unavailable, pro: available },
  ];

  return (
    <View style={[styles.playerCardPlanNudge, worldCupMode && { borderColor: accent, backgroundColor: 'rgba(167, 132, 244, 0.10)' }, containerStyle]}>
      <View style={styles.playerCardPlanNudgeTopRow}>
        <View style={[styles.playerCardPlanNudgeIcon, { borderColor: accent, backgroundColor: worldCupMode ? 'rgba(167, 132, 244, 0.16)' : 'rgba(22, 163, 74, 0.12)' }]}>
          <BadgeCheck size={19} color={accent} strokeWidth={2.3} />
        </View>
        <View
          style={[
            styles.playerCardPlanNudgeCopy,
            styles.playerCardPlanNudgeTitlePill,
            { borderColor: `${accent}66` },
          ]}
        >
          <Text style={[styles.playerCardPlanNudgeTitle, { color: accent, textShadowColor: `${accent}55` }]}>{title}</Text>
        </View>
        <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => [styles.playerCardPlanNudgeClose, pressed && styles.pressed]}>
          <X size={16} color="#8F8F99" strokeWidth={2.4} />
        </Pressable>
      </View>
      <View style={styles.playerCardPlanNudgeTable}>
        <View style={[styles.playerCardPlanNudgeTableRow, styles.playerCardPlanNudgeTableHeader]}>
          <View style={styles.playerCardPlanNudgeFeatureCell} />
          <View style={[styles.playerCardPlanNudgeValueCell, styles.playerCardPlanNudgePlusCell]}>
            <Text style={styles.playerCardPlanNudgePlusText}>{t('plusPlanName', 'PLUS')}</Text>
          </View>
          <View style={[styles.playerCardPlanNudgeValueCell, styles.playerCardPlanNudgeProCell]}>
            <Text style={styles.playerCardPlanNudgeProText}>{t('proPlanName', 'PRO')}</Text>
          </View>
        </View>
        {comparisonRows.map((row) => (
          <View key={row.label} style={[styles.playerCardPlanNudgeTableRow, styles.playerCardPlanNudgeTableBorder]}>
            <View style={styles.playerCardPlanNudgeFeatureCell}>
              <Text style={styles.playerCardPlanNudgeFeatureText}>{row.label}</Text>
            </View>
            <View style={[styles.playerCardPlanNudgeValueCell, styles.playerCardPlanNudgePlusValue]}>{row.plus}</View>
            <View style={[styles.playerCardPlanNudgeValueCell, styles.playerCardPlanNudgeProValue]}>{row.pro}</View>
          </View>
        ))}
      </View>
      <Pressable
        onPress={onOpenPlans}
        style={({ pressed }) => [
          styles.playerCardPlanNudgeButton,
          { borderColor: accent, backgroundColor: accent },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.playerCardPlanNudgeButtonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

export default function PlayerPoolScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<any>();
  const tutorial = useTutorial();
  const [name, setName] = React.useState('');
  const [contractStatus, setContractStatus] = React.useState<'' | 'loan' | 'permanent'>('');
  const [loanEndDate, setLoanEndDate] = React.useState('');
  const [contractEndDate, setContractEndDate] = React.useState('');
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
  const [pendingPortfolioMatchup, setPendingPortfolioMatchup] = React.useState<string | null>(null);
  const route = useRoute<import('@react-navigation/native').RouteProp<import('@/types').MainTabsParamList, 'Strategy'>>();
  React.useEffect(() => {
    const incoming = route.params?.matchupPlayer;
    if (!incoming) return;
    setRevealedPotentialForCard(false);
    setRevealedFormForCard(false);
    currentCardRenderIdRef.current = `${incoming.id}:${Date.now()}`;
    setSelectedPlayerId(incoming.id);
    setSelectedPlayer(incoming.player);
    setPendingPortfolioMatchup(incoming.id);
    navigation.setParams({ matchupPlayer: undefined });
  }, [route.params?.visitKey, route.params?.matchupPlayer, navigation]);

  const [revealedPotentialForCard, setRevealedPotentialForCard] = React.useState(false);
  const [revealedFormForCard, setRevealedFormForCard] = React.useState(false);
  const [searching, setSearching] = React.useState(false);
  const [revealingPotential, setRevealingPotential] = React.useState(false);
  const [revealingForm, setRevealingForm] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [positionOpen, setPositionOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [plan, setPlan] = React.useState<Plan>('Free');
  const [proUpsellOpen, setProUpsellOpen] = React.useState(false);
  const [matchupUpgradeMode, setMatchupUpgradeMode] = React.useState<3 | 4 | null>(null);
  const [playerCardPlanNudgeVisible, setPlayerCardPlanNudgeVisible] = React.useState(false);
  const [matchupPlanNudgeDismissed, setMatchupPlanNudgeDismissed] = React.useState(false);
  const [sortKey, setSortKey] = React.useState<CandidateSortKey>('name');
  const [sortDir, setSortDir] = React.useState<SortDir>('asc');
  const sharedMatchup = useMatchup();
  const { mode: matchupMode, setMode: setMatchupMode, setRow1: setMatchupRow1, setRow2: setMatchupRow2, setRow3: setMatchupRow3, setRow4: setMatchupRow4 } = sharedMatchup;
  const [matchupRow1, matchupRow2, matchupRow3, matchupRow4] = sharedMatchup.rows;
  const isFocused = useIsFocused();
  const [planResolved, setPlanResolved] = React.useState(false);
  const [addingMatchupPlayer, setAddingMatchupPlayer] = React.useState(false);
  const [comparisonOpen, setComparisonOpen] = React.useState(false);
  const [comparisonLoading, setComparisonLoading] = React.useState(false);
  const [comparisonError, setComparisonError] = React.useState<string | null>(null);
  const [comparisonData, setComparisonData] = React.useState<MatchupComparisonResponse | null>(null);
  const [reportLoadingPlayerId, setReportLoadingPlayerId] = React.useState<string | null>(null);
  const [readyReportsByPlayerId, setReadyReportsByPlayerId] = React.useState<Record<string, ScoutingReportResponse>>({});
  const [scoutOpen, setScoutOpen] = React.useState(false);
  const [scoutPlayer, setScoutPlayer] = React.useState<PlayerData | null>(null);
  const [scoutReport, setScoutReport] = React.useState<ScoutingReportResponse | null>(null);
  const [scoutReportPayload,setScoutReportPayload]=React.useState<PlayerIdentityPayload|null>(null);
  const [scoutReportPlayerId,setScoutReportPlayerId]=React.useState<string|null>(null);
  const worldCupMode: boolean = false;
  const [countryOptions, setCountryOptions] = React.useState<string[]>([...PLAYER_POOL_COUNTRIES]);
  const [leagueOptions, setLeagueOptions] = React.useState<string[]>([]);
  const [teamOptions, setTeamOptions] = React.useState<string[]>([...PLAYER_POOL_TEAM_NAMES]);
  const [positionOptions, setPositionOptions] = React.useState<string[]>(
    [...PLAYER_POOL_POSITION_OPTIONS],
  );
  const scrollRef = React.useRef<ScrollView | null>(null);
  const matchupTop = React.useRef(0);
  const scrollToMatchup = React.useCallback(() => {
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: Math.max(0, matchupTop.current - 12), animated: true }));
  }, []);
  const currentCardRenderIdRef = React.useRef<string | null>(null);
  const countedCardRenderIdRef = React.useRef<string | null>(null);
  const isPlayerPoolTutorialActive = tutorial.active && tutorial.stage === 'playerPool';
  const canUseThreeWayComparison = plan === 'No Ads Monthly' || plan === 'Pro Monthly' || plan === 'Pro Yearly';
  const canUseFourWayComparison = plan === 'Pro Monthly' || plan === 'Pro Yearly';
  React.useEffect(() => {
    if (isFocused && planResolved && !canUseThreeWayComparison && matchupMode > 2) {
      setMatchupMode(2);
      setMatchupRow3(null);
      setMatchupRow4(null);
    } else if (isFocused && planResolved && !canUseFourWayComparison && matchupMode === 4) {
      setMatchupMode(3);
      setMatchupRow4(null);
    }
  }, [canUseFourWayComparison, canUseThreeWayComparison, matchupMode, isFocused, planResolved]);


  const refreshCurrentPlan = React.useCallback(async () => {
    try {
      const me = await getMe();
      const currentPlan = me?.plan;
      const normalizedPlan: Plan =
        currentPlan === 'No Ads Monthly' ||
        currentPlan === 'Pro Monthly' ||
        currentPlan === 'Pro Yearly'
          ? currentPlan
          : 'Free';
      setPlan(normalizedPlan);
      setPlanResolved(true);
    } catch {
      setPlan('Free');
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let alive = true;

      (async () => {
        if (!alive) return;
        await refreshCurrentPlan();
      })();

      return () => {
        alive = false;
      };
    }, [refreshCurrentPlan]),
  );

  const scrollToTutorialArea = React.useCallback((area: 'worldCup' | 'weekly' | 'filters' | 'candidates' | 'card' | 'form' | 'matchupAdd' | 'matchup') => {
    const y =
      area === 'worldCup'
        ? 60
        : area === 'weekly'
        ? 150
        : area === 'filters'
        ? 0
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
    setContractStatus('');
    setLoanEndDate('');
    setContractEndDate('');
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

    if (tutorial.playerPoolStep === 'candidates' || tutorial.playerPoolStep === 'viniciusReady') {
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
      scrollToTutorialArea('card');
    } else if (tutorial.playerPoolStep === 'launchMatchup') {
      scrollToTutorialArea('matchup');
    }
  }, [isPlayerPoolTutorialActive, scrollToTutorialArea, tutorial.playerPoolStep]);

  const skipPlayerPoolTutorial = React.useCallback(() => {
    setComparisonOpen(false);
    setProUpsellOpen(false);
    tutorial.skipTutorial();
    navigation.navigate('Strategy');
  }, [navigation, tutorial]);

  React.useEffect(() => {
    let alive = true;

    (async () => {
      await refreshCurrentPlan();

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
          const orderedPositions = orderedRoleOptions(options.positions);
          setPositionOptions(orderedPositions.length ? orderedPositions : [...PLAYER_POOL_POSITION_OPTIONS]);
        }

      } catch (error) {
        // Keep local fallback lists when the backend options endpoint is unavailable.
      }
    })();

    return () => {
      alive = false;
    };
  }, [refreshCurrentPlan, worldCupMode]);

  React.useEffect(() => {
    if (!worldCupMode) return;
    setNationality('');
    setSelectedNationality(null);
    setLeague('');
    setSelectedLeague(null);
    setSortKey((current) => (current === 'nationality' ? 'name' : current));
  }, [worldCupMode]);

  const nationalitySuggestions = React.useMemo(() => {
    const q = normalizeSearchText(nationality);
    if (!q) return [];
    const matches = countryOptions.filter((item) => optionMatchesSearch(item, q));
    const exactMatch = matches.find((item) => normalizeSearchText(item) === q);
    if (exactMatch) return [exactMatch];
    return matches.slice(0, 6);
  }, [countryOptions, nationality]);

  const teamSuggestions = React.useMemo(() => {
    const q = normalizeSearchText(team);
    if (!q) return [];
    const matches = teamOptions.filter((item) => optionMatchesSearch(item, q));
    const exactMatch = matches.find((item) => normalizeSearchText(item) === q);
    if (exactMatch) return [exactMatch];
    return matches.slice(0, 6);
  }, [team, teamOptions]);

  const leagueSuggestions = React.useMemo(() => {
    const q = normalizeSearchText(league);
    if (!q) return [];
    const matches = leagueOptions.filter((item) => optionMatchesSearch(item, q));
    const exactMatch = matches.find((item) => normalizeSearchText(item) === q);
    if (exactMatch) return [exactMatch];
    return matches.slice(0, 6);
  }, [league, leagueOptions]);

  const clearFilters = React.useCallback(() => {
    setName('');
    setContractStatus('');
    setLoanEndDate('');
    setContractEndDate('');
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
    setPlayerCardPlanNudgeVisible(false);
    setRevealedPotentialForCard(false);
    setRevealedFormForCard(false);
    setError(null);
  }, []);

  const resetPlayerPoolState = React.useCallback(() => {
    clearFilters();
    setMatchupRow1(null);
    setMatchupRow2(null);
    setMatchupRow3(null);
    setMatchupRow4(null);
    setComparisonOpen(false);
    setComparisonLoading(false);
    setComparisonError(null);
    setComparisonData(null);
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
    if (isPlayerPoolTutorialActive && matchupMode !== 2) {
      setMatchupMode(2);
    }
  }, [isPlayerPoolTutorialActive, matchupMode]);

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
    const payload: PlayerPoolSearchInput = {
      name: searchName.trim() || undefined,
      contractStatus: contractStatus || undefined,
      loanEndDate: contractStatus === 'permanent' ? undefined : loanEndDate || undefined,
      contractEndDate: contractEndDate || undefined,
      nationality: worldCupMode ? undefined : nationality.trim() || undefined,
      nationalityExact: worldCupMode
        ? undefined
        : !!selectedNationality &&
          optionExactMatch(selectedNationality, nationality),
      league: worldCupMode ? undefined : league.trim() || undefined,
      leagueExact: worldCupMode
        ? undefined
        : !!selectedLeague && optionExactMatch(selectedLeague, league),
      team: team.trim() || undefined,
      teamExact: !!selectedTeam && optionExactMatch(selectedTeam, team),
      position: position || undefined,
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
      setRevealedPotentialForCard(false);
      setRevealedFormForCard(false);
      const firstRow = next[0];
      currentCardRenderIdRef.current = firstRow ? `${firstRow.id}:${Date.now()}` : null;
      countedCardRenderIdRef.current = null;
      setPlayerCardPlanNudgeVisible(false);
      setResults(next);
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
      setPlayerCardPlanNudgeVisible(false);
      setRevealedPotentialForCard(false);
      setRevealedFormForCard(false);
      setError(err?.message ?? t('favoritesError', 'Favorites error'));
    } finally {
      setSearching(false);
    }
  }, [
    contractStatus,
    loanEndDate,
    contractEndDate,
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
          const ok = await showInterstitialAndWaitSafely();
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
          const ok = await showInterstitialAndWaitSafely();
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

  type MissingScoreGateSource = 'matchup' | 'playerCard';
  type ScoreEnsureOptions = { requirePotential?: boolean; skipGate?: boolean };
  type MissingScoreGateResult = { scheduled: boolean; access: boolean };

  const runMissingScoreGateForFreeUser = React.useCallback(async (source: MissingScoreGateSource): Promise<MissingScoreGateResult> => {
    if (plan !== 'Free' || isPlayerPoolTutorialActive) return { scheduled: false, access: true };

    if (source === 'matchup') {
      const nextCount = await incrementMatchupMissingScoreAddCount();
      if (shouldShowMatchupMissingScoreInterstitial(nextCount)) {
        const ok = await showInterstitialAndWaitSafely();
        if (!ok) {
          setProUpsellOpen(true);
        }
        return { scheduled: true, access: ok };
      }
      return { scheduled: false, access: true };
    }

    const nextCount = await incrementPlayerPoolMissingScoreActionCount();
    if (shouldShowPlayerPoolMissingScoreActionInterstitial(nextCount)) {
      const ok = await showInterstitialAndWaitSafely();
      if (!ok) {
        setProUpsellOpen(true);
      }
      return { scheduled: true, access: ok };
    }
    return { scheduled: false, access: true };
  }, [isPlayerPoolTutorialActive, plan]);

  const ensureSelectedPlayerScores = React.useCallback(async (
    gateSource: MissingScoreGateSource,
    options: ScoreEnsureOptions = {},
  ): Promise<SearchResultRow | null> => {
    if (!selectedPlayerId || !selectedPlayer) return null;

    const requirePotential = options.requirePotential ?? true;
    const startedFullyRevealed = requirePotential
      ? revealedPotentialForCard && revealedFormForCard
      : revealedFormForCard;
    let nextPotential =
      revealedPotentialForCard && typeof selectedPlayer.meta?.potential === 'number'
        ? Math.round(selectedPlayer.meta.potential)
        : undefined;
    let nextForm =
      revealedFormForCard && typeof selectedPlayer.meta?.form === 'number'
        ? Math.round(selectedPlayer.meta.form)
        : undefined;

    if (!startedFullyRevealed && !options.skipGate) {
      await runMissingScoreGateForFreeUser(gateSource);
    }

    if (requirePotential && nextPotential === undefined) {
      const revealed = await revealPlayerPoolPotential(selectedPlayerId, worldCupMode);
      nextPotential = Math.round(revealed.potential);
    }

    if (nextForm === undefined) {
      const revealed = await revealPlayerPoolForm(selectedPlayerId, worldCupMode);
      nextForm = Math.round(revealed.form);
    }

    const enrichedPlayer: PlayerData = {
      ...selectedPlayer,
      meta: {
        ...(selectedPlayer.meta ?? {}),
        potential: requirePotential ? nextPotential : undefined,
        form: nextForm,
      },
    };

    if (requirePotential) {
      setRevealedPotentialForCard(true);
    }
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
                  potential: requirePotential ? nextPotential : undefined,
                  form: nextForm,
                },
              },
            }
          : row,
      ),
    );

    setSelectedPlayer(enrichedPlayer);

    return {
      id: selectedPlayerId,
      player: enrichedPlayer,
    };
  }, [
    revealedFormForCard,
    revealedPotentialForCard,
    runMissingScoreGateForFreeUser,
    selectedPlayer,
    selectedPlayerId,
    worldCupMode,
  ]);

  const ensureSelectedPlayerScoresForMatchup = React.useCallback(
    () => ensureSelectedPlayerScores('matchup'),
    [ensureSelectedPlayerScores],
  );

  const selectedReportState = React.useMemo<'idle' | 'loading' | 'ready'>(() => {
    if (!selectedPlayerId) return 'idle';
    if (reportLoadingPlayerId === selectedPlayerId) return 'loading';
    return readyReportsByPlayerId[selectedPlayerId]?.status === 'ready' ? 'ready' : 'idle';
  }, [readyReportsByPlayerId, reportLoadingPlayerId, selectedPlayerId]);

  const buildReportPayload = React.useCallback((player: PlayerData) => ({
    sportmonksId: player.meta?.sportmonksId,
    playerId: selectedPlayerId ?? undefined,
    worldCupMode,
    name: player.name,
    gender: player.meta?.gender,
    nationality: player.meta?.nationality,
    team: player.meta?.team,
    league: player.meta?.league,
    age: player.meta?.age,
    height: player.meta?.height,
    weight: player.meta?.weight,
    potential: !worldCupMode && typeof player.meta?.potential === 'number' ? Math.round(player.meta.potential) : undefined,
    form: typeof player.meta?.form === 'number' ? Math.round(player.meta.form) : undefined,
  }), [selectedPlayerId, worldCupMode]);

  const grantReportAccessForFreeUser = React.useCallback(async () => {
    try {
      const nextCount = await incrementReportActionCount();

      if (shouldShowReportActionInterstitial(nextCount)) {
        const shown = await showInterstitialAndWaitSafely();
        if (shown) return true;

        setProUpsellOpen(true);
        return false;
      }

      return true;
    } catch {
      setProUpsellOpen(true);
      return false;
    }
  }, []);

  const addSelectedPlayerToPortfolio = React.useCallback(async (player: PlayerData) => {
    const enriched = await ensureSelectedPlayerScores('playerCard');
    const playerToSave = enriched?.player ?? player;

    await addFavoritePlayer({
      playerId: selectedPlayerId ?? undefined,
      sportmonksId: playerToSave.meta?.sportmonksId,
      name: playerToSave.name,
      nationality: playerToSave.meta?.nationality,
      age: typeof playerToSave.meta?.age === 'number' ? playerToSave.meta.age : undefined,
      potential:
        typeof playerToSave.meta?.potential === 'number'
          ? Math.round(playerToSave.meta.potential)
          : undefined,
      form:
        typeof playerToSave.meta?.form === 'number'
          ? Math.round(playerToSave.meta.form)
          : undefined,
      gender: playerToSave.meta?.gender,
      height: typeof playerToSave.meta?.height === 'number' ? playerToSave.meta.height : undefined,
      weight: typeof playerToSave.meta?.weight === 'number' ? playerToSave.meta.weight : undefined,
      team: playerToSave.meta?.team,
      league: playerToSave.meta?.league,
      worldCupMode,
      formRevealed: worldCupMode ? true : undefined,
      roles: playerToSave.meta?.roles ?? [],
    });

    return true;
  }, [ensureSelectedPlayerScores, selectedPlayerId, worldCupMode]);

  const generateReportFromPlayerCard = React.useCallback(async (player: PlayerData) => {
    if (!selectedPlayerId || reportLoadingPlayerId) return;

    setReportLoadingPlayerId(selectedPlayerId);
    try {
      recordSelectedCardInterestOnce();

      const reportRequiresPotentialOnCard = !worldCupMode;
      // Reports use the shared report cadence regardless of score visibility.
      const enriched = await ensureSelectedPlayerScores('playerCard', {
        requirePotential: reportRequiresPotentialOnCard,
        skipGate: true,
      });
      const reportPlayer = enriched?.player ?? player;
      const hasAccess =
        plan !== 'Free' ||
        isPlayerPoolTutorialActive ||
        await grantReportAccessForFreeUser();
      const payload = buildReportPayload(reportPlayer);

      if (hasAccess) {
        setScoutPlayer(reportPlayer);
        setScoutReport({
          favorite_player_id: selectedPlayerId,
          status: 'processing',
          content: '',
          content_json: { sections: { analysis: { status: 'processing' } } },
        });
        setScoutReportPayload(payload);
        setScoutReportPlayerId(selectedPlayerId);
        setScoutOpen(true);
      }

      const report = await getPlayerPoolScoutingReportProgress(payload);

      if (report.status === 'failed' || report.status === 'error') {
        throw new Error(t('reportFailedBody', 'Could not generate the report. Please try again later.'));
      }
      if(report.status==='ready')setReadyReportsByPlayerId((current) => ({ ...current, [selectedPlayerId]: report }));

      if (hasAccess) {
        setScoutReport(report);
      }
    } catch (err: any) {
      setScoutReport((current) => current?.status === 'processing' ? { ...current, status: 'failed' } : current);
      Alert.alert(t('reportError', 'Report error'), String(err?.message || err));
    } finally {
      setReportLoadingPlayerId(null);
    }
  }, [
    buildReportPayload,
    ensureSelectedPlayerScores,
    grantReportAccessForFreeUser,
    isPlayerPoolTutorialActive,
    plan,
    recordSelectedCardInterestOnce,
    reportLoadingPlayerId,
    revealedFormForCard,
    revealedPotentialForCard,
    runMissingScoreGateForFreeUser,
    selectedPlayerId,
    t,
    worldCupMode,
  ]);

  const addSelectedPlayerToMatchup = React.useCallback(async () => {
    if (addingMatchupPlayer || !selectedPlayerId || !selectedPlayerForMatchup) return;
    if ([matchupRow1, matchupRow2, matchupRow3, matchupRow4].slice(0, matchupMode).every(Boolean)) return;
    if (
      matchupRow1?.id === selectedPlayerForMatchup.id ||
      matchupRow2?.id === selectedPlayerForMatchup.id ||
      (matchupMode >= 3 && matchupRow3?.id === selectedPlayerForMatchup.id) ||
      (matchupMode === 4 && matchupRow4?.id === selectedPlayerForMatchup.id)
    ) {
      return;
    }

    const stableId = selectedPlayerForMatchup.player.meta?.sportmonksId;
    if (!Number.isSafeInteger(stableId) || (stableId ?? 0) <= 0) {
      Alert.alert(t('matchupComparisonFailed', 'Matchup comparison failed'), t('matchupMissingStableId', 'Player identity is unavailable. Please search for the player again.'));
      return;
    }

    let matchupPlayer = selectedPlayerForMatchup;
    try {
      setAddingMatchupPlayer(true);
      const enriched = await ensureSelectedPlayerScoresForMatchup();
      if (enriched) matchupPlayer = enriched;
    } catch (err: any) {
      Alert.alert(t('matchupComparisonFailed', 'Matchup comparison failed'), String(err?.message || err));
      return;
    } finally {
      setAddingMatchupPlayer(false);
    }

    sharedMatchup.add(matchupPlayer);
    recordSelectedCardInterestOnce();
    if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'addYamalToMatchup') {
      setName('Vinicius Junior'); onSearch('Vinicius Junior');
    } else if (isPlayerPoolTutorialActive && tutorial.playerPoolStep === 'addViniciusToMatchup') {
      tutorial.setPlayerPoolStep('launchMatchup');
    }
  }, [
    sharedMatchup.add,
    matchupRow4,
    addingMatchupPlayer,
    ensureSelectedPlayerScoresForMatchup,
    isPlayerPoolTutorialActive,
    matchupMode,
    matchupRow1,
    matchupRow2,
    matchupRow3,
    onSearch,
    recordSelectedCardInterestOnce,
    selectedPlayerId,
    selectedPlayerForMatchup,
    t,
    tutorial,
  ]);

  React.useEffect(() => {
    if (!pendingPortfolioMatchup || pendingPortfolioMatchup !== selectedPlayerId) return;
    setPendingPortfolioMatchup(null);
    void addSelectedPlayerToMatchup().then(scrollToMatchup);
  }, [pendingPortfolioMatchup, selectedPlayerId, addSelectedPlayerToMatchup, scrollToMatchup]);

  const comparisonRequest = React.useRef(0);
  React.useEffect(() => {
    comparisonRequest.current++;
    setComparisonOpen(false); setComparisonData(null); setComparisonLoading(false);
  }, [matchupRow1, matchupRow2, matchupRow3, matchupRow4, matchupMode, isFocused]);

  const onLaunchMatchup = React.useCallback(() => { navigation.navigate('Matchup'); }, [navigation]);

  const candidateTableHeight = React.useMemo(() => {
    if (results.length === 0) {
      return ROW_HEIGHT * 3;
    }

    const visibleRows = Math.min(results.length, CANDIDATE_TABLE_VISIBLE_ROWS);
    return ROW_HEIGHT * (visibleRows + 1) + 2;
  }, [results.length]);

  const roleDisplayLabel = React.useCallback((value: string) => {
    return rolePickerCode(value) || ROLE_LONG_TO_SHORT[value] || value;
  }, []);

  const positionOptionLabels = React.useMemo(() => {
    const available = new Set(positionOptions.map((item) => rolePickerCode(item)).filter(Boolean));
    if (!available.size) return [...PLAYER_POOL_POSITION_OPTIONS];
    return ROLE_PICKER_ORDER.filter((role) => available.has(role));
  }, [positionOptions]);

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
      worldCupMode && sortKey === 'nationality' ? 'name' : sortKey;
    const base =
      effectiveSortKey === 'name'
        ? t('tblName', 'Name')
        : effectiveSortKey === 'nationality'
          ? t('tblNat', 'Nat.')
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
        worldCupMode && sortKey === 'nationality' ? 'name' : sortKey;

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
              : a.player.meta?.team ?? '';

      const bVal =
        effectiveSortKey === 'name'
          ? b.player.name
          : effectiveSortKey === 'role'
            ? b.player.meta?.roles?.[0] ?? ''
            : effectiveSortKey === 'nationality'
              ? b.player.meta?.nationality ?? ''
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
        <SearchFilters
          name={name}
          setName={setName}
          contractStatus={contractStatus}
          setContractStatus={setContractStatus}
          loanEndDate={loanEndDate}
          setLoanEndDate={setLoanEndDate}
          contractEndDate={contractEndDate}
          setContractEndDate={setContractEndDate}
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

        <TutorialPageGuide page="playerPool" frame={0} onShow={y => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />

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
          onSelectRow={(row) => {
            setRevealedPotentialForCard(false);
            setRevealedFormForCard(false);
            setPlayerCardPlanNudgeVisible(false);
            currentCardRenderIdRef.current = `${row.id}:${Date.now()}`;
            countedCardRenderIdRef.current = null;
            setSelectedPlayerId(row.id);
            setSelectedPlayer(row.player);
            if (planResolved && plan === 'Free' && !isPlayerPoolTutorialActive) {
              void incrementPlayerCardPlanNudgeCount().then((count) => {
                setPlayerCardPlanNudgeVisible(shouldShowPlayerCardPlanNudge(count));
              });
            }
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
        />

        <TutorialPageGuide page="playerPool" frame={1} onShow={y => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />

        <PlayerCardPP
          onMatchup={async () => { await addSelectedPlayerToMatchup(); }}
          matchupDisabled={addingMatchupPlayer || [matchupRow1, matchupRow2, matchupRow3, matchupRow4].slice(0, matchupMode).every(Boolean) || [matchupRow1, matchupRow2, matchupRow3, matchupRow4].slice(0, matchupMode).some(row => row?.id === selectedPlayerId)}
          selectedPlayer={selectedPlayer}
          selectedPlayerForCard={selectedPlayerForCard}
          onRevealPotential={onRevealPotential}
          onRevealForm={onRevealForm}
          selectedPlayerId={selectedPlayerId}
          onGenerateReport={generateReportFromPlayerCard}
          onAddFavorite={addSelectedPlayerToPortfolio}
          reportState={selectedReportState}
          reportDisabled={!selectedPlayerId}
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
          footerContent={
            playerCardPlanNudgeVisible && plan === 'Free' && !isPlayerPoolTutorialActive ? (
              <PlayerCardPlanNudge
                onClose={() => {
                  setPlayerCardPlanNudgeVisible(false);
                  setMatchupPlanNudgeDismissed(true);
                }}
                onOpenPlans={() => {
                  setPlayerCardPlanNudgeVisible(false);
                  setMatchupPlanNudgeDismissed(true);
                  navigation.navigate('Profile', { screen: 'ManagePlan' });
                }}
                worldCupMode={worldCupMode}
                title={t('playerCardPlanNudgeTitle', 'Discover Plus & Pro')}
                buttonLabel={t('viewPlans', 'View Plans')}
              />
            ) : null
          }
        />

        <TutorialPageGuide page="playerPool" frame={2} onShow={y => scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true })} />
        <View onLayout={event => { matchupTop.current = event.nativeEvent.layout.y; }}>
        <MatchupCenter
          row1={matchupRow1}
          row2={matchupRow2}
          row3={matchupRow3}
          row4={matchupRow4}
          matchupMode={matchupMode}
          onMatchupModeChange={(mode) => {
            if (mode === 3 && !canUseThreeWayComparison) {
              setMatchupUpgradeMode(3);
              return;
            }
            if (mode === 4 && !canUseFourWayComparison) {
              setMatchupUpgradeMode(4);
              return;
            }
            if (mode < matchupMode) {
              const retainedRows = [matchupRow1, matchupRow2, matchupRow3, matchupRow4].filter(Boolean).slice(0, mode);
              setMatchupRow1(retainedRows[0] ?? null);
              setMatchupRow2(retainedRows[1] ?? null);
              setMatchupRow3(retainedRows[2] ?? null);
              setMatchupRow4(retainedRows[3] ?? null);
            }
            setMatchupMode(mode);
          }}
          onLaunchMatchup={onLaunchMatchup}
          launchDisabled={!matchupRow1 || !matchupRow2 || (matchupMode >= 3 && !matchupRow3) || (matchupMode === 4 && !matchupRow4)}
          launchLoading={comparisonLoading}
          onRemoveRow1={() => sharedMatchup.removeAt(0)}
          onRemoveRow2={() => sharedMatchup.removeAt(1)}
          onRemoveRow3={() => sharedMatchup.removeAt(2)}
          onRemoveRow4={() => sharedMatchup.removeAt(3)}
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
        </View>
        {plan === 'Free' &&
        !isPlayerPoolTutorialActive &&
        matchupMode === 2 &&
        matchupRow1 &&
        matchupRow2 &&
        !playerCardPlanNudgeVisible &&
        !matchupPlanNudgeDismissed ? (
          <PlayerCardPlanNudge
            onClose={() => setMatchupPlanNudgeDismissed(true)}
            onOpenPlans={() => {
              setMatchupPlanNudgeDismissed(true);
              navigation.navigate('Profile', { screen: 'ManagePlan' });
            }}
            worldCupMode={worldCupMode}
            title={t('playerCardPlanNudgeTitle', 'Discover Plus & Pro')}
            buttonLabel={t('viewPlans', 'View Plans')}
            containerStyle={styles.matchupPlanNudge}
          />
        ) : null}
        <ComparisonModal
          visible={comparisonOpen}
          loading={comparisonLoading}
          error={comparisonError}
          player1={comparisonData?.player1 ?? (matchupRow1 ? { id: matchupRow1.id, player: matchupRow1.player } : null)}
          player2={comparisonData?.player2 ?? (matchupRow2 ? { id: matchupRow2.id, player: matchupRow2.player } : null)}
          player4={comparisonData?.player4 ?? (matchupMode === 4 && matchupRow4 ? { id: matchupRow4.id, player: matchupRow4.player } : null)}
          player3={comparisonData?.player3 ?? (matchupMode >= 3 && matchupRow3 ? { id: matchupRow3.id, player: matchupRow3.player } : null)}
          onClose={() => {
            comparisonRequest.current++;
            setComparisonLoading(false);
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
        {scoutPlayer && scoutReport ? (
          <ScoutingReport
            visible={scoutOpen}
            onClose={() => setScoutOpen(false)}
            player={scoutPlayer}
            report={scoutReport}
            plan={plan}
            reloadReport={scoutReportPayload?()=>getPlayerPoolScoutingReportProgress(scoutReportPayload):undefined}
            loadReportSection={scoutReportPayload?(section)=>getPlayerPoolScoutingReportSection(scoutReportPayload,section):undefined}
            onReportUpdate={next=>{
              setScoutReport(next);
              if(next.status==='ready'&&scoutReportPlayerId)setReadyReportsByPlayerId(current=>({...current,[scoutReportPlayerId]:next}));
            }}
          />
        ) : null}
        <PlusProUpsellScreen
          visible={proUpsellOpen}
          onClose={() => setProUpsellOpen(false)}
        />
        <Modal
          visible={matchupUpgradeMode !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setMatchupUpgradeMode(null)}
        >
          <View style={styles.proPromptBackdrop}>
            <View
              style={[
                styles.proPromptCard,
                worldCupMode && {
                  borderColor: WORLD_CUP_COLORS.mint,
                  backgroundColor: WORLD_CUP_COLORS.panel,
                },
              ]}
            >
              <View style={styles.proPromptHeader}>
                <View style={[styles.proPromptIconWrap, worldCupMode && { borderColor: WORLD_CUP_COLORS.mint }]}>
                  <BadgeCheck size={20} color={worldCupMode ? WORLD_CUP_COLORS.mint : ACCENT} strokeWidth={2.3} />
                </View>
                <Text style={styles.proPromptTitle}>
                  {matchupUpgradeMode === 3
                    ? i18n.language.startsWith('tr')
                      ? <><Text style={styles.proPromptPlus}>PLUS</Text> veya <Text style={styles.proPromptPro}>PRO</Text> ile 3’lü karşılaştırma</>
                      : <><Text style={styles.proPromptPlus}>PLUS</Text> or <Text style={styles.proPromptPro}>PRO</Text> for a 3-way matchup</>
                    : i18n.language.startsWith('tr')
                      ? <><Text style={styles.proPromptPro}>PRO</Text> ile 4’lü karşılaştırma</>
                      : <><Text style={styles.proPromptPro}>PRO</Text> for a 4-way matchup</>}
                </Text>
              </View>
              <Text style={styles.proPromptBody}>
                {matchupUpgradeMode === 3
                  ? i18n.language.startsWith('tr')
                    ? <>Bu özelliğe erişmek için <Text style={styles.proPromptPlus}>PLUS</Text> veya <Text style={styles.proPromptPro}>PRO</Text>’ya geç.</>
                    : <>Switch to <Text style={styles.proPromptPlus}>PLUS</Text> or <Text style={styles.proPromptPro}>PRO</Text> to access this feature.</>
                  : i18n.language.startsWith('tr')
                    ? <>Bu özelliğe erişmek için <Text style={styles.proPromptPro}>PRO</Text>’ya geç.</>
                    : <>Switch to <Text style={styles.proPromptPro}>PRO</Text> to access this feature.</>}
              </Text>
              <View style={styles.proPromptActions}>
                <Pressable
                  onPress={() => setMatchupUpgradeMode(null)}
                  style={({ pressed }) => [styles.proPromptSecondary, pressed && styles.pressed]}
                >
                  <Text style={styles.proPromptSecondaryText}>{t('notNow', 'Not now')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    setMatchupUpgradeMode(null);
                    navigation.navigate('Profile', { screen: 'ManagePlan' });
                  }}
                  style={({ pressed }) => [
                    styles.proPromptPrimary,
                    worldCupMode && { backgroundColor: WORLD_CUP_COLORS.mint, borderColor: WORLD_CUP_COLORS.mint },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.proPromptPrimaryText}>{t('managePlan', 'Manage Plan')}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  playerCardPlanNudge: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.32)',
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
    padding: 12,
    gap: 10,
  },
  matchupPlanNudge: {
    marginTop: -8,
  },
  playerCardPlanNudgeTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  playerCardPlanNudgeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerCardPlanNudgeCopy: {
    flex: 1,
    minWidth: 0,
  },
  playerCardPlanNudgeTitlePill: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    backgroundColor: 'rgba(8, 18, 13, 0.72)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  playerCardPlanNudgeTitle: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  playerCardPlanNudgeTable: {
    overflow: 'hidden',
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#26362E',
    backgroundColor: '#131916',
  },
  playerCardPlanNudgeTableRow: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  playerCardPlanNudgeTableHeader: {
    minHeight: 34,
    backgroundColor: '#101512',
  },
  playerCardPlanNudgeTableBorder: {
    borderTopWidth: 1,
    borderTopColor: '#26362E',
  },
  playerCardPlanNudgeFeatureCell: {
    flex: 1.4,
    minWidth: 0,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  playerCardPlanNudgeValueCell: {
    flex: 0.72,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderLeftWidth: 1,
    borderLeftColor: '#26362E',
  },
  playerCardPlanNudgePlusCell: {
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
  },
  playerCardPlanNudgeProCell: {
    backgroundColor: 'rgba(22, 163, 74, 0.11)',
  },
  playerCardPlanNudgePlusValue: {
    backgroundColor: 'rgba(56, 189, 248, 0.025)',
  },
  playerCardPlanNudgeProValue: {
    backgroundColor: 'rgba(22, 163, 74, 0.035)',
  },
  playerCardPlanNudgePlusText: {
    color: '#38BDF8',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  playerCardPlanNudgeProText: {
    color: '#4ADE80',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  playerCardPlanNudgeFeatureText: {
    color: '#D4DED8',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
  },
  playerCardPlanNudgeValueText: {
    color: '#F2F5F3',
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  playerCardPlanNudgeClose: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  playerCardPlanNudgeButton: {
    minHeight: 40,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  playerCardPlanNudgeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  proPromptBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  proPromptCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.34)',
    backgroundColor: PANEL,
    padding: 18,
    gap: 12,
  },
  proPromptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  proPromptIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: 'rgba(36, 245, 166, 0.42)',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPromptTitle: {
    flex: 1,
    color: '#F4F6F5',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  proPromptBody: {
    color: '#9A9AA3',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  proPromptPlus: { color: '#38BDF8', fontWeight: '900' },
  proPromptPro: { color: ACCENT, fontWeight: '900' },
  proPromptActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  proPromptSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  proPromptSecondaryText: {
    color: '#B6B6BE',
    fontSize: 12,
    fontWeight: '900',
  },
  proPromptPrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  proPromptPrimaryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.92,
  },
});
