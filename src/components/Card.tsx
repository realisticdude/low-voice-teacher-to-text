import React from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { colors, radius, spacing } from "./theme";

interface CardProps extends ViewProps {
  /** Inner padding on the 8pt grid. */
  padding?: number;
  raised?: boolean;
}

/** Elevated surface. Depth comes from a lighter fill and a hairline border, not shadows. */
export function Card({ padding = spacing.lg, raised, style, ...rest }: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { padding, backgroundColor: raised ? colors.surfaceRaised : colors.surface },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
