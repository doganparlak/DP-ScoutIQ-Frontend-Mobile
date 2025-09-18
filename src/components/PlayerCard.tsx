import * as React from 'react';
import { View, Text } from 'react-native';
import { CARD, TEXT, MUTED, ACCENT } from '@/theme';
import type { PlayerData } from '@/types';

type Props = { player: PlayerData };

export default function PlayerCard({ player }: Props) {
  const { name, meta } = player;
  const roles = meta?.roles ?? [];

  return (
    <View style={{ backgroundColor: CARD, borderRadius: 16, padding: 14, gap: 8 }}>
      <Text style={{ color: TEXT, fontSize: 18, fontWeight: '800' }}>{name}</Text>

      <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
        {meta?.nationality ? (
          <Text style={{ color: MUTED }}>Nationality: <Text style={{ color: TEXT }}>{meta.nationality}</Text></Text>
        ) : null}
        {typeof meta?.age === 'number' ? (
          <Text style={{ color: MUTED }}>Age: <Text style={{ color: TEXT }}>{meta.age}</Text></Text>
        ) : null}
      </View>

      {roles.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {roles.map(r => (
            <View key={r} style={{ backgroundColor: ACCENT, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999 }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 12 }}>{r}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
