import React, { useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, StyleSheet, useWindowDimensions, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { StatusPill } from "../components/StatusPill";
import { CaptionView } from "../components/CaptionView";
import { Banner } from "../components/Banner";
import { LiveBadge } from "../components/LiveBadge";
import { CAPTION_SIZES, TextSizeControl } from "../components/TextSizeControl";
import { SegmentedControl } from "../components/SegmentedControl";
import { TranscriptDownload } from "../components/TranscriptDownload";
import { colors, fonts, spacing, wideBreakpoint } from "../components/theme";
import {
  addParticipant,
  ClassroomServiceError,
  findActiveClassroomByCode,
} from "../services/classroomService";
import { useClassroomChannel } from "../hooks/useClassroomChannel";
import { generateId } from "../lib/id";
import { LANGUAGES } from "../lib/languages";
import { rememberClass } from "../lib/recentClasses";
import type { CaptionMessage, Classroom } from "../types";

interface StudentScreenProps {
  onExit: () => void;
}

const CODE_LENGTH = 6;
const CAPTION_SIZE_KEY = "captionSizeIndex";
const DEFAULT_SIZE_INDEX = 2;
const READING_LANGUAGE_KEY = "captionReadingLanguage";

/** What a student reads: the teacher's own words, or the English translation. */
type ReadingLanguage = "original" | "en";

export function StudentScreen({ onExit }: StudentScreenProps) {
  const [studentName, setStudentName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<{ message: string; field?: "code" } | null>(null);
  const [caption, setCaption] = useState<CaptionMessage | null>(null);
  const [sizeIndex, setSizeIndex] = useState(DEFAULT_SIZE_INDEX);
  const [readingLanguage, setReadingLanguage] = useState<ReadingLanguage>("original");

  const participantId = useMemo(() => generateId(), []);

  const { status, ended, teacherPresent } = useClassroomChannel({
    code: classroom?.code ?? "",
    participantId,
    name: studentName,
    role: "student",
    onCaptionReceived: (message) => setCaption(message),
  });

  // Remember each student's preferred caption size on this device.
  useEffect(() => {
    AsyncStorage.getItem(CAPTION_SIZE_KEY)
      .then((stored) => {
        const index = Number(stored);
        if (stored !== null && Number.isInteger(index) && index >= 0 && index < CAPTION_SIZES.length) {
          setSizeIndex(index);
        }
      })
      .catch(() => {});
  }, []);

  // Remember whether this student prefers Hindi or English captions.
  useEffect(() => {
    AsyncStorage.getItem(READING_LANGUAGE_KEY)
      .then((stored) => {
        if (stored === "original" || stored === "en") setReadingLanguage(stored);
      })
      .catch(() => {});
  }, []);

  const handleReadingLanguageChange = (next: ReadingLanguage) => {
    setReadingLanguage(next);
    AsyncStorage.setItem(READING_LANGUAGE_KEY, next).catch(() => {});
  };

  const handleSizeChange = (index: number) => {
    setSizeIndex(index);
    AsyncStorage.setItem(CAPTION_SIZE_KEY, String(index)).catch(() => {});
  };

  const handleJoin = async () => {
    setJoinError(null);
    setJoining(true);
    try {
      const found = await findActiveClassroomByCode(codeInput);
      await addParticipant(found.id, studentName.trim(), "student");
      setClassroom(found);
      void rememberClass({
        classroomId: found.id,
        code: found.code,
        teacherName: found.teacher_name,
        role: "student",
        joinedAt: Date.now(),
      });
    } catch (err) {
      if (err instanceof ClassroomServiceError) {
        const isCodeProblem = err.code === "NOT_FOUND" || err.code === "INACTIVE";
        setJoinError({ message: err.message, field: isCodeProblem ? "code" : undefined });
      } else {
        setJoinError({ message: "Could not join the class. Please try again." });
      }
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    setClassroom(null);
    setCaption(null);
    onExit();
  };

  // Android's back button returns to Home instead of closing the app.
  const handleLeaveRef = useRef(handleLeave);
  handleLeaveRef.current = handleLeave;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleLeaveRef.current();
      return true;
    });
    return () => sub.remove();
  }, []);

  if (!classroom) {
    const canSubmit =
      Boolean(studentName.trim()) && codeInput.length === CODE_LENGTH && !joining;

    return (
      <Screen scroll maxWidth={480}>
        <Button label="Back" icon="arrow-left" variant="ghost" size="sm" fullWidth={false} onPress={onExit} />

        <View style={styles.setupHeader}>
          <Text variant="overline" tone="accent">
            Student
          </Text>
          <Text variant="title">Join a class</Text>
          <Text variant="body" tone="secondary">
            Enter the 6-letter code your teacher shared. Captions start as soon as they
            speak.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Class code"
            code
            placeholder="ABC234"
            value={codeInput}
            onChangeText={(text) => {
              setCodeInput(text.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, CODE_LENGTH));
              if (joinError?.field === "code") setJoinError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            // No maxLength: it would count spaces/dashes in a pasted code
            // before they're stripped. onChangeText caps the length instead.
            error={joinError?.field === "code" ? joinError.message : null}
            hint={`${codeInput.length}/${CODE_LENGTH} characters`}
            autoFocus
          />
          <TextField
            label="Your name"
            hint="Your teacher sees this in the class."
            placeholder="e.g. Priya"
            value={studentName}
            onChangeText={setStudentName}
            autoCapitalize="words"
            autoComplete="name"
            maxLength={60}
            returnKeyType="go"
            onSubmitEditing={() => canSubmit && handleJoin()}
          />

          {joinError && !joinError.field ? (
            <Banner title="Couldn't join" message={joinError.message} />
          ) : null}

          <Button
            label={joining ? "Joining…" : "Join class"}
            iconRight="arrow-right"
            size="lg"
            loading={joining}
            disabled={!canSubmit}
            onPress={handleJoin}
          />
        </View>
      </Screen>
    );
  }

  return (
    <LiveView
      classroom={classroom}
      status={status}
      ended={ended}
      teacherPresent={teacherPresent}
      caption={caption}
      readingLanguage={readingLanguage}
      onReadingLanguageChange={handleReadingLanguageChange}
      sizeIndex={sizeIndex}
      onSizeChange={handleSizeChange}
      onLeave={handleLeave}
    />
  );
}

interface LiveViewProps {
  classroom: Classroom;
  status: React.ComponentProps<typeof StatusPill>["status"];
  ended: boolean;
  teacherPresent: boolean;
  /** Latest caption broadcast (carries both languages once Hindi is spoken). */
  caption: CaptionMessage | null;
  readingLanguage: ReadingLanguage;
  onReadingLanguageChange: (language: ReadingLanguage) => void;
  sizeIndex: number;
  onSizeChange: (index: number) => void;
  onLeave: () => void;
}

function LiveView({
  classroom,
  status,
  ended,
  teacherPresent,
  caption,
  readingLanguage,
  onReadingLanguageChange,
  sizeIndex,
  onSizeChange,
  onLeave,
}: LiveViewProps) {
  const { width } = useWindowDimensions();
  const wide = width >= wideBreakpoint;
  const receiving = useRecentlyReceived(caption?.timestamp ?? null);
  const live = receiving && status === "connected" && teacherPresent && !ended;

  // The teacher only sends an English version once Hindi has been spoken.
  const translationOffered = caption?.translatedText !== undefined;
  const showEnglish = translationOffered && readingLanguage === "en";
  const captionText = (showEnglish ? caption?.translatedText : caption?.text) ?? "";
  const translationDown = showEnglish && caption?.translationStatus === "unavailable";

  return (
    <Screen maxWidth={wide ? 1000 : 640}>
      <View style={styles.liveHeader}>
        <View style={styles.classInfo}>
          <Text variant="overline" tone="muted">
            Class{" "}
            <Text variant="overline" style={styles.inlineCode}>
              {classroom.code}
            </Text>
          </Text>
          <Text variant="heading" numberOfLines={1}>
            {classroom.teacher_name}'s class
          </Text>
        </View>
        <StatusPill status={status} />
      </View>

      <View style={styles.stack}>
        {ended ? (
          <Banner
            tone="info"
            icon="check-circle"
            title="Class ended"
            message="Your teacher ended this class. Save the transcript below; it's deleted from the server after 24 hours."
          />
        ) : !teacherPresent ? (
          <Banner
            tone="warning"
            title="Teacher disconnected"
            message="Captions will continue automatically when they reconnect."
          />
        ) : null}
        {translationDown ? (
          <Banner
            tone="warning"
            icon="globe"
            title="English translation unavailable"
            message="Sentences that couldn't be translated are shown in Hindi."
          />
        ) : null}

        <CaptionView
          finalText={captionText}
          fontSize={CAPTION_SIZES[sizeIndex]}
          placeholder={
            showEnglish && caption?.text
              ? "Translating…"
              : ended
                ? "No captions were sent"
                : "Waiting for your teacher"
          }
          placeholderHint={
            showEnglish && caption?.text
              ? "English appears after each sentence your teacher finishes."
              : ended
                ? "This class ended before your teacher started speaking."
                : "Captions will appear here as soon as they start speaking."
          }
          header={
            <>
              <LiveBadge live={live} idleLabel={ended ? "Ended" : "Waiting"} />
              <View style={styles.headerControls}>
                {translationOffered ? (
                  <SegmentedControl
                    compact
                    label="Caption language"
                    value={readingLanguage}
                    onChange={onReadingLanguageChange}
                    options={[
                      { value: "original", label: LANGUAGES.hi.shortLabel, accessibilityLabel: "Hindi" },
                      { value: "en", label: LANGUAGES.en.shortLabel, accessibilityLabel: "English" },
                    ]}
                  />
                ) : null}
                <TextSizeControl value={sizeIndex} onChange={onSizeChange} />
              </View>
            </>
          }
        />

        <TranscriptDownload
          classroomId={classroom.id}
          info={{ code: classroom.code, teacherName: classroom.teacher_name }}
          compact={!ended}
        />

        <Button
          label={ended ? "Back to home" : "Leave class"}
          icon={ended ? "home" : "log-out"}
          variant={ended ? "primary" : "secondary"}
          onPress={onLeave}
        />
      </View>
    </Screen>
  );
}

/**
 * True while captions keep arriving. Students can't see whether the teacher's
 * mic is on, so "live" means "a caption came in within the last few seconds".
 * Uses the local receive time, since phone clocks can disagree.
 */
const LIVE_WINDOW_MS = 8000;

function useRecentlyReceived(lastCaptionAt: number | null): boolean {
  const [receivedAt, setReceivedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (lastCaptionAt !== null) setReceivedAt(Date.now());
  }, [lastCaptionAt]);

  useEffect(() => {
    if (receivedAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 2000);
    return () => clearInterval(timer);
  }, [receivedAt]);

  return receivedAt !== null && Math.max(now, receivedAt) - receivedAt < LIVE_WINDOW_MS;
}

const styles = StyleSheet.create({
  setupHeader: {
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  form: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  liveHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    minHeight: 44,
    marginBottom: spacing.md,
  },
  classInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  inlineCode: {
    fontFamily: fonts.monoBold,
    color: colors.accent,
    letterSpacing: 2,
  },
  headerControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  stack: {
    flex: 1,
    gap: spacing.md,
  },
});
