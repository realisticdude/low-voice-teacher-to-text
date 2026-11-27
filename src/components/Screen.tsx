import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { colors, spacing } from "./theme";

interface ScreenProps {
  children: React.ReactNode;
  /** Scrollable page (forms, home) vs. fixed full-height layout (live captions). */
  scroll?: boolean;
  /** Content column cap so lines stay readable on tablets and desktops. */
  maxWidth?: number;
  contentStyle?: StyleProp<ViewStyle>;
  /** Lets a page scroll itself (e.g. the logo's "back to top"). */
  scrollRef?: React.Ref<ScrollView>;
  /**
   * With `scroll`: the column fills the screen (so a flexible child like the
   * caption box can grow), and the page only scrolls when the content can't
   * fit, e.g. on small phones or in landscape. Keeps every control reachable.
   */
  fill?: boolean;
  /**
   * Pinned action bar below the content (outside the scroll area), for the
   * one action that must always be in reach on a phone.
   */
  footer?: React.ReactNode;
}

/**
 * Page shell: safe-area insets, keyboard avoidance, a responsive side gutter
 * (16px on phones, 24px+ wider) and a centred, width-capped content column.
 */
export function Screen({
  children,
  scroll = false,
  maxWidth = 560,
  contentStyle,
  scrollRef,
  fill = false,
  footer,
}: ScreenProps) {
  const { width } = useWindowDimensions();
  const gutter = width < 600 ? spacing.md : spacing.lg;

  const column = (
    <View style={[styles.column, { maxWidth }, (!scroll || fill) && styles.fill, contentStyle]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            style={styles.fill}
            contentContainerStyle={[
              styles.scrollContent,
              fill && styles.scrollContentFill,
              { paddingHorizontal: gutter },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {column}
          </ScrollView>
        ) : (
          <View style={[styles.fill, styles.fixedContent, { paddingHorizontal: gutter }]}>
            {column}
          </View>
        )}
        {footer ? (
          <View style={[styles.footer, { paddingHorizontal: gutter }]}>
            <View style={[styles.column, { maxWidth }]}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  footer: {
    alignItems: "center",
    paddingTop: spacing.sm + spacing.xs,
    paddingBottom: spacing.sm + spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  scrollContentFill: {
    paddingVertical: spacing.md,
  },
  fixedContent: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  column: {
    width: "100%",
  },
});
