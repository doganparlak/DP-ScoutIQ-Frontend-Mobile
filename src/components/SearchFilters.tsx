import React from 'react';
import { normalizeSearchText, optionMatchesSearch } from '@/utils/searchSuggestions';
import { PLAYER_ROLE_GRID_ORDER } from '@/services/api';
import { Selector } from './LeaguePerformanceControls';
import { createThemedStyles,useThemedStyles,type ThemeColors } from '@/theme';

import { ChevronDown,ListFilter,Search,X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import {
Pressable,
Modal,
FlatList,
Keyboard,
useWindowDimensions,
StyleSheet,
Text,
TextInput,
View,
} from 'react-native';

import { TutorialHint } from '@/components/Tutorial';


type PlayerPoolComponentTheme = {
  panel: string;
  card: string;
  line: string;
  accent: string;
  accentSoft: string;
  muted: string;
};

type Props = {
  name: string;
  setName: (value: string) => void;
  nationality: string;
  setNationality: (value: string) => void;
  selectedNationality: string | null;
  setSelectedNationality: (value: string | null) => void;
  nationalityOptions: string[];
  league: string;
  setLeague: (value: string) => void;
  selectedLeague: string | null;
  setSelectedLeague: (value: string | null) => void;
  leagueOptions: string[];
  team: string;
  setTeam: (value: string) => void;
  selectedTeam: string | null;
  setSelectedTeam: (value: string | null) => void;
  teamOptions: string[];
  position: string;
  setPosition: (value: string) => void;
  positionOpen: boolean;
  setPositionOpen: (value: boolean) => void;
  positionOptionLabels: string[];
  roleDisplayLabel: (value: string) => string;
  minAge: string;
  setMinAge: (value: string) => void;
  maxAge: string;
  setMaxAge: (value: string) => void;
  clearFilters: () => void;
  onSearch: () => void;
  tutorialStep?: 'filters' | 'search' | null;
  onTutorialContinue?: () => void;
  onTutorialSkipAll?: () => void;
  tutorialActive?: boolean;
  theme?: PlayerPoolComponentTheme;
  worldCupMode?: boolean;
};

export default function SearchFilters({
  name,
  setName,
  nationality,
  setNationality,
  selectedNationality,
  setSelectedNationality,
  nationalityOptions,
  league,
  setLeague,
  selectedLeague,
  setSelectedLeague,
  leagueOptions,
  team,
  setTeam,
  selectedTeam,
  setSelectedTeam,
  teamOptions,
  position,
  setPosition,
  positionOpen,
  setPositionOpen,
  roleDisplayLabel,
  minAge,
  setMinAge,
  maxAge,
  setMaxAge,
  clearFilters,
  onSearch,
  tutorialStep = null,
  onTutorialContinue,
  onTutorialSkipAll,
  tutorialActive = false,
  theme,
  worldCupMode = false,
}: Props) {
  const themed = useThemedStyles(getModuleTheme);
  const {styles, ACCENT, FRAME_HEADING, MUTED, TEXT} = themed;

  const { t, i18n } = useTranslation();
  const [selector,setSelector] = React.useState<'nationality'|'league'|'team'|null>(null);
  const [query,setQuery] = React.useState('');
  const {height} = useWindowDimensions();
  const controlsLocked = tutorialActive;
  const searchEnabled = !tutorialActive || tutorialStep === 'search';
  const inputStyle = theme
    ? [styles.input, { backgroundColor: theme.card, borderColor: theme.line }]
    : styles.input;
  const rangeInputStyle = theme
    ? [styles.input, styles.rangeInput, { backgroundColor: theme.card, borderColor: theme.line }]
    : [styles.input, styles.rangeInput];

  return (
    <View style={[styles.panel, theme && { backgroundColor: theme.panel, borderColor: theme.line }]}>
      <View style={[styles.worldCupTopStripe, { backgroundColor: theme?.accent ?? ACCENT }]} />
      <View style={[FRAME_HEADING, { marginBottom: 10 }]}><ListFilter size={20} color={theme?.accent ?? ACCENT} /><Text style={[styles.sectionTitle, theme && { color: theme.accent }]}>
        {t('playerPoolFilters', 'Player search filters')}
      </Text></View>

      <View style={styles.tutorialGap}>
        <TutorialHint
          visible={tutorialStep === 'filters'}
        title={t('tutorialSearchFiltersTitle', 'Start with search filters')}
        body={t(
          'tutorialSearchFiltersBody',
          'Distinct filter options narrow the player pool. We picked Lamine Yamal as an example.',
        )}
          actionLabel={t('tutorialPointToSearch', 'Point me to Search')}
          onAction={onTutorialContinue}
          onSkipAll={onTutorialSkipAll}
        />
      </View>

      <View style={styles.filters}>
        <View style={styles.filterCol}>
          <Text style={[styles.filterLabel, theme && { color: theme.muted }]}>{t('fltName', 'Name')}</Text>
          <TextInput
            value={name}
            onChangeText={controlsLocked ? undefined : setName}
            editable={!controlsLocked}
            placeholder={t('phSearchName', 'Search name')}
            placeholderTextColor={theme?.muted ?? MUTED}
            style={inputStyle}
          />
        </View>

        {(['nationality','league','team'] as const).filter(key=>!worldCupMode || key==='team').map(key=>{
          const label=key==='nationality'?t('fltNationality','Nationality'):key==='league'?t('fltLeague','League'):t('fltTeam','Team');
          const value=key==='nationality'?nationality:key==='league'?league:team;
          return <View key={key} style={styles.filterCol}><Text style={[styles.filterLabel,theme&&{color:theme.muted}]}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{disabled:controlsLocked}} disabled={controlsLocked} style={[inputStyle,styles.dropdownInput]} onPress={()=>{Keyboard.dismiss();setQuery('');setSelector(key);}}><Text numberOfLines={1} style={{flex:1,color:value?TEXT:(theme?.muted??MUTED),fontSize:14}}>{value || (i18n.language.startsWith('tr')?'Seçin':'Select')}</Text><ChevronDown size={16} color={theme?.muted??MUTED}/></Pressable></View>;
        })}

        <View style={styles.filterCol}>
          <Text style={[styles.filterLabel, theme && { color: theme.muted }]}>{t('tblRoles', 'Role')}</Text>
          <Pressable
            onPress={() => setPositionOpen(true)}
            disabled={controlsLocked}
            style={({ pressed }) => [inputStyle, styles.dropdownInput, pressed && styles.pressed]}
          >
            <Text style={{ color: position ? TEXT : (theme?.muted ?? MUTED), fontSize: 14 }}>
              {position ? roleDisplayLabel(position) : t('tblRoles', 'Role')}
            </Text>
            <ChevronDown size={16} color={MUTED} strokeWidth={2.2} />
          </Pressable>
        </View>

        <View style={styles.filterCol}>
          <Text style={[styles.filterLabel, theme && { color: theme.muted }]}>{t('fltAge', 'Age (min / max)')}</Text>
          <View style={styles.rangeRow}>
            <TextInput
              value={minAge}
              editable={!controlsLocked}
              onChangeText={(value) => setMinAge(value.replace(/[^\d]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMin', 'Min')}
              placeholderTextColor={theme?.muted ?? MUTED}
              style={rangeInputStyle}
            />
            <TextInput
              value={maxAge}
              editable={!controlsLocked}
              onChangeText={(value) => setMaxAge(value.replace(/[^\d]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMax', 'Max')}
              placeholderTextColor={theme?.muted ?? MUTED}
              style={rangeInputStyle}
            />
          </View>
        </View>

      </View>

      <View style={styles.actionsRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{disabled:controlsLocked}}
          onPress={clearFilters}
          disabled={controlsLocked}
          style={({ pressed }) => [
            styles.secondaryButton,
            controlsLocked && styles.disabledButton,
            theme && { backgroundColor: theme.card, borderColor: theme.line },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.secondaryButtonText, theme && { color: theme.muted }]}>
            {t('clearFilters', 'Clear filters')}
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{disabled:!searchEnabled}}
          onPress={onSearch}
          disabled={!searchEnabled}
          style={({ pressed }) => [
            styles.primaryButton,
            theme && {
              backgroundColor: theme.accentSoft,
              borderColor: theme.accent,
            },
            !searchEnabled && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          <Search size={16} color={theme?.accent ?? ACCENT} strokeWidth={2.2} />
          <Text style={[styles.primaryButtonText, theme && { color: theme.accent }]}>
            {t('playerPoolSearchButton', 'Search')}
          </Text>
        </Pressable>
      </View>

      <TutorialHint
        visible={tutorialStep === 'search'}
        title={t('tutorialSearchButtonTitle', 'Run the search')}
        body={t(
          'tutorialSearchButtonBody',
          'Tap Search to list matching players.',
        )}
        onSkipAll={onTutorialSkipAll}
        targetLabel={t('tutorialPressSearch', 'Press Search')}
        arrow="up"
      />

      {selector && <Modal visible transparent animationType="fade" onRequestClose={()=>setSelector(null)}><View style={styles.modalBackdrop}><View style={[styles.modalCard,{maxHeight:height*.8},theme&&{backgroundColor:theme.panel,borderColor:theme.line}]} accessibilityViewIsModal>
        <View style={styles.modalHeader}><Text style={styles.modalTitle}>{selector==='nationality'?t('fltNationality','Nationality'):selector==='league'?t('fltLeague','League'):t('fltTeam','Team')}</Text><Pressable hitSlop={12} accessibilityRole="button" accessibilityLabel={t('close','Close')} onPress={()=>setSelector(null)}><X size={22} color={theme?.accent??ACCENT}/></Pressable></View>
        <TextInput value={query} onChangeText={setQuery} placeholder={i18n.language.startsWith('tr')?'Ara':'Search'} placeholderTextColor={theme?.muted??MUTED} style={[inputStyle,{marginVertical:12}]}/>
        <FlatList data={(selector==='nationality'?nationalityOptions:selector==='league'?leagueOptions:teamOptions).filter(v=>optionMatchesSearch(v,normalizeSearchText(query)))} keyExtractor={v=>v} initialNumToRender={15} maxToRenderPerBatch={15} windowSize={5} keyboardShouldPersistTaps="handled" contentContainerStyle={{gap:8}}
          ListHeaderComponent={<Pressable style={inputStyle} onPress={()=>{if(selector==='nationality'){setNationality('');setSelectedNationality(null);}else if(selector==='league'){setLeague('');setSelectedLeague(null);}else{setTeam('');setSelectedTeam(null);}setSelector(null);}}><Text style={{color:theme?.accent??ACCENT}}>{i18n.language.startsWith('tr')?'Seçimi temizle':'Clear selection'}</Text></Pressable>}
          ListEmptyComponent={<Text style={{color:theme?.muted??MUTED,padding:12}}>{i18n.language.startsWith('tr')?'Sonuç bulunamadı.':'No results found.'}</Text>}
          renderItem={({item})=>{const selected=item===(selector==='nationality'?selectedNationality:selector==='league'?selectedLeague:selectedTeam);return <Pressable accessibilityRole="radio" accessibilityState={{selected}} style={[inputStyle,selected&&{borderColor:theme?.accent??ACCENT}]} onPress={()=>{if(selector==='nationality'){setNationality(item);setSelectedNationality(item);}else if(selector==='league'){setLeague(item);setSelectedLeague(item);}else{setTeam(item);setSelectedTeam(item);}setSelector(null);}}><Text style={{color:theme?.accent??TEXT,fontWeight:'700'}}>{item}</Text></Pressable>;}}/>
      </View></View></Modal>}

      {positionOpen && <Selector
        columns={3}
        title={t('tblRoles', 'Role')}
        tr={i18n.language.startsWith('tr')}
        selected={position}
        options={[
          {key: '', label: i18n.language.startsWith('tr') ? 'Seçimi temizle' : 'Clear selection'},
          ...PLAYER_ROLE_GRID_ORDER.map(role => ({key: role, label: role})),
        ]}
        onSelect={role => {setPosition(role);setPositionOpen(false);}}
        onClose={() => setPositionOpen(false)}
      />}
    </View>
  );
}


const getModuleTheme = createThemedStyles((colors: ThemeColors) => {
  const {FRAME_TITLE, FRAME_STRIPE, FRAME_HEADING, TEXT, MUTED, LINE, ACCENT, CARD, DANGER, DANGER_DARK, PANEL, themeColor} = colors;

  const styles = StyleSheet.create({
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    padding: 16,
  },
  sectionTitle: { ...FRAME_TITLE, flex: 1, minWidth: 0, marginBottom: 0 },
  tutorialGap: {
    marginBottom: 12,
  },
  worldCupTopStripe: { ...FRAME_STRIPE },
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
    height: 44,
    color: TEXT,
    backgroundColor: CARD,
    borderColor: LINE,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    letterSpacing: 0,
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
    minHeight: 48,
    paddingVertical: 12,
    minWidth: 0,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    textAlign: 'center',
    flexShrink: 1,
    color: MUTED,
    fontSize: 14,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    minWidth: 0,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: themeColor('rgba(22, 163, 74, 0.12)', 'surface'),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  disabledButton: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.92,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: themeColor('rgba(0,0,0,0.55)', 'surface'),
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: PANEL,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LINE,
    padding: 16,
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
  return {FRAME_TITLE, FRAME_STRIPE, FRAME_HEADING, TEXT, MUTED, LINE, ACCENT, CARD, DANGER, DANGER_DARK, PANEL, styles, themeColor};
});
