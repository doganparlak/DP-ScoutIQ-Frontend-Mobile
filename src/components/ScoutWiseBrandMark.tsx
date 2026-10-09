import { useThemeColors } from '@/theme';
import React from 'react';
import { View,type ImageProps,type StyleProp,type ViewStyle } from 'react-native';
import Svg,{ Circle,ClipPath,Defs,Polygon,Rect,Image as SvgImage } from 'react-native-svg';

/** Match the web brand in light mode and preserve the transparent dark-mode mark. */
export default function ScoutWiseBrandMark({style, accessible = false, accessibilityLabel, accessibilityRole, accessibilityIgnoresInvertColors}: Pick<ImageProps, 'style' | 'accessible' | 'accessibilityLabel' | 'accessibilityRole' | 'accessibilityIgnoresInvertColors'>) {
  const {TEXT, mode} = useThemeColors();
  const clip = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return <View style={style as StyleProp<ViewStyle>} accessible={accessible} accessibilityLabel={accessibilityLabel} accessibilityRole={accessibilityRole} accessibilityIgnoresInvertColors={accessibilityIgnoresInvertColors}>
    <Svg width="100%" height="100%" viewBox="0 0 1024 1024">
      <Defs><ClipPath id={clip}>{mode === 'light'
        ? <Rect width="1024" height="1024" rx={1024 * 8 / 30}/>
        : <Circle cx="512" cy="491" r="397"/>}</ClipPath></Defs>
      {mode === 'dark' && <Rect x="496" y="0" width="32" height="1024" fill={TEXT}/>}
      {mode === 'dark' && <Polygon points="0,918 218,700 306,788 70,1024 0,1024" fill={TEXT}/>}
      <SvgImage href={mode === 'light' ? require('../../assets/scoutwise_logo_green.png') : require('../../assets/scoutwise_logo.png')} width="1024" height="1024" clipPath={`url(#${clip})`}/>
    </Svg>
  </View>;
}
