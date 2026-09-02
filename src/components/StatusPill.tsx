import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "./theme";
import type { ConnectionStatus } from "../types";

const STATUS_CONFIG: Record<
  ConnectionStatus,
  { label: string; color: string }
> = {
  connecting: { label: "Connecting…", color: colors.warning },
  connected: { label: "Connected", color: colors.success },
  disconnected: { label: "Disconnected", color: colors.textMuted },
  error: { label: "Connection error", color: colors.danger },
};

export function StatusPill({ status }: { status: ConnectionStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <View style={styles.container}>
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text style={styles.label}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "500",
  },
});
