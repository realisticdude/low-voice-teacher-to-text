import React from "react";
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Text } from "./Text";
import { colors, radius, spacing, touchTarget } from "./theme";
import { usePressAnimation } from "./usePressAnimation";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
type IconName = React.ComponentProps<typeof Feather>["name"];

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to the container width (default) or hug the content. */
  fullWidth?: boolean;
  accessibilityHint?: string;
}

const HEIGHTS: Record<Size, number> = { sm: touchTarget, md: 48, lg: 56 };

const PALETTE: Record<
  Variant,
  { bg: string; bgHover: string; border: string; fg: string }
> = {
  primary: {
    bg: colors.accent,
    bgHover: colors.accentHover,
    border: colors.accent,
    fg: colors.onAccent,
  },
  secondary: {
    bg: colors.surfaceRaised,
    bgHover: colors.surfaceHover,
    border: colors.border,
    fg: colors.text,
  },
  ghost: {
    bg: "transparent",
    bgHover: colors.surfaceRaised,
    border: "transparent",
    fg: colors.textSecondary,
  },
  danger: {
    bg: colors.dangerSoft,
    bgHover: "rgba(255, 107, 112, 0.2)",
    border: colors.dangerBorder,
    fg: colors.danger,
  },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  disabled,
  loading,
  fullWidth = true,
  accessibilityHint,
}: ButtonProps) {
  const inactive = Boolean(disabled || loading);
  const { hovered, focused, animatedStyle, handlers } = usePressAnimation();
  const palette = PALETTE[variant];
  const iconSize = size === "lg" ? 20 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: Boolean(loading) }}
      style={[!fullWidth && styles.hug]}
      {...handlers}
    >
      <Animated.View
        style={[
          styles.base,
          {
            minHeight: HEIGHTS[size],
            paddingHorizontal: size === "sm" ? spacing.md : spacing.lg,
            backgroundColor: hovered && !inactive ? palette.bgHover : palette.bg,
            borderColor: palette.border,
          },
          focused && styles.focusRing,
          inactive && styles.inactive,
          animatedStyle,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} size="small" />
        ) : (
          icon && <Feather name={icon} size={iconSize} color={palette.fg} />
        )}
        <Text
          variant={size === "lg" ? "heading" : "label"}
          style={{ color: palette.fg }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {iconRight && !loading && (
          <View style={styles.iconRight}>
            <Feather name={iconRight} size={iconSize} color={palette.fg} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hug: {
    alignSelf: "flex-start",
  },
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  iconRight: {
    marginLeft: spacing.xxs,
  },
  focusRing: {
    borderColor: colors.accentHover,
    borderWidth: 2,
  },
  inactive: {
    opacity: 0.45,
  },
});
