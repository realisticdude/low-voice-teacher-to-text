import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { StatusPill } from "../components/StatusPill";
import { CaptionView } from "../components/CaptionView";
import { ErrorBanner } from "../components/ErrorBanner";
import { MicLevel } from "../components/MicLevel";
import { colors, spacing } from "../components/theme";
import {
  addParticipant,
  ClassroomServiceError,
  createClassroom,
  setClassroomActive,
} from "../services/classroomService";
import { useClassroomChannel } from "../hooks/useClassroomChannel";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { generateId } from "../lib/id";
import type { CaptionMessage, Classroom } from "../types";

interface TeacherScreenProps {
  onExit: () => void;
}

export function TeacherScreen({ onExit }: TeacherScreenProps) {
  const [teacherName, setTeacherName] = useState("");
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [creating, setCreating] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const participantId = useMemo(() => generateId(), []);

  const [finalText, setFinalText] = useState("");

  const handleFinalTranscript = (text: string) => {
    setFinalText((prev) => (prev ? `${prev} ${text}` : text));
  };

  const speech = useSpeechRecognition(handleFinalTranscript);

  const { status, studentCount, sendCaption, announceEnded } = useClassroomChannel({
    code: classroom?.code ?? "",
    participantId,
    name: teacherName,
    role: "teacher",
  });

  // Broadcast captions to students. Finalized text goes out at once; interim
  // (in-progress) text is throttled, because recognizers can emit many
  // partial results a second and Supabase rate-limits each client.
  const teacherNameRef = useRef(teacherName);
  teacherNameRef.current = teacherName;
  const lastSentTextRef = useRef("");
  const lastSentAtRef = useRef(0);
  const pendingRef = useRef<{ text: string; isFinal: boolean } | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushCaption = useCallback(() => {
    if (sendTimerRef.current) {
      clearTimeout(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    lastSentAtRef.current = Date.now();
    sendCaption({
      id: generateId(),
      text: trimCaption(pending.text),
      isFinal: pending.isFinal,
      senderName: teacherNameRef.current,
      timestamp: Date.now(),
    });
  }, [sendCaption]);

  useEffect(() => {
    if (!classroom) return;
    const interim = speech.interimText;
    const text = interim ? `${finalText} ${interim}`.trim() : finalText;
    if (text === lastSentTextRef.current) return;
    lastSentTextRef.current = text;
    pendingRef.current = { text, isFinal: !interim };

    const wait = interim
      ? Math.max(0, INTERIM_SEND_INTERVAL_MS - (Date.now() - lastSentAtRef.current))
      : 0;
    if (wait === 0) {
      flushCaption();
    } else if (!sendTimerRef.current) {
      sendTimerRef.current = setTimeout(flushCaption, wait);
    }
  }, [finalText, speech.interimText, classroom, flushCaption]);

  useEffect(
    () => () => {
      if (sendTimerRef.current) clearTimeout(sendTimerRef.current);
    },
    []
  );

  const handleCreateClassroom = async () => {
    setSetupError(null);
    setCreating(true);
    try {
      const created = await createClassroom(teacherName);
      await addParticipant(created.id, teacherName.trim(), "teacher");
      setClassroom(created);
    } catch (err) {
      setSetupError(
        err instanceof ClassroomServiceError
          ? err.message
          : "Could not create the classroom. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleEndClassroom = async () => {
    speech.stop();
    if (classroom) {
      // Tell students first: once the classroom is inactive, the realtime
      // policies no longer let the teacher send to its channel.
      try {
        await announceEnded();
      } catch {
        // Best-effort - students also notice the teacher leaving presence.
      }
      try {
        await setClassroomActive(classroom.id, false);
      } catch {
        // Best-effort - the student side will still detect a broken channel.
      }
    }
    onExit();
  };

  // Android's back button would otherwise close the app and leave the
  // classroom active with no teacher.
  const handleEndRef = useRef(handleEndClassroom);
  handleEndRef.current = handleEndClassroom;
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!classroom) {
        onExit();
        return true;
      }
      Alert.alert("End classroom?", "Students will stop receiving captions.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Classroom",
          style: "destructive",
          onPress: () => void handleEndRef.current(),
        },
      ]);
      return true;
    });
    return () => sub.remove();
  }, [classroom, onExit]);

  if (!classroom) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.container}
        >
          <Text style={styles.title}>Create a Classroom</Text>
          <Text style={styles.subtitle}>
            Enter your name to generate a classroom code for your students.
          </Text>

          <View style={{ height: spacing.lg }} />
          <TextField
            placeholder="Your name"
            value={teacherName}
            onChangeText={setTeacherName}
            autoCapitalize="words"
            maxLength={60}
            returnKeyType="done"
          />

          {setupError && (
            <>
              <View style={{ height: spacing.md }} />
              <ErrorBanner message={setupError} />
            </>
          )}

          <View style={{ height: spacing.lg }} />
          <Button
            label="Create Classroom"
            size="large"
            loading={creating}
            disabled={!teacherName.trim() || creating}
            onPress={handleCreateClassroom}
          />
          <View style={{ height: spacing.md }} />
          <Button label="Back" variant="secondary" onPress={onExit} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  const isListening =
    speech.status === "listening" || speech.status === "starting";

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.label}>Classroom Code</Text>
            <Text style={styles.code}>{classroom.code}</Text>
          </View>
          <View style={styles.rightHeader}>
            <StatusPill status={status} />
            <Text style={styles.studentCount}>
              {studentCount} student{studentCount === 1 ? "" : "s"} connected
            </Text>
          </View>
        </View>

        {speech.status === "unsupported" && (
          <ErrorBanner message="Speech recognition isn't available on this device. Captions can't be sent from here." />
        )}
        {speech.status === "permission-denied" && (
          <ErrorBanner
            message={
              speech.errorMessage ??
              "Microphone or speech recognition permission was denied. Enable it in Settings to use captions."
            }
          />
        )}
        {speech.status === "error" && speech.errorMessage && (
          <ErrorBanner message={speech.errorMessage} />
        )}

        {isListening && speech.volume !== null && (
          <MicLevel volume={speech.volume} />
        )}

        <View style={{ height: spacing.md }} />
        <CaptionView
          finalText={finalText}
          interimText={speech.interimText}
          placeholder={
            isListening
              ? "Listening… start speaking."
              : "Tap “Start Captions” and begin speaking."
          }
        />

        <View style={{ height: spacing.md }} />
        <View style={styles.controls}>
          {!isListening ? (
            <Button
              label="Start Captions"
              size="large"
              onPress={speech.start}
            />
          ) : (
            <Button
              label="Stop Captions"
              size="large"
              variant="danger"
              onPress={speech.stop}
            />
          )}
          <View style={{ height: spacing.sm }} />
          <Button
            label="End Classroom"
            variant="secondary"
            onPress={handleEndClassroom}
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
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    marginTop: spacing.xs,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  rightHeader: {
    alignItems: "flex-end",
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  code: {
    color: colors.primary,
    fontSize: 40,
    fontWeight: "800",
    letterSpacing: 4,
  },
  studentCount: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  controls: {
    marginTop: spacing.sm,
  },
});

/** Minimum gap between interim caption broadcasts (keeps us under the realtime rate limit). */
const INTERIM_SEND_INTERVAL_MS = 300;

/**
 * Each broadcast carries the transcript so far, so late joiners catch up.
 * Cap it so a long lecture doesn't outgrow Supabase's message size limit;
 * students still see the most recent part.
 */
const MAX_CAPTION_CHARS = 4000;

function trimCaption(text: string): string {
  if (text.length <= MAX_CAPTION_CHARS) return text;
  const tail = text.slice(-MAX_CAPTION_CHARS);
  const firstSpace = tail.indexOf(" ");
  return `…${firstSpace > 0 ? tail.slice(firstSpace + 1) : tail}`;
}
