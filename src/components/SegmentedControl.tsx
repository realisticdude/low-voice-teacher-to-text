import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { colors, fonts, radius, spacing, touchTarget } from "./theme";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  /** Spoken name when the visible label is an abbreviation. */
  accessibilityLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Spoken name of the whole group, e.g. "Caption language". */
  label: string;
  disabled?: boolean;
  /** Smaller pill for headers; still a 44px touch target via hitSlop. */
  compact?: boolean;
}

/** Pick-one control (language pickers). Announced as a radio group. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
  compact,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={[styles.group, compact && styles.groupCompact, disabled && styles.disabled]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => !selected && onChange(option.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ checked: selected, disabled: Boolean(disabled) }}
            hitSlop={compact ? { top: 6, bottom: 6 } : undefined}
            style={(state) => [
              styles.segment,
              compact && styles.segmentCompact,
              selected && styles.selected,
              // react-native-web adds `hovered`; native never sets it.
              !selected &&
                (state as { hovered?: boolean }).hovered &&
                !disabled &&
                styles.hovered,
            ]}
          >
            <Text
              style={[
                styles.label,
                compact && styles.labelCompact,
                { color: selected ? colors.onAccent : colors.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    padding: spacing.xs,
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  groupCompact: {
    padding: 3,
    gap: 3,
    borderRadius: radius.sm + 2,
  },
  segment: {
    flex: 1,
    minHeight: touchTarget - spacing.xs * 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentCompact: {
    flex: 0,
    minHeight: 32,
    minWidth: 44,
    paddingHorizontal: spacing.sm + spacing.xs,
  },
  selected: {
    backgroundColor: colors.accent,
  },
  hovered: {
    backgroundColor: colors.surfaceHover,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 20,
  },
  labelCompact: {
    fontFamily: fonts.mono,
    fontSize: 13,
    letterSpacing: 0.26,
  },
  disabled: {
    opacity: 0.5,
  },
});
