import React, {useEffect, useState} from 'react';
import {Image, StyleSheet, View} from 'react-native';
import {UserRound} from 'lucide-react-native';

export default function ReportPlayerPortrait({
  imageUrl,
  accent,
  size = 46,
}: {
  imageUrl?: string | null;
  accent: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [imageUrl]);
  const height = Math.round(size * 1.08);
  return <View style={[s.frame, {width: size, height, borderRadius: Math.round(size * .25), borderColor: `${accent}85`, backgroundColor: `${accent}0D`}]}>
    {imageUrl && !failed
      ? <Image source={{uri: imageUrl}} resizeMode="contain" onError={() => setFailed(true)} style={s.image}/>
      : <UserRound size={Math.round(size * .55)} color={accent}/>} 
  </View>;
}

const s = StyleSheet.create({
  frame: {borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0},
  image: {width: '100%', height: '100%'},
});
