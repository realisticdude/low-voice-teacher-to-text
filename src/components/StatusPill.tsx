import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { PulseDot } from "./PulseDot";
import { colors, radius, spacing } from "./theme";
import type { ConnectionStatus } from "../types";

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string }> = {
  connecting: { label: "Connecting", color: colors.warning },
  connected: { label: "Connected", color: colors.success },
  disconnected: { label: "Disconnected", color: colors.textMuted },
  error: { label: "Connection error", color: colors.danger },
};

export function StatusPill({ status }: { status: ConnectionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLabel={`Connection status: ${config.label}`}
      accessibilityLiveRegion="polite"
    >
      <PulseDot color={config.color} active={status === "connecting"} />
      <Text variant="caption" tone="secondary">
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs + spacing.xxs,
    paddingHorizontal: spacing.sm + spacing.xs,
    borderRadius: radius.pill,
    alignSelf: "flex-start",
  },
});
