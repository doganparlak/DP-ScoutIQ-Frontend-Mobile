// src/screens/MyProfileScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Linking,
  Modal,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { X, UserX } from 'lucide-react-native';
import PlayerCard from '@/components/PlayerCard';

import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE, DANGER, DANGER_DARK } from '@/theme';
import { RootStackParamList, MainTabsParamList, type PlayerData } from '@/types';
import {
  deleteFavoritePlayer,
  getFavoritePlayers,
  ROLE_LONG_TO_SHORT,
  getMe,
  logout,
  type FavoritePlayer,
  type Profile,
} from '@/services/api';
import { countryToCode2 } from '@/constants/countries';

type ProfileTabNav = BottomTabNavigationProp<MainTabsParamList, 'Profile'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

type PlayerRow = {
  id: string;
  name: string;                // full name
  nationality?: string;        // full country name
  age?: number;
  rolesShort: string[];        // SHORT for display/filter
  potential?: number;
};

const ALL_ROLE_SHORTS = [
  'GK', 'LB', 'LCB', 'CB', 'RCB', 'RB',
  'LWB', 'LCM', 'CDM', 'CM', 'RCM', 'RWB',
  'LW', 'LCF', 'CF', 'RCF', 'RW',
] as const;

const ROW_HEIGHT = 48;

// keep identical flexes for header & rows to align separators
const COL = { name: 1.0, nat: 0.8, age: 0.7, roles: 1.2, pot: 0.8, del: 0.6 } as const;

type SortKey = 'name' | 'nationality' | 'age' | 'roles' | 'potential';
type SortDir = 'asc' | 'desc';

// 'Lionel Andres Messi Cuccittini' -> 'Lionel'
function firstWord(full: string): string {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? '';
}

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  const rootNav = useNavigation<RootNav>();

  // ----- account (placeholder; wire to /me if you want here) -----
  const [email] = useState('you@club.com');
  const [plan] = useState<'Free' | 'Pro' | 'Elite'>('Pro');

  // ----- favorites state -----
  const [rows, setRows] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = React.useCallback(async () => {
    try {
      setLoading(true);
      const favs = await getFavoritePlayers(); // LONG roles from backend
      const mapped: PlayerRow[] = favs.map((f: FavoritePlayer) => ({
        id: f.id,
        name: f.name,
        nationality: f.nationality || '',
        age: typeof f.age === 'number' ? f.age : undefined,
        potential: typeof f.potential === 'number' ? f.potential : undefined,
        rolesShort: (f.roles || []).map(long => ROLE_LONG_TO_SHORT[long] ?? long), // convert to SHORT
      }));
      setRows(mapped);
    } catch (e: any) {
      Alert.alert('Favorites error', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- PlayerCard preview overlay state ----------
  const [previewPlayer, setPreviewPlayer] = React.useState<PlayerData | null>(null);

  const toPlayerData = (p: PlayerRow): PlayerData => ({
    name: p.name,
    meta: {
      nationality: p.nationality,
      age: p.age,
      roles: p.rolesShort,
      potential: p.potential,
    },
    stats: [], // required by PlayerData; populate if/when you have stats
  });

  // initial fetch
  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  // refetch whenever Profile tab gains focus
  useFocusEffect(React.useCallback(() => {
    fetchFavorites();
  }, [fetchFavorites]));

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
    setQName('');
    setQNat('');
    setMinAge('');
    setMaxAge('');
    setMinPot('');
    setMaxPot('');
    setSelectedRoles([]);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteFavoritePlayer(id);
      setRows(s => s.filter(x => x.id !== id));
    } catch (e: any) {
      Alert.alert('Delete failed', String(e?.message || e));
    }
  };

  // ---- Unified table row renderer: first row is header; rest are data rows
  const renderUnifiedRow = (item: PlayerRow | 'HEADER', index: number) => {
    const isHeader = item === 'HEADER';
    const pressedStyle = { opacity: 0.9 };

    const RowInner = (
      <View style={[styles.row, { minHeight: ROW_HEIGHT }]}>
        {/* Name */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('name')} style={({ pressed }) => [styles.cell, { flex: COL.name }, pressed && pressedStyle, sortKey === 'name' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>Name {sortKey === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.name, textAlign: 'center' }]}>
            {firstWord((item as PlayerRow).name)}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Nat */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('nationality')} style={({ pressed }) => [styles.cell, { flex: COL.nat }, pressed && pressedStyle, sortKey === 'nationality' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>Nat. {sortKey === 'nationality' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.nat, textAlign: 'center' }]}>
            {countryToCode2((item as PlayerRow).nationality)}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Age */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('age')} style={({ pressed }) => [styles.cell, { flex: COL.age }, pressed && pressedStyle, sortKey === 'age' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>Age {sortKey === 'age' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
          </Pressable>
        ) : (
          <Text style={[styles.td, styles.cell, { flex: COL.age, textAlign: 'center' }]}>
            {(item as PlayerRow).age ?? '—'}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Roles */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('roles')} style={({ pressed }) => [styles.cell, { flex: COL.roles }, pressed && pressedStyle, sortKey === 'roles' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>Roles {sortKey === 'roles' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={[styles.td, styles.cell, { flex: COL.roles, textAlign: 'center' }]}>
            {(item as PlayerRow).rolesShort.join(', ')}
          </Text>
        )}
        <View style={styles.vsep} />

        {/* Potential */}
        {isHeader ? (
          <Pressable onPress={() => cycleSort('potential')} style={({ pressed }) => [styles.cell, { flex: COL.pot }, pressed && pressedStyle, sortKey === 'potential' && { backgroundColor: CARD }]}>
            <Text style={[styles.thText, { textAlign: 'center' }]}>Pot. {sortKey === 'potential' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</Text>
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
        {/* unified, thicker horizontal row divider (between every row, including after header) */}
        <View style={styles.hsepThick} />
      </View>
    );
  };

  const openPlans = () => Linking.openURL('https://example.com/plans'); // TODO: replace
  const openHelp  = () => rootNav.navigate('HelpCenter');

  const handleLogout = async () => {
    try { await logout(); } catch {}
    rootNav.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.safe, { paddingTop: 0 }]}>
      <ScrollView contentContainerStyle={{ paddingTop: -10, paddingBottom: 50 }}>
        {/* Account card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>

          <View style={styles.kv}>
            <Text style={styles.k}>Email</Text>
            <Text style={styles.v}>{email}</Text>
          </View>

          <View style={styles.kv}>
            <Text style={styles.k}>Current plan</Text>
            <Text style={styles.v}>{plan}</Text>
          </View>

          <View style={styles.btnRow}>
            <Pressable
              onPress={openPlans}
              style={({ pressed }) => [styles.primaryBtn, { backgroundColor: pressed ? ACCENT_DARK : ACCENT }]}
            >
              <Text style={styles.primaryBtnText}> Subscription plans</Text>
            </Pressable>

            <Pressable
              onPress={openHelp}
              style={({ pressed }) => [styles.outlineBtn, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={styles.outlineBtnText}>Help center</Text>
            </Pressable>
          </View>

          {/* Subtle logout link */}
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            style={({ pressed }) => [styles.logoutLinkWrap, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.logoutText}>Log out</Text>
          </Pressable>
        </View>

        {/* Favorite players */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Favorite players</Text>

          {/* Filters */}
          <View style={{ height: 8 }} />

          <View style={styles.filters}>
            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>Name</Text>
              <TextInput
                value={qName}
                onChangeText={setQName}
                placeholder="Search name"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>Nationality</Text>
              <TextInput
                value={qNat}
                onChangeText={setQNat}
                placeholder="Search nationality"
                placeholderTextColor={MUTED}
                style={styles.input}
              />
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>Age (min / max)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={minAge}
                  onChangeText={(t) => setMinAge(t.replace(/[^\d]/g, ''))}
                  keyboardType="numeric"
                  placeholder="min"
                  placeholderTextColor={MUTED}
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={maxAge}
                  onChangeText={(t) => setMaxAge(t.replace(/[^\d]/g, ''))}
                  keyboardType="numeric"
                  placeholder="max"
                  placeholderTextColor={MUTED}
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
            </View>

            <View style={styles.filterCol}>
              <Text style={styles.filterLabel}>Potential (min / max)</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  value={minPot}
                  onChangeText={(t) => setMinPot(t.replace(/[^\d]/g, '').slice(0, 3))}
                  keyboardType="numeric"
                  placeholder="min"
                  placeholderTextColor={MUTED}
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  value={maxPot}
                  onChangeText={(t) => setMaxPot(t.replace(/[^\d]/g, '').slice(0, 3))}
                  keyboardType="numeric"
                  placeholder="max"
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
                >
                  <Text style={active ? styles.chipTextActive : styles.chipTextInactive}>{r}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Clear filters (centered) */}
          <View style={{ alignItems: 'center' }}>
            <Pressable
              onPress={clearFilters}
              style={({ pressed }) => [{ paddingVertical: 8, paddingHorizontal: 12, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={{ color: MUTED }}>Clear filters</Text>
            </Pressable>
          </View>

          {/* Unified single table (header row + player rows) */}
          <View style={styles.table}>
            {/* Outer top border */}
            <View style={styles.tableTopBorder} />

            {loading ? (
              <View style={{ paddingVertical: 16 }}>
                <Text style={{ color: MUTED }}>Loading favorites…</Text>
              </View>
            ) : (
              <ScrollView
                style={{ maxHeight: ROW_HEIGHT * 3 + 2 }}
                nestedScrollEnabled
                bounces={false}
                showsVerticalScrollIndicator
              >
                {/* First row: headers */}
                {renderUnifiedRow('HEADER', 0)}
                {/* Rest: player rows */}
                {filtered.map((item, idx) => renderUnifiedRow(item, idx + 1))}
              </ScrollView>
            )}

            {/* Outer bottom border */}
            <View style={styles.tableBottomBorder} />
          </View>
        </View>
      </ScrollView>

      {/* PlayerCard overlay modal with close button positioned inside top-right of the card */}
      {previewPlayer && (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => setPreviewPlayer(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCardWrap}>
              <PlayerCard player={previewPlayer} />

              {/* absolutely-positioned close, anchored to this wrapper (not modifying PlayerCard) */}
              <Pressable
                onPress={() => setPreviewPlayer(null)}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                style={({ pressed }) => [
                  styles.closeInsideCard,
                  { opacity: pressed ? 0.9 : 1 },
                ]}
                accessibilityLabel="Close player card"
              >
                {({ pressed }) => (
                  <X size={22} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.2} />
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  card: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
  },

  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 10 },

  kv: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  k: { color: MUTED },
  v: { color: TEXT, fontWeight: '600' },

  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryBtn: { flex: 1, borderRadius: 12, alignItems: 'center', paddingVertical: 12 },
  primaryBtnText: { color: TEXT, fontWeight: '700', fontSize: 15 },
  outlineBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  outlineBtnText: { color: TEXT, fontWeight: '700', fontSize: 15 },

  // Subtle logout link
  logoutLinkWrap: {
    alignSelf: 'center',
    marginTop: 10,
    paddingBottom: 2,
    borderBottomWidth: 2,
    borderBottomColor: ACCENT,
  },
  logoutText: { color: TEXT, fontWeight: '800', fontSize: 15, textAlign: 'center' },

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

  // ---- Unified table styles
  table: { marginTop: 10 },
  tableTopBorder: { height: 1, backgroundColor: LINE },
  tableBottomBorder: { height: 1, backgroundColor: LINE },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    // cell padding is in .cell to keep header/body identical
  },

  // thicker, unified horizontal dividers between EVERY row
  hsepThick: {
    height: 2,
    backgroundColor: LINE,
  },

  // cells (shared by header & body so verticals align)
  cell: { paddingVertical: 10, justifyContent: 'center' },
  thText: { color: TEXT, fontWeight: '700' },
  td: { color: TEXT, flex: 1 },

  // vertical separators (shared across header and rows)
  vsep: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: LINE,
    opacity: 0.9,
  },

  // legacy named widths (kept for reference; flexes are enforced inline)
  name: { flex: 1.6 },
  nat: { flex: 0.8 },
  age: { flex: 0.6, textAlign: 'right' as const },
  roles: { flex: 1.2 },
  pot: { flex: 0.8, textAlign: 'right' as const },

  // Modal overlay
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
    borderRadius: 16,
    overflow: 'visible',   // allow the close button to render within bounds
    padding: 2,
    position: 'relative',  // anchor for the absolute close button
  },
  closeInsideCard: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 10,
    padding: 6,
  },
});
