import React from "react";
import { StyleSheet, View } from "react-native";
import { IconButton } from "./IconButton";
import { Text } from "./Text";
import { colors, fonts, spacing } from "./theme";

export const CAPTION_SIZES = [20, 24, 28, 34, 42] as const;

interface TextSizeControlProps {
  /** Index into CAPTION_SIZES. */
  value: number;
  onChange: (index: number) => void;
}

/** A− / A+ stepper so each student can pick a caption size they can read from their seat. */
export function TextSizeControl({ value, onChange }: TextSizeControlProps) {
  const atMin = value <= 0;
  const atMax = value >= CAPTION_SIZES.length - 1;

  return (
    <View style={styles.row}>
      <IconButton
        icon="minus"
        label="Smaller captions"
        disabled={atMin}
        onPress={() => onChange(value - 1)}
      >
        <Text style={[styles.glyph, { fontSize: 13 }]}>A</Text>
      </IconButton>
      <Text variant="caption" tone="muted" style={styles.value}>
        {CAPTION_SIZES[value]}
      </Text>
      <IconButton
        icon="plus"
        label="Larger captions"
        disabled={atMax}
        onPress={() => onChange(value + 1)}
      >
        <Text style={[styles.glyph, { fontSize: 19 }]}>A</Text>
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  glyph: {
    fontFamily: fonts.semibold,
    color: colors.text,
  },
  value: {
    minWidth: 22,
    textAlign: "center",
    fontFamily: fonts.mono,
  },
});
