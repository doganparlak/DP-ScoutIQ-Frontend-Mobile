import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
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

  const parsed = useMemo(() => parseReportText(report?.content || ''), [report?.content]);
  const spiderGroups = useMemo(() => buildSpiderGroupsFromReport(report), [report]);

  useEffect(() => {
    if (visible) setPage(0);
  }, [visible, spiderGroups.length]);


  const pages = useMemo(() => {
    const playerPage = {
    key: 'player',
    title: t('player', 'Player'),
    node: (
      <View style={{ gap: 12 }}>
        <PlayerCard player={player} titleAlign="center" />
        <Text style={{ color: MUTED, lineHeight: 18 }}>
          {t('tapArrowsToNavigate', 'Tap arrows to navigate the report.')}
        </Text>
      </View>
    ),
  };

    if (spiderGroups.length === 0) return [playerPage];

    const out: Array<{ key: string; title: string; node: React.ReactNode }> = [playerPage];

    spiderGroups.forEach((g, idx) => {
      const title = t(g.titleKey, g.fallbackTitle);
      const isRadar = (g.points?.length ?? 0) >= 4;

      const isErrors = g.titleKey === 'errors_discipline';

      const node = isErrors ? (
        <View style={{ width: '100%', alignItems: 'center' }}>
          <View style={{ width: '100%', maxWidth: 620 }}>
            <ErrorsDisciplineTiles
              title={title}
              points={g.points}
              collapsedCount={2}
              defaultCollapsed
            />
          </View>
        </View>
      ) : isRadar ? (
        <View style={{ marginLeft: 28, paddingRight: -28, alignItems: 'center' }}>
          <View style={{ transform: [{ scale: 0.90 }] }}>
            <SpiderChart title={title} points={g.points} />
          </View>
        </View>
      ) : (
        <SpiderChart title={title} points={g.points} />
      );

      out.push({
        key: `metrics-${idx}`,
        title,
        node,
      });
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

  const goPrev = () => setPage((p) => Math.max(0, p - 1));
  const goNext = () => setPage((p) => Math.min(last, p + 1));

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

          <ScrollView contentContainerStyle={{ paddingBottom: 8 }} showsVerticalScrollIndicator>
            {pages[page]?.node}
          </ScrollView>

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
    maxHeight: '88%',
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: LINE,
    padding: 14,
    ...shadows.card,
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
    marginTop: 10,
    paddingTop: 10,
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
});
