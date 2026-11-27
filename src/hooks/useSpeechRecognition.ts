import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionOptions,
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
  /**
   * Latest input level from the mic, roughly -2 (silent) to 10 (loud).
   * Null when not listening or when the platform doesn't report it (web).
   */
  volume: number | null;
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
  onFinalTranscript: (text: string) => void,
  /** BCP-47 locale to recognize, e.g. "en-US" or "hi-IN". Applies from the next start. */
  locale: string = "en-US"
): UseSpeechRecognitionResult {
  // Read through a ref so automatic restarts use the latest choice.
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [volume, setVolume] = useState<number | null>(null);

  // Tracks whether the caller wants recognition running, so we know whether
  // an "end" event should trigger an auto-restart or be treated as a real stop.
  const wantsListeningRef = useRef(false);
  // Set when an error was surfaced, so the "end" event that follows every
  // error doesn't overwrite the "error" status with "stopped".
  const errorShownRef = useRef(false);
  const lastFinalTranscriptRef = useRef<string>("");
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;
  // When the current recognizer session began, and whether we've already
  // asked it to wind down so it can be replaced (see maybeRecycleSession).
  const sessionStartedAtRef = useRef(0);
  const recyclingRef = useRef(false);

  // A continuous session gets slower the longer it runs: the browser's
  // SpeechRecognition re-sends every result of the session on each event, and
  // iOS before 18 keeps one ever-growing transcript (and stops after about a
  // minute). Stopping the session lets the "end" handler start a fresh one,
  // just like the teacher tapping Pause and Start, but at a sentence boundary
  // so no words are cut off.
  const maybeRecycleSession = (isFinal: boolean) => {
    if (!wantsListeningRef.current || recyclingRef.current) return;
    const age = Date.now() - sessionStartedAtRef.current;
    if ((isFinal && age >= RECYCLE_AFTER_MS) || age >= MAX_SESSION_MS) {
      recyclingRef.current = true;
      // stop() (not abort()) makes the recognizer finalize what it has heard
      // before it ends.
      ExpoSpeechRecognitionModule.stop();
    }
  };

  useSpeechRecognitionEvent("start", () => {
    sessionStartedAtRef.current = Date.now();
    recyclingRef.current = false;
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
      if (transcript.trim() !== lastFinalTranscriptRef.current.trim()) {
        lastFinalTranscriptRef.current = transcript;
        onFinalTranscriptRef.current(transcript.trim());
      }
    } else {
      setInterimText(transcript);
    }
    maybeRecycleSession(event.isFinal);
  });

  useSpeechRecognitionEvent("error", (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      wantsListeningRef.current = false;
      errorShownRef.current = true;
      setStatus("permission-denied");
      setErrorMessage(PERMISSION_DENIED_MESSAGE);
      return;
    }
    if (event.error === "no-speech" || event.error === "speech-timeout") {
      // Not a real error, just silence - the "end" handler will restart if needed.
      return;
    }
    if (event.error === "aborted" && !wantsListeningRef.current) {
      // The session was stopped on purpose (Stop, End Classroom, backgrounding).
      return;
    }
    if (event.error === "busy" || event.error === "client") {
      // Transient on some Android recognizers between sessions - let the
      // "end" handler restart rather than stopping captions.
      return;
    }
    // A real failure: don't let the "end" event that follows auto-restart,
    // which would immediately clear the banner. The teacher taps Start to retry.
    wantsListeningRef.current = false;
    errorShownRef.current = true;
    setErrorMessage(event.message || event.error);
    setStatus("error");
  });

  useSpeechRecognitionEvent("end", () => {
    recyclingRef.current = false;
    setInterimText("");
    setVolume(null);
    if (errorShownRef.current) {
      // Keep the "error"/"permission-denied" status (and its banner) set by
      // the error handler.
      errorShownRef.current = false;
      return;
    }
    if (wantsListeningRef.current) {
      // The native session ended on its own (common on Android without
      // continuous support) - restart to keep captions flowing.
      try {
        ExpoSpeechRecognitionModule.start(recognitionOptions(localeRef.current));
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

  useSpeechRecognitionEvent("volumechange", (event) => {
    setVolume(event.value);
  });

  // Pause recognition when the app is backgrounded (the OS suspends mic
  // access anyway, and resuming a stale session tends to throw errors), then
  // start a fresh session when the teacher comes back.
  const resumeOnActiveRef = useRef(false);
  const startRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        if (resumeOnActiveRef.current) {
          resumeOnActiveRef.current = false;
          void startRef.current();
        }
      } else if (nextState === "background" && wantsListeningRef.current) {
        resumeOnActiveRef.current = true;
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
      setErrorMessage(PERMISSION_DENIED_MESSAGE);
      return;
    }

    errorShownRef.current = false;
    lastFinalTranscriptRef.current = "";
    wantsListeningRef.current = true;
    setStatus("starting");
    try {
      ExpoSpeechRecognitionModule.start(recognitionOptions(localeRef.current));
    } catch (err) {
      wantsListeningRef.current = false;
      setStatus("error");
      setErrorMessage(
        err instanceof Error ? err.message : "Could not start speech recognition."
      );
    }
  }, []);
  startRef.current = start;

  const stop = useCallback(() => {
    wantsListeningRef.current = false;
    resumeOnActiveRef.current = false;
    setInterimText("");
    ExpoSpeechRecognitionModule.stop();
  }, []);

  return { status, interimText, errorMessage, volume, start, stop };
}

const PERMISSION_DENIED_MESSAGE =
  "Microphone or speech recognition permission was denied. Enable it in Settings to use captions.";

/** Replace the session at the next finished sentence once it's this old. */
const RECYCLE_AFTER_MS = 30_000;
/**
 * Replace it regardless after this long, for recognizers that never send a
 * final result mid-session (iOS before 18). Stays under Apple's ~1 minute
 * limit per recognition task.
 */
const MAX_SESSION_MS = 50_000;

const recognitionOptions = (lang: string): ExpoSpeechRecognitionOptions => ({
  lang,
  interimResults: true,
  continuous: true,
  addsPunctuation: true,
  // Drives the mic level meter so a quiet teacher can see they're heard.
  volumeChangeEventOptions: { enabled: true, intervalMillis: 150 },
  // iOS: Apple's voice processing adds automatic gain control, which helps
  // pick up a soft voice (it also lowers speaker playback, unused here).
  iosVoiceProcessingEnabled: true,
  // Android: wait longer before treating a pause as the end of speech, so
  // quiet or hesitant speakers aren't cut off mid-sentence. Some recognizer
  // services ignore these hints.
  androidIntentOptions: {
    EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
    EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
  },
});
