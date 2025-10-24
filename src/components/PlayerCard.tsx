// src/components/PlayerCard.tsx
import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CARD, TEXT, MUTED, ACCENT, LINE } from '@/theme';
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

export default function PlayerCard({ player, onAddFavorite, titleAlign = 'left' }: Props) {
  const { t } = useTranslation();
  const { name, meta } = player;
  const roles = meta?.roles ?? [];
  const potential = meta?.potential;

  const [isAdding, setIsAdding] = React.useState(false);
  const [isAdded, setIsAdded] = React.useState(false);

  const handleAdd = async () => {
    if (!onAddFavorite || isAdding || isAdded) return;
    try {
      setIsAdding(true);
      const maybePromise = onAddFavorite(player);
      let ok = true;
      if (maybePromise && typeof (maybePromise as Promise<boolean>)?.then === 'function') {
        ok = await (maybePromise as Promise<boolean>);
      }
      if (ok !== false) setIsAdded(true);
      else setIsAdding(false); // handled failure => re-enable
    } catch {
      setIsAdding(false);
    }
  };

  const disabled = !onAddFavorite || isAdding || isAdded;
  const potentialInt = Math.round(isValidPotential(potential) ? potential : 0);

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 14, gap: 8 }}>
      {/* header row: name + add button */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: TEXT, fontSize: 18, fontWeight: '800', flex: 1, textAlign: titleAlign }}>
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

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {meta?.nationality ? (
          <Text style={{ color: MUTED }}>
            {t('nationality', 'Nationality')}: <Text style={{ color: TEXT }}>{meta.nationality}</Text>
          </Text>
        ) : null}

        {typeof meta?.age === 'number' ? (
          <Text style={{ color: MUTED }}>
            {t('age', 'Age')}: <Text style={{ color: TEXT }}>{meta.age}</Text>
          </Text>
        ) : null}
      </View>

      {isValidPotential(potential) && (
        <View style={{ marginTop: 4, gap: 6 }}>
          <Text style={{ color: MUTED }}>
            {t('potential', 'Potential')}:{' '}
            <Text style={{ color: TEXT, fontWeight: '700' }}>{potentialInt}</Text>/100
          </Text>

          <View
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.15)',
              overflow: 'hidden',
            }}
            accessibilityLabel={t('potentialA11y', 'Potential {{val}} out of 100', { val: potentialInt })}
          >
            <View
              style={{
                width: `${Math.max(0, Math.min(100, potentialInt))}%`,
                height: '100%',
                backgroundColor: ACCENT,
              }}
            />
          </View>
        </View>
      )}

      {roles.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {roles.map((r) => (
            <View
              key={r}
              style={{ backgroundColor: ACCENT, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 }}
            >
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{r}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
