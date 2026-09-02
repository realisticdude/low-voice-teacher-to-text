import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, spacing } from "./theme";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  size?: "large" | "medium";
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
  loading,
  size = "medium",
}: ButtonProps) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        size === "large" && styles.large,
        isPrimary && { backgroundColor: colors.primary },
        isDanger && { backgroundColor: colors.danger },
        !isPrimary && !isDanger && styles.secondary,
        (disabled || loading) && styles.disabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {loading && (
          <ActivityIndicator
            color={isPrimary || isDanger ? colors.primaryText : colors.text}
            style={{ marginRight: spacing.sm }}
          />
        )}
        <Text
          style={[
            styles.label,
            size === "large" && styles.labelLarge,
            isPrimary || isDanger
              ? { color: colors.primaryText }
              : { color: colors.text },
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  large: {
    paddingVertical: spacing.lg,
  },
  secondary: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  labelLarge: {
    fontSize: 19,
  },
});
