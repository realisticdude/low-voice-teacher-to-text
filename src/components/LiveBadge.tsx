import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { PulseDot } from "./PulseDot";
import { colors, radius, spacing } from "./theme";

/** "LIVE" while captions are flowing, "PAUSED" otherwise. */
export function LiveBadge({ live, idleLabel = "Paused" }: { live: boolean; idleLabel?: string }) {
  return (
    <View
      style={[styles.badge, live ? styles.live : styles.idle]}
      accessibilityRole="text"
      accessibilityLabel={live ? "Captions are live" : `Captions ${idleLabel.toLowerCase()}`}
      accessibilityLiveRegion="polite"
    >
      <PulseDot color={live ? colors.live : colors.textMuted} active={live} size={7} />
      <Text variant="overline" style={{ color: live ? colors.live : colors.textMuted }}>
        {live ? "Live" : idleLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + spacing.xxs,
    paddingVertical: spacing.xxs + 1,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  live: {
    backgroundColor: "rgba(255, 77, 94, 0.10)",
    borderColor: "rgba(255, 77, 94, 0.35)",
  },
  idle: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.border,
  },
});
