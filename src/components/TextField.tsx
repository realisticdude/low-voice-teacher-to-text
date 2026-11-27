import React, { useState } from "react";
import { StyleSheet, TextInput, type TextInputProps, View } from "react-native";
import { Text } from "./Text";
import { colors, fonts, radius, spacing } from "./theme";

interface TextFieldProps extends Omit<TextInputProps, "style"> {
  label: string;
  /** Helper text under the field; replaced by `error` when that is set. */
  hint?: string;
  error?: string | null;
  /** Large monospace style for short codes. */
  code?: boolean;
}

export function TextField({
  label,
  hint,
  error,
  code,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const helper = error || hint;

  return (
    <View style={styles.wrapper}>
      <Text variant="label" tone="secondary" nativeID={`${label}-label`}>
        {label}
      </Text>
      <View
        style={[
          styles.field,
          focused && styles.fieldFocused,
          Boolean(error) && styles.fieldError,
        ]}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${label}-label`}
          accessibilityHint={helper ?? undefined}
          style={[styles.input, code && styles.codeInput]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
      </View>
      {helper ? (
        <Text variant="caption" tone={error ? "danger" : "muted"}>
          {helper}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  field: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceRaised,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
    // Web draws its own focus outline inside the field; the border handles focus here.
    outlineStyle: "none",
  } as object,
  codeInput: {
    minHeight: 64,
    fontFamily: fonts.monoBold,
    fontSize: 26,
    letterSpacing: 8,
    textAlign: "center",
  },
});
