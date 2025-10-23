import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CARD, TEXT, MUTED, ACCENT, LINE } from '@/theme';
import type { PlayerData } from '@/types';

type Props = {
  player: PlayerData;
  onAddFavorite?: (p: PlayerData) => void | Promise<boolean>;
  titleAlign?: 'left' | 'center';
};

function isValidPotential(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;
}

export default function PlayerCard({ player, onAddFavorite, titleAlign = 'left' }: Props) {
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
      // unexpected error => re-enable
      setIsAdding(false);
    }
  };

  const disabled = !onAddFavorite || isAdding || isAdded;

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 14, gap: 8 }}>
      {/* header row: name + add button */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ color: TEXT, fontSize: 18, fontWeight: '800', flex: 1, textAlign: titleAlign }}>{name}</Text>
        {onAddFavorite && (
          <TouchableOpacity
            accessibilityRole="button"
            onPress={handleAdd}
            // still non-clickable after success
            disabled={!onAddFavorite || isAdding || isAdded}
            style={{
              borderWidth: 1,
              // ✅ keep ACCENT when added; only gray out when there's no handler
              borderColor: isAdded ? ACCENT : (!onAddFavorite ? LINE : ACCENT),
              borderRadius: 999,
              paddingHorizontal: 10,
              paddingVertical: 2,
              // ✅ don't dim when added; dim only while adding or when there's no handler
              opacity: (isAdding || !onAddFavorite) ? 0.5 : 1,
            }}
          >
            <Text
              style={{
                // ✅ keep ACCENT green for ✓ (and +). Only mute if no handler.
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
            Nationality: <Text style={{ color: TEXT }}>{meta.nationality}</Text>
          </Text>
        ) : null}

        {typeof meta?.age === 'number' ? (
          <Text style={{ color: MUTED }}>
            Age: <Text style={{ color: TEXT }}>{meta.age}</Text>
          </Text>
        ) : null}
      </View>

      {isValidPotential(potential) && (
        <View style={{ marginTop: 4, gap: 6 }}>
          <Text style={{ color: MUTED }}>
            Potential: <Text style={{ color: TEXT, fontWeight: '700' }}>{Math.round(potential)}</Text>/100
          </Text>
          <View
            style={{
              height: 8,
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.15)',
              overflow: 'hidden',
            }}
            accessibilityLabel={`Potential ${Math.round(potential)} out of 100`}
          >
            <View
              style={{
                width: `${Math.max(0, Math.min(100, Math.round(potential)))}%`,
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
