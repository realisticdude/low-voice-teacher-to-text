import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Button } from "../components/Button";
import { colors, spacing } from "../components/theme";
import { isSupabaseConfigured } from "../lib/supabase";
import { ErrorBanner } from "../components/ErrorBanner";

interface HomeScreenProps {
  onSelectRole: (role: "teacher" | "student") => void;
}

export function HomeScreen({ onSelectRole }: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>LiveClass Caption</Text>
          <Text style={styles.subtitle}>
            Live speech captions for your classroom
          </Text>
        </View>

        {!isSupabaseConfigured && (
          <ErrorBanner message="Supabase is not configured yet. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file, then restart the app." />
        )}

        <View style={styles.buttons}>
          <Button
            label="I'm a Teacher"
            size="large"
            onPress={() => onSelectRole("teacher")}
          />
          <View style={{ height: spacing.md }} />
          <Button
            label="I'm a Student"
            size="large"
            variant="secondary"
            onPress={() => onSelectRole("student")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    marginTop: spacing.xs,
  },
  buttons: {
    marginBottom: spacing.xl,
  },
});
