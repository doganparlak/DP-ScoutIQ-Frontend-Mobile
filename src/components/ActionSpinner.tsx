import React from 'react';
import { Animated, Easing } from 'react-native';
import { RefreshCw } from 'lucide-react-native';

/** Matches the web's RefreshCw animate-spin action indicator. */
export default function ActionSpinner({size = 17, color}: {size?: number; color: string}) {
  const progress = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    const animation = Animated.loop(Animated.timing(progress, {
      toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [progress]);
  return <Animated.View style={{width:size, height:size, transform:[{rotate:progress.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})}]}}>
    <RefreshCw size={size} color={color}/>
  </Animated.View>;
}
