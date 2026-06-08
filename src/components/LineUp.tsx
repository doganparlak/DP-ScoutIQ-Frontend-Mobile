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
import { ChevronDown, RefreshCcw, Shirt, Users, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { ACCENT, CARD, DANGER, DANGER_DARK, LINE, MUTED, PANEL, TEXT } from '@/theme';
import { TutorialHint } from './Tutorial';

export type LineUpPlayer = {
  id: string;
  name: string;
  age?: number;
  team?: string;
  rolesShort?: string[];
  potential?: number;
  form?: number;
};

type FormationGroup = {
  title: string;
  formations: string[];
};

const FORMATION_GROUPS: FormationGroup[] = [
  { title: 'Back 3', formations: ['3-4-3', '3-4-2-1', '3-4-1-2', '3-5-2', '3-1-4-2', '3-2-4-1', '3-6-1'] },
  { title: 'Back 4', formations: ['4-4-2', '4-4-1-1', '4-3-3', '4-2-3-1', '4-1-4-1', '4-3-2-1', '4-3-1-2', '4-2-2-2', '4-5-1', '4-1-2-1-2 (Diamond)', '4-2-4'] },
  { title: 'Back 5', formations: ['5-3-2', '5-4-1', '5-2-3', '5-2-2-1', '5-3-1-1'] },
  { title: 'Back 6', formations: ['6-3-1', '6-2-2', '6-1-3', '6-4-0'] },
];

const DEFAULT_FORMATION = '4-3-3';

const POSITION_GROUPS = {
  GOALKEEPING: ['GK'],
  DEFENSE: ['LB', 'LCB', 'CB', 'RCB', 'RB', 'LWB', 'RWB'],
  MIDFIELD: ['LM', 'LDM', 'LCM', 'LAM', 'CM', 'CAM', 'CDM', 'RDM', 'RCM', 'RAM', 'RM'],
  ATTACK: ['LW', 'RW', 'LCF', 'CF', 'RCF'],
} as const;

function positionGroup(position?: string) {
  if (!position) return null;
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if ((positions as readonly string[]).includes(position)) return group;
  }
  return null;
}

function hasAbbreviation(token: string) {
  return /[.]/.test(token);
}

function displayLineupName(name: string) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.some(hasAbbreviation)) {
    return parts.filter((part) => !hasAbbreviation(part)).at(-1) || parts.at(-1) || parts[0];
  }
  return parts[0];
}

function rowLabels(count: number, rowIndex: number, totalRows: number) {
  if (rowIndex === 0) return defensiveLabels(count);
  if (rowIndex === totalRows - 1) return attackingLabels(count);
  if (totalRows > 3 && rowIndex === totalRows - 2) return attackingMidLabels(count);
  return midfieldLabels(count);
}

function defensiveLabels(count: number) {
  if (count === 3) return ['LCB', 'CB', 'RCB'];
  if (count === 4) return ['LB', 'LCB', 'RCB', 'RB'];
  if (count === 5) return ['LWB', 'LCB', 'CB', 'RCB', 'RWB'];
  if (count === 6) return ['LWB', 'LCB', 'LCB', 'RCB', 'RCB', 'RWB'];
  return Array.from({ length: count }, (_, i) => `D${i + 1}`);
}

function midfieldLabels(count: number) {
  if (count === 1) return ['CDM'];
  if (count === 2) return ['LCM', 'RCM'];
  if (count === 3) return ['LCM', 'CM', 'RCM'];
  if (count === 4) return ['LM', 'LCM', 'RCM', 'RM'];
  if (count === 5) return ['LM', 'LCM', 'CM', 'RCM', 'RM'];
  return Array.from({ length: count }, (_, i) => `M${i + 1}`);
}

function attackingMidLabels(count: number) {
  if (count === 1) return ['CAM'];
  if (count === 2) return ['LAM', 'RAM'];
  if (count === 3) return ['LAM', 'CAM', 'RAM'];
  return midfieldLabels(count);
}

function attackingLabels(count: number) {
  if (count === 0) return [];
  if (count === 1) return ['CF'];
  if (count === 2) return ['LCF', 'RCF'];
  if (count === 3) return ['LW', 'CF', 'RW'];
  return Array.from({ length: count }, (_, i) => `A${i + 1}`);
}

function buildSlots(formation: string) {
  const rows = (formation.match(/\d+/g) || []).map((value) => Number(value)).filter((value) => Number.isFinite(value));
  const out: { id: string; label: string; row: number }[] = [{ id: 'gk-0', label: 'GK', row: 0 }];
  rows.forEach((count, rowIndex) => {
    const labels = rowLabels(count, rowIndex, rows.length);
    labels.forEach((label, slotIndex) => {
      out.push({
        id: `r${rowIndex}-${slotIndex}`,
        label,
        row: rowIndex + 1,
      });
    });
  });
  return out;
}

function playerSubtitle(player: LineUpPlayer) {
  const bits = [
    player.rolesShort?.slice(0, 2).join(', '),
    player.team,
    typeof player.age === 'number' ? `${player.age}` : undefined,
  ].filter(Boolean);
  return bits.join('  •  ');
}

function formatFormValue(form?: number) {
  if (typeof form !== 'number' || !Number.isFinite(form)) return '-';
  return Number.isInteger(form) ? String(form) : form.toFixed(1);
}

export default function LineUp({
  visible,
  players,
  onClose,
  tutorialVisible = false,
  onTutorialNext,
  onTutorialSkip,
}: {
  visible: boolean;
  players: LineUpPlayer[];
  onClose: () => void;
  tutorialVisible?: boolean;
  onTutorialNext?: () => void;
  onTutorialSkip?: () => void;
}) {
  const { t } = useTranslation();
  const [teamName, setTeamName] = React.useState('');
  const [formation, setFormation] = React.useState(DEFAULT_FORMATION);
  const [formationOpen, setFormationOpen] = React.useState(false);
  const [assignments, setAssignments] = React.useState<Record<string, string | undefined>>({});
  const [activeSlotId, setActiveSlotId] = React.useState<string | null>(null);

  const slots = React.useMemo(() => buildSlots(formation), [formation]);
  const activeSlot = slots.find((slot) => slot.id === activeSlotId);
  const playersById = React.useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );

  const rows = React.useMemo(() => {
    const grouped = new Map<number, typeof slots>();
    slots.forEach((slot) => {
      const row = grouped.get(slot.row) ?? [];
      row.push(slot);
      grouped.set(slot.row, row);
    });
    return Array.from(grouped.entries()).sort((a, b) => b[0] - a[0]).map((entry) => entry[1]);
  }, [slots]);

  const teamPower = React.useMemo(() => {
    const total = slots.reduce((sum, slot) => {
      const player = playersById.get(assignments[slot.id] || '');
      const form = typeof player?.form === 'number' ? player.form : 0;
      if (!player || !form) return sum;
      const slotGroup = positionGroup(slot.label);
      const playerGroups = (player.rolesShort || []).map(positionGroup).filter(Boolean);
      if (!playerGroups.length) return sum + form;
      const playerMatchesGroup = playerGroups.some((group) => group === slotGroup);
      return sum + (playerMatchesGroup ? form : form / 2);
    }, 0);
    return total / 11;
  }, [assignments, playersById, slots]);

  React.useEffect(() => {
    if (!visible) return;
    setAssignments((current) => {
      const next: Record<string, string | undefined> = {};
      slots.forEach((slot) => {
        next[slot.id] = current[slot.id];
      });
      return next;
    });
  }, [slots, visible]);

  const assignPlayer = (playerId?: string) => {
    if (!activeSlotId) return;
    setAssignments((current) => {
      if (
        playerId &&
        Object.entries(current).some(([slotId, assignedPlayerId]) => (
          slotId !== activeSlotId && assignedPlayerId === playerId
        ))
      ) {
        return current;
      }
      return { ...current, [activeSlotId]: playerId };
    });
    setActiveSlotId(null);
  };

  const resetLineup = () => setAssignments({});

  const selectFormation = (item: string) => {
    setFormation(item);
    setFormationOpen(false);
  };

  const pickerPlayers = React.useMemo(() => {
    const assignedElsewhere = new Set(
      Object.entries(assignments)
        .filter(([slotId, playerId]) => slotId !== activeSlotId && !!playerId)
        .map(([, playerId]) => playerId),
    );
    return players.filter((player) => !assignedElsewhere.has(player.id));
  }, [activeSlotId, assignments, players]);

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconBubble}>
                <Users size={18} color={ACCENT} strokeWidth={2.5} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.title}>{t('lineupTitle', 'Lineup Builder')}</Text>
                <Text style={styles.subtitle}>
                  {t('lineupSubtitle', 'Build a formation from your Player Portfolio.')}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              {({ pressed }) => <X size={22} color={pressed ? DANGER_DARK : DANGER} strokeWidth={2.4} />}
            </Pressable>
          </View>

          {tutorialVisible ? (
            <View style={styles.tutorialWrap}>
              <TutorialHint
                visible
                title={t('tutorialLineupModalTitle', 'Build your XI')}
                body={t(
                  'tutorialLineupModalBody',
                  'Choose a formation, name your team, and tap pitch slots to assign players from your portfolio.',
                )}
                actionLabel={t('next', 'Next')}
                onAction={onTutorialNext}
                onSkipAll={onTutorialSkip}
                arrow="none"
              />
            </View>
          ) : null}

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.formationPanel}>
              <View style={styles.panelHeader}>
                <Text style={styles.panelTitle}>{t('lineupSetup', 'Lineup setup')}</Text>
                <Pressable onPress={resetLineup} style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}>
                  <RefreshCcw size={14} color={MUTED} strokeWidth={2.4} />
                  <Text style={styles.resetText}>{t('lineupClear', 'Clear')}</Text>
                </Pressable>
              </View>

              <View style={styles.setupGrid}>
                <View style={styles.setupCol}>
                  <Text style={styles.inputLabel}>{t('lineupTeamName', 'Team name')}</Text>
                  <TextInput
                    value={teamName}
                    onChangeText={(value) => setTeamName(value.slice(0, 15))}
                    maxLength={15}
                    placeholder={t('lineupTeamNamePlaceholder', 'Name your team')}
                    placeholderTextColor={MUTED}
                    style={styles.teamInput}
                  />
                </View>

                <View style={styles.setupCol}>
                  <Text style={styles.inputLabel}>{t('lineupFormation', 'Formation')}</Text>
                  <Pressable
                    onPress={() => setFormationOpen((open) => !open)}
                    style={({ pressed }) => [styles.dropdownButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.dropdownText}>{formation}</Text>
                    <ChevronDown
                      size={18}
                      color={ACCENT}
                      strokeWidth={2.5}
                      style={formationOpen ? styles.dropdownIconOpen : undefined}
                    />
                  </Pressable>
                </View>
              </View>

              {formationOpen ? (
                <View style={styles.dropdownMenu}>
                  {FORMATION_GROUPS.map((group) => (
                    <View key={group.title} style={styles.groupBlock}>
                      <Text style={styles.groupTitle}>{t(`lineup${group.title.replace(/\s/g, '')}`, group.title)}</Text>
                      <View style={styles.formationGrid}>
                        {group.formations.map((item) => {
                          const active = item === formation;
                          return (
                            <Pressable
                              key={item}
                              onPress={() => selectFormation(item)}
                              style={({ pressed }) => [
                                styles.formationChip,
                                active ? styles.formationChipActive : styles.formationChipInactive,
                                pressed && styles.pressed,
                              ]}
                            >
                              <Text style={active ? styles.formationChipTextActive : styles.formationChipText}>
                                {item}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.pitch}>
              <View style={styles.pitchMarkings} pointerEvents="none">
                <View style={styles.halfwayLine} />
                <View style={styles.centerCircle} />
                <View style={styles.centerSpot} />
                <View style={styles.penaltyAreaTop} />
                <View style={styles.goalAreaTop} />
                <View style={styles.penaltySpotTop} />
                <View style={styles.penaltyArcTop} />
                <View style={styles.goalTop} />
                <View style={styles.penaltyAreaBottom} />
                <View style={styles.goalAreaBottom} />
                <View style={styles.penaltySpotBottom} />
                <View style={styles.penaltyArcBottom} />
                <View style={styles.goalBottom} />
                <View style={[styles.cornerArc, styles.cornerTopLeft]} />
                <View style={[styles.cornerArc, styles.cornerTopRight]} />
                <View style={[styles.cornerArc, styles.cornerBottomLeft]} />
                <View style={[styles.cornerArc, styles.cornerBottomRight]} />
              </View>
              <View style={styles.pitchHeader}>
                <Text numberOfLines={1} style={styles.pitchTeamName}>
                  {teamName.trim() || t('lineupUntitledTeam', 'Untitled XI')}
                </Text>
                <View style={styles.pitchPowerWrap}>
                  <Text style={styles.pitchPowerLabel}>{t('lineupTeamPower', 'Team power')}</Text>
                  <Text style={styles.pitchPowerValue}>{Math.round(teamPower)}</Text>
                </View>
                <Text style={styles.pitchFormation}>{formation}</Text>
              </View>
              {rows.map((row, rowIndex) => {
                const compactRow = row.length >= 6;
                return (
                <View key={`row-${rowIndex}`} style={[styles.pitchRow, compactRow && styles.pitchRowCompact]}>
                  {row.map((slot) => {
                    const player = playersById.get(assignments[slot.id] || '');
                    return (
                      <Pressable
                        key={slot.id}
                        onPress={() => setActiveSlotId(slot.id)}
                        style={({ pressed }) => [
                          styles.slot,
                          compactRow && styles.slotCompact,
                          pressed && styles.slotPressed,
                        ]}
                      >
                        <View
                          style={[
                            player ? styles.slotIconFilled : styles.slotIcon,
                            compactRow && styles.slotIconCompact,
                          ]}
                        >
                          <Shirt size={compactRow ? 15 : 18} color={player ? TEXT : ACCENT} strokeWidth={2.3} />
                        </View>
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.68}
                          style={[styles.slotName, compactRow && styles.slotNameCompact]}
                        >
                          {player ? displayLineupName(player.name) : slot.label}
                        </Text>
                        {typeof player?.form === 'number' ? (
                          <Text numberOfLines={1} style={[styles.slotForm, compactRow && styles.slotFormCompact]}>
                            {player.form}
                          </Text>
                        ) : null}
                        {!player ? (
                          <Text numberOfLines={1} style={[styles.slotLabel, compactRow && styles.slotLabelCompact]}>
                            {slot.label}
                          </Text>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
                );
              })}
            </View>
          </ScrollView>

          <Modal transparent visible={!!activeSlotId} animationType="fade" onRequestClose={() => setActiveSlotId(null)}>
            <View style={styles.pickerBackdrop}>
              <View style={styles.pickerCard}>
                <View style={styles.pickerHeader}>
                  <View>
                    <Text style={styles.pickerTitle}>
                      {t('lineupPickPlayer', 'Pick a player')}
                    </Text>
                    <Text style={styles.pickerSubtitle}>
                      {activeSlot
                        ? t('lineupPickForSlot', 'Slot: {{slot}}', { slot: activeSlot.label })
                        : ''}
                    </Text>
                  </View>
                  <Pressable onPress={() => setActiveSlotId(null)} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <X size={20} color={DANGER} strokeWidth={2.4} />
                  </Pressable>
                </View>

                <Pressable onPress={() => assignPlayer(undefined)} style={styles.clearSlotButton}>
                  <Text style={styles.clearSlotText}>{t('lineupClearSlot', 'Clear this slot')}</Text>
                </Pressable>

                <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={styles.playerList}>
                  {pickerPlayers.length ? (
                    pickerPlayers.map((player) => {
                      const selected = assignments[activeSlotId || ''] === player.id;
                      return (
                        <Pressable
                          key={player.id}
                          onPress={() => assignPlayer(player.id)}
                          style={({ pressed }) => [
                            styles.playerOption,
                            selected && styles.playerOptionSelected,
                            pressed && styles.pressed,
                          ]}
                        >
                          <View style={styles.playerOptionIcon}>
                            <Shirt size={16} color={selected ? TEXT : ACCENT} strokeWidth={2.3} />
                          </View>
                          <View style={styles.playerOptionMain}>
                            <Text numberOfLines={1} style={styles.playerOptionName}>{player.name}</Text>
                            <Text numberOfLines={1} style={styles.playerOptionMeta}>{playerSubtitle(player)}</Text>
                          </View>
                          <View style={styles.playerFormChip}>
                            <Text style={styles.playerFormLabel}>{t('lineupFormShort', 'Form')}</Text>
                            <Text style={styles.playerFormValue}>{formatFormValue(player.form)}</Text>
                          </View>
                          {selected ? <ChevronDown size={18} color={ACCENT} strokeWidth={2.4} /> : null}
                        </Pressable>
                      );
                    })
                  ) : (
                    <Text style={styles.emptyText}>
                      {t('lineupNoPlayers', 'Add players to your portfolio first.')}
                    </Text>
                  )}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
  },
  modalCard: {
    width: '100%',
    maxWidth: 620,
    maxHeight: '88%',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
  },
  headerTitleRow: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { color: TEXT, fontSize: 18, fontWeight: '900' },
  subtitle: { color: MUTED, marginTop: 3, fontSize: 12, fontWeight: '700' },
  content: { padding: 14, gap: 14 },
  tutorialWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  formationPanel: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    padding: 12,
    gap: 10,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  panelTitle: { color: ACCENT, fontWeight: '900', fontSize: 14 },
  setupGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  setupCol: { flexBasis: '48%', flexGrow: 1, gap: 6, minWidth: 150 },
  inputLabel: { color: MUTED, fontSize: 12, fontWeight: '800' },
  teamInput: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    color: TEXT,
    paddingHorizontal: 12,
    fontWeight: '800',
  },
  dropdownButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: 'rgba(22, 163, 74, 0.11)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dropdownText: { color: TEXT, fontWeight: '900' },
  dropdownIconOpen: { transform: [{ rotate: '180deg' }] },
  dropdownMenu: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 10,
    gap: 10,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  resetText: { color: MUTED, fontSize: 12, fontWeight: '800' },
  groupBlock: { gap: 7 },
  groupTitle: { color: TEXT, fontSize: 12, fontWeight: '900' },
  formationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formationChip: {
    minWidth: 70,
    borderRadius: 999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  formationChipActive: { borderColor: ACCENT, backgroundColor: ACCENT },
  formationChipInactive: { borderColor: LINE, backgroundColor: PANEL },
  formationChipText: { color: MUTED, fontWeight: '900', fontSize: 12 },
  formationChipTextActive: { color: TEXT, fontWeight: '900', fontSize: 12 },
  pitch: {
    minHeight: 620,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(226, 255, 230, 0.72)',
    backgroundColor: '#0E271A',
    paddingTop: 56,
    paddingBottom: 28,
    paddingHorizontal: 8,
    gap: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  pitchMarkings: {
    ...StyleSheet.absoluteFillObject,
  },
  halfwayLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1.4,
    backgroundColor: 'rgba(226, 255, 230, 0.58)',
  },
  centerCircle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 112,
    height: 112,
    marginTop: -56,
    marginLeft: -56,
    borderRadius: 56,
    borderWidth: 1.5,
    borderColor: 'rgba(226, 255, 230, 0.55)',
  },
  centerSpot: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 6,
    height: 6,
    marginLeft: -3,
    marginTop: -3,
    borderRadius: 3,
    backgroundColor: 'rgba(226, 255, 230, 0.75)',
  },
  penaltyAreaTop: {
    position: 'absolute',
    top: 0,
    left: '18%',
    width: '64%',
    height: 96,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: 'rgba(226, 255, 230, 0.56)',
  },
  goalAreaTop: {
    position: 'absolute',
    top: 0,
    left: '34%',
    width: '32%',
    height: 42,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: 'rgba(226, 255, 230, 0.56)',
  },
  penaltySpotTop: {
    position: 'absolute',
    top: 70,
    left: '50%',
    width: 5,
    height: 5,
    marginLeft: -2.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(226, 255, 230, 0.70)',
  },
  penaltyArcTop: {
    position: 'absolute',
    top: 96,
    left: '50%',
    width: 76,
    height: 38,
    marginLeft: -38,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: 'rgba(226, 255, 230, 0.45)',
  },
  goalTop: {
    position: 'absolute',
    top: -7,
    left: '42%',
    width: '16%',
    height: 7,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(226, 255, 230, 0.64)',
  },
  penaltyAreaBottom: {
    position: 'absolute',
    bottom: 0,
    left: '18%',
    width: '64%',
    height: 96,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(226, 255, 230, 0.56)',
  },
  goalAreaBottom: {
    position: 'absolute',
    bottom: 0,
    left: '34%',
    width: '32%',
    height: 42,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(226, 255, 230, 0.56)',
  },
  penaltySpotBottom: {
    position: 'absolute',
    bottom: 70,
    left: '50%',
    width: 5,
    height: 5,
    marginLeft: -2.5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(226, 255, 230, 0.70)',
  },
  penaltyArcBottom: {
    position: 'absolute',
    bottom: 96,
    left: '50%',
    width: 76,
    height: 38,
    marginLeft: -38,
    borderTopLeftRadius: 38,
    borderTopRightRadius: 38,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: 'rgba(226, 255, 230, 0.45)',
  },
  goalBottom: {
    position: 'absolute',
    bottom: -7,
    left: '42%',
    width: '16%',
    height: 7,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: 'rgba(226, 255, 230, 0.64)',
  },
  cornerArc: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: 'rgba(226, 255, 230, 0.76)',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 1.8,
    borderBottomWidth: 1.8,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 16,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 1.8,
    borderBottomWidth: 1.8,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 16,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 1.8,
    borderTopWidth: 1.8,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 16,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 1.8,
    borderTopWidth: 1.8,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 16,
  },
  pitchHeader: {
    position: 'absolute',
    top: 10,
    left: 12,
    right: 12,
    minHeight: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(226, 255, 230, 0.18)',
    backgroundColor: 'rgba(4, 14, 9, 0.58)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
  },
  pitchTeamName: { flex: 1, minWidth: 0, color: '#B7F7C8', fontWeight: '900', fontSize: 11.5 },
  pitchFormation: { flex: 1, color: '#B7F7C8', fontWeight: '900', fontSize: 11.5, textAlign: 'center' },
  pitchPowerWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderLeftColor: 'rgba(226, 255, 230, 0.16)',
    borderRightColor: 'rgba(226, 255, 230, 0.16)',
    paddingLeft: 8,
    paddingRight: 8,
  },
  pitchPowerLabel: { color: '#B7F7C8', fontSize: 11.5, fontWeight: '900' },
  pitchPowerValue: { color: ACCENT, fontSize: 11.5, fontWeight: '900' },
  pitchRow: {
    flex: 1,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    gap: 5,
  },
  pitchRowCompact: {
    gap: 3,
    justifyContent: 'space-between',
  },
  slot: {
    width: 54,
    height: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.34)',
    backgroundColor: 'rgba(5, 14, 9, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  slotCompact: {
    width: 44,
    height: 62,
    borderRadius: 12,
    paddingHorizontal: 2,
  },
  slotPressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
  slotIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.13)',
  },
  slotIconFilled: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
  },
  slotIconCompact: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  slotName: { color: TEXT, fontSize: 12, fontWeight: '900', marginTop: 4, width: '100%', textAlign: 'center' },
  slotNameCompact: { fontSize: 10.5, marginTop: 3 },
  slotForm: { color: '#B7F7C8', fontSize: 10, fontWeight: '900', marginTop: 1 },
  slotFormCompact: { fontSize: 9 },
  slotLabel: { color: ACCENT, fontSize: 9, fontWeight: '900', marginTop: 1 },
  slotLabelCompact: { fontSize: 8 },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '78%',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: ACCENT,
    backgroundColor: PANEL,
    padding: 14,
    gap: 10,
  },
  pickerHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  pickerTitle: { color: TEXT, fontSize: 16, fontWeight: '900' },
  pickerSubtitle: { color: MUTED, fontSize: 12, fontWeight: '800', marginTop: 3 },
  clearSlotButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    alignItems: 'center',
    paddingVertical: 10,
  },
  clearSlotText: { color: DANGER, fontWeight: '900' },
  playerList: { gap: 8, paddingBottom: 4 },
  playerOption: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
  },
  playerOptionSelected: { borderColor: ACCENT, backgroundColor: 'rgba(22, 163, 74, 0.14)' },
  playerOptionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
  },
  playerOptionMain: { flex: 1, minWidth: 0 },
  playerOptionName: { color: TEXT, fontWeight: '900' },
  playerOptionMeta: { color: MUTED, fontSize: 12, fontWeight: '700', marginTop: 2 },
  playerFormChip: {
    minWidth: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.35)',
    backgroundColor: 'rgba(22, 163, 74, 0.10)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: 'center',
  },
  playerFormLabel: { color: MUTED, fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  playerFormValue: { color: ACCENT, fontSize: 13, fontWeight: '900', marginTop: 1 },
  emptyText: { color: MUTED, textAlign: 'center', paddingVertical: 18, fontWeight: '800' },
  pressed: { opacity: 0.86 },
});
