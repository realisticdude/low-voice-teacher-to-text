import React from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { colors, fonts, radius, spacing, touchTarget } from "./theme";
import { usePressAnimation } from "./usePressAnimation";

interface LogoProps {
  showWordmark?: boolean;
  /**
   * Makes the logo a button (e.g. "back to top" or "leave class"). The mark
   * sits in the top-left corner, where people expect to tap.
   */
  onPress?: () => void;
  /** Spoken name of what pressing the logo does. */
  accessibilityLabel?: string;
}

/**
 * Brand mark: a "CC" (closed captions) tile plus the wordmark. The tile used
 * to be two horizontal bars, which read as a ☰ menu button that did nothing.
 */
export function Logo({ showWordmark = true, onPress, accessibilityLabel }: LogoProps) {
  const { hovered, focused, animatedStyle, handlers } = usePressAnimation(0.95);

  const content = (
    <View style={styles.row}>
      <View style={[styles.mark, hovered && styles.markHover]}>
        <Text style={styles.markText} accessible={false}>
          CC
        </Text>
      </View>
      {showWordmark && (
        <Text variant="heading" accessible={false}>
          LiveClass Caption
        </Text>
      )}
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel="LiveClass Caption">
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? "LiveClass Caption"}
      hitSlop={8}
      style={styles.pressable}
      {...handlers}
    >
      <Animated.View style={[styles.pressTarget, focused && styles.focused, animatedStyle]}>
        {content}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: "flex-start",
  },
  pressTarget: {
    minHeight: touchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
    marginHorizontal: -spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
  },
  focused: {
    borderColor: colors.accent,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + spacing.xxs,
  },
  mark: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  markHover: {
    backgroundColor: colors.accentHover,
  },
  markText: {
    fontFamily: fonts.monoBold,
    fontSize: 12,
    lineHeight: 14,
    letterSpacing: 0.5,
    color: colors.onAccent,
  },
});
