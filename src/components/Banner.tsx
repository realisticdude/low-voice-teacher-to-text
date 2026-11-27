import React from "react";
import { StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Text } from "./Text";
import { colors, radius, spacing } from "./theme";

type Tone = "danger" | "warning" | "info";

const TONES: Record<
  Tone,
  { bg: string; border: string; fg: string; icon: React.ComponentProps<typeof Feather>["name"] }
> = {
  danger: { bg: colors.dangerSoft, border: colors.dangerBorder, fg: colors.danger, icon: "alert-circle" },
  warning: {
    bg: colors.warningSoft,
    border: "rgba(242, 184, 75, 0.35)",
    fg: colors.warning,
    icon: "wifi-off",
  },
  info: { bg: colors.accentSoft, border: colors.accentBorder, fg: colors.accent, icon: "info" },
};

interface BannerProps {
  tone?: Tone;
  title?: string;
  message: string;
  icon?: React.ComponentProps<typeof Feather>["name"];
  children?: React.ReactNode;
}

/** Inline status message. Errors are announced to screen readers. */
export function Banner({ tone = "danger", title, message, icon, children }: BannerProps) {
  const t = TONES[tone];
  return (
    <View
      accessibilityRole={tone === "danger" ? "alert" : "summary"}
      accessibilityLiveRegion={tone === "danger" ? "assertive" : "polite"}
      style={[styles.container, { backgroundColor: t.bg, borderColor: t.border }]}
    >
      <Feather name={icon ?? t.icon} size={18} color={t.fg} style={styles.icon} />
      <View style={styles.body}>
        {title ? (
          <Text variant="label" style={{ color: t.fg }}>
            {title}
          </Text>
        ) : null}
        <Text variant="bodySm" tone={title ? "secondary" : "primary"}>
          {message}
        </Text>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.sm + spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  icon: {
    marginTop: 1,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
});
