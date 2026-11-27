import { useRef, useState } from "react";
import { Animated } from "react-native";
import { useNativeDriver } from "./theme";

/**
 * Shared tactile feedback for pressables: a spring scale-down on press,
 * plus hover and focus flags for web/keyboard users.
 */
export function usePressAnimation(pressedScale = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const springTo = (toValue: number) =>
    Animated.spring(scale, {
      toValue,
      useNativeDriver,
      speed: 40,
      bounciness: toValue === 1 ? 6 : 0,
    }).start();

  return {
    hovered,
    focused,
    animatedStyle: { transform: [{ scale }] },
    handlers: {
      onPressIn: () => springTo(pressedScale),
      onPressOut: () => springTo(1),
      onHoverIn: () => setHovered(true),
      onHoverOut: () => setHovered(false),
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
    },
  };
}
