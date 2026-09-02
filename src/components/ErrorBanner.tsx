import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "./theme";

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#3A1620",
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
  },
  text: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "500",
  },
});
