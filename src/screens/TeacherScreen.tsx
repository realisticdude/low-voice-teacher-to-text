import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { StatusPill } from "../components/StatusPill";
import { CaptionView } from "../components/CaptionView";
import { ErrorBanner } from "../components/ErrorBanner";
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

  // Broadcast the finalized transcript to students as it grows.
  const lastSentFinalRef = useRef("");
  useEffect(() => {
    if (!classroom || finalText === lastSentFinalRef.current) return;
    lastSentFinalRef.current = finalText;
    const message: CaptionMessage = {
      id: generateId(),
      text: finalText,
      isFinal: true,
      senderName: teacherName,
      timestamp: Date.now(),
    };
    sendCaption(message);
  }, [finalText, classroom, teacherName, sendCaption]);

  // Broadcast interim (in-progress) text so students see captions with less delay.
  useEffect(() => {
    if (!classroom) return;
    const message: CaptionMessage = {
      id: generateId(),
      text: speech.interimText
        ? `${finalText} ${speech.interimText}`.trim()
        : finalText,
      isFinal: false,
      senderName: teacherName,
      timestamp: Date.now(),
    };
    sendCaption(message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.interimText]);

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
