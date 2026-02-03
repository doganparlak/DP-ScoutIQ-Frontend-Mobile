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
import { ChevronLeft, ChevronRight, X } from 'lucide-react-native';

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

type PageItem = { key: string; title: string; node: React.ReactNode };

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

  const groups: Array<{ titleKey: string; fallbackTitle: string; points: SpiderPoint[] }> = [];

  if (isGK) {
    const pts = toSpiderPoints(stats, GK_METRICS);
    if (pts.length) groups.push({ titleKey: 'goalkeeping', fallbackTitle: 'Goalkeeping', points: pts });
  }
  const contrib = toSpiderPoints(stats, CONTRIBUTION_IMPACT_METRICS);
  if (contrib.length) groups.push({ titleKey: 'contribution_impact', fallbackTitle: 'Contribution & Impact', points: contrib });

  const shooting = toSpiderPoints(stats, SHOOTING_METRICS);
  if (shooting.length) groups.push({ titleKey: 'shooting', fallbackTitle: 'Shooting & Finishing', points: shooting });

  const passing = toSpiderPoints(stats, PASSING_METRICS);
  if (passing.length) groups.push({ titleKey: 'passing', fallbackTitle: 'Passing & Delivery', points: passing });

  const defending = toSpiderPoints(stats, DEFENDING_METRICS);
  if (defending.length) groups.push({ titleKey: 'defending', fallbackTitle: 'Defending', points: defending });

  const errors = toSpiderPoints(stats, ERRORS_DISCIPLINE_METRICS);
  if (errors.length) groups.push({ titleKey: 'errors_discipline', fallbackTitle: 'Errors & Discipline', points: errors });

  return groups;
}

export default function ScoutingReport({ visible, onClose, player, report }: Props) {
  const [page, setPage] = useState(0);
  const { t } = useTranslation();

  const [footerH, setFooterH] = useState(0);
  const onFooterLayout = (e: LayoutChangeEvent) => {
    const h = Math.round(e.nativeEvent.layout.height);
    if (h > 0 && h !== footerH) setFooterH(h);
  };

  // ✅ width of the "content area" inside the card (so paging doesn't change layout)
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
        <View style={{ gap: 12 }}>
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

          <Text style={{ color: MUTED, lineHeight: 18, textAlign: 'center' }}>
            {t('tapArrowsToNavigate', 'Tap arrows to navigate the report.')}
          </Text>
        </View>
      ),
    };

    if (spiderGroups.length === 0) return [playerPage];

    const out: PageItem[] = [playerPage];

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
              collapsedCount={3}
              defaultCollapsed
            />
          </View>
        </View>
      ) : isRadar ? (
        <View style={{ marginTop: -25, marginLeft: 40, alignItems: 'center' }}>
          <View style={{ transform: [{ scale: 0.90 }] }}>
            <SpiderChart title={title} points={g.points} />
          </View>
        </View>
      ) : (
        <SpiderChart title={title} points={g.points} />
      );

      out.push({ key: `metrics-${idx}`, title, node });
    });

    out.push({
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
              <View key={`${i}-${s}`} style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ color: ACCENT, fontWeight: '900' }}>•</Text>
                <Text style={{ color: TEXT, flex: 1, lineHeight: 20 }}>{s}</Text>
              </View>
            ))
          )}
        </View>
      ),
    });

    out.push({
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
              <View key={`${i}-${s}`} style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ color: DANGER, fontWeight: '900' }}>•</Text>
                <Text style={{ color: TEXT, flex: 1, lineHeight: 20 }}>{s}</Text>
              </View>
            ))
          )}
        </View>
      ),
    });

    out.push({
      key: 'conclusion',
      title: t('conclusion', 'Conclusion'),
      node: (
        <View style={{ gap: 10 }}>
          {parsed.conclusion.length === 0 ? (
            <Text style={{ color: MUTED }}>
              {t('noConclusionFound', 'No conclusion found.')}
            </Text>
          ) : (
            parsed.conclusion.map((s, i) => (
              <View key={`${i}-${s}`} style={{ flexDirection: 'row', gap: 10 }}>
                <Text style={{ color: ACCENT, fontWeight: '900' }}>•</Text>
                <Text style={{ color: TEXT, flex: 1, lineHeight: 20 }}>{s}</Text>
              </View>
            ))
          )}
        </View>
      ),
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

  // when opening, reset to first page (no animation)
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
            <Text style={styles.headerTitle}>
              {t('scoutingReport', 'Scouting Report')} • {pages[page]?.title ?? ''}
            </Text>

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

          {/* ✅ Same spot as before, but now supports swipe. Width measured from this container. */}
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
                      contentContainerStyle={{ paddingBottom: 0}} // ✅ ensures content ends above footer line
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
    position: 'absolute',   // ✅ float footer
    left: 14,
    right: 14,
    bottom: 22,             // ✅ move up/down here (try 18–28)
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

  createdByTitle: {
    textAlign: 'center',
    marginTop: Platform.OS === 'android' ? 40 : 75,
    letterSpacing: 0.3,
    fontSize: 24,
    lineHeight: 30,
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
});
