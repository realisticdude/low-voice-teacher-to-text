import React, { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { Text } from "./Text";
import { spacing } from "./theme";
import { fetchTranscript } from "../services/transcriptService";
import { saveTranscript, type TranscriptFormat } from "../lib/transcriptDownload";
import type { TranscriptInfo } from "../lib/transcript";

interface TranscriptDownloadProps {
  classroomId: string;
  info: TranscriptInfo;
  /** Hide the explanatory line (e.g. in compact lists). */
  compact?: boolean;
}

/**
 * "Save PDF" / "Save text" buttons. Always fetches the full stored
 * transcript, so students who joined late still get the whole class.
 */
export function TranscriptDownload({ classroomId, info, compact }: TranscriptDownloadProps) {
  const [busy, setBusy] = useState<TranscriptFormat | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "muted" | "danger" } | null>(null);

  const handleSave = async (format: TranscriptFormat) => {
    setBusy(format);
    setMessage(null);
    try {
      const segments = await fetchTranscript(classroomId);
      await saveTranscript(format, info, segments);
      if (!segments.length) {
        setMessage({ text: "Nothing has been captioned yet, so the file is empty.", tone: "muted" });
      }
    } catch (err) {
      setMessage({
        text:
          err instanceof Error && err.message
            ? `Couldn't save the transcript: ${err.message}`
            : "Couldn't save the transcript. Please try again.",
        tone: "danger",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.flex}>
          <Button
            label="Save PDF"
            icon="file-text"
            variant="secondary"
            size="sm"
            loading={busy === "pdf"}
            disabled={busy !== null}
            onPress={() => handleSave("pdf")}
            accessibilityHint={
              Platform.OS === "web"
                ? "Opens the print dialog; choose Save as PDF"
                : "Creates a PDF and opens the share sheet"
            }
          />
        </View>
        <View style={styles.flex}>
          <Button
            label="Save text"
            icon="download"
            variant="secondary"
            size="sm"
            loading={busy === "txt"}
            disabled={busy !== null}
            onPress={() => handleSave("txt")}
          />
        </View>
      </View>
      {message ? (
        <Text variant="caption" tone={message.tone} accessibilityLiveRegion="polite">
          {message.text}
        </Text>
      ) : !compact ? (
        <Text variant="caption" tone="muted">
          Kept on the server for 24 hours. Save a copy to keep it.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
});
