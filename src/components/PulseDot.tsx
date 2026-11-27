import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useNativeDriver } from "./theme";

interface PulseDotProps {
  color: string;
  /** When true, a soft halo pulses outward (live / connecting). */
  active?: boolean;
  size?: number;
}

/** Status dot with an optional breathing halo. Uses transform/opacity only, so it stays at 60fps. */
export function PulseDot({ color, active = false, size = 8 }: PulseDotProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      progress.stopAnimation();
      progress.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1400,
        useNativeDriver,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [active, progress]);

  return (
    <View style={{ width: size, height: size }} accessible={false}>
      {active && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: size,
              backgroundColor: color,
              opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
              transform: [
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) },
              ],
            },
          ]}
        />
      )}
      <View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: color }]} />
    </View>
  );
}
