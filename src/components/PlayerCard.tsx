// src/components/PlayerCard.tsx
import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CARD, TEXT, MUTED, ACCENT, LINE, DANGER } from '@/theme';
import type { PlayerData } from '@/types';
import { useTranslation } from 'react-i18next';

type Props = {
  player: PlayerData;
  onAddFavorite?: (p: PlayerData) => void | Promise<boolean>;
  titleAlign?: 'left' | 'center';
};

function isValidPotential(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;
}

function getScoreColor(score: number): string {
  if (score < 50) return DANGER;
  if (score < 70) return '#F59E0B';
  return ACCENT;
}

function ScoreBar({
  label,
  value,
  accessibilityLabel,
}: {
  label: string;
  value: number;
  accessibilityLabel: string;
}) {
  const score = Math.max(0, Math.min(100, Math.round(value)));
  const scoreColor = getScoreColor(score);

  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: MUTED }}>
        {label}:{' '}
        <Text style={{ color: scoreColor, fontWeight: '800' }}>{score}</Text>/100
      </Text>

      <View
        style={{
          height: 8,
          borderRadius: 999,
          backgroundColor: '#272a2a',
          overflow: 'hidden',
        }}
        accessibilityLabel={accessibilityLabel}
      >
        <View
          style={{
            width: `${score}%`,
            height: '100%',
            backgroundColor: scoreColor,
          }}
        />
      </View>
    </View>
  );
}

export default function PlayerCard({ player, onAddFavorite, titleAlign = 'left' }: Props) {
  const { t } = useTranslation();
  const { name, meta } = player;
  const roles = meta?.roles ?? [];
  const potential = meta?.potential;
  const form = meta?.form;

  const [isAdding, setIsAdding] = React.useState(false);
  const [isAdded, setIsAdded] = React.useState(false);
  const [showAddedMessage, setShowAddedMessage] = React.useState(false);

  React.useEffect(() => {
    setIsAdding(false);
    setIsAdded(false);
    setShowAddedMessage(false);
  }, [player.name, meta?.team, meta?.nationality]);

  const handleAdd = async () => {
    if (!onAddFavorite || isAdding || isAdded) return;
    try {
      setIsAdding(true);
      const maybePromise = onAddFavorite(player);
      let ok = true;
      if (maybePromise && typeof (maybePromise as Promise<boolean>)?.then === 'function') {
        ok = await (maybePromise as Promise<boolean>);
      }
      if (ok !== false) {
        setIsAdded(true);
        setShowAddedMessage(true);
      }
      else setIsAdding(false); // handled failure => re-enable
    } catch {
      setIsAdding(false);
    }
  };

  const disabled = !onAddFavorite || isAdding || isAdded;
  const potentialInt = Math.round(isValidPotential(potential) ? potential : 0);
  const formInt = Math.round(isValidPotential(form) ? form : 0);

  // gender label (localized if 'male'/'female')
  const genderLabel = React.useMemo(() => {
    const g = meta?.gender;
    if (!g || typeof g !== 'string') return undefined;
    const lower = g.toLowerCase();
    if (lower === 'male') return t('genderMale', 'Male');
    if (lower === 'female') return t('genderFemale', 'Female');
    return g;
  }, [meta?.gender, t]);

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 14, gap: 8 }}>
      {showAddedMessage && (
        <View
          style={{
            alignSelf: 'center',
            backgroundColor: ACCENT,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ color: 'white', fontSize: 12, fontWeight: '800' }}>
            {t('playerAddedToPortfolio', 'Player is added to your portfolio')}
          </Text>
        </View>
      )}

      {/* header row: name + add button */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text
          style={{
            color: TEXT,
            fontSize: 18,
            fontWeight: '800',
            flex: 1,
            textAlign: titleAlign,
          }}
        >
          {name}
        </Text>

        {onAddFavorite && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={
              isAdded
                ? t('addedToFavorites', 'Added to favorites')
                : t('addToFavorites', 'Add to favorites')
            }
            onPress={handleAdd}
            disabled={disabled}
            style={{
              borderWidth: 1,
              borderColor: isAdded ? ACCENT : (!onAddFavorite ? LINE : ACCENT),
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 2,
              opacity: (isAdding || !onAddFavorite) ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                color: isAdded ? ACCENT : (!onAddFavorite ? MUTED : ACCENT),
                fontWeight: '800',
                fontSize: 14,
              }}
            >
              {isAdded ? '✓' : isAdding ? '…' : '＋'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* meta block: 
          row 1 -> gender, age
          row 2 -> nationality, league
          row 3 -> team
          row 4 -> height, weight
      */}
      <View style={{ gap: 4, marginTop: 4 }}>
        {/* Row 1: Gender, Age */}
        {(genderLabel || typeof meta?.age === 'number') && (
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {genderLabel && (
              <Text style={{ color: MUTED }}>
                {t('gender', 'Gender')}: <Text style={{ color: TEXT }}>{genderLabel}</Text>
              </Text>
            )}
            {typeof meta?.age === 'number' && (
              <Text style={{ color: MUTED }}>
                {t('age', 'Age')}: <Text style={{ color: TEXT }}>{meta.age}</Text>
              </Text>
            )}
          </View>
        )}

        {/* Row 2: Nationality, League */}
        {(meta?.nationality || meta?.league) && (
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {meta?.nationality && (
              <Text style={{ color: MUTED }}>
                {t('nationality', 'Nationality')}:{' '}
                <Text style={{ color: TEXT }}>{meta.nationality}</Text>
              </Text>
            )}
            {meta?.league && (
              <Text style={{ color: MUTED }}>
                {t('league', 'League')}: <Text style={{ color: TEXT }}>{meta.league}</Text>
              </Text>
            )}
          </View>
        )}

        {/* Row 3: Team */}
        {meta?.team && (
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            <Text style={{ color: MUTED }}>
              {t('team', 'Team')}: <Text style={{ color: TEXT }}>{meta.team}</Text>
            </Text>
          </View>
        )}

        {/* Row 4: Height, Weight */}
        {(typeof meta?.height === 'number' || typeof meta?.weight === 'number') && (
          <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
            {typeof meta?.height === 'number' && (
              <Text style={{ color: MUTED }}>
                {t('height', 'Height')}: <Text style={{ color: TEXT }}>{meta.height}</Text>
              </Text>
            )}
            {typeof meta?.weight === 'number' && (
              <Text style={{ color: MUTED }}>
                {t('weight', 'Weight')}: <Text style={{ color: TEXT }}>{meta.weight}</Text>
              </Text>
            )}
          </View>
        )}
      </View>

      {(isValidPotential(potential) || isValidPotential(form)) && (
        <View style={{ marginTop: 4, gap: 8 }}>
          {isValidPotential(potential) && (
            <ScoreBar
              label={t('potential', 'Potential')}
              value={potentialInt}
              accessibilityLabel={t('potentialA11y', 'Potential {{val}} out of 100', {
                val: potentialInt,
              })}
            />
          )}
          {isValidPotential(form) && (
            <ScoreBar
              label={t('form', 'Form')}
              value={formInt}
              accessibilityLabel={t('formA11y', 'Form {{val}} out of 100', {
                val: formInt,
              })}
            />
          )}
        </View>
      )}

      {roles.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {roles.map((r) => (
            <View
              key={r}
              style={{
                backgroundColor: ACCENT,
                paddingVertical: 4,
                paddingHorizontal: 8,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{r}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
