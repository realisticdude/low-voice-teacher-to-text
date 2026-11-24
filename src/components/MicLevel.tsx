import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "./theme";

// expo-speech-recognition reports levels from about -2 to 10; below 0 is
// inaudible. Quiet-but-audible speech tends to sit in the low single digits.
const MIN = -2;
const MAX = 10;
const QUIET_BELOW = 2;

/** Live mic input meter, so a soft-spoken teacher can see they're being heard. */
export function MicLevel({ volume }: { volume: number }) {
  const fraction = Math.min(1, Math.max(0, (volume - MIN) / (MAX - MIN)));

  let label = "Good level";
  let color = colors.success;
  if (volume < 0) {
    label = "No sound";
    color = colors.textMuted;
  } else if (volume < QUIET_BELOW) {
    label = "Quiet — move the phone closer";
    color = colors.warning;
  }

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Microphone level: ${label}`}
    >
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(fraction * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
  },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  label: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
});
