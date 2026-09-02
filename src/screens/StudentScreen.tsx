import React, { useMemo, useState } from "react";
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
  findActiveClassroomByCode,
} from "../services/classroomService";
import { useClassroomChannel } from "../hooks/useClassroomChannel";
import { generateId } from "../lib/id";
import type { CaptionMessage, Classroom } from "../types";

interface StudentScreenProps {
  onExit: () => void;
}

export function StudentScreen({ onExit }: StudentScreenProps) {
  const [studentName, setStudentName] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [caption, setCaption] = useState<CaptionMessage | null>(null);

  const participantId = useMemo(() => generateId(), []);

  const { status } = useClassroomChannel({
    code: classroom?.code ?? "",
    participantId,
    name: studentName,
    role: "student",
    onCaptionReceived: (message) => setCaption(message),
  });

  const handleJoin = async () => {
    setJoinError(null);
    setJoining(true);
    try {
      const found = await findActiveClassroomByCode(codeInput);
      await addParticipant(found.id, studentName.trim(), "student");
      setClassroom(found);
    } catch (err) {
      setJoinError(
        err instanceof ClassroomServiceError
          ? err.message
          : "Could not join the classroom. Please try again."
      );
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = () => {
    setClassroom(null);
    setCaption(null);
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
          <Text style={styles.title}>Join a Classroom</Text>
          <Text style={styles.subtitle}>
            Enter your name and the classroom code from your teacher.
          </Text>

          <View style={{ height: spacing.lg }} />
          <TextField
            placeholder="Your name"
            value={studentName}
            onChangeText={setStudentName}
            autoCapitalize="words"
            returnKeyType="next"
          />
          <View style={{ height: spacing.sm }} />
          <TextField
            placeholder="Classroom code"
            value={codeInput}
            onChangeText={(text) => setCodeInput(text.toUpperCase())}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            returnKeyType="done"
          />

          {joinError && (
            <>
              <View style={{ height: spacing.md }} />
              <ErrorBanner message={joinError} />
            </>
          )}

          <View style={{ height: spacing.lg }} />
          <Button
            label="Join Classroom"
            size="large"
            loading={joining}
            disabled={!studentName.trim() || !codeInput.trim() || joining}
            onPress={handleJoin}
          />
          <View style={{ height: spacing.md }} />
          <Button label="Back" variant="secondary" onPress={onExit} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.label}>Classroom</Text>
            <Text style={styles.code}>{classroom.code}</Text>
          </View>
          <StatusPill status={status} />
        </View>

        <View style={{ height: spacing.md }} />
        <CaptionView
          finalText={caption?.text ?? ""}
          placeholder="Waiting for the teacher to start speaking…"
        />

        <View style={{ height: spacing.md }} />
        <Button label="Leave Classroom" variant="secondary" onPress={handleLeave} />
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
  label: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  code: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 3,
  },
});
