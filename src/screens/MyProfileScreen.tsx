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
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { BG, TEXT, ACCENT, ACCENT_DARK, PANEL, CARD, MUTED, LINE } from '@/theme';
import { RootStackParamList, MainTabsParamList } from '@/types';
import { getMe, logout, type FavoritePlayer, type Profile } from '@/services/api';

type ProfileTabNav = BottomTabNavigationProp<MainTabsParamList, 'Profile'>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

type Player = {
  id: string;
  name: string;
  nationality: string;
  age: number;
  roles: string[];
  potential: number; // 0–100
};

const SAMPLE_PLAYERS: Player[] = [
  { id: '1', name: 'J. Alvarez', nationality: 'Argentina', age: 24, roles: ['ST', 'RW'], potential: 90 },
  { id: '2', name: 'A. Yıldız', nationality: 'Türkiye', age: 21, roles: ['AM', 'LW'], potential: 86 },
  { id: '3', name: 'M. Diop', nationality: 'Senegal', age: 19, roles: ['DM', 'CB'], potential: 88 },
  { id: '4', name: 'T. Ito', nationality: 'Japan', age: 22, roles: ['RW'], potential: 84 },
  { id: '5', name: 'L. Costa', nationality: 'Portugal', age: 26, roles: ['CM'], potential: 82 },
];

const ALL_ROLES = ['GK','CB','LB','RB','DM','CM','AM','LW','RW','ST'];
const ROW_HEIGHT = 48; // for max-3-rows viewport

type SortKey = 'name' | 'nationality' | 'age' | 'roles' | 'potential';
type SortDir = 'asc' | 'desc';

export default function MyProfileScreen() {
  const insets = useSafeAreaInsets();
  // const tabNav  = useNavigation<ProfileTabNav>();
  const rootNav = useNavigation<RootNav>();

  const resetToWelcome = () => {
   rootNav.reset({
     index: 0,
     routes: [{ name: 'Welcome' }],
   });
 };

  // ----- account (replace with real data from storage/services) -----
  const [email] = useState('you@club.com');
  const [plan] = useState<'Free' | 'Pro' | 'Elite'>('Pro');

  // ----- favorites state -----
  const [players] = useState<Player[]>(SAMPLE_PLAYERS);

  // per-column filters
  const [qName, setQName] = useState('');
  const [qNat, setQNat] = useState('');
  const [minAge, setMinAge] = useState<string>('');
  const [maxAge, setMaxAge] = useState<string>('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [minPot, setMinPot] = useState<string>('');
  const [maxPot, setMaxPot] = useState<string>(''); // NEW: potential max

  // sorting
  const [sortKey, setSortKey] = useState<SortKey>('potential');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const toggleRole = (r: string) => {
    setSelectedRoles((prev) => (prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]));
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

    const ageMaxOk = maxA !== undefined && (minA === undefined || maxA >= minA) ? maxA : undefined;
    const potMaxOk = maxP !== undefined && (minP === undefined || maxP >= minP) ? maxP : undefined;

    let list = players.filter(p => {
      if (qName && !p.name.toLowerCase().includes(qName.toLowerCase())) return false;
      if (qNat && !p.nationality.toLowerCase().includes(qNat.toLowerCase())) return false;
      if (minA !== undefined && p.age < minA) return false;
      if (maxA !== undefined && p.age > maxA) return false;
      if (ageMaxOk !== undefined && p.age > ageMaxOk) return false;
      if (minP !== undefined && p.potential < minP) return false;
      if (maxP !== undefined && p.potential > maxP) return false;
      if (potMaxOk !== undefined && p.potential > potMaxOk) return false;
      if (selectedRoles.length > 0 && !selectedRoles.some(r => p.roles.includes(r))) return false;
      return true;
    });

    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      switch (sortKey) {
        case 'name': return a.name.localeCompare(b.name) * dir;
        case 'nationality': return a.nationality.localeCompare(b.nationality) * dir;
        case 'age': return (a.age - b.age) * dir;
        case 'potential': return (a.potential - b.potential) * dir;
        case 'roles': {
          const ar = a.roles[0] ?? '';
          const br = b.roles[0] ?? '';
          return ar.localeCompare(br) * dir;
        }
      }
    });

    return list;
  }, [players, qName, qNat, minAge, maxAge, minPot, maxPot, selectedRoles, sortKey, sortDir]);

  const clearFilters = () => {
    setQName('');
    setQNat('');
    setMinAge('');
    setMaxAge('');
    setSelectedRoles([]);
    setMinPot('');
    setMaxPot('');
  };

  const openPlans = () => Linking.openURL('https://example.com/plans');       // TODO replace
  const openHelp  = () => rootNav.navigate('HelpCenter');

  const deleteAccount = async () => {
    // TODO: call your API, clear local storage, revoke tokens, etc.
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete account',
      'This will permanently delete your account and data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => { await deleteAccount(); resetToWelcome(); }
        },
      ],
    );
  };

  const handleLogout = async () => {
  // TODO: clear tokens / storage / revoke session
  rootNav.reset({
    index: 0,
    routes: [{ name: 'Login' }],
  });
};

  const renderHeaderCell = (label: string, key: SortKey) => {
    const active = sortKey === key;
    return (
      <Pressable
        onPress={() => cycleSort(key)}
        style={[styles.th, active && { backgroundColor: CARD }]}
      >
        <Text style={styles.thText}>
          {label} {active ? (sortDir === 'asc' ? '▲' : '▼') : ''}
        </Text>
      </Pressable>
    );
  };

  const renderRow = ({ item }: { item: Player }) => (
    <View style={[styles.row, { minHeight: ROW_HEIGHT }]}>
      <Text numberOfLines={1} style={[styles.td, styles.name]}>{item.name}</Text>
      <Text numberOfLines={1} style={[styles.td, styles.nat]}>{item.nationality}</Text>
      <Text style={[styles.td, styles.age]}>{item.age}</Text>
      <Text numberOfLines={1} style={[styles.td, styles.roles]}>{item.roles.join(', ')}</Text>
      <Text style={[styles.td, styles.pot]}>{item.potential}</Text>
    </View>
  );

  return (
  <SafeAreaView
    edges={['top']}
    style={[styles.safe, { paddingTop: 0 }]}
  >
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
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: pressed ? ACCENT_DARK : ACCENT },
            ]}
          >
            <Text style={styles.primaryBtnText}> Subscription Plans</Text>
          </Pressable>

          <Pressable
            onPress={openHelp}
            style={({ pressed }) => [
              styles.outlineBtn,
              { opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.outlineBtnText}>Help Center</Text>
          </Pressable>
        </View>

        {/* Subtle delete link */}
        <Pressable
          onPress={handleLogout}
          style={({ pressed }) => [{ alignSelf: 'center', marginTop: 10, opacity: pressed ? 0.8 : 1 }]}
        >
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>

      {/* Favorites */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Favorite players</Text>

        {/* Filters */}
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

          {/* Potential min / max */}
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
          {ALL_ROLES.map((r) => {
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

        {/* Clear filters */}
        <View style={{ alignItems: 'flex-end' }}>
          <Pressable
            onPress={clearFilters}
            style={({ pressed }) => [
              { paddingVertical: 8, paddingHorizontal: 12, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={{ color: MUTED }}>Clear filters</Text>
          </Pressable>
        </View>

        {/* Table (max 3 visible, scroll if >3) */}
        <View style={styles.table}>
          <View style={styles.headRow}>
            {renderHeaderCell('Name', 'name')}
            {renderHeaderCell('Nationality', 'nationality')}
            {renderHeaderCell('Age', 'age')}
            {renderHeaderCell('Roles', 'roles')}
            {renderHeaderCell('Potential', 'potential')}
          </View>
          <ScrollView
              style={{ maxHeight: ROW_HEIGHT * 3 + 2 }}
              nestedScrollEnabled
              bounces={false}
              showsVerticalScrollIndicator
            >
              {filtered.map((item, idx) => (
                <React.Fragment key={item.id}>
                  {idx > 0 && <View style={styles.sep} />}
                  {renderRow({ item })}
                </React.Fragment>
              ))}
            </ScrollView>
        </View>
      </View>
    </ScrollView>
  </SafeAreaView>
);



}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 6 },
  title: { color: TEXT, fontSize: 22, fontWeight: '800' },

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
  primaryBtnText: { color: TEXT, fontWeight: '700' },
  outlineBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
  },
  outlineBtnText: { color: TEXT, fontWeight: '700' },

  // Subtle delete link
  logoutText: { color: MUTED, fontWeight: '700', fontSize: 14, textAlign: 'center' },
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
  headRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE },
  th: { flex: 1, paddingVertical: 10, paddingHorizontal: 6 },
  thText: { color: TEXT, fontWeight: '700' },

  row: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 6 },
  sep: { height: 1, backgroundColor: LINE },

  // cells
  td: { color: TEXT, flex: 1 },
  name: { flex: 1.4 },
  nat: { flex: 1.2 },
  age: { flex: 0.6, textAlign: 'right' as const },
  roles: { flex: 1.4 },
  pot: { flex: 0.9, textAlign: 'right' as const },
});
