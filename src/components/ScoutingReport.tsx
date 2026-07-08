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
import { BrickWall, ChevronLeft, ChevronRight, DraftingCompass, LogIn, ShieldAlert, ShieldCheck, Star, X } from 'lucide-react-native';

import PlayerCard from '../components/PlayerCard';
import SpiderChart, { type SpiderPoint } from '../components/SpiderChart';
import type { PlayerData } from '../types';
import type { ScoutingReportResponse } from '../services/api';
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

    const out: PageItem[] = [playerPage, roleUsagePage, strengthsPage, weaknessesPage];

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
});
