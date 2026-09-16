import { useWorkspaceActionAd } from '@/ads/useWorkspaceActionAd';
import { useMatchup } from '@/context/MatchupContext';
import { portfolioViewportHeight } from '@/utils/portfolioLayout';
import { FRAME_TITLE, FRAME_STRIPE } from '@/theme';
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Shirt, X, UserX, Users, UserRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { TEXT, ACCENT, PANEL, CARD, MUTED, LINE, DANGER, DANGER_DARK } from '../theme';
import type { PlayerData } from '../types';
import ScoutingReport from './ScoutingReport';
import {
  deleteFavoritePlayer,
  getFavoritePlayers,
  getScoutingReport,
  getFavoriteScoutingReportSection,
  ROLE_PICKER_ORDER,
  rolePickerCode,
  type Plan,
  type FavoritePlayer,
  type ScoutingReportResponse,
} from '../services/api';
import { portfolioTeamShortName } from '@/utils/portfolioTeamShortName';
import { countryToCode2 } from '../constants/countries';
import PlayerCard from '../components/PlayerCard';
import { normalizePlayerContract, type PlayerContract } from '@/utils/playerContract';
import { matchesPortfolioFilters, type PortfolioFilters } from '@/utils/portfolioFilters';
import { showInterstitialAndWaitSafely } from '../ads/interstitial';
import { PlusProUpsellScreen } from '@/ads/PlusProUpsellScreen';
import {
  incrementPortfolioLineupLaunchCount,
  incrementReportActionCount,
  shouldShowPortfolioLineupInterstitial,
  shouldShowReportActionInterstitial,
} from '../ads/adGating';
import { TutorialHint, type ProfileTutorialStep } from './Tutorial';
import LineUp from './LineUp';

type PlayerRow = PlayerContract & {
  sportmonksId?: number;
  teamId?: number;
  leagueId?: number;
  playerId?: string;
  id: string;
  name: string;
  imageUrl?: string;
  nationality?: string;
  age?: number;
  rolesShort: string[];
  potential?: number;
  form?: number;
  gender?: string;
  team?: string;
  league?: string;
  height?: number;
  weight?: number;
};

const ALL_ROLE_SHORTS = ROLE_PICKER_ORDER;

function roleMatchesSelection(playerRoles: string[], selectedRole: string) {
  return playerRoles.includes(selectedRole);
}

const ROW_HEIGHT = 48;
const COL = {
  name: 1.0,
  nat: 0.7,
  team: 0.85,
  age: 0.6,
  roles: 0.7,
  form: 0.7,
  pot: 0.7,
} as const;

type SortKey = 'name' | 'nationality' | 'team' | 'age' | 'roles' | 'form' | 'potential';
type SortDir = 'asc' | 'desc';

function hasAbbreviation(token: string) {
  return /[.]/.test(token);
}

function portfolioDisplayName(full: string): string {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const lastName = parts.filter((part) => !hasAbbreviation(part)).at(-1) || parts.at(-1) || parts[0];
  return lastName.length > 8 ? parts[0] : lastName;
}

function missingRank(value: unknown): 0 | 1 {
  if (value === null || value === undefined) return 1;
  if (typeof value === 'string' && !value.trim()) return 1;
  if (typeof value === 'number' && !Number.isFinite(value)) return 1;
  return 0;
}

function compareWithMissingLast<T>(
  aValue: T,
  bValue: T,
  dir: number,
  comparePresent: (a: NonNullable<T>, b: NonNullable<T>) => number,
) {
  const aMissing = missingRank(aValue);
  const bMissing = missingRank(bValue);
  if (aMissing !== bMissing) return aMissing - bMissing;
  if (aMissing) return 0;
  return comparePresent(aValue as NonNullable<T>, bValue as NonNullable<T>) * dir;
}

function isLamineYamalName(name: string) {
  return name
    .toLocaleLowerCase('en-US')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .includes('lamine yamal');
}

function normalizeSearchText(value?: string | null) {
  const folded = String(value || '')
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

function searchIncludes(value: string | undefined, query: string) {
  const normalizedQuery = normalizeSearchText(query);
  return !normalizedQuery || normalizeSearchText(value).includes(normalizedQuery);
}

type FavoritePlayersProps = {
  workspaceFilters?: PortfolioFilters;
  plan?: Plan;
  profileTutorialStep?: ProfileTutorialStep | null;
  onProfileTutorialNext?: () => void;
  onProfileTutorialSkip?: () => void;
};

export default function FavoritePlayers({
  workspaceFilters,
  plan = 'Free',
  profileTutorialStep = null,
  onProfileTutorialNext,
  onProfileTutorialSkip,
}: FavoritePlayersProps) {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const tableViewportHeight = workspaceFilters ? portfolioViewportHeight(windowHeight) : ROW_HEIGHT * 5 + 2;
  const tutorialLocked =
    profileTutorialStep === 'watchlist' ||
    profileTutorialStep === 'report' ||
    profileTutorialStep === 'filters' ||
    profileTutorialStep === 'lineup' ||
    profileTutorialStep === 'lineupModal';
  const canPressTutorialLineup = profileTutorialStep === 'lineup';

  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const deletingRef = React.useRef(new Set<string>());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const sharedMatchup = useMatchup();
  const matchupAds = useWorkspaceActionAd();
  const matchupFull = sharedMatchup.rows.slice(0, sharedMatchup.mode).every(Boolean);
  const [proUpsellOpen, setProUpsellOpen] = useState(false);
  const [proUpsellSource, setProUpsellSource] = useState<'report' | 'lineup' | null>(null);
  const [lineupOpen, setLineupOpen] = useState(false);

  const navigation = useNavigation<any>();
  const [previewRow, setPreviewRow] = useState<PlayerRow | null>(null);
  const [previewPlayer, setPreviewPlayer] = useState<PlayerData | null>(null);

  const [qName, setQName] = useState('');
  const [genderFilter, setGenderFilter] = useState<'' | 'male' | 'female'>('');
  const [qNat, setQNat] = useState('');
  const [qLeague, setQLeague] = useState('');
  const [qTeam, setQTeam] = useState('');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [minPot, setMinPot] = useState<string>('');
  const [maxPot, setMaxPot] = useState<string>('');
  const [minForm, setMinForm] = useState<string>('');
  const [maxForm, setMaxForm] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>('potential');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [scoutOpen, setScoutOpen] = useState(false);
  const [scoutPlayer, setScoutPlayer] = useState<PlayerData | null>(null);
  const [scoutReport, setScoutReport] = useState<ScoutingReportResponse | null>(null);

  // Backend states
  const [processingReports, setProcessingReports] = useState<Set<string>>(new Set());
  const [queuedReportPlayer, setQueuedReportPlayer] = useState<PlayerRow | null>(null);
  const [readyReports, setReadyReports] = useState<Map<string, ScoutingReportResponse>>(new Map());

  // Access states
  // This means: user is allowed to open the report
  // It can happen because:
  // - Pro user
  // - interstitial ad closed
  // - upsell was shown and then closed
  const [reportAccessGranted, setReportAccessGranted] = useState<Set<string>>(new Set());

  // The player currently tied to the ongoing ad / upsell / report flow
  const [activeReportPlayerId, setActiveReportPlayerId] = useState<string | null>(null);

  const favoritesTranslation = React.useRef(t);
  favoritesTranslation.current = t;

  const fetchFavorites = React.useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const favs = await getFavoritePlayers();

      const mapped: PlayerRow[] = favs.map((f: FavoritePlayer) => ({
        id: f.id,
        playerId: f.playerId,
        sportmonksId: f.sportmonksId,
        teamId: f.teamId,
        leagueId: f.leagueId,
        imageUrl: f.imageUrl,
        ...normalizePlayerContract(f),
        name: f.name,
        nationality: f.nationality || '',
        age: typeof f.age === 'number' ? f.age : undefined,
        potential: typeof f.potential === 'number' ? f.potential : undefined,
        form: typeof f.form === 'number' ? f.form : undefined,
        rolesShort: Array.from(new Set((f.roles || []).map((role) => rolePickerCode(role)).filter(Boolean))),
        gender: f.gender || undefined,
        team: f.team || undefined,
        league: f.league || undefined,
        height: typeof (f as any).height === 'number' ? (f as any).height : undefined,
        weight: typeof (f as any).weight === 'number' ? (f as any).weight : undefined,
      }));

      setRows(mapped);
    } catch (e: any) {
      setLoadError(String(e?.message || e));
      Alert.alert(favoritesTranslation.current('favoritesError', 'Favorites error'), String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  const toPlayerData = (p: PlayerRow): PlayerData => ({
    name: p.name,
    meta: {
      ...normalizePlayerContract(p),
      sportmonksId: p.sportmonksId,
      teamId: p.teamId,
      leagueId: p.leagueId,
      imageUrl: p.imageUrl,
      nationality: p.nationality,
      age: p.age,
      roles: p.rolesShort,
      potential: p.potential,
      form: p.form,
      gender: p.gender,
      team: p.team,
      league: p.league,
      height: p.height,
      weight: p.weight,
    },
    stats: [],
  });

  useFocusEffect(
    React.useCallback(() => {
      fetchFavorites();
    }, [fetchFavorites])
  );

  const cycleGender = () => {
    setGenderFilter((prev) => (prev === '' ? 'male' : prev === 'male' ? 'female' : ''));
  };

  const renderGenderFilterLabel = () => {
    if (genderFilter === 'male') return t('genderMale', 'Male');
    if (genderFilter === 'female') return t('genderFemale', 'Female');
    return t('phGenderAny', 'Any');
  };

  const toggleRole = (r: string) => {
    setSelectedRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const cycleSort = (key: SortKey) => {
    if (key !== sortKey) {
      setSortKey(key);
      setSortDir('asc');
    } else {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    }
  };

  const filtered = useMemo(() => {
    const minA = minAge ? parseInt(minAge, 10) : undefined;
    const maxA = maxAge ? parseInt(maxAge, 10) : undefined;
    const minP = minPot ? Math.min(100, parseInt(minPot, 10)) : undefined;
    const maxP = maxPot ? Math.min(100, parseInt(maxPot, 10)) : undefined;
    const minF = minForm ? Math.min(100, parseInt(minForm, 10)) : undefined;
    const maxF = maxForm ? Math.min(100, parseInt(maxForm, 10)) : undefined;

    const list = rows.filter((p) => {
      if (workspaceFilters && !matchesPortfolioFilters(p, workspaceFilters)) return false;
      if (!searchIncludes(p.name, qName)) return false;
      if (!searchIncludes(p.nationality, qNat)) return false;
      if (!searchIncludes(p.league, qLeague)) return false;
      if (!searchIncludes(p.team, qTeam)) return false;

      if (genderFilter) {
        const g = (p.gender || '').toLowerCase();
        if (g !== genderFilter) return false;
      }

      if (minA !== undefined && (p.age ?? -Infinity) < minA) return false;
      if (maxA !== undefined && (p.age ?? Infinity) > maxA) return false;

      if (minP !== undefined && (p.potential ?? -Infinity) < minP) return false;
      if (maxP !== undefined && (p.potential ?? Infinity) > maxP) return false;

      if (minF !== undefined && (p.form ?? -Infinity) < minF) return false;
      if (maxF !== undefined && (p.form ?? Infinity) > maxF) return false;

      if (
        selectedRoles.length > 0 &&
        !selectedRoles.some((role) => roleMatchesSelection(p.rolesShort, role))
      ) {
        return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;

      switch (sortKey) {
        case 'name':
          return compareWithMissingLast(a.name, b.name, dir, (av, bv) => av.localeCompare(bv));
        case 'nationality':
          return compareWithMissingLast(a.nationality, b.nationality, dir, (av, bv) => av.localeCompare(bv));
        case 'team':
          return compareWithMissingLast(a.team, b.team, dir, (av, bv) => av.localeCompare(bv));
        case 'age':
          return compareWithMissingLast(a.age, b.age, dir, (av, bv) => av - bv);
        case 'potential':
          return compareWithMissingLast(a.potential, b.potential, dir, (av, bv) => av - bv);
        case 'form':
          return compareWithMissingLast(a.form, b.form, dir, (av, bv) => av - bv);
        case 'roles': {
          const ar = a.rolesShort[0] ?? '';
          const br = b.rolesShort[0] ?? '';
          return compareWithMissingLast(ar, br, dir, (av, bv) => av.localeCompare(bv));
        }
      }
    });

    return list;
  }, [
    workspaceFilters,
    rows,
    qName,
    qNat,
    qLeague,
    qTeam,
    minAge,
    maxAge,
    minPot,
    maxPot,
    minForm,
    maxForm,
    selectedRoles,
    genderFilter,
    sortKey,
    sortDir,
  ]);
  const tableNeedsInnerScroll = filtered.length * (ROW_HEIGHT + 12) + 8 > tableViewportHeight;

  const clearFilters = () => {
    if (tutorialLocked) return;
    setQName('');
    setGenderFilter('');
    setQNat('');
    setQLeague('');
    setQTeam('');
    setMinAge('');
    setMaxAge('');
    setMinPot('');
    setMaxPot('');
    setMinForm('');
    setMaxForm('');
    setSelectedRoles([]);
  };

  const allowReport = (player: PlayerRow) => {
    setProcessingReports((prev) => {
      const next = new Set(prev);
      next.add(player.id);
      return next;
    });

    setQueuedReportPlayer(player);
  };

  // Opens as soon as access is granted; the durable foundation arrives in place.
  useEffect(() => {
    if (!activeReportPlayerId) return;
    if (!reportAccessGranted.has(activeReportPlayerId)) return;

    const ready = readyReports.get(activeReportPlayerId);
    const player = rows.find((r) => r.id === activeReportPlayerId);
    if (!player) return;

    setScoutPlayer(toPlayerData(player));
    setScoutReport(ready ?? {
      favorite_player_id: player.id,
      status: 'processing',
      content: '',
      content_json: { sections: { analysis: { status: 'processing' } } },
    });
    setPreviewPlayer(null);
    setTimeout(() => setScoutOpen(true), 250);

    setReportAccessGranted((prev) => {
      const next = new Set(prev);
      next.delete(activeReportPlayerId);
      return next;
    });
    setActiveReportPlayerId(null);
  }, [activeReportPlayerId, reportAccessGranted, readyReports, rows]);

  // Polling while backend is still processing
  useEffect(() => {
    if (processingReports.size === 0) return;

    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;

      for (const playerId of Array.from(processingReports)) {
        try {
          const row = rows.find((r) => r.id === playerId);
          if (!row) continue;

          const payload = {
            name: row.name,
            gender: row.gender,
            nationality: row.nationality,
            team: row.team,
            age: row.age,
            height: row.height,
            weight: row.weight,
            potential: row.potential,
            form: row.form,
          };

          const res = await getScoutingReport(playerId, payload, true);

          if (res.status === 'ready' && res.content) {
            setReadyReports((prev) => {
              const next = new Map(prev);
              next.set(playerId, res);
              return next;
            });

            setProcessingReports((prev) => {
              const next = new Set(prev);
              next.delete(playerId);
              return next;
            });

            continue;
          }

          if (res.status === 'error' || res.status === 'failed') {
            setProcessingReports((prev) => {
              const next = new Set(prev);
              next.delete(playerId);
              return next;
            });
          }
        } catch {
          // temporary network error: keep polling
        }
      }
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [processingReports, rows]);

  // Initial backend request
  useEffect(() => {
    if (!queuedReportPlayer) return;

    let cancelled = false;

    (async () => {
      const p = queuedReportPlayer;

      try {
        const payload = {
          name: p.name,
          gender: p.gender,
          nationality: p.nationality,
          team: p.team,
          age: p.age,
          height: p.height,
          weight: p.weight,
          potential: p.potential,
          form: p.form,
        };

        const res = await getScoutingReport(p.id, payload, true);
        if (cancelled) return;

        if (res.status === 'ready' || res.status === 'processing') {
          setReadyReports((prev) => {
            const next = new Map(prev);
            next.set(p.id, res);
            return next;
          });
        }

        if (res.status === 'ready' && res.content) {
          setProcessingReports((prev) => {
            const next = new Set(prev);
            next.delete(p.id);
            return next;
          });

          return;
        }

        if (res.status === 'processing') {
          return;
        }

        setProcessingReports((prev) => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });

        if (res.status === 'error' || res.status === 'failed') {
          Alert.alert(
            t('reportFailed', 'Report failed'),
            t('reportFailedBody', 'Could not generate the report. Please try again later.')
          );
        }
      } catch (e: any) {
        if (cancelled) return;

        setProcessingReports((prev) => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });

        Alert.alert(t('reportError', 'Report error'), String(e?.message || e));
      } finally {
        if (!cancelled) {
          setQueuedReportPlayer(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queuedReportPlayer, t]);

  const handleReportPress = async (player: PlayerRow) => {
    if (profileTutorialStep === 'report') {
      if (!isLamineYamalName(player.name)) return;

      try {
        const res = await getScoutingReport(player.id, {
          name: player.name,
          gender: player.gender,
          nationality: player.nationality,
          team: player.team,
          age: player.age,
          height: player.height,
          weight: player.weight,
          potential: player.potential,
          form: player.form,
          tutorial_mode: true,
        });

        if (res.status === 'ready') {
          setScoutPlayer(toPlayerData(player));
          setScoutReport(res);
          setPreviewPlayer(null);
    setTimeout(() => setScoutOpen(true), 250);
        }
      } catch (e: any) {
        Alert.alert(t('reportError', 'Report error'), String(e?.message || e));
      }
      return;
    }

    if (tutorialLocked) return;

    const hasAdFreeAccess = plan !== 'Free';
    const existing = readyReports.get(player.id);
    const grantReportAccessForFreeUser = async () => {
      try {
        const nextCount = await incrementReportActionCount();

        if (shouldShowReportActionInterstitial(nextCount)) {
          const shown = await showInterstitialAndWaitSafely();
          if (shown) {
            setReportAccessGranted((prev) => {
              const next = new Set(prev);
              next.add(player.id);
              return next;
            });
            return true;
          }

          setProUpsellSource('report');
          setProUpsellOpen(true);
          return false;
        }

        setReportAccessGranted((prev) => {
          const next = new Set(prev);
          next.add(player.id);
          return next;
        });
        return true;
      } catch {
        setProUpsellSource('report');
        setProUpsellOpen(true);
        return false;
      }
    };

    // Paid plans: cached reports open immediately, free users share the shared every-third report counter.
    if (hasAdFreeAccess && existing) {
      setScoutPlayer(toPlayerData(player));
      setScoutReport(existing);
      setPreviewPlayer(null);
    setTimeout(() => setScoutOpen(true), 250);
      return;
    }

    if (!hasAdFreeAccess && existing) {
      setActiveReportPlayerId(player.id);

      await grantReportAccessForFreeUser();
      return;
    }

    // Already unlocked and ready -> open immediately
    if (reportAccessGranted.has(player.id)) {
      if (existing) {
        setScoutPlayer(toPlayerData(player));
        setScoutReport(existing);
        setPreviewPlayer(null);
    setTimeout(() => setScoutOpen(true), 250);
      }
      return;
    }

    // Already processing this player -> do nothing
    if (processingReports.has(player.id) || queuedReportPlayer?.id === player.id) {
      return;
    }

    // Start backend immediately
    setActiveReportPlayerId(player.id);
    allowReport(player);

    // Paid plans: instant access, no ad
    if (hasAdFreeAccess) {
      setReportAccessGranted((prev) => {
        const next = new Set(prev);
        next.add(player.id);
        return next;
      });
      return;
    }

    // Free: gate every third report action while the backend works.
    await grantReportAccessForFreeUser();
  };

  const handleDelete = async (id: string) => {
    if (tutorialLocked || deletingRef.current.has(id)) return;
    deletingRef.current.add(id);
    setDeletingIds(new Set(deletingRef.current));
    try {
      await deleteFavoritePlayer(id);
      setRows(current => current.filter(player => player.id !== id));
    } catch (e: any) {
      Alert.alert(t('deleteFailed', 'Delete failed'), String(e?.message || e));
    } finally {
      deletingRef.current.delete(id);
      setDeletingIds(new Set(deletingRef.current));
    }
  };

  const confirmDelete = (player: PlayerRow) => {
    if (tutorialLocked || deletingRef.current.has(player.id)) return;
    Alert.alert(
      t('portfolioRemoveTitle', 'Remove from portfolio'),
      t('portfolioRemoveConfirm', 'Remove {{name}} from your portfolio?', { name: player.name }),
      [
        { text: t('portfolioRemoveCancel', 'Cancel'), style: 'cancel' },
        { text: t('portfolioRemoveAction', 'Remove'), style: 'destructive', onPress: () => { void handleDelete(player.id); } },
      ],
    );
  };

  const handleLineupPress = async () => {
    if (tutorialLocked && !canPressTutorialLineup) return;

    setLineupOpen(true);

    if (profileTutorialStep === 'lineup') {
      onProfileTutorialNext?.();
      return;
    }

    const hasAdFreeAccess = plan !== 'Free';
    if (hasAdFreeAccess) return;

    try {
      const nextCount = await incrementPortfolioLineupLaunchCount();
      if (!shouldShowPortfolioLineupInterstitial(nextCount)) {
        return;
      }

      const shown = await showInterstitialAndWaitSafely();
      if (!shown) {
        setProUpsellSource('lineup');
        setProUpsellOpen(true);
      }
    } catch {
      setProUpsellSource('lineup');
      setProUpsellOpen(true);
    }
  };

  const renderUnifiedRow = (item: PlayerRow | 'HEADER') => {
    const isHeader = item === 'HEADER';
    const pressedStyle = { opacity: 0.9 };
    const chevron = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');
    const canPressTutorialReport =
      !isHeader &&
      profileTutorialStep === 'report' &&
      isLamineYamalName((item as PlayerRow).name);

    const RowInner = (
      <View style={[styles.row, isHeader && styles.clickableHeaderRow, { minHeight: ROW_HEIGHT }]}>


        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('name')}
            disabled={tutorialLocked}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.name },
              pressed && pressedStyle,
              sortKey === 'name' && styles.activeHeaderCell,
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblName', 'Name')}
              {chevron('name')}
            </Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.name, textAlign: 'center' }]}>
            {portfolioDisplayName((item as PlayerRow).name)}
          </Text>
        )}

        <View style={styles.vsep} />

        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('nationality')}
            disabled={tutorialLocked}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.nat },
              pressed && pressedStyle,
              sortKey === 'nationality' && styles.activeHeaderCell,
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {workspaceFilters ? t('portfolioCountry', 'Nat.') : t('tblNat', 'Nat.')}
              {chevron('nationality')}
            </Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.nat, textAlign: 'center' }]}>
            {countryToCode2((item as PlayerRow).nationality) || '—'}
          </Text>
        )}

        <View style={styles.vsep} />

        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('team')}
            disabled={tutorialLocked}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.team },
              pressed && pressedStyle,
              sortKey === 'team' && styles.activeHeaderCell,
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblTeam', 'Team')}
              {chevron('team')}
            </Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} accessibilityLabel={(item as PlayerRow).team || '—'} style={[styles.td, styles.cell, { flex: COL.team, textAlign: 'center' }]}>
            {portfolioTeamShortName((item as PlayerRow).team)}
          </Text>
        )}

        <View style={styles.vsep} />

        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('age')}
            disabled={tutorialLocked}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.age },
              pressed && pressedStyle,
              sortKey === 'age' && styles.activeHeaderCell,
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblAge', 'Age')}
              {chevron('age')}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.td, styles.cell, { flex: COL.age, textAlign: 'center' }]}>
            {Number.isFinite((item as PlayerRow).age) ? (item as PlayerRow).age : '—'}
          </Text>
        )}

        <View style={styles.vsep} />

        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('roles')}
            disabled={tutorialLocked}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.roles },
              pressed && pressedStyle,
              sortKey === 'roles' && styles.activeHeaderCell,
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblRoles', 'Role')}
              {chevron('roles')}
            </Text>
          </Pressable>
        ) : (
          <View style={[styles.cell, styles.rolePillGroup, { flex: COL.roles }]}>
            {(() => {
              const playerRoles = ((item as PlayerRow).rolesShort || [])
                .map((role) => role?.trim())
                .filter(Boolean);
              const selectedMatchingRole = selectedRoles.find((role) => playerRoles.includes(role));
              const visibleRole = selectedMatchingRole || playerRoles[0];

              return visibleRole ? (
                <View key={visibleRole} style={styles.rolePill}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                    style={styles.rolePillText}
                  >
                    {visibleRole}
                  </Text>
                </View>
              ) : (
                <Text numberOfLines={1} style={[styles.td, styles.roleDash]}>—</Text>
              );
            })()}
          </View>
        )}

        <View style={styles.vsep} />

        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('form')}
            disabled={tutorialLocked}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.form },
              pressed && pressedStyle,
              sortKey === 'form' && styles.activeHeaderCell,
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblForm', 'Form')}
              {chevron('form')}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.td, styles.cell, { flex: COL.form, textAlign: 'center' }]}>
            {(item as PlayerRow).form ?? '—'}
          </Text>
        )}

        <View style={styles.vsep} />

        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('potential')}
            disabled={tutorialLocked}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.pot },
              pressed && pressedStyle,
              sortKey === 'potential' && styles.activeHeaderCell,
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblPot', 'Pot.')}
              {chevron('potential')}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.td, styles.cell, { flex: COL.pot, textAlign: 'center' }]}>
            {(item as PlayerRow).potential ?? '—'}
          </Text>
        )}

        <View style={styles.vsep} />
        <View style={styles.deleteCell}>
          {isHeader ? <UserX size={14} color={MUTED} /> : (
            <Pressable
              testID={`portfolio-delete-${(item as PlayerRow).id}`}
              onPress={event => { event.stopPropagation(); confirmDelete(item as PlayerRow); }}
              disabled={tutorialLocked || deletingIds.has((item as PlayerRow).id)}
              accessibilityRole="button"
              accessibilityLabel={t('portfolioRemovePlayer', 'Remove {{name}} from portfolio', { name: (item as PlayerRow).name })}
              accessibilityState={{ disabled: tutorialLocked || deletingIds.has((item as PlayerRow).id), busy: deletingIds.has((item as PlayerRow).id) }}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.deleteButtonPressed, tutorialLocked && styles.rowLocked]}
            >
              {deletingIds.has((item as PlayerRow).id) ? <ActivityIndicator size="small" color={DANGER} /> : <UserX size={18} color={DANGER} strokeWidth={2} />}
            </Pressable>
          )}
        </View>
      </View>
    );

    return (
      <View key={isHeader ? 'header' : (item as PlayerRow).id}>
        {isHeader ? (
          RowInner
        ) : (
          <Pressable
            disabled={tutorialLocked && !canPressTutorialReport}
            testID="portfolio-player-preview"
            onPress={() => { setPreviewRow(item as PlayerRow); setPreviewPlayer(toPlayerData(item as PlayerRow)); }}
            style={({ pressed }) => [
              styles.clickableRow,
              pressed && !tutorialLocked && styles.clickableRowPressed,
              tutorialLocked && styles.rowLocked,
            ]}
          >
            {RowInner}
          </Pressable>
        )}
        <View style={styles.clickableRowGap} />
      </View>
    );
  };

  return (
    <View style={[styles.card, workspaceFilters && { marginHorizontal: 0, marginTop: 0 }]}>
      {workspaceFilters && <View style={FRAME_STRIPE} />}
      <View style={styles.sectionHeader}>
        {workspaceFilters && <Shirt size={20} color={ACCENT} />}
        <Text style={[styles.sectionTitle, workspaceFilters && FRAME_TITLE]}>{workspaceFilters ? t('portfolioWorkspace', 'Player Portfolio') : t('squadPortfolio', 'Squad Portfolio')}</Text>
        {workspaceFilters && <Text style={{ color: ACCENT, fontWeight: '800' }}>{filtered.length}</Text>}
        <Pressable
          onPress={handleLineupPress}
          hitSlop={workspaceFilters ? 12 : undefined}
          disabled={tutorialLocked && !canPressTutorialLineup}
          style={({ pressed }) => [
            styles.lineupButton,
            workspaceFilters && styles.workspaceLineupButton,
            tutorialLocked && !canPressTutorialLineup && styles.lineupButtonDisabled,
            canPressTutorialLineup && styles.lineupButtonTutorial,
            pressed && (!tutorialLocked || canPressTutorialLineup) && styles.lineupButtonPressed,
          ]}
          accessibilityLabel={t('openLineup', 'Open lineup')}
        >
          <Users size={15} color={ACCENT} strokeWidth={2.5} />
          <Text style={styles.lineupButtonText}>{t('openLineup', 'Lineup')}</Text>
        </Pressable>
      </View>

      <View style={{ height: 8 }} />

      <View style={profileTutorialStep === 'lineup' ? styles.profileTutorialHint : undefined}>
        <TutorialHint
          visible={profileTutorialStep === 'lineup'}
          title={t('tutorialProfileLineupTitle', 'Lineup Builder')}
          body={t(
            'tutorialProfileLineupBody',
            'Use Lineup to turn your portfolio into a formation, pick players by position, and check the squad rating.',
          )}
          targetLabel={t('tutorialPressLineup', 'Press Lineup')}
          onSkipAll={onProfileTutorialSkip}
          arrow="none"
          targetArrow="up"
        />
      </View>

      <View style={profileTutorialStep === 'filters' ? styles.profileTutorialHint : undefined}>
        <TutorialHint
          visible={profileTutorialStep === 'filters'}
          title={t('tutorialProfileFiltersTitle', 'Portfolio filters')}
          body={t(
            'tutorialProfileFiltersBody',
            'This is the area where you can filter your portfolio by player details and scouting values.',
          )}
          actionLabel={t('next', 'Next')}
          onAction={onProfileTutorialNext}
          onSkipAll={onProfileTutorialSkip}
          arrow="none"
        />
      </View>

      {!workspaceFilters && <>
      <View style={styles.filters}>
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltName', 'Name')}</Text>
          <TextInput
            value={qName}
            onChangeText={setQName}
            editable={!tutorialLocked}
            placeholder={t('phSearchName', 'Search name')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltGender', 'Gender')}</Text>
          <Pressable
            onPress={cycleGender}
            disabled={tutorialLocked}
            style={({ pressed }) => [styles.input, { justifyContent: 'center' }, pressed && { opacity: 0.9 }]}
            accessibilityLabel={t('fltGender', 'Gender')}
          >
            <Text style={{ color: genderFilter ? TEXT : MUTED, fontSize: 14 }}>{renderGenderFilterLabel()}</Text>
          </Pressable>
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltNationality', 'Nationality')}</Text>
          <TextInput
            value={qNat}
            onChangeText={setQNat}
            editable={!tutorialLocked}
            placeholder={t('phSearchNationality', 'Search nationality')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltLeague', 'League')}</Text>
          <TextInput
            value={qLeague}
            onChangeText={setQLeague}
            editable={!tutorialLocked}
            placeholder={t('phSearchLeague', 'Search league')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltTeam', 'Team')}</Text>
          <TextInput
            value={qTeam}
            onChangeText={setQTeam}
            editable={!tutorialLocked}
            placeholder={t('phSearchTeam', 'Search team')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltAge', 'Age (min / max)')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={minAge}
              onChangeText={(t_) => setMinAge(t_.replace(/[^\d]/g, ''))}
              editable={!tutorialLocked}
              keyboardType="numeric"
              placeholder={t('phMin', 'min')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={maxAge}
              onChangeText={(t_) => setMaxAge(t_.replace(/[^\d]/g, ''))}
              editable={!tutorialLocked}
              keyboardType="numeric"
              placeholder={t('phMax', 'max')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltPotential', 'Potential (min / max)')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={minPot}
              onChangeText={(t_) => setMinPot(t_.replace(/[^\d]/g, '').slice(0, 3))}
              editable={!tutorialLocked}
              keyboardType="numeric"
              placeholder={t('phMin', 'min')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={maxPot}
              onChangeText={(t_) => setMaxPot(t_.replace(/[^\d]/g, '').slice(0, 3))}
              editable={!tutorialLocked}
              keyboardType="numeric"
              placeholder={t('phMax', 'max')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltForm', 'Form (min / max)')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={minForm}
              onChangeText={(t_) => setMinForm(t_.replace(/[^\d]/g, '').slice(0, 3))}
              editable={!tutorialLocked}
              keyboardType="numeric"
              placeholder={t('phMin', 'min')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={maxForm}
              onChangeText={(t_) => setMaxForm(t_.replace(/[^\d]/g, '').slice(0, 3))}
              editable={!tutorialLocked}
              keyboardType="numeric"
              placeholder={t('phMax', 'max')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>

      </View>

      <View style={styles.rolesWrap}>
        {ALL_ROLE_SHORTS.map((r) => {
          const active = selectedRoles.includes(r);
          return (
            <Pressable
              key={r}
              onPress={() => toggleRole(r)}
              disabled={tutorialLocked}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              accessibilityLabel={`${t('role', 'Role')} ${r}`}
            >
              <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>{r}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ alignItems: 'center' }}>
        <Pressable
          onPress={clearFilters}
          disabled={tutorialLocked}
          style={({ pressed }) => [{ paddingVertical: 8, paddingHorizontal: 12, opacity: pressed ? 0.8 : 1 }]}
          accessibilityLabel={t('clearFilters', 'Clear filters')}
        >
          <Text style={{ color: DANGER_DARK }}>{t('clearFilters', 'Clear filters')}</Text>
        </Pressable>
      </View>

      </>}
      <View style={profileTutorialStep === 'watchlist' ? styles.profileTutorialHint : undefined}>
        <TutorialHint
          visible={profileTutorialStep === 'watchlist'}
          title={t('tutorialProfileWatchlistTitle', 'Player portfolio')}
          body={t(
            'tutorialProfileWatchlistBody',
            'This is your watchlist. Saved players appear here so you can revisit and evaluate them later.',
          )}
          actionLabel={t('next', 'Next')}
          onAction={onProfileTutorialNext}
          onSkipAll={onProfileTutorialSkip}
          arrow="none"
        />
      </View>

      <View style={profileTutorialStep === 'report' ? styles.profileTutorialHint : undefined}>
        <TutorialHint
          visible={profileTutorialStep === 'report'}
          title={t('tutorialProfileReportTitle', 'Create a scouting report')}
          body={t(
            'tutorialProfileReportBody',
            'Open Lamine Yamal’s row, then tap Scouting report in his player card.',
          )}
          targetLabel={t('tutorialPressYamalReport', 'Open Lamine Yamal’s player card')}
          onSkipAll={onProfileTutorialSkip}
          arrow="none"
          targetArrow="down"
        />
      </View>

      <View style={styles.table}>
        <View style={styles.tableTopBorder} />

        {loadError ? <View style={{ padding: 16, gap: 12 }}><Text style={{ color: MUTED }}>{t('favoritesError', 'Favorites error')}</Text><Pressable accessibilityRole="button" onPress={fetchFavorites}><Text style={{ color: ACCENT }}>{t('portfolioRetry', 'Retry')}</Text></Pressable></View> : loading ? (
          <View style={{ paddingVertical: 16 }}>
            <Text style={{ color: MUTED }}>{t('loadingFavorites', 'Loading favorites…')}</Text>
          </View>
        ) : (
          <View style={{ width: '100%' }}>
            <View style={styles.tableHeaderWrap}>
              {renderUnifiedRow('HEADER')}
            </View>
            <View style={styles.tableScrollWrap}>
              <ScrollView
                style={{ maxHeight: tableViewportHeight }}
                contentContainerStyle={{ paddingRight: 5, paddingVertical: 4 }}
                scrollIndicatorInsets={Platform.OS === 'ios' ? { right: -5 } : undefined}
                nestedScrollEnabled={tableNeedsInnerScroll}
                bounces={false}
                scrollEnabled={tableNeedsInnerScroll}
                showsVerticalScrollIndicator={tableNeedsInnerScroll}
              >
                {filtered.map((item) => renderUnifiedRow(item))}
                {filtered.length === 0 && <Text style={{ color: MUTED, padding: 16, textAlign: 'center' }}>{t('portfolioNoPlayers', 'No saved players match these filters.')}</Text>}
              </ScrollView>
            </View>
          </View>
        )}

        <View style={styles.tableBottomBorder} />
      </View>

      {previewPlayer && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setPreviewPlayer(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardWrap}>
              <View style={{flexDirection:'row',alignItems:'center',gap:8,marginBottom:10}}>
                <UserRound size={20} color={ACCENT}/>
                <Text style={[FRAME_TITLE,{flex:1}]}>{t('playerCard', 'Player Card')}</Text>
              <Pressable
                onPress={() => setPreviewPlayer(null)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                style={({ pressed }) => [styles.closeInsideCard, { opacity: pressed ? 0.9 : 1 }]}
                accessibilityLabel={t('closePlayerCard', 'Close player card')}
              >
                {({ pressed }) => <X size={22} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />}
              </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
              <PlayerCard player={previewPlayer} titleAlign="left"
                reportState={previewRow && (processingReports.has(previewRow.id) || queuedReportPlayer?.id === previewRow.id) ? 'loading' : 'idle'}
                onGenerateReport={async () => { if (previewRow) await handleReportPress(previewRow); }}
                matchupDisabled={matchupAds.busy || matchupFull || (!!previewRow && sharedMatchup.rows.some(row => row?.id === previewRow.playerId))}
               
                onMatchup={tutorialLocked ? undefined : async () => {
                  if (!previewRow || matchupAds.busy || matchupFull || sharedMatchup.rows.some(row => row?.id === previewRow.playerId)) return;
                  if (!previewRow.playerId || !Number.isSafeInteger(previewRow.sportmonksId) || (previewRow.sportmonksId ?? 0) <= 0) { Alert.alert(t('matchupWorkspace'), t('portfolioPlayerUnavailable', 'This saved player could not be matched to the current player pool.')); return; }
                  const entry = {id: previewRow.playerId, player: {...previewPlayer, meta: {...previewPlayer.meta, sportmonksId: previewRow.sportmonksId}}};
                  try {
                    await matchupAds.run('portfolioPlayerMatchupAdd', () => { sharedMatchup.add(entry); });
                  } catch (error) {
                    Alert.alert(t('matchupWorkspace'), String(error));
                  }
                }} />
              </ScrollView>

            </View>
          </View>
        </Modal>
      )}

      {matchupAds.fallback}
      <PlusProUpsellScreen
        visible={proUpsellOpen}
        onClose={() => {
          setProUpsellOpen(false);
          const source = proUpsellSource;
          setProUpsellSource(null);

          if (source === 'report' && activeReportPlayerId) {
            setReportAccessGranted((prev) => {
              const next = new Set(prev);
              next.add(activeReportPlayerId);
              return next;
            });
          }
        }}
      />

      <LineUp
        visible={lineupOpen}
        players={rows}
        onClose={() => {
          setLineupOpen(false);
          if (profileTutorialStep === 'lineupModal') {
            onProfileTutorialNext?.();
          }
        }}
        tutorialVisible={profileTutorialStep === 'lineupModal'}
        onTutorialNext={() => {
          setLineupOpen(false);
          onProfileTutorialNext?.();
        }}
        onTutorialSkip={() => {
          setLineupOpen(false);
          onProfileTutorialSkip?.();
        }}
      />

      {scoutOpen && scoutPlayer && scoutReport && (
        <ScoutingReport
          visible={scoutOpen}
          onClose={() => {
            setScoutOpen(false);
            setScoutPlayer(null);
            setScoutReport(null);
            if (profileTutorialStep === 'report') {
              onProfileTutorialNext?.();
            }
          }}
          player={scoutPlayer}
          report={scoutReport}
          plan={plan}
          reloadReport={async()=>{
            const row=rows.find(item=>item.id===scoutReport.favorite_player_id);
            return getScoutingReport(scoutReport.favorite_player_id,row?{name:row.name,gender:row.gender,nationality:row.nationality,team:row.team,age:row.age,height:row.height,weight:row.weight,potential:row.potential,form:row.form}:{},true);
          }}
          loadReportSection={async(section)=>{
            const row=rows.find(item=>item.id===scoutReport.favorite_player_id);
            return getFavoriteScoutingReportSection(scoutReport.favorite_player_id,section,row?{name:row.name,gender:row.gender,nationality:row.nationality,team:row.team,age:row.age,height:row.height,weight:row.weight,potential:row.potential,form:row.form}:{});
          }}
          onReportUpdate={next=>{
            setScoutReport(next);
            setReadyReports(current=>{const updated=new Map(current);updated.set(next.favorite_player_id,next);return updated;});
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tableHeaderWrap: {
    paddingRight: 5,
  },
  tableScrollWrap: {
    paddingRight: 1,
  },
  tableScroll: {
    marginRight: -1,
  },
  iconCellLeft: { alignItems: 'flex-start', paddingLeft: 0 },
  iconCellRight: { alignItems: 'flex-end', paddingRight: 0 },
  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  sectionTitle: { color: ACCENT, fontSize: 16, fontWeight: '700', flex: 1, minWidth: 0 },
  lineupButton: {
    minHeight: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
  },
  workspaceLineupButton: { minHeight: 20, height: 20, paddingHorizontal: 8 },
  lineupButtonText: { color: ACCENT, fontSize: 12, fontWeight: '900' },
  lineupButtonDisabled: { opacity: 0.45 },
  lineupButtonPressed: { opacity: 0.82 },
  lineupButtonTutorial: { backgroundColor: 'rgba(22, 163, 74, 0.22)' },

  profileTutorialHint: { marginBottom: 12 },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filterCol: { flexBasis: '48%', flexGrow: 1, gap: 6 },
  filterLabel: { color: MUTED, fontSize: 12 },
  input: {
    color: TEXT,
    backgroundColor: CARD,
    borderColor: LINE,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },

  rolesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1 },
  chipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipInactive: { backgroundColor: 'transparent', borderColor: LINE },
  chipTextActive: { color: TEXT, fontWeight: '700' },
  chipTextInactive: { color: MUTED, fontWeight: '600' },

  table: { marginTop: 10 },
  tableTopBorder: { height: 1, backgroundColor: LINE },
  tableBottomBorder: { height: 1, backgroundColor: LINE },

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
  activeHeaderCell: {
    backgroundColor: 'rgba(36, 245, 166, 0.14)',
  },
  clickableRowPressed: {
    transform: [{ scale: 0.992 }],
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    borderColor: 'rgba(36, 245, 166, 0.42)',
  },
  clickableRowGap: { height: 8 },
  rowLocked: { opacity: 0.62 },
  hsepThick: { height: 2, backgroundColor: LINE },

  cell: { minWidth: 0, paddingVertical: 10, justifyContent: 'center' },
  thText: { color: TEXT, fontSize: 11, lineHeight: 14, fontWeight: '800' },
  td: { minWidth: 0, color: TEXT, flex: 1, fontSize: 11.5 },
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

  deleteCell: { width: 32, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { width: 32, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  deleteButtonPressed: { backgroundColor: 'rgba(248,113,113,0.2)' },
  vsep: { width: 1, alignSelf: 'stretch', backgroundColor: LINE, opacity: 0.9 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCardWrap: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '90%',
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: PANEL,
    borderWidth: 1,
    borderColor: ACCENT,
    padding: 12,
    position: 'relative',
  },
  closeInsideCard: { padding: 6 },
});
