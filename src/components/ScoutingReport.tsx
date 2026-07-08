import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import Svg, { Defs, Line, LinearGradient, Polygon, Rect, Stop, Text as SvgText } from 'react-native-svg';
import {
  toSpiderPoints,
  GK_METRICS,
  SHOOTING_METRICS,
  PASSING_METRICS,
  CONTRIBUTION_IMPACT_METRICS,
  ERRORS_DISCIPLINE_METRICS,
  DEFENDING_METRICS,
} from '../components/spiderRanges';
import { useTranslation } from 'react-i18next';
import { BrickWall, ChevronLeft, ChevronRight, DraftingCompass, LogIn, Map as MapIcon, ShieldAlert, ShieldCheck, Star, X } from 'lucide-react-native';

import PlayerCard from '../components/PlayerCard';
import SpiderChart, { type SpiderPoint } from '../components/SpiderChart';
import type { PlayerData } from '../types';
import { ROLE_LONG_TO_SHORT, ROLE_SHORT_TO_LONG, type ScoutingReportResponse } from '../services/api';
import ErrorsDisciplineTiles from '../components/ErrorsDisciplineTiles';

import {
  CARD,
  TEXT,
  MUTED,
  ACCENT,
  LINE,
  DANGER,
  shadows,
} from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  player: PlayerData;
  report: ScoutingReportResponse;
};

type ParsedReport = {
  strengths: string[];
  weaknesses: string[];
  conclusion: string[];
};

type ReportIcon = React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
type PageItem = { key: string; title: string; node: React.ReactNode; Icon?: ReportIcon };

type NarrativeSection = 'strengths' | 'weaknesses' | 'conclusion';
type NarrativeBullet = { title: string; body: string };

type PitchRoleZoneCode = 'GK' | 'LB' | 'RB' | 'CB' | 'LM' | 'RM' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'CF';

type PitchZone = {
  code: PitchRoleZoneCode;
  x: number;
  y: number;
  w: number;
  h: number;
};

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

function roleShortLabel(value?: string) {
  if (!value) return '';
  const upper = String(value).trim().toUpperCase();
  if (ROLE_SHORT_TO_LONG[upper]) return upper;
  return ROLE_LONG_TO_SHORT[String(value)] || ROLE_LONG_TO_SHORT[String(value).toLowerCase()] || upper;
}

function normalizePositionCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>((acc, [rawRole, rawCount]) => {
    const role = roleShortLabel(rawRole).toUpperCase();
    const count = Number(rawCount);
    if (role && Number.isFinite(count) && count > 0) acc[role] = (acc[role] || 0) + count;
    return acc;
  }, {});
}

function normalizePositionNames(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => roleShortLabel(String(item)).toUpperCase()).filter(Boolean)));
}

function toPitchZone(value: string): PitchRoleZoneCode | '' {
  const code = roleShortLabel(value).toUpperCase();
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

function getReportPositionSource(player: PlayerData, report: ScoutingReportResponse) {
  const card = report.content_json?.player_card || {};
  const counts = normalizePositionCounts(card.position_counts || card.positionCounts || player.meta?.positionCounts);
  const namesSeen = normalizePositionNames(card.position_names_seen || card.positionNamesSeen || player.meta?.positionNamesSeen);
  const total =
    Object.values(counts).reduce((sum, count) => sum + count, 0) ||
    Number(card.position_count_total || card.positionCountTotal || player.meta?.positionCountTotal || 0);
  return { counts, namesSeen, total };
}

function RoleDistributionPitchMap({ player, report }: { player: PlayerData; report: ScoutingReportResponse }) {
  const { counts, namesSeen, total } = getReportPositionSource(player, report);
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
          <LinearGradient id="mobileReportPitchShade" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0%" stopColor="#0A371E" />
            <Stop offset="50%" stopColor="#082616" />
            <Stop offset="100%" stopColor="#0A371E" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="56" height="100" fill="url(#mobileReportPitchShade)" />
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
  );
}

const NARRATIVE_TITLE_FALLBACKS: Record<NarrativeSection, string[]> = {
  strengths: [],
  weaknesses: [],
  conclusion: ['Role & System', 'Development Focus', 'Usage Recommendation', 'In Possession', 'Out of Possession'],
};

function parseNarrativeBullet(item: string, section: NarrativeSection, index: number): NarrativeBullet {
  const match = item.match(/^([^:：]{2,42})[:：]\s*(.+)$/);
  if (match) {
    return { title: match[1].trim(), body: match[2].trim() };
  }

  return {
    title: NARRATIVE_TITLE_FALLBACKS[section][index] || '',
    body: item,
  };
}

function NarrativeBulletRow({
  item,
  index,
  section,
  color,
}: {
  item: string;
  index: number;
  section: NarrativeSection;
  color: string;
}) {
  const bullet = parseNarrativeBullet(item, section, index);
  return (
    <View style={styles.narrativeRow}>
      <Text style={[styles.narrativeDot, { color }]}>•</Text>
      <Text style={styles.narrativeText}>
        {bullet.title ? (
          <Text style={[styles.narrativeTitle, { color }]}>
            {bullet.title}: {' '}
          </Text>
        ) : null}
        {bullet.body}
      </Text>
    </View>
  );
}

function stripBullet(s: string) {
  return s.replace(/^\s*[-•]\s*/, '').trim();
}

function splitBullets(block: string): string[] {
  const lines = (block || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const bulletLines = lines.filter((l) => /^[-•]\s+/.test(l));
  const src = bulletLines.length ? bulletLines : lines;

  return src.map(stripBullet).filter(Boolean);
}

function parseReportText(text: string): ParsedReport {
  const t = text || '';

  const strengthsBlock =
    (t.match(/STRENGTHS(?:\s*\(\d+\))?\s*\n([\s\S]*?)(?:\n\s*(POTENTIAL\s+WEAKNESSES|WEAKNESSES|CONCLUSION)\b)/i)?.[1] ?? '').trim();

  const weaknessesBlock =
    (t.match(/(POTENTIAL\s+WEAKNESSES\s*\/\s*CONCERNS|WEAKNESSES(?:\s*\/\s*CONCERNS)?)\s*\n([\s\S]*?)(?:\n\s*CONCLUSION\b)/i)?.[2] ?? '').trim();

  const conclusionBlock =
    (t.match(/CONCLUSION\s*\n([\s\S]*)$/i)?.[1] ?? '').trim();

  return {
    strengths: strengthsBlock ? splitBullets(strengthsBlock) : [],
    weaknesses: weaknessesBlock ? splitBullets(weaknessesBlock) : [],
    conclusion: conclusionBlock ? splitBullets(conclusionBlock) : [],
  };
}

function buildSpiderGroupsFromReport(report: ScoutingReportResponse): Array<{
  titleKey: string;
  fallbackTitle: string;
  points: SpiderPoint[];
  Icon: ReportIcon;
}> {
  const cj = report?.content_json;
  const meta = cj?.metrics_docs?.[0]?.metadata;

  if (!meta || typeof meta !== 'object') return [];

  const SKIP = new Set([
    'player_name',
    'team_name',
    'nationality_name',
    'position_name',
    'player_key',
    'gender',
    'age',
    'height',
    'weight',
    'match_count',
  ]);

  const stats: Array<{ metric: string; value: number | string }> = Object.entries(meta)
    .filter(([k]) => !SKIP.has(k))
    .filter(([, v]) => typeof v === 'number' || typeof v === 'string')
    .map(([metric, value]) => ({ metric, value: value as number | string }));

  const roles: string[] =
    (cj?.player_card?.roles && Array.isArray(cj.player_card.roles))
      ? cj.player_card.roles
      : [];

  const isGK = roles.some((r) => String(r).toLowerCase().includes('goalkeeper') || String(r).toUpperCase() === 'GK');

  const groups: Array<{ titleKey: string; fallbackTitle: string; points: SpiderPoint[]; Icon: ReportIcon }> = [];

  if (isGK) {
    const pts = toSpiderPoints(stats, GK_METRICS);
    if (pts.length) groups.push({ titleKey: 'goalkeeping', fallbackTitle: 'Goalkeeping', points: pts, Icon: ShieldCheck });
  }
  const contrib = toSpiderPoints(stats, CONTRIBUTION_IMPACT_METRICS);
  if (contrib.length) groups.push({ titleKey: 'contribution_impact', fallbackTitle: 'Contribution & Impact', points: contrib, Icon: Star });

  const shooting = toSpiderPoints(stats, SHOOTING_METRICS);
  if (shooting.length) groups.push({ titleKey: 'shooting', fallbackTitle: 'Shooting & Finishing', points: shooting, Icon: LogIn });

  const passing = toSpiderPoints(stats, PASSING_METRICS);
  if (passing.length) groups.push({ titleKey: 'passing', fallbackTitle: 'Passing & Delivery', points: passing, Icon: DraftingCompass });

  const defending = toSpiderPoints(stats, DEFENDING_METRICS);
  if (defending.length) groups.push({ titleKey: 'defending', fallbackTitle: 'Defending', points: defending, Icon: BrickWall });

  const errors = toSpiderPoints(stats, ERRORS_DISCIPLINE_METRICS);
  if (errors.length) groups.push({ titleKey: 'errors_discipline', fallbackTitle: 'Errors & Discipline', points: errors, Icon: ShieldAlert });

  return groups;
}

export default function ScoutingReport({ visible, onClose, player, report }: Props) {
  const [page, setPage] = useState(0);
  const { t } = useTranslation();

  const [pagerWidth, setPagerWidth] = useState<number>(0);
  const listRef = useRef<FlatList<PageItem> | null>(null);

  const parsed = useMemo(() => parseReportText(report?.content || ''), [report?.content]);
  const spiderGroups = useMemo(() => buildSpiderGroupsFromReport(report), [report]);

  useEffect(() => {
    if (visible) setPage(0);
  }, [visible, spiderGroups.length]);

  const pages = useMemo<PageItem[]>(() => {
    const playerPage: PageItem = {
      key: 'player',
      title: t('player', 'Player'),
      node: (
        <View style={styles.playerPage}>
          <PlayerCard player={player} titleAlign="center" />

          <Text style={styles.createdByTitle}>
            {!!t('createdByPrefix', { defaultValue: '' }) && (
              <Text style={styles.createdByPrefix}>
                {t('createdByPrefix')}{' '}
              </Text>
            )}

            <Text style={styles.brandScout}>{t('brandScout', 'Scout')}</Text>
            <Text style={styles.brandWise}>{t('brandWise', 'Wise')}</Text>

            {!!t('createdBySuffix', { defaultValue: '' }) && (
              <Text style={styles.createdByPrefix}>
                {' '}{t('createdBySuffix')}
              </Text>
            )}
          </Text>

          <Text style={styles.reportHint}>
            {t('tapArrowsToNavigate', 'Tap arrows to navigate the report.')}
          </Text>
        </View>
      ),
    };

    const strengthsPage: PageItem = {
      key: 'strengths',
      title: t('strengths', 'Strengths'),
      node: (
        <View style={{ gap: 10 }}>
          {parsed.strengths.length === 0 ? (
            <Text style={{ color: MUTED }}>
              {t('noStrengthsFound', 'No strengths section found.')}
            </Text>
          ) : (
            parsed.strengths.map((s, i) => (
              <NarrativeBulletRow
                key={`${i}-${s}`}
                item={s}
                index={i}
                section="strengths"
                color={ACCENT}
              />
            ))
          )}
        </View>
      ),
    };

    const weaknessesPage: PageItem = {
      key: 'weaknesses',
      title: t('weakness_concerns', 'Weakness & Concerns'),
      node: (
        <View style={{ gap: 10 }}>
          {parsed.weaknesses.length === 0 ? (
            <Text style={{ color: MUTED }}>
              {t('noConcernsFound', 'No concerns section found.')}
            </Text>
          ) : (
            parsed.weaknesses.map((s, i) => (
              <NarrativeBulletRow
                key={`${i}-${s}`}
                item={s}
                index={i}
                section="weaknesses"
                color={DANGER}
              />
            ))
          )}
        </View>
      ),
    };

    const pitchSource = getReportPositionSource(player, report);
    const hasPitchMap = Object.keys(pitchSource.counts).length > 0 || pitchSource.namesSeen.length > 0;
    const pitchMapPage: PageItem | null = hasPitchMap
      ? {
          key: 'pitch-map',
          title: t('pitchMap', 'Pitch Map'),
          node: (
            <View style={styles.pitchMapPage}>
              <RoleDistributionPitchMap player={player} report={report} />
            </View>
          ),
          Icon: MapIcon,
        }
      : null;

    const roleUsagePage: PageItem = {
      key: 'conclusion',
      title: t('role_usage', 'Role & Usage'),
      node: (
        <View style={{ gap: 10 }}>
          {parsed.conclusion.length === 0 ? (
            <Text style={{ color: MUTED }}>
              {t('noConclusionFound', 'No conclusion found.')}
            </Text>
          ) : (
            parsed.conclusion.map((s, i) => (
              <NarrativeBulletRow
                key={`${i}-${s}`}
                item={s}
                index={i}
                section="conclusion"
                color={ACCENT}
              />
            ))
          )}
        </View>
      ),
    };

    const out: PageItem[] = [playerPage, ...(pitchMapPage ? [pitchMapPage] : []), roleUsagePage, strengthsPage, weaknessesPage];

    spiderGroups.forEach((g, idx) => {
      const title = t(g.titleKey, g.fallbackTitle);
      const isRadar = (g.points?.length ?? 0) >= 4;
      const isErrors = g.titleKey === 'errors_discipline';

      const node = isErrors ? (
        <View style={{ marginTop: -5, width: '100%', alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 620 }}>
            <ErrorsDisciplineTiles
              title={title}
              points={g.points}
              Icon={g.Icon}
              collapsedCount={3}
              defaultCollapsed
            />
          </View>
        </View>
      ) : isRadar ? (
        <View style={{ marginTop: -25, marginLeft: 40, alignItems: 'center' }}>
          <View style={{ transform: [{ scale: 0.90 }] }}>
            <SpiderChart title={title} points={g.points} Icon={g.Icon} />
          </View>
        </View>
      ) : (
        <SpiderChart title={title} points={g.points} Icon={g.Icon} />
      );

      out.push({ key: `metrics-${idx}`, title, node, Icon: g.Icon });
    });

    return out;
  }, [player, parsed, spiderGroups, t]);

  const last = pages.length - 1;
  const canPrev = page > 0;
  const canNext = page < last;

  const scrollToPage = useCallback(
    (nextIndex: number, animated = true) => {
      const idx = Math.max(0, Math.min(last, nextIndex));
      setPage(idx);
      if (pagerWidth > 0) {
        listRef.current?.scrollToIndex({ index: idx, animated });
      }
    },
    [last, pagerWidth]
  );

  const goPrev = () => scrollToPage(page - 1);
  const goNext = () => scrollToPage(page + 1);

  useEffect(() => {
    if (visible) {
      scrollToPage(0, false);
    }
  }, [visible, scrollToPage]);

  const onPagerLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w > 0 && w !== pagerWidth) setPagerWidth(w);
  };

  const onSwipeEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pagerWidth <= 0) return;
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / pagerWidth);
    if (idx !== page) setPage(idx);
  };

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              {pages[page]?.Icon ? React.createElement(pages[page].Icon as ReportIcon, { size: 18, color: ACCENT, strokeWidth: 2.2 }) : null}
              <Text style={styles.headerTitle}>
                {t('scoutingReport', 'Scouting Report')} • {pages[page]?.title ?? ''}
              </Text>
            </View>

            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityLabel={t('closeScoutingReport', 'Close scouting report')}
              style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
            >
              <X size={22} color={DANGER} />
            </Pressable>
          </View>

          <View style={styles.headerDivider} />

          <View onLayout={onPagerLayout} style={{ flex: 1, paddingBottom: 65 }}>
            {pagerWidth > 0 ? (
              <FlatList
                ref={listRef}
                data={pages}
                keyExtractor={(item) => item.key}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onSwipeEnd}
                getItemLayout={(_, index) => ({
                  length: pagerWidth,
                  offset: pagerWidth * index,
                  index,
                })}
                renderItem={({ item }) => (
                  <View style={{ width: pagerWidth }}>
                    <ScrollView
                      contentContainerStyle={{ paddingBottom: 0 }}
                      showsVerticalScrollIndicator
                    >
                      {item.node}
                    </ScrollView>
                  </View>
                )}
              />
            ) : null}
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={goPrev}
              disabled={!canPrev}
              style={({ pressed }) => [
                styles.navBtn,
                !canPrev && { opacity: 0.35 },
                pressed && canPrev && { opacity: 0.85 },
              ]}
              accessibilityLabel={t('previousSection', 'Previous section')}
            >
              <ChevronLeft size={22} color={TEXT} />
            </Pressable>

            <View style={styles.dots}>
              {pages.map((p, i) => (
                <View
                  key={p.key}
                  style={[
                    styles.dot,
                    i === page ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            <Pressable
              onPress={goNext}
              disabled={!canNext}
              style={({ pressed }) => [
                styles.navBtn,
                !canNext && { opacity: 0.35 },
                pressed && canNext && { opacity: 0.85 },
              ]}
              accessibilityLabel={t('nextSection', 'Next section')}
            >
              <ChevronRight size={22} color={TEXT} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 700,
    height: '60%',
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
    ...shadows.card,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  headerDivider: {
    height: 1,
    backgroundColor: LINE,
    marginVertical: 10,
  },
  footer: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 22,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: LINE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navBtn: {
    width: 44,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 99,
  },
  dotActive: { backgroundColor: ACCENT },
  dotInactive: { backgroundColor: LINE },

  playerPage: {
    gap: 8,
  },
  createdByTitle: {
    textAlign: 'center',
    marginTop: Platform.OS === 'android' ? 8 : 12,
    letterSpacing: 0.3,
    fontSize: 22,
    lineHeight: 27,
  },
  reportHint: {
    color: MUTED,
    lineHeight: 18,
    textAlign: 'center',
  },
  createdByPrefix: {
    color: MUTED,
    fontWeight: '600',
  },
  brandScout: {
    color: TEXT,
    fontWeight: '900',
  },
  brandWise: {
    color: ACCENT,
    fontWeight: '900',
  },
  narrativeRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  narrativeDot: {
    fontWeight: '900',
    fontSize: 16,
    lineHeight: 21,
  },
  narrativeText: {
    color: TEXT,
    flex: 1,
    lineHeight: 20,
  },
  narrativeTitle: {
    fontWeight: '900',
  },
  pitchMapPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
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
    backgroundColor: 'rgba(255,255,255,0.035)',
    paddingHorizontal: 7,
    paddingVertical: 4,
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
    backgroundColor: 'rgba(255,255,255,0.052)',
    overflow: 'hidden',
  },
  pitchMapWrap: {
    width: '58%',
    maxWidth: 232,
    aspectRatio: 0.56,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(167, 199, 172, 0.55)',
    backgroundColor: '#092E19',
  },
});
