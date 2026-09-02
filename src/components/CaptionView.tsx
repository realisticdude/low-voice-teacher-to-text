import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, spacing } from "./theme";

interface CaptionViewProps {
  finalText: string;
  interimText?: string;
  placeholder: string;
}

/** Large, auto-scrolling caption area shared by teacher and student screens. */
export function CaptionView({
  finalText,
  interimText,
  placeholder,
}: CaptionViewProps) {
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [finalText, interimText]);

  const hasContent = finalText.length > 0 || Boolean(interimText);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {hasContent ? (
          <Text style={styles.text}>
            {finalText}
            {interimText ? (
              <Text style={styles.interim}> {interimText}</Text>
            ) : null}
          </Text>
        ) : (
          <Text style={styles.placeholder}>{placeholder}</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollContent: {
    padding: spacing.lg,
    flexGrow: 1,
  },
  text: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 36,
    fontWeight: "500",
  },
  interim: {
    color: colors.textMuted,
  },
  placeholder: {
    color: colors.textMuted,
    fontSize: 20,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
