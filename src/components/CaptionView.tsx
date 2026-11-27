import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Text } from "./Text";
import { colors, fonts, radius, spacing } from "./theme";

interface CaptionViewProps {
  finalText: string;
  /** In-progress words, shown dimmed after the finalized text. */
  interimText?: string;
  placeholder: string;
  placeholderHint?: string;
  /** Caption font size; line height follows at 1.4x for readability. */
  fontSize?: number;
  /** Row above the transcript (title, live badge, size controls). */
  header?: React.ReactNode;
}

/** Large, auto-scrolling transcript panel shared by the teacher and student screens. */
export function CaptionView({
  finalText,
  interimText,
  placeholder,
  placeholderHint,
  fontSize = 26,
  header,
}: CaptionViewProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [finalText, interimText, fontSize]);

  const hasContent = finalText.length > 0 || Boolean(interimText);
  const textStyle = { fontSize, lineHeight: Math.round(fontSize * 1.4) };

  return (
    <View style={styles.container}>
      {header ? <View style={styles.header}>{header}</View> : null}
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Live transcript"
      >
        {hasContent ? (
          <Text style={[styles.caption, textStyle]} selectable>
            {finalText}
            {interimText ? (
              <Text style={[styles.caption, styles.interim, textStyle]}>
                {finalText ? " " : ""}
                {interimText}
              </Text>
            ) : null}
          </Text>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Feather name="message-square" size={22} color={colors.textMuted} />
            </View>
            <Text variant="heading" tone="secondary" align="center">
              {placeholder}
            </Text>
            {placeholderHint ? (
              <Text variant="bodySm" tone="muted" align="center">
                {placeholderHint}
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 220,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  caption: {
    fontFamily: fonts.medium,
    color: colors.text,
    letterSpacing: -0.2,
  },
  interim: {
    color: colors.textMuted,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
});
