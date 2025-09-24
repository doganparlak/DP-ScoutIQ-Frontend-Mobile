import * as React from 'react';
import { View, Text } from 'react-native';
import { CARD, TEXT, MUTED, ACCENT } from '@/theme';
import type { PlayerData } from '@/types';

type Props = { player: PlayerData };

function isValidPotential(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100;
}

export default function PlayerCard({ player }: Props) {
  const { name, meta } = player;
  const roles = meta?.roles ?? [];
  const potential = meta?.potential;

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 14, gap: 8 }}>
      <Text style={{ color: TEXT, fontSize: 18, fontWeight: '800' }}>{name}</Text>

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

      {/* Potential (0–100) */}
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
