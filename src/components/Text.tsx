import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { colors, typography } from "./theme";

export type TextVariant = keyof typeof typography;
export type TextTone =
  | "primary"
  | "secondary"
  | "muted"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "onAccent";

const TONE_COLORS: Record<TextTone, string> = {
  primary: colors.text,
  secondary: colors.textSecondary,
  muted: colors.textMuted,
  accent: colors.accent,
  success: colors.success,
  warning: colors.warning,
  danger: colors.danger,
  onAccent: colors.onAccent,
};

interface TextProps extends RNTextProps {
  variant?: TextVariant;
  tone?: TextTone;
  align?: "left" | "center" | "right";
}

/** Typography primitive: every piece of text in the app goes through the type scale. */
export function Text({
  variant = "body",
  tone = "primary",
  align,
  style,
  ...rest
}: TextProps) {
  const isHeading = variant === "display" || variant === "title";
  return (
    <RNText
      accessibilityRole={isHeading ? "header" : undefined}
      {...rest}
      style={[
        typography[variant],
        { color: TONE_COLORS[tone] },
        align && { textAlign: align },
        style,
      ]}
    />
  );
}
