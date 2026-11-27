import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Logo } from "../components/Logo";
import { Banner } from "../components/Banner";
import { colors, radius, readableWidth, spacing, wideBreakpoint } from "../components/theme";
import { usePressAnimation } from "../components/usePressAnimation";
import { TranscriptDownload } from "../components/TranscriptDownload";
import {
  listRecentClasses,
  TRANSCRIPT_RETENTION_MS,
  type RecentClass,
} from "../lib/recentClasses";
import { formatTime } from "../lib/transcript";
import { isSupabaseConfigured } from "../lib/supabase";

type FeatherName = React.ComponentProps<typeof Feather>["name"];

interface HomeScreenProps {
  onSelectRole: (role: "teacher" | "student") => void;
}

const STEPS: { title: string; body: string }[] = [
  { title: "Start a class", body: "Enter your name and get a 6-letter code." },
  { title: "Share the code", body: "Students type it on their own phones to join." },
  { title: "Speak naturally", body: "Your words appear on every screen as you talk." },
];

const FACTS: { icon: FeatherName; label: string }[] = [
  { icon: "clock", label: "Transcripts deleted after 24 hours" },
  { icon: "user-x", label: "No accounts or sign-up" },
  { icon: "mic", label: "Tuned for soft voices" },
];

export function HomeScreen({ onSelectRole }: HomeScreenProps) {
  const { width, height } = useWindowDimensions();
  const wide = width >= wideBreakpoint;
  // Small phones (e.g. 320×568): tighten the hero so both role cards are
  // on the first screen without scrolling.
  const compact = !wide && (width < 360 || height < 700);
  const scrollRef = useRef<ScrollView>(null);
  const [recent, setRecent] = useState<RecentClass[]>([]);

  useEffect(() => {
    listRecentClasses().then(setRecent).catch(() => {});
  }, []);

  return (
    <Screen scroll maxWidth={wide ? 1080 : 560} scrollRef={scrollRef}>
      <View style={[styles.topBar, compact && styles.topBarCompact]}>
        <Logo
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          accessibilityLabel="LiveClass Caption, back to top"
        />
      </View>

      <View style={[styles.main, wide && styles.mainWide, compact && styles.mainCompact]}>
        {/* Value proposition */}
        <View style={[styles.hero, wide && styles.heroWide, compact && styles.heroCompact]}>
          <Text variant="overline" tone="accent">
            Live classroom captions
          </Text>
          <Text variant="display" style={[wide && styles.displayWide, compact && styles.displayCompact]}>
            Every word, on every screen.
          </Text>
          <Text variant="body" tone="secondary" style={styles.lede}>
            Speak at your normal volume. Students read what you say live on their own
            phones, in Hindi or English, with no accounts and no setup.
          </Text>

          {wide && <Facts />}
        </View>

        {/* Primary actions */}
        <View style={[styles.actions, wide && styles.actionsWide]}>
          {!isSupabaseConfigured && (
            <Banner
              title="Setup needed"
              message="Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file, then restart the app."
            />
          )}
          <Text variant="overline" tone="muted">
            Choose your role
          </Text>
          <RoleCard
            compact={compact}
            icon="mic"
            title="I'm teaching"
            description="Start a class and get a code to share."
            emphasis
            onPress={() => onSelectRole("teacher")}
          />
          <RoleCard
            compact={compact}
            icon="smartphone"
            title="I'm a student"
            description="Join with the code from your teacher."
            onPress={() => onSelectRole("student")}
          />
        </View>
      </View>

      {!wide && <Facts />}

      {recent.length > 0 && <RecentClasses classes={recent} wide={wide} />}

      {/* How it works */}
      <View style={[styles.section, wide && styles.sectionWide]}>
        <Text variant="overline" tone="muted">
          How it works
        </Text>
        <View style={[styles.steps, wide && styles.stepsWide]}>
          {STEPS.map((step, i) => (
            <View key={step.title} style={[styles.step, wide && styles.stepWide]}>
              <View style={styles.stepNumber}>
                <Text variant="caption" tone="accent">
                  {i + 1}
                </Text>
              </View>
              <View style={styles.stepBody}>
                <Text variant="heading">{step.title}</Text>
                <Text variant="bodySm" tone="secondary">
                  {step.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <Text variant="caption" tone="muted" style={styles.footer}>
        Captions come from the teacher's device's built-in speech recognition. Transcripts
        are kept for 24 hours so the class can download them, then deleted automatically.
      </Text>
    </Screen>
  );
}

/**
 * Classes from the last 24 hours, so a transcript can still be saved after
 * leaving the class (the server deletes it after that).
 */
function RecentClasses({ classes, wide }: { classes: RecentClass[]; wide: boolean }) {
  return (
    <View style={[styles.section, wide && styles.sectionWide]}>
      <View style={styles.sectionHeader}>
        <Text variant="overline" tone="muted">
          Recent classes
        </Text>
        <Text variant="bodySm" tone="secondary" style={styles.lede}>
          Save a transcript before it's deleted from the server.
        </Text>
      </View>
      <View style={[styles.recentList, wide && styles.recentListWide]}>
        {classes.map((c) => {
          const hoursLeft = Math.max(
            1,
            Math.ceil((c.joinedAt + TRANSCRIPT_RETENTION_MS - Date.now()) / 3_600_000)
          );
          return (
            <View key={c.classroomId} style={[styles.recentCard, wide && styles.recentCardWide]}>
              <View style={styles.recentTop}>
                <View style={styles.recentTitle}>
                  <Text variant="mono" tone="accent">
                    {c.code}
                  </Text>
                  <Text variant="heading" numberOfLines={1}>
                    {c.teacherName}'s class
                  </Text>
                </View>
                <View style={styles.tag}>
                  <Text variant="mono" tone="secondary">
                    {c.role === "teacher" ? "Teacher" : "Student"}
                  </Text>
                </View>
              </View>
              <Text variant="mono" tone="muted">
                {c.role === "teacher" ? "Started" : "Joined"} {formatTime(new Date(c.joinedAt).toISOString())} ·
                deleted in ~{hoursLeft}h
              </Text>
              <TranscriptDownload
                classroomId={c.classroomId}
                info={{ code: c.code, teacherName: c.teacherName }}
                compact
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function Facts() {
  return (
    <View style={styles.facts}>
      {FACTS.map((fact) => (
        <View key={fact.label} style={styles.fact}>
          <Feather name={fact.icon} size={15} color={colors.textSecondary} />
          <Text variant="bodySm" tone="secondary">
            {fact.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

interface RoleCardProps {
  icon: FeatherName;
  title: string;
  description: string;
  emphasis?: boolean;
  compact?: boolean;
  onPress: () => void;
}

function RoleCard({ icon, title, description, emphasis, compact, onPress }: RoleCardProps) {
  const { hovered, focused, animatedStyle, handlers } = usePressAnimation(0.98);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={description}
      {...handlers}
    >
      <Animated.View
        style={[
          styles.roleCard,
          compact && styles.roleCardCompact,
          emphasis && styles.roleCardEmphasis,
          hovered && styles.roleCardHover,
          focused && styles.roleCardFocus,
          animatedStyle,
        ]}
      >
        <View
          style={[
            styles.roleIcon,
            compact && styles.roleIconCompact,
            emphasis && styles.roleIconEmphasis,
          ]}
        >
          <Feather
            name={icon}
            size={22}
            color={emphasis ? colors.onAccent : colors.text}
          />
        </View>
        <View style={styles.roleText}>
          <Text variant="heading">{title}</Text>
          <Text variant="bodySm" tone="secondary">
            {description}
          </Text>
        </View>
        <Feather
          name="arrow-right"
          size={20}
          color={hovered || focused ? colors.text : colors.textMuted}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    minHeight: 44,
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  topBarCompact: {
    marginBottom: spacing.md,
  },
  mainCompact: {
    gap: spacing.lg,
  },
  heroCompact: {
    gap: spacing.sm,
  },
  displayCompact: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.7,
  },
  roleCardCompact: {
    minHeight: 72,
    padding: spacing.md,
  },
  roleIconCompact: {
    width: 40,
    height: 40,
  },
  main: {
    gap: spacing.xl,
  },
  mainWide: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxxl,
    marginTop: spacing.xl,
  },
  hero: {
    gap: spacing.md,
  },
  heroWide: {
    flex: 1.1,
  },
  displayWide: {
    fontSize: 52,
    lineHeight: 58,
    letterSpacing: -1.6,
  },
  lede: {
    maxWidth: readableWidth,
  },
  actions: {
    gap: spacing.sm + spacing.xs,
  },
  actionsWide: {
    flex: 1,
  },
  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.lg,
    rowGap: spacing.sm + spacing.xs,
    marginTop: spacing.lg,
  },
  fact: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  section: {
    marginTop: spacing.section,
    gap: spacing.lg,
  },
  sectionWide: {
    marginTop: spacing.sectionWide,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  recentList: {
    gap: spacing.md,
  },
  recentListWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xl,
  },
  recentCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  recentCardWide: {
    flexBasis: 320,
    flexGrow: 1,
    maxWidth: 520,
  },
  recentTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  recentTitle: {
    flex: 1,
    gap: spacing.xxs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.sm / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  steps: {
    gap: spacing.sm,
  },
  stepsWide: {
    flexDirection: "row",
    gap: spacing.xl,
  },
  step: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepWide: {
    flex: 1,
    padding: spacing.lg,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBody: {
    flex: 1,
    gap: spacing.xs,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 88,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleCardEmphasis: {
    backgroundColor: colors.surfaceRaised,
    borderColor: colors.accentBorder,
  },
  roleCardHover: {
    backgroundColor: colors.surfaceHover,
    borderColor: colors.borderStrong,
  },
  roleCardFocus: {
    borderColor: colors.accent,
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHover,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  roleIconEmphasis: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  roleText: {
    flex: 1,
    gap: spacing.xxs,
  },
  footer: {
    marginTop: spacing.section,
    maxWidth: readableWidth,
  },
});
