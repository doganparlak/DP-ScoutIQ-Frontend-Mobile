import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search, X } from 'lucide-react-native';

import { TutorialHint } from '@/components/Tutorial';
import { TEXT, MUTED, LINE, ACCENT, CARD, DANGER, DANGER_DARK, PANEL } from '@/theme';

type Props = {
  name: string;
  setName: (value: string) => void;
  gender: '' | 'male' | 'female';
  renderGenderLabel: () => string;
  cycleGender: () => void;
  nationality: string;
  setNationality: (value: string) => void;
  selectedNationality: string | null;
  setSelectedNationality: (value: string | null) => void;
  nationalitySuggestions: string[];
  league: string;
  setLeague: (value: string) => void;
  selectedLeague: string | null;
  setSelectedLeague: (value: string | null) => void;
  leagueSuggestions: string[];
  team: string;
  setTeam: (value: string) => void;
  selectedTeam: string | null;
  setSelectedTeam: (value: string | null) => void;
  teamSuggestions: string[];
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
  minHeight: string;
  setMinHeight: (value: string) => void;
  maxHeight: string;
  setMaxHeight: (value: string) => void;
  clearFilters: () => void;
  onSearch: () => void;
  tutorialStep?: 'filters' | 'search' | null;
  onTutorialContinue?: () => void;
  onTutorialSkipAll?: () => void;
  tutorialActive?: boolean;
};

export default function SearchFilters({
  name,
  setName,
  gender,
  renderGenderLabel,
  cycleGender,
  nationality,
  setNationality,
  selectedNationality,
  setSelectedNationality,
  nationalitySuggestions,
  league,
  setLeague,
  selectedLeague,
  setSelectedLeague,
  leagueSuggestions,
  team,
  setTeam,
  selectedTeam,
  setSelectedTeam,
  teamSuggestions,
  position,
  setPosition,
  positionOpen,
  setPositionOpen,
  positionOptionLabels,
  roleDisplayLabel,
  minAge,
  setMinAge,
  maxAge,
  setMaxAge,
  minHeight,
  setMinHeight,
  maxHeight,
  setMaxHeight,
  clearFilters,
  onSearch,
  tutorialStep = null,
  onTutorialContinue,
  onTutorialSkipAll,
  tutorialActive = false,
}: Props) {
  const { t } = useTranslation();
  const controlsLocked = tutorialActive;
  const searchEnabled = !tutorialActive || tutorialStep === 'search';

  return (
    <View style={styles.panel}>
      <Text style={styles.sectionTitle}>{t('playerPoolFilters', 'Search filters')}</Text>

      <TutorialHint
        visible={tutorialStep === 'filters'}
        title={t('tutorialSearchFiltersTitle', 'Start with search filters')}
        body={t(
          'tutorialSearchFiltersBody',
          'Filters narrow the database. We filled in Lamine Yamal as an example.',
        )}
        actionLabel={t('tutorialPointToSearch', 'Point me to Search')}
        onAction={onTutorialContinue}
        onSkipAll={onTutorialSkipAll}
      />

      <View style={styles.filters}>
        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltName', 'Name')}</Text>
          <TextInput
            value={name}
            onChangeText={controlsLocked ? undefined : setName}
            editable={!controlsLocked}
            placeholder={t('phSearchName', 'Search name')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltGender', 'Gender')}</Text>
          <Pressable
            onPress={cycleGender}
            disabled={controlsLocked}
            style={({ pressed }) => [styles.input, styles.centeredInput, pressed && styles.pressed]}
          >
            <Text style={{ color: gender ? TEXT : MUTED, fontSize: 14 }}>{renderGenderLabel()}</Text>
          </Pressable>
        </View>

        <View style={styles.filterCol}>
          <Text style={styles.filterLabel}>{t('fltNationality', 'Country')}</Text>
          <TextInput
            value={nationality}
            editable={!controlsLocked}
            onChangeText={(value) => {
              if (controlsLocked) return;
              setNationality(value);
              setSelectedNationality(
                selectedNationality && selectedNationality === value ? selectedNationality : null,
              );
            }}
            placeholder={t('phSearchNationality', 'Search nationality')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
          {nationalitySuggestions.length > 0 &&
          nationality.trim().toLowerCase() !== selectedNationality?.trim().toLowerCase() ? (
            <View style={styles.suggestions}>
              {nationalitySuggestions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    if (controlsLocked) return;
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
            editable={!controlsLocked}
            onChangeText={(value) => {
              if (controlsLocked) return;
              setLeague(value);
              setSelectedLeague(selectedLeague && selectedLeague === value ? selectedLeague : null);
            }}
            placeholder={t('phSearchLeague', 'Search league')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
          {leagueSuggestions.length > 0 &&
          league.trim().toLowerCase() !== selectedLeague?.trim().toLowerCase() ? (
            <View style={styles.suggestions}>
              {leagueSuggestions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    if (controlsLocked) return;
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
            editable={!controlsLocked}
            onChangeText={(value) => {
              if (controlsLocked) return;
              setTeam(value);
              setSelectedTeam(selectedTeam && selectedTeam === value ? selectedTeam : null);
            }}
            placeholder={t('phSearchTeam', 'Search team')}
            placeholderTextColor={MUTED}
            style={styles.input}
          />
          {teamSuggestions.length > 0 &&
          team.trim().toLowerCase() !== selectedTeam?.trim().toLowerCase() ? (
            <View style={styles.suggestions}>
              {teamSuggestions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    if (controlsLocked) return;
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
            disabled={controlsLocked}
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
              editable={!controlsLocked}
              onChangeText={(value) => setMinAge(value.replace(/[^\d]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMin', 'Min')}
              placeholderTextColor={MUTED}
              style={[styles.input, styles.rangeInput]}
            />
            <TextInput
              value={maxAge}
              editable={!controlsLocked}
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
              editable={!controlsLocked}
              onChangeText={(value) => setMinHeight(value.replace(/[^\d.]/g, ''))}
              keyboardType="numeric"
              placeholder={t('phMin', 'Min')}
              placeholderTextColor={MUTED}
              style={[styles.input, styles.rangeInput]}
            />
            <TextInput
              value={maxHeight}
              editable={!controlsLocked}
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
          disabled={controlsLocked}
          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryButtonText}>{t('clearFilters', 'Clear filters')}</Text>
        </Pressable>

        <Pressable
          onPress={onSearch}
          disabled={!searchEnabled}
          style={({ pressed }) => [
            styles.primaryButton,
            !searchEnabled && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          <Search size={16} color={ACCENT} strokeWidth={2.2} />
          <Text style={styles.primaryButtonText}>{t('playerPoolSearchButton', 'Search')}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
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
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.92,
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
