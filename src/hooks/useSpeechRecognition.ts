import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export type SpeechRecognitionStatus =
  | "idle"
  | "starting"
  | "listening"
  | "stopped"
  | "unsupported"
  | "permission-denied"
  | "error";

interface UseSpeechRecognitionResult {
  status: SpeechRecognitionStatus;
  interimText: string;
  errorMessage: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

/**
 * Wraps expo-speech-recognition with:
 * - permission requests (mic + speech recognizer)
 * - graceful "unsupported device" detection
 * - auto-restart when the platform ends a session early (Android stops
 *   after a pause even in continuous mode on some OEM builds; iOS <18 stops
 *   after ~3s of silence when `continuous` isn't honored)
 * - de-duplication of repeated final transcripts
 * - pausing while the app is backgrounded (mic access is unreliable/blocked there)
 */
export function useSpeechRecognition(
  onFinalTranscript: (text: string) => void
): UseSpeechRecognitionResult {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tracks whether the caller wants recognition running, so we know whether
  // an "end" event should trigger an auto-restart or be treated as a real stop.
  const wantsListeningRef = useRef(false);
  const lastFinalTranscriptRef = useRef<string>("");
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;

  useSpeechRecognitionEvent("start", () => {
    setStatus("listening");
    setErrorMessage(null);
  });

  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results[0]?.transcript ?? "";
    if (!transcript.trim()) return;

    if (event.isFinal) {
      setInterimText("");
      // Guard against the same final result firing twice in a row, which
      // some Android recognizer services do at segment boundaries.
      if (transcript.trim() === lastFinalTranscriptRef.current.trim()) {
        return;
      }
      lastFinalTranscriptRef.current = transcript;
      onFinalTranscriptRef.current(transcript.trim());
    } else {
      setInterimText(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      wantsListeningRef.current = false;
      setStatus("permission-denied");
      setErrorMessage("Microphone or speech recognition permission was denied.");
      return;
    }
    if (event.error === "no-speech" || event.error === "speech-timeout") {
      // Not a real error, just silence - the "end" handler will restart if needed.
      return;
    }
    setErrorMessage(event.message || event.error);
    setStatus("error");
  });

  useSpeechRecognitionEvent("end", () => {
    setInterimText("");
    if (wantsListeningRef.current) {
      // The native session ended on its own (common on Android without
      // continuous support) - restart to keep captions flowing.
      try {
        ExpoSpeechRecognitionModule.start(RECOGNITION_OPTIONS);
        setStatus("starting");
      } catch {
        wantsListeningRef.current = false;
        setStatus("error");
        setErrorMessage("Speech recognition stopped unexpectedly.");
      }
    } else {
      setStatus("stopped");
    }
  });

  // Pause recognition when the app is backgrounded; the OS suspends mic
  // access anyway, and resuming a stale session tends to throw errors.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState !== "active" && wantsListeningRef.current) {
        wantsListeningRef.current = false;
        ExpoSpeechRecognitionModule.stop();
      }
    });
    return () => subscription.remove();
  }, []);

  const start = useCallback(async () => {
    setErrorMessage(null);

    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setStatus("unsupported");
      setErrorMessage(
        "Speech recognition is not available on this device."
      );
      return;
    }

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setStatus("permission-denied");
      setErrorMessage(
        "Microphone and speech recognition permissions are required to start captions."
      );
      return;
    }

    lastFinalTranscriptRef.current = "";
    wantsListeningRef.current = true;
    setStatus("starting");
    try {
      ExpoSpeechRecognitionModule.start(RECOGNITION_OPTIONS);
    } catch (err) {
      wantsListeningRef.current = false;
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Could not start speech recognition."
      );
    }
  }, []);

  const stop = useCallback(() => {
    wantsListeningRef.current = false;
    setInterimText("");
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { status, interimText, errorMessage, start, stop };
}

const RECOGNITION_OPTIONS = {
  lang: "en-US",
  interimResults: true,
  continuous: true,
  addsPunctuation: true,
} as const;
