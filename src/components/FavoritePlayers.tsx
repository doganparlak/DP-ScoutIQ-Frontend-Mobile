import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { X, UserX } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE, DANGER, DANGER_DARK } from '../theme';
import type { PlayerData } from '../types';
import {
  deleteFavoritePlayer,
  getFavoritePlayers,
  ROLE_LONG_TO_SHORT,
  type FavoritePlayer,
} from '../services/api';
import { countryToCode2 } from '../constants/countries';
import PlayerCard from '../components/PlayerCard';

type PlayerRow = {
  id: string;
  name: string;
  nationality?: string;
  age?: number;
  rolesShort: string[];
  potential?: number;
};

const ALL_ROLE_SHORTS = [
  'GK','LB','RB','LCB','RCB','CB','LWB','RWB','LM','RM','LCM','RCM','CDM','CM','CAM','LW','RW','LCF','RCF','CF'
] as const;

const ROW_HEIGHT = 48;
const COL = { name: 1.0, nat: 0.8, age: 0.7, roles: 1.2, pot: 0.8, del: 0.6 } as const;

type SortKey = 'name' | 'nationality' | 'age' | 'roles' | 'potential';
type SortDir = 'asc' | 'desc';

// 'Lionel Andres Messi Cuccittini' -> 'Lionel'
function firstWord(full: string): string {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? '';
}

export default function FavoritePlayers() {
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
    meta: { nationality: p.nationality, age: p.age, roles: p.rolesShort, potential: p.potential },
    stats: [],
  });

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  useFocusEffect(React.useCallback(() => { fetchFavorites(); }, [fetchFavorites]));

  // ----- filters -----
  const [qName, setQName] = useState('');
  const [qNat, setQNat] = useState('');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [minPot, setMinPot] = useState<string>('');
  const [maxPot, setMaxPot] = useState<string>('');

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

    let list = rows.filter(p => {
      if (qName && !p.name.toLowerCase().includes(qName.toLowerCase())) return false;
      if (qNat && !(p.nationality || '').toLowerCase().includes(qNat.toLowerCase())) return false;
      if (minA !== undefined && (p.age ?? -Infinity) < minA) return false;
      if (maxA !== undefined && (p.age ?? Infinity) > maxA) return false;
      if (minP !== undefined && (p.potential ?? -Infinity) < minP) return false;
      if (maxP !== undefined && (p.potential ?? Infinity) > maxP) return false;
      if (selectedRoles.length > 0 && !selectedRoles.some(r => p.rolesShort.includes(r))) return false;
      return true;
    });

    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'nationality': return (a.nationality || '').localeCompare(b.nationality || '') * dir;
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
  }, [rows, qName, qNat, minAge, maxAge, minPot, maxPot, selectedRoles, sortKey, sortDir]);

  const clearFilters = () => {
    setQName(''); setQNat(''); setMinAge(''); setMaxAge(''); setMinPot(''); setMaxPot(''); setSelectedRoles([]);
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
        {/* Name */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('name')}
            style={({ pressed }) => [styles.cell, { flex: COL.name }, pressed && pressedStyle, sortKey === 'name' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblName', 'Name')}{chevron('name')}</Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.name, textAlign: 'center' }]}>
            {firstWord((item as PlayerRow).name)}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Nat */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('nationality')}
            style={({ pressed }) => [styles.cell, { flex: COL.nat }, pressed && pressedStyle, sortKey === 'nationality' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblNat', 'Nat.')}{chevron('nationality')}</Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.nat, textAlign: 'center' }]}>
            {countryToCode2((item as PlayerRow).nationality)}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Age */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('age')}
            style={({ pressed }) => [styles.cell, { flex: COL.age }, pressed && pressedStyle, sortKey === 'age' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblAge', 'Age')}{chevron('age')}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.td, styles.cell, { flex: COL.age, textAlign: 'center' }]}>
            {(item as PlayerRow).age ?? '—'}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Roles */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('roles')}
            style={({ pressed }) => [styles.cell, { flex: COL.roles }, pressed && pressedStyle, sortKey === 'roles' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblRoles', 'Roles')}{chevron('roles')}</Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.roles, textAlign: 'center' }]}>
            {(item as PlayerRow).rolesShort.join(', ')}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Potential */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('potential')}
            style={({ pressed }) => [styles.cell, { flex: COL.pot }, pressed && pressedStyle, sortKey === 'potential' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>{t('tblPot', 'Pot.')}{chevron('potential')}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.td, styles.cell, { flex: COL.pot, textAlign: 'center' }]}>
            {(item as PlayerRow).potential ?? '—'}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Delete (no header label) */}
        {isHeader ? (
          <View style={[styles.cell, { flex: COL.del }]} />
        ) : (
          <View style={[styles.cell, { flex: COL.del, alignItems: 'center' }]}>
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
          <ScrollView
            style={{ maxHeight: ROW_HEIGHT * 3 + 2 }}
            nestedScrollEnabled
            bounces={false}
            showsVerticalScrollIndicator
          >
            {renderUnifiedRow('HEADER')}
            {filtered.map((item) => renderUnifiedRow(item))}
          </ScrollView>
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
    </View>
  );
}

const styles = StyleSheet.create({
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

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
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
