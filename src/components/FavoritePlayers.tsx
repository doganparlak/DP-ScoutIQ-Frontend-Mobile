import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { X, UserX, FileText } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { TEXT, ACCENT, PANEL, CARD, MUTED, LINE, DANGER, DANGER_DARK } from '../theme';
import type { PlayerData } from '../types';
import ScoutingReport from './ScoutingReport';
import {
  deleteFavoritePlayer,
  getFavoritePlayers,
  getScoutingReport,
  ROLE_LONG_TO_SHORT,
  type Plan,
  type FavoritePlayer,
  type ScoutingReportResponse,
} from '../services/api';
import { countryToCode2 } from '../constants/countries';
import PlayerCard from '../components/PlayerCard';
// /**
import {ensureRewardedLoaded,  showRewardedSafely } from '../ads/rewarded';
//*/
type PlayerRow = {
  id: string;
  name: string;
  nationality?: string;
  age?: number;
  rolesShort: string[];
  potential?: number;
  gender?: string;
  team?: string;
  height?: number;
  weight?: number;
};

const ALL_ROLE_SHORTS = [
  'GK','LB','RB','LCB','RCB','CB','LWB','RWB','LM','RM','LDM','RDM','LCM','RCM','LAM','RAM','CDM','CM','CAM','LW','RW','LCF','RCF','CF'
] as const;

const ROW_HEIGHT = 48;
// name, gender, nat, team, age, roles, pot, delete
const COL = { rep: 0.55, name: 0.93, gen: 0.9, nat: 0.93, team: 1.0, age: 0.8, roles: 0.8, pot: 0.83, del: 0.55 } as const;

type SortKey = 'name' | 'gender' | 'nationality' | 'team' | 'age' | 'roles' | 'potential';
type SortDir = 'asc' | 'desc';

// 'Lionel Andres Messi Cuccittini' -> 'Lionel'
function firstWord(full: string): string {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? '';
}

export default function FavoritePlayers({ plan = 'Free' }: { plan?: Plan }) {
  const { t } = useTranslation();

  // ----- favorites state -----
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = React.useCallback(async () => {
    try {
      setLoading(true);
      const favs = await getFavoritePlayers();
      const mapped: PlayerRow[] = favs.map((f: FavoritePlayer) => ({
        id: f.id,
        name: f.name,
        nationality: f.nationality || '',
        age: typeof f.age === 'number' ? f.age : undefined,
        potential: typeof f.potential === 'number' ? f.potential : undefined,
        rolesShort: (f.roles || []).map(long => ROLE_LONG_TO_SHORT[long] ?? long),
        gender: f.gender || undefined,
        team: f.team || undefined,
        height: typeof (f as any).height === 'number' ? (f as any).height : undefined,
        weight: typeof (f as any).weight === 'number' ? (f as any).weight : undefined,
      }));
      setRows(mapped);
    } catch (e: any) {
      Alert.alert(t('favoritesError', 'Favorites error'), String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // preview overlay
  const [previewPlayer, setPreviewPlayer] = useState<PlayerData | null>(null);
  const toPlayerData = (p: PlayerRow): PlayerData => ({
    name: p.name,
    meta: {
      nationality: p.nationality,
      age: p.age,
      roles: p.rolesShort,
      potential: p.potential,
      gender: p.gender,
      team: p.team,
      height: p.height,
      weight: p.weight,
    },
    stats: [],
  });

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);
  useFocusEffect(React.useCallback(() => { fetchFavorites(); }, [fetchFavorites]));

  // ----- filters -----
  const [qName, setQName] = useState('');
  const [genderFilter, setGenderFilter] = useState<'' | 'male' | 'female'>('');
  const [qNat, setQNat] = useState('');
  const [qTeam, setQTeam] = useState('');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [minPot, setMinPot] = useState<string>('');
  const [maxPot, setMaxPot] = useState<string>('');
  const [minHeight, setMinHeight] = useState<string>('');
  const [maxHeight, setMaxHeight] = useState<string>('');
  const [minWeight, setMinWeight] = useState<string>('');
  const [maxWeight, setMaxWeight] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const cycleGender = () => {
    setGenderFilter(prev =>
      prev === '' ? 'male' : prev === 'male' ? 'female' : ''
    );
  };

  const renderGenderFilterLabel = () => {
    if (genderFilter === 'male') return t('genderMale', 'Male');
    if (genderFilter === 'female') return t('genderFemale', 'Female');
    return t('phGenderAny', 'Any');
  };

  // sorting
  const [sortKey, setSortKey] = useState<SortKey>('potential');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleRole = (r: string) => {
    setSelectedRoles(prev => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]));
  };

  const cycleSort = (key: SortKey) => {
    if (key !== sortKey) { setSortKey(key); setSortDir('asc'); }
    else { setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); }
  };

  const filtered = useMemo(() => {
    const minA = minAge ? parseInt(minAge, 10) : undefined;
    const maxA = maxAge ? parseInt(maxAge, 10) : undefined;
    const minP = minPot ? Math.min(100, parseInt(minPot, 10)) : undefined;
    const maxP = maxPot ? Math.min(100, parseInt(maxPot, 10)) : undefined;
    const minH = minHeight ? parseFloat(minHeight) : undefined;
    const maxH = maxHeight ? parseFloat(maxHeight) : undefined;
    const minW = minWeight ? parseFloat(minWeight) : undefined;
    const maxW = maxWeight ? parseFloat(maxWeight) : undefined;

    let list = rows.filter(p => {
      if (qName && !p.name.toLowerCase().includes(qName.toLowerCase())) return false;
      if (qNat && !(p.nationality || '').toLowerCase().includes(qNat.toLowerCase())) return false;
      if (qTeam && !(p.team || '').toLowerCase().includes(qTeam.toLowerCase())) return false;

      if (genderFilter) {
        const g = (p.gender || '').toLowerCase();
        if (g !== genderFilter) return false;
      }

      if (minA !== undefined && (p.age ?? -Infinity) < minA) return false;
      if (maxA !== undefined && (p.age ?? Infinity) > maxA) return false;

      if (minP !== undefined && (p.potential ?? -Infinity) < minP) return false;
      if (maxP !== undefined && (p.potential ?? Infinity) > maxP) return false;

      if (minH !== undefined && (p.height ?? -Infinity) < minH) return false;
      if (maxH !== undefined && (p.height ?? Infinity) > maxH) return false;

      if (minW !== undefined && (p.weight ?? -Infinity) < minW) return false;
      if (maxW !== undefined && (p.weight ?? Infinity) > maxW) return false;

      if (selectedRoles.length > 0 && !selectedRoles.some(r => p.rolesShort.includes(r))) return false;
      return true;
    });

    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'gender': {
          const ag = (a.gender || '').toLowerCase();
          const bg = (b.gender || '').toLowerCase();
          return ag.localeCompare(bg) * dir;
        }
        case 'nationality': return (a.nationality || '').localeCompare(b.nationality || '') * dir;
        case 'team': return (a.team || '').localeCompare(b.team || '') * dir;
        case 'age': return ((a.age ?? 0) - (b.age ?? 0)) * dir;
        case 'potential': return ((a.potential ?? 0) - (b.potential ?? 0)) * dir;
        case 'roles': {
          const ar = a.rolesShort[0] ?? '';
          const br = b.rolesShort[0] ?? '';
          return ar.localeCompare(br) * dir;
        }
      }
    });

    return list;
  }, [
    rows,
    qName,
    qNat,
    qTeam,
    minAge,
    maxAge,
    minPot,
    maxPot,
    minHeight,
    maxHeight,
    minWeight,
    maxWeight,
    selectedRoles,
    genderFilter,
    sortKey,
    sortDir,
  ]);

  const clearFilters = () => {
    setQName('');
    setGenderFilter('');
    setQNat('');
    setQTeam('');
    setMinAge('');
    setMaxAge('');
    setMinPot('');
    setMaxPot('');
    setMinHeight('');
    setMaxHeight('');
    setMinWeight('');
    setMaxWeight('');
    setSelectedRoles([]);
  };

  const [scoutOpen, setScoutOpen] = useState(false);
  const [scoutPlayer, setScoutPlayer] = useState<PlayerData | null>(null);
  const [scoutReport, setScoutReport] = useState<ScoutingReportResponse | null>(null);

  // show "…" while report is being processed for that player id
  const [processingReports, setProcessingReports] = useState<Set<string>>(new Set());

  // one-shot trigger that kicks off the first request AFTER the UI renders
  const [queuedReportPlayer, setQueuedReportPlayer] = useState<PlayerRow | null>(null);

  // --- Polling effect (your existing logic) ---
  useEffect(() => {
    if (processingReports.size === 0) return;

    let cancelled = false;

    const interval = setInterval(async () => {
      if (cancelled) return;

      for (const playerId of Array.from(processingReports)) {
        try {
          const row = rows.find(r => r.id === playerId);
          if (!row) continue;

          const payload = {
            name: row.name,
            gender: row.gender,
            nationality: row.nationality,
            team: row.team,
            age: row.age,
            height: row.height,
            weight: row.weight,
          };

          const res = await getScoutingReport(playerId, payload);

          if (res.status === 'ready' && res.content) {
            if (cancelled) return;

            setScoutPlayer(toPlayerData(row));
            setScoutReport(res);
            setScoutOpen(true);

            setProcessingReports(prev => {
              const next = new Set(prev);
              next.delete(playerId);
              return next;
            });
          }

          if (res.status === 'error' || res.status === 'failed') {
            setProcessingReports(prev => {
              const next = new Set(prev);
              next.delete(playerId);
              return next;
            });
          }
        } catch {
          // keep polling (temporary network errors)
        }
      }
    }, 20000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [processingReports, rows]);

  // --- Initial request effect (single call, after UI shows “…”) ---
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
        };

        const res = await getScoutingReport(p.id, payload);
        if (cancelled) return;

        if (res.status === 'ready' && res.content) {
          setScoutPlayer(toPlayerData(p));
          setScoutReport(res);
          setScoutOpen(true);

          setProcessingReports(prev => {
            const next = new Set(prev);
            next.delete(p.id);
            return next;
          });
          return;
        }

        if (res.status === 'processing') {
          // keep processingReports; polling will continue
          return;
        }

        // error/failed/unknown -> clear processing and inform
        setProcessingReports(prev => {
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

        setProcessingReports(prev => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });

        Alert.alert(t('reportError', 'Report error'), String(e?.message || e));
      } finally {
        if (!cancelled) setQueuedReportPlayer(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queuedReportPlayer, t]);

  const handleReportPress = async (player: PlayerRow) => {

    // prevent duplicate taps/queues
    if (processingReports.has(player.id) || queuedReportPlayer?.id === player.id) return;

    // PRO: open immediately
    if (plan === 'Pro') {
      setProcessingReports(prev => {
        const next = new Set(prev);
        next.add(player.id);
        return next;
      });
      setQueuedReportPlayer(player);
      return;
    }
    // FREE: must watch rewarded
    try {
      // Wait a short time for the ad to be ready
      const ready = await ensureRewardedLoaded(5000);
      if (!ready) return; // ✅ silent no-op in production

      const { shown, rewarded } = await showRewardedSafely();

      // Only proceed if user actually earned the reward
      if (!shown || !rewarded) return;

      setProcessingReports(prev => {
        const next = new Set(prev);
        next.add(player.id);
        return next;
      });
      setQueuedReportPlayer(player);
    } catch {
      // ✅ silent fail in production (or log in dev)
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFavoritePlayer(id);
      setRows(s => s.filter(x => x.id !== id));
    } catch (e: any) {
      Alert.alert(t('deleteFailed', 'Delete failed'), String(e?.message || e));
    }
  };

  // ---- Unified table row renderer: first row is header; rest are data rows
  const renderUnifiedRow = (item: PlayerRow | 'HEADER') => {
    const isHeader = item === 'HEADER';
    const pressedStyle = { opacity: 0.9 };
    const chevron = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

    const RowInner = (
      <View style={[styles.row, { minHeight: ROW_HEIGHT }]}>
        {/* Report (left-most) */}
        {isHeader ? (
          <View style={[styles.cell, { flex: COL.rep, alignItems: 'center' }]} />
        ) : (
          <View style={[styles.cell, { flex: COL.rep }, styles.iconCellLeft]}>
            <Pressable
              onPress={(e) => {
                e?.stopPropagation?.();
                handleReportPress(item as PlayerRow);
              }}
              onPressIn={(e) => { e?.stopPropagation?.(); }}
              disabled={processingReports.has((item as PlayerRow).id)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityLabel={
                processingReports.has((item as PlayerRow).id)
                  ? t('reportGenerating', 'Report generating')
                  : t('openScoutingReport', 'Open scouting report')
              }
              style={({ pressed }) => [
                pressed && !processingReports.has((item as PlayerRow).id) && { opacity: 0.85 },
              ]}
            >
              {() => {
                const rowId = (item as PlayerRow).id;
                const isProcessing = processingReports.has(rowId);

                if (isProcessing) {
                  return (
                    <Text style={{ color: MUTED, fontSize: 16, fontWeight: '900' }}>
                      …
                    </Text>
                  );
                }

                return <FileText size={20} color={ACCENT} strokeWidth={2.2} />;
              }}
            </Pressable>
          </View>
        )}

        <View style={styles.vsep} />

        {/* Name */}
        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('name')}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.name },
              pressed && pressedStyle,
              sortKey === 'name' && { backgroundColor: CARD },
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblName', 'Name')}{chevron('name')}
            </Text>
          </Pressable>
        ) : (
          <Text
            numberOfLines={1}
            style={[styles.td, styles.cell, { flex: COL.name, textAlign: 'center' }]}
          >
            {firstWord((item as PlayerRow).name)}
          </Text>
        )}

        <View style={styles.vsep} />

        {/* Gender */}
        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('gender')}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.gen },
              pressed && pressedStyle,
              sortKey === 'gender' && { backgroundColor: CARD },
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblGender', 'Gen.')}{chevron('gender')}
            </Text>
          </Pressable>
        ) : (
          <Text
            numberOfLines={1}
            style={[styles.td, styles.cell, { flex: COL.gen, textAlign: 'center' }]}
          >
            {(() => {
              const g = (item as PlayerRow).gender?.toLowerCase();
              if (g === 'male') return t('genderMaleShort', 'M');
              if (g === 'female') return t('genderFemaleShort', 'F');
              return '—';
            })()}
          </Text>
        )}

        <View style={styles.vsep} />

        {/* Nat */}
        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('nationality')}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.nat },
              pressed && pressedStyle,
              sortKey === 'nationality' && { backgroundColor: CARD },
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblNat', 'Nat.')}{chevron('nationality')}
            </Text>
          </Pressable>
        ) : (
          <Text
            numberOfLines={1}
            style={[styles.td, styles.cell, { flex: COL.nat, textAlign: 'center' }]}
          >
            {countryToCode2((item as PlayerRow).nationality)}
          </Text>
        )}

        <View style={styles.vsep} />

        {/* Team */}
        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('team')}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.team },
              pressed && pressedStyle,
              sortKey === 'team' && { backgroundColor: CARD },
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblTeam', 'Team')}{chevron('team')}
            </Text>
          </Pressable>
        ) : (
          <Text
            numberOfLines={1}
            style={[styles.td, styles.cell, { flex: COL.team, textAlign: 'center' }]}
          >
            {(item as PlayerRow).team || '' || '—'}
          </Text>
        )}

        <View style={styles.vsep} />

        {/* Age */}
        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('age')}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.age },
              pressed && pressedStyle,
              sortKey === 'age' && { backgroundColor: CARD },
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblAge', 'Age')}{chevron('age')}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.td, styles.cell, { flex: COL.age, textAlign: 'center' }]}>
            {(item as PlayerRow).age ?? '—'}
          </Text>
        )}

        <View style={styles.vsep} />

        {/* Roles */}
        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('roles')}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.roles },
              pressed && pressedStyle,
              sortKey === 'roles' && { backgroundColor: CARD },
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblRoles', 'Role')}{chevron('roles')}
            </Text>
          </Pressable>
        ) : (
          <Text
            numberOfLines={1}
            style={[styles.td, styles.cell, { flex: COL.roles, textAlign: 'center' }]}
          >
            {(() => {
              const roles = (item as PlayerRow).rolesShort || [];
              return roles[0] ?? '—';
            })()}
          </Text>
        )}

        <View style={styles.vsep} />

        {/* Potential */}
        {isHeader ? (
          <Pressable
            onPress={() => cycleSort('potential')}
            style={({ pressed }) => [
              styles.cell,
              { flex: COL.pot },
              pressed && pressedStyle,
              sortKey === 'potential' && { backgroundColor: CARD },
            ]}
          >
            <Text style={[styles.thText, { textAlign: 'center' }]}>
              {t('tblPot', 'Pot.')}{chevron('potential')}
            </Text>
          </Pressable>
        ) : (
          <Text style={[styles.td, styles.cell, { flex: COL.pot, textAlign: 'center' }]}>
            {(item as PlayerRow).potential ?? '—'}
          </Text>
        )}

        <View style={styles.vsep} />

        {/* Delete */}
        {isHeader ? (
          <View style={[styles.cell, { flex: COL.del }]} />
        ) : (
          <View style={[styles.cell, { flex: COL.del }, styles.iconCellRight]}>
            <Pressable
              onPress={() => handleDelete((item as PlayerRow).id)}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              accessibilityLabel={t('removeFromFavorites', 'Remove from favorites')}
            >
              {({ pressed }) => (
                <UserX size={20} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
              )}
            </Pressable>
          </View>
        )}
      </View>
    );

    return (
      <View key={isHeader ? 'header' : (item as PlayerRow).id}>
        {isHeader ? (
          RowInner
        ) : (
          <Pressable onPress={() => setPreviewPlayer(toPlayerData(item as PlayerRow))}>
            {RowInner}
          </Pressable>
        )}
        <View style={styles.hsepThick} />
      </View>
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>{t('squadPortfolio', 'Squad Portfolio')}</Text>

      {/* Filters */}
      <View style={{ height: 8 }} />
      <View style={styles.filters}>
        {/* Row 1: Name / Gender */}
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltName', 'Name')}</Text>
          <TextInput
            value={qName}
            onChangeText={setQName}
            placeholder={t('phSearchName', 'Search name')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltGender', 'Gender')}</Text>
          <Pressable
            onPress={cycleGender}
            style={({ pressed }) => [
              styles.input,
              { justifyContent: 'center' },
              pressed && { opacity: 0.9 },
            ]}
            accessibilityLabel={t('fltGender', 'Gender')}
          >
            <Text style={{ color: genderFilter ? TEXT : MUTED, fontSize: 14 }}>
              {renderGenderFilterLabel()}
            </Text>
          </Pressable>
        </View>

        {/* Row 2: Nationality / Team */}
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltNationality', 'Nationality')}</Text>
          <TextInput
            value={qNat}
            onChangeText={setQNat}
            placeholder={t('phSearchNationality', 'Search nationality')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltTeam', 'Team')}</Text>
          <TextInput
            value={qTeam}
            onChangeText={setQTeam}
            placeholder={t('phSearchTeam', 'Search team')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        {/* Row 3: Age / Potential */}
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltAge', 'Age (min / max)')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={minAge}
              onChangeText={(t_) => setMinAge(t_.replace(/[^\d]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMin', 'min')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={maxAge}
              onChangeText={(t_) => setMaxAge(t_.replace(/[^\d]/g, ''))}
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
              keyboardType="numeric"
              placeholder={t('phMin', 'min')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={maxPot}
              onChangeText={(t_) => setMaxPot(t_.replace(/[^\d]/g, '').slice(0, 3))}
              keyboardType="numeric"
              placeholder={t('phMax', 'max')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>

        {/* Row 4: Height / Weight */}
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltHeight', 'Height (min / max)')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={minHeight}
              onChangeText={(t_) => setMinHeight(t_.replace(/[^\d.]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMin', 'min')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={maxHeight}
              onChangeText={(t_) => setMaxHeight(t_.replace(/[^\d.]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMax', 'max')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltWeight', 'Weight (min / max)')}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={minWeight}
              onChangeText={(t_) => setMinWeight(t_.replace(/[^\d.]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMin', 'min')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TextInput
              value={maxWeight}
              onChangeText={(t_) => setMaxWeight(t_.replace(/[^\d.]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMax', 'max')}
              placeholderTextColor={MUTED}
              style={[styles.input, { flex: 1 }]}
            />
          </View>
        </View>
      </View>

      {/* Role chips */}
      <View style={styles.rolesWrap}>
        {ALL_ROLE_SHORTS.map((r) => {
          const active = selectedRoles.includes(r);
          return (
            <Pressable
              key={r}
              onPress={() => toggleRole(r)}
              style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              accessibilityLabel={`${t('role', 'Role')} ${r}`}
            >
              <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>{r}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Clear filters */}
      <View style={{ alignItems: 'center' }}>
        <Pressable
          onPress={clearFilters}
          style={({ pressed }) => [{ paddingVertical: 8, paddingHorizontal: 12, opacity: pressed ? 0.8 : 1 }]}
          accessibilityLabel={t('clearFilters', 'Clear filters')}
        >
          <Text style={{ color: DANGER_DARK }}>{t('clearFilters', 'Clear filters')}</Text>
        </Pressable>
      </View>

      {/* Unified table */}
      <View style={styles.table}>
        <View style={styles.tableTopBorder} />

        {loading ? (
          <View style={{ paddingVertical: 16 }}>
            <Text style={{ color: MUTED }}>{t('loadingFavorites', 'Loading favorites…')}</Text>
          </View>
        ) : (
          <View style={styles.tableScrollWrap}>
            <ScrollView
              style={{ maxHeight: ROW_HEIGHT * 5 + 2 }}
              contentContainerStyle={{ paddingRight: 5 }} // keeps content away from the bar
              scrollIndicatorInsets={
                Platform.OS === 'ios' ? { right: -5 } : undefined
              }
              nestedScrollEnabled
              bounces={false}
              showsVerticalScrollIndicator
            >
              {renderUnifiedRow('HEADER')}
              {filtered.map((item) => renderUnifiedRow(item))}
            </ScrollView>

          </View>
        )}
        <View style={styles.tableBottomBorder} />
      </View>

      {/* Player modal */}
      {previewPlayer && (
        <Modal transparent visible animationType="fade" onRequestClose={() => setPreviewPlayer(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardWrap}>
              <PlayerCard player={previewPlayer} titleAlign="center" />
              <Pressable
                onPress={() => setPreviewPlayer(null)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                style={({ pressed }) => [styles.closeInsideCard, { opacity: pressed ? 0.9 : 1 }]}
                accessibilityLabel={t('closePlayerCard', 'Close player card')}
              >
                {({ pressed }) => (<X size={22} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />)}
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {scoutOpen && scoutPlayer && scoutReport && (
        <ScoutingReport
          visible={scoutOpen}
          onClose={() => {
            setScoutOpen(false);
            setScoutPlayer(null);
            setScoutReport(null);
          }}
          player={scoutPlayer}
          report={scoutReport}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tableScrollWrap: {
    paddingRight: 1,  // <-- increase this to push the indicator more to the right
  },
  tableScroll: {
    marginRight: -1,  // <-- must match paddingRight above
  },
  iconCellLeft: { alignItems: 'flex-start', paddingLeft: 0 },
  iconCellRight: { alignItems: 'flex-end', paddingRight: 0 },
  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },
  sectionTitle: { color: ACCENT, fontSize: 16, fontWeight: '700', marginBottom: 10 },

  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  filterCol: { flexBasis: '48%', flexGrow: 1, gap: 6 },
  filterLabel: { color: MUTED, fontSize: 12 },
  input: {
    color: TEXT, backgroundColor: CARD, borderColor: LINE, borderWidth: 1.5,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
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

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  hsepThick: { height: 2, backgroundColor: LINE },

  cell: { paddingVertical: 10, justifyContent: 'center' },
  thText: { color: TEXT, fontWeight: '700' },
  td: { color: TEXT, flex: 1 },

  vsep: { width: 1, alignSelf: 'stretch', backgroundColor: LINE, opacity: 0.9 },

  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16,
  },
  modalCardWrap: { width: '100%', maxWidth: 560, borderRadius: 16, overflow: 'visible', padding: 2, position: 'relative' },
  closeInsideCard: { position: 'absolute', top: 6, right: 6, zIndex: 10, padding: 6 },
});
