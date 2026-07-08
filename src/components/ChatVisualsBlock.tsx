import * as React from 'react';
import { View, Alert, Text, StyleSheet } from 'react-native';
import Svg, { Defs, Line, LinearGradient, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { BrickWall, DraftingCompass, LogIn, Map as MapIcon, ShieldAlert, ShieldCheck, Star } from 'lucide-react-native';
import PlayerCard from '@/components/PlayerCard';
import SpiderChart from '@/components/SpiderChart';
import { useTranslation } from 'react-i18next';
import { addFavoritePlayer, rolePickerCode } from '@/services/api';
import { ACCENT, CARD, LINE, MUTED, PANEL, TEXT } from '@/theme';

import {
  GK_METRICS,
  SHOOTING_METRICS,
  PASSING_METRICS,
  CONTRIBUTION_IMPACT_METRICS,
  ERRORS_DISCIPLINE_METRICS,
  DEFENDING_METRICS,
  toSpiderPoints,
} from '@/components/spiderRanges';

import type { PlayerData } from '@/types';
import ErrorsDisciplineTiles from '@/components/ErrorsDisciplineTiles';

type VisualKind = 'playerCard' | 'pitchMap' | 'metrics' | 'full';
type Props = { players: PlayerData[]; visualKind?: VisualKind };

type PitchRoleZoneCode = 'GK' | 'LB' | 'RB' | 'CB' | 'LM' | 'RM' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'CF';
type PitchZone = { code: PitchRoleZoneCode; x: number; y: number; w: number; h: number };

const PITCH_ROLE_ZONES: PitchZone[] = [
  { code: 'GK', x: 2, y: 82, w: 52, h: 16 },
  { code: 'LB', x: 2, y: 60.667, w: 13, h: 21.333 },
  { code: 'LM', x: 2, y: 39.333, w: 13, h: 21.334 },
  { code: 'LW', x: 2, y: 18, w: 13, h: 21.333 },
  { code: 'CB', x: 15, y: 66, w: 26, h: 16 },
  { code: 'CDM', x: 15, y: 50, w: 26, h: 16 },
  { code: 'CM', x: 15, y: 34, w: 26, h: 16 },
  { code: 'CAM', x: 15, y: 18, w: 26, h: 16 },
  { code: 'RB', x: 41, y: 60.667, w: 13, h: 21.333 },
  { code: 'RM', x: 41, y: 39.333, w: 13, h: 21.334 },
  { code: 'RW', x: 41, y: 18, w: 13, h: 21.333 },
  { code: 'CF', x: 2, y: 2, w: 52, h: 16 },
];

function normalizePositionCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [rawRole, rawCount]) => {
    const role = rolePickerCode(rawRole);
    const count = Number(rawCount);
    if (role && Number.isFinite(count) && count > 0) acc[role] = (acc[role] || 0) + count;
    return acc;
  }, {});
}

function normalizePositionNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => rolePickerCode(String(item))).filter(Boolean)));
}

function toPitchZone(value: string): PitchRoleZoneCode | '' {
  const code = rolePickerCode(value);
  if (['GK', 'LB', 'RB', 'CB', 'LM', 'RM', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'CF'].includes(code)) {
    return code as PitchRoleZoneCode;
  }
  return '';
}

function normalizePitchZoneCounts(counts: Record<string, number>) {
  return Object.entries(counts).reduce<Partial<Record<PitchRoleZoneCode, number>>>((acc, [role, count]) => {
    const zone = toPitchZone(role);
    if (zone) acc[zone] = (acc[zone] || 0) + count;
    return acc;
  }, {});
}

function buildPitchZoneColorValues(zoneCounts: Partial<Record<PitchRoleZoneCode, number>>) {
  const leftWide = (zoneCounts.LM || 0) + (zoneCounts.LW || 0);
  const rightWide = (zoneCounts.RM || 0) + (zoneCounts.RW || 0);
  return PITCH_ROLE_ZONES.reduce<Partial<Record<PitchRoleZoneCode, number>>>((acc, zone) => {
    if (zone.code === 'LM' || zone.code === 'LW') acc[zone.code] = leftWide;
    else if (zone.code === 'RM' || zone.code === 'RW') acc[zone.code] = rightWide;
    else acc[zone.code] = zoneCounts[zone.code] || 0;
    return acc;
  }, {});
}

function getPlayerPositionSource(player: PlayerData) {
  const meta = (player.meta || {}) as PlayerData['meta'] & Record<string, unknown>;
  const counts = normalizePositionCounts(meta.positionCounts ?? meta.position_counts);
  const namesSeen = normalizePositionNames(meta.positionNamesSeen ?? meta.position_names_seen);
  const total =
    Object.values(counts).reduce((sum, count) => sum + count, 0) ||
    Number(meta.positionCountTotal || meta.position_count_total || 0);
  return { counts, namesSeen, total };
}

function hasPitchMapData(player: PlayerData) {
  const { counts, namesSeen } = getPlayerPositionSource(player);
  return Object.keys(counts).length > 0 || namesSeen.length > 0;
}

function ChatPitchMap({ player }: { player: PlayerData }) {
  const { t } = useTranslation();
  const { counts, namesSeen, total } = getPlayerPositionSource(player);
  const zoneCounts = normalizePitchZoneCounts(counts);
  const activeZones = new Set<string>([
    ...Object.keys(zoneCounts),
    ...(Object.keys(zoneCounts).length ? [] : namesSeen.map(toPitchZone).filter(Boolean)),
  ]);

  if (!activeZones.size) return null;

  const colorValues = buildPitchZoneColorValues(zoneCounts);
  const max = Math.max(...Object.values(colorValues), ...Object.values(zoneCounts), 0);
  const roleEntries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([role, count]) => ({
      role,
      pct: total ? Math.round((count / total) * 100) : null,
    }));

  return (
    <View style={styles.pitchBubble}>
      <View style={styles.pitchHeader}>
        <View style={styles.categoryTitleFrame}>
          <MapIcon size={18} color="white" strokeWidth={2.4} />
          <Text style={styles.pitchTitle}>{t('pitchMap', 'Pitch Map')}</Text>
        </View>
      </View>
      <View style={styles.pitchMapStage}>
        <View style={styles.pitchRoleList}>
          {roleEntries.map((entry) => (
            <View key={entry.role} style={styles.pitchRolePill}>
              <Text style={styles.pitchRoleCode}>{entry.role}</Text>
              {entry.pct !== null ? <Text style={styles.pitchRolePct}>{entry.pct}%</Text> : null}
            </View>
          ))}
        </View>
        <View style={styles.pitchMapWrap}>
          <Svg viewBox="0 0 56 100" width="100%" height="100%" preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="chatPitchShade" x1="0" x2="0" y1="0" y2="1">
                <Stop offset="0%" stopColor="#0A371E" />
                <Stop offset="50%" stopColor="#082616" />
                <Stop offset="100%" stopColor="#0A371E" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="56" height="100" fill="url(#chatPitchShade)" />
            {PITCH_ROLE_ZONES.map((zone) => {
              const count = zoneCounts[zone.code] || 0;
              const colorValue = colorValues[zone.code] || 0;
              const active = activeZones.has(zone.code) || Boolean(colorValue);
              const intensity = colorValue && max ? colorValue / max : 0;
              const percent = count && total ? Math.round((count / total) * 100) : 0;
              const fill = active ? `rgba(32, 201, 151, ${0.06 + intensity * 0.62})` : 'rgba(6, 16, 11, 0.24)';
              const labelX = zone.x + zone.w / 2;
              const labelY = zone.y + zone.h / 2;
              const roleY = labelY - (percent ? 3.2 : 0);
              const percentY = labelY + 4.6;
              return (
                <React.Fragment key={zone.code}>
                  <Rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    fill={fill}
                    stroke="rgba(215, 239, 219, 0.36)"
                    strokeWidth={0.42}
                  />
                  <SvgText
                    x={labelX}
                    y={roleY}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    fill="rgba(255,255,255,0.93)"
                    fontSize="3.45"
                    fontWeight="900"
                  >
                    {zone.code}
                  </SvgText>
                  {percent ? (
                    <SvgText
                      x={labelX}
                      y={percentY}
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      fill="#D1FAE5"
                      fontSize="2.75"
                      fontWeight="900"
                    >
                      {percent} %
                    </SvgText>
                  ) : null}
                </React.Fragment>
              );
            })}
          </Svg>
        </View>
        <View style={styles.pitchDirectionSlot}>
          <View style={styles.pitchDirectionRail}>
            <Svg viewBox="0 0 10 48" width="100%" height="100%" preserveAspectRatio="none">
              <Line x1="5" y1="43" x2="5" y2="7" stroke="rgba(148, 163, 184, 0.74)" strokeWidth="0.7" strokeLinecap="round" />
              <Polygon points="5,4.4 3.45,8.6 6.55,8.6" fill="rgba(148, 163, 184, 0.74)" />
            </Svg>
          </View>
        </View>
      </View>
    </View>
  );
}

function PlayerCardBlock({ players }: Props) {
  const { t } = useTranslation();
  return (
    <View style={{ paddingHorizontal: 12, marginBottom: 12, gap: 10 }}>
      {players.map((p) => (
        <PlayerCard
          key={p.name}
          player={p}
          onAddFavorite={async (player) => {
            try {
              await addFavoritePlayer({
                name: player.name,
                nationality: player.meta?.nationality,
                age: typeof player.meta?.age === 'number' ? player.meta.age : undefined,
                potential:
                  typeof player.meta?.potential === 'number'
                    ? Math.round(player.meta.potential)
                    : undefined,
                form:
                  typeof player.meta?.form === 'number'
                    ? Math.round(player.meta.form)
                    : undefined,
                gender: player.meta?.gender,
                height: typeof player.meta?.height === 'number' ? player.meta.height : undefined,
                weight: typeof player.meta?.weight === 'number' ? player.meta.weight : undefined,
                team: player.meta?.team,
                league: player.meta?.league,
                roles: player.meta?.roles ?? [],
              });
              return true;
            } catch (e: any) {
              Alert.alert(t('addFavoriteFailed', 'Add failed'), String(e?.message || e));
              return false;
            }
          }}
        />
      ))}
    </View>
  );
}

function PitchMapBlock({ players }: Props) {
  const pitchPlayers = players.filter(hasPitchMapData);
  if (!pitchPlayers.length) return null;
  return (
    <View style={{ paddingHorizontal: 12, marginBottom: 12, gap: 10 }}>
      {pitchPlayers.map((player) => (
        <ChatPitchMap key={player.name} player={player} />
      ))}
    </View>
  );
}

function MetricsBlock({ players }: Props) {
  const { t } = useTranslation();

  return (
    <View style={{ paddingHorizontal: 12, marginBottom: 12, gap: 10 }}>
      {players.map((p) => {
        const gk = toSpiderPoints(p.stats, GK_METRICS);
        const shooting = toSpiderPoints(p.stats, SHOOTING_METRICS);
        const passing = toSpiderPoints(p.stats, PASSING_METRICS);
        const contrib = toSpiderPoints(p.stats, CONTRIBUTION_IMPACT_METRICS);
        const defending = toSpiderPoints(p.stats, DEFENDING_METRICS);
        const errors = toSpiderPoints(p.stats, ERRORS_DISCIPLINE_METRICS);

        const hasAny = !!(
          gk.length ||
          shooting.length ||
          passing.length ||
          contrib.length ||
          defending.length ||
          errors.length
        );

        if (!hasAny) return null;

        return (
          <View key={p.name} style={{ gap: 10 }}>
            {gk.length > 0 ? <SpiderChart title={t('chartGK', 'Goalkeeping')} points={gk} Icon={ShieldCheck} /> : null}

            {contrib.length > 0 ? (
              <SpiderChart title={t('contribution_impact', 'Contribution & Impact')} points={contrib} Icon={Star} />
            ) : null}

            {shooting.length > 0 ? (
              <SpiderChart title={t('shooting', 'Shooting & Finishing')} points={shooting} Icon={LogIn} />
            ) : null}

            {passing.length > 0 ? (
              <SpiderChart title={t('passing', 'Passing & Delivery')} points={passing} Icon={DraftingCompass} />
            ) : null}

            {defending.length > 0 ? (
              <SpiderChart title={t('defending', 'Defending')} points={defending} Icon={BrickWall} />
            ) : null}

            {errors.length > 0 ? (
              <ErrorsDisciplineTiles
                title={t('errors_discipline', 'Errors & Discipline')}
                points={errors}
                collapsedCount={3}
                defaultCollapsed
                Icon={ShieldAlert}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function ChatVisualsBlockInner({ players, visualKind = 'full' }: Props) {
  if (visualKind === 'playerCard') return <PlayerCardBlock players={players} />;
  if (visualKind === 'pitchMap') return <PitchMapBlock players={players} />;
  if (visualKind === 'metrics') return <MetricsBlock players={players} />;

  return (
    <>
      <PlayerCardBlock players={players} />
      <PitchMapBlock players={players} />
      <MetricsBlock players={players} />
    </>
  );
}

const styles = StyleSheet.create({
  pitchBubble: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: PANEL,
    padding: 12,
    gap: 10,
  },
  pitchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryTitleFrame: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: ACCENT,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 8,
  },
  pitchTitle: {
    color: TEXT,
    fontSize: 16,
    fontWeight: '700',
  },
  pitchMapStage: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 7,
    transform: [{ translateX: 10 }],
  },
  pitchRoleList: {
    width: 72,
    gap: 5,
    alignItems: 'stretch',
    marginTop: 0,
  },
  pitchRolePill: {
    minHeight: 25,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: 'rgba(17, 24, 19, 0.86)',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  pitchRoleCode: {
    color: ACCENT,
    fontSize: 11,
    fontWeight: '900',
  },
  pitchRolePct: {
    color: MUTED,
    fontSize: 10.5,
    fontWeight: '900',
  },
  pitchMapWrap: {
    width: '58%',
    maxWidth: 232,
    aspectRatio: 0.56,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(167,199,172,0.55)',
    backgroundColor: '#092E19',
  },
  pitchDirectionSlot: {
    width: 72,
    alignItems: 'flex-start',
  },
  pitchDirectionRail: {
    width: 22,
    height: 178,
    marginTop: 0,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: LINE,
    backgroundColor: CARD,
    overflow: 'hidden',
  },
});

export default React.memo(ChatVisualsBlockInner);
