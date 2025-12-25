import * as React from 'react';
import { View, Alert } from 'react-native';
import PlayerCard from '@/components/PlayerCard';
import SpiderChart from '@/components/SpiderChart';
import { useTranslation } from 'react-i18next';
import { addFavoritePlayer } from '@/services/api';

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

type Props = { players: PlayerData[] };

function ChatVisualsBlockInner({ players }: Props) {
  const { t } = useTranslation();

  return (
    <View style={{ paddingHorizontal: 12, marginBottom: 12, gap: 10 }}>
      {players.map((p) => {
        // Compute once per player render (and memoization prevents re-doing it constantly)
        const gk = toSpiderPoints(p.stats, GK_METRICS);
        const shooting = toSpiderPoints(p.stats, SHOOTING_METRICS);
        const passing = toSpiderPoints(p.stats, PASSING_METRICS);
        const contrib = toSpiderPoints(p.stats, CONTRIBUTION_IMPACT_METRICS);
        const errors = toSpiderPoints(p.stats, ERRORS_DISCIPLINE_METRICS);
        const defending = toSpiderPoints(p.stats, DEFENDING_METRICS);

        const hasAny =
          gk.length ||
          shooting.length ||
          passing.length ||
          contrib.length ||
          errors.length ||
          defending.length;

        return (
          <View key={p.name} style={{ gap: 10 }}>
            <PlayerCard
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
                    gender: player.meta?.gender,
                    height: typeof player.meta?.height === 'number' ? player.meta.height : undefined,
                    weight: typeof player.meta?.weight === 'number' ? player.meta.weight : undefined,
                    team: player.meta?.team,
                    roles: player.meta?.roles ?? [],
                  });
                  return true;
                } catch (e: any) {
                  Alert.alert(t('addFavoriteFailed', 'Add failed'), String(e?.message || e));
                  return false;
                }
              }}
            />

            {hasAny ? (
              <View style={{ gap: 10 }}>
                {gk.length > 0 ? <SpiderChart title={t('chartGK', 'Goalkeeping')} points={gk} /> : null}
                {shooting.length > 0 ? (
                  <SpiderChart title={t('shooting', 'Shooting & Finishing')} points={shooting} />
                ) : null}
                {passing.length > 0 ? (
                  <SpiderChart title={t('passing', 'Passing & Delivery')} points={passing} />
                ) : null}
                {contrib.length > 0 ? (
                  <SpiderChart title={t('contribution_impact', 'Contribution & Impact')} points={contrib} />
                ) : null}
                {errors.length > 0 ? (
                  <ErrorsDisciplineTiles
                    title={t('errors_discipline', 'Errors & Discipline')}
                    points={errors}
                    // optionally tweak thresholds/collapsing:
                    thresholds={{ good: 0.33, warn: 0.66 }}
                    collapsedCount={2}
                    defaultCollapsed={true}
                  />
                ) : null}
                {defending.length > 0 ? (
                  <SpiderChart title={t('defending', 'Defending')} points={defending} />
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

// Only rerender if players reference changes (it won't when you append other messages)
export default React.memo(ChatVisualsBlockInner);
