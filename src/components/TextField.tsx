import React from "react";
import { StyleSheet, TextInput, TextInputProps, View } from "react-native";
import { colors, spacing } from "./theme";

export function TextField(props: TextInputProps) {
  return (
    <View style={styles.wrapper}>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    color: colors.text,
    fontSize: 17,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
});
