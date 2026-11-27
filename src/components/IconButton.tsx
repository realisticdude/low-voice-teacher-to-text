import React from "react";
import { Animated, Pressable, StyleSheet } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { colors, radius, touchTarget } from "./theme";
import { usePressAnimation } from "./usePressAnimation";

interface IconButtonProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  /** Required: icon-only controls need a spoken name. */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}

/** Square 44x44 control for icon-only actions. */
export function IconButton({ icon, label, onPress, disabled, children }: IconButtonProps) {
  const { hovered, focused, animatedStyle, handlers } = usePressAnimation(0.92);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      hitSlop={4}
      {...handlers}
    >
      <Animated.View
        style={[
          styles.base,
          hovered && !disabled && styles.hovered,
          focused && styles.focused,
          disabled && styles.disabled,
          animatedStyle,
        ]}
      >
        {children ?? <Feather name={icon} size={18} color={colors.text} />}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hovered: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.borderStrong,
  },
  focused: {
    borderColor: colors.accent,
  },
  disabled: {
    opacity: 0.4,
  },
});
