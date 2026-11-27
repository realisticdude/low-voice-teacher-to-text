import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { colors, radius, spacing } from "./theme";

// expo-speech-recognition reports levels from about -2 to 10; below 0 is
// inaudible. Quiet-but-audible speech tends to sit in the low single digits.
const MIN = -2;
const MAX = 10;
const QUIET_BELOW = 2;
const SEGMENTS = 16;

/** Segmented live mic meter, so a soft-spoken teacher can see they're being heard. */
export function MicLevel({ volume }: { volume: number }) {
  const fraction = Math.min(1, Math.max(0, (volume - MIN) / (MAX - MIN)));
  const lit = Math.round(fraction * SEGMENTS);

  let label = "Good level";
  let color: string = colors.success;
  if (volume < 0) {
    label = "No sound detected";
    color = colors.textMuted;
  } else if (volume < QUIET_BELOW) {
    label = "Quiet — move the phone closer";
    color = colors.warning;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Microphone level"
      accessibilityValue={{ text: label }}
    >
      <View style={styles.meter}>
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <View
            key={i}
            style={[styles.segment, { backgroundColor: i < lit ? color : colors.surfaceHover }]}
          />
        ))}
      </View>
      <Text variant="caption" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  meter: {
    flexDirection: "row",
    gap: 3,
    height: 8,
  },
  segment: {
    flex: 1,
    borderRadius: radius.sm / 4,
  },
});
