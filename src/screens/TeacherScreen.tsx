import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, Platform, Share, StyleSheet, useWindowDimensions, View } from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { Screen } from "../components/Screen";
import { Text } from "../components/Text";
import { Button } from "../components/Button";
import { TextField } from "../components/TextField";
import { StatusPill } from "../components/StatusPill";
import { CaptionView } from "../components/CaptionView";
import { Banner } from "../components/Banner";
import { Card } from "../components/Card";
import { Logo } from "../components/Logo";
import { LiveBadge } from "../components/LiveBadge";
import { MicLevel } from "../components/MicLevel";
import { SegmentedControl } from "../components/SegmentedControl";
import { TranscriptDownload } from "../components/TranscriptDownload";
import { colors, spacing, typography, wideBreakpoint } from "../components/theme";
import {
  addParticipant,
  ClassroomServiceError,
  createClassroom,
  setClassroomActive,
} from "../services/classroomService";
import { useClassroomChannel } from "../hooks/useClassroomChannel";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { generateId } from "../lib/id";
import { DEFAULT_LANGUAGE, LANGUAGES, type SpokenLanguage } from "../lib/languages";
import {
  hasHindi,
  joinEnglish,
  joinOriginal,
  newLiveSegment,
  type LiveSegment,
} from "../lib/transcript";
import { rememberClass } from "../lib/recentClasses";
import { saveSegment, saveSegmentTranslation } from "../services/transcriptService";
import { translateHindiToEnglish } from "../services/translationService";
import type { CaptionMessage, Classroom } from "../types";

interface TeacherScreenProps {
  onExit: () => void;
}

export function TeacherScreen({ onExit }: TeacherScreenProps) {
  const [teacherName, setTeacherName] = useState("");
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [creating, setCreating] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [ending, setEnding] = useState(false);

  const participantId = useMemo(() => generateId(), []);

  // Language the teacher speaks. Students can always switch to English.
  const [language, setLanguage] = useState<SpokenLanguage>(DEFAULT_LANGUAGE);
  // Finished sentences, each with its English translation once available.
  const [segments, setSegments] = useState<LiveSegment[]>([]);
  const [translationUnavailable, setTranslationUnavailable] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // Read inside recognizer callbacks, which outlive individual renders.
  const classroomRef = useRef<Classroom | null>(null);
  classroomRef.current = classroom;
  const languageRef = useRef(language);
  languageRef.current = language;
  const nextSeqRef = useRef(1);

  const updateSegment = (seq: number, patch: Partial<LiveSegment>) =>
    setSegments((prev) => prev.map((s) => (s.seq === seq ? { ...s, ...patch } : s)));

  const handleFinalTranscript = (text: string) => {
    const current = classroomRef.current;
    const lang = languageRef.current;
    const seq = nextSeqRef.current++;
    setSegments((prev) => [...prev, newLiveSegment(seq, lang, text)]);
    if (!current) return;

    // Keep the 24-hour transcript for downloads. Captions keep flowing even
    // if saving fails; the teacher just sees a warning.
    const saved = saveSegment(current.id, seq, lang, text).then(
      () => true,
      () => {
        setSaveFailed(true);
        return false;
      }
    );

    if (lang === "hi") {
      translateHindiToEnglish(current.id, text)
        .then((english) => {
          updateSegment(seq, { en: english });
          setTranslationUnavailable(false);
          saved
            .then((ok) => (ok ? saveSegmentTranslation(current.id, seq, english) : undefined))
            .catch(() => {
              // The live English caption still shows; only the download lacks it.
            });
        })
        .catch(() => {
          updateSegment(seq, { enFailed: true });
          setTranslationUnavailable(true);
        });
    }
  };

  const speech = useSpeechRecognition(
    handleFinalTranscript,
    LANGUAGES[language].recognitionLocale
  );

  const finalText = joinOriginal(segments);
  const showTranslation = hasHindi(segments);
  const englishText = showTranslation ? joinEnglish(segments) : "";

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
  const pendingRef = useRef<Pick<
    CaptionMessage,
    "text" | "isFinal" | "lang" | "translatedText" | "translationStatus"
  > | null>(null);
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
      ...pending,
      id: generateId(),
      text: trimCaption(pending.text),
      translatedText:
        pending.translatedText === undefined ? undefined : trimCaption(pending.translatedText),
      senderName: teacherNameRef.current,
      timestamp: Date.now(),
    });
  }, [sendCaption]);

  useEffect(() => {
    if (!classroom) return;
    const interim = speech.interimText;
    const text = interim ? `${finalText} ${interim}`.trim() : finalText;
    const translationStatus = translationUnavailable ? "unavailable" : "ok";
    const key = JSON.stringify([text, englishText, language, translationStatus]);
    if (key === lastSentTextRef.current) return;
    lastSentTextRef.current = key;
    pendingRef.current = {
      text,
      isFinal: !interim,
      lang: language,
      // Only sent once Hindi has been spoken, so English-only classes stay lean.
      translatedText: showTranslation ? englishText : undefined,
      translationStatus: showTranslation ? translationStatus : undefined,
    };

    const wait = interim
      ? Math.max(0, INTERIM_SEND_INTERVAL_MS - (Date.now() - lastSentAtRef.current))
      : 0;
    if (wait === 0) {
      flushCaption();
    } else if (!sendTimerRef.current) {
      sendTimerRef.current = setTimeout(flushCaption, wait);
    }
  }, [
    finalText,
    englishText,
    showTranslation,
    language,
    translationUnavailable,
    speech.interimText,
    classroom,
    flushCaption,
  ]);

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
      void rememberClass({
        classroomId: created.id,
        code: created.code,
        teacherName: created.teacher_name,
        role: "teacher",
        joinedAt: Date.now(),
      });
    } catch (err) {
      setSetupError(
        err instanceof ClassroomServiceError
          ? err.message
          : "Could not create the class. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  const handleEndClassroom = async () => {
    setEnding(true);
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
  // classroom active with no teacher. In a live class it opens the same
  // inline "End class?" confirmation as the on-screen button.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!classroom) {
        onExit();
      } else {
        setConfirmingEnd((open) => !open);
      }
      return true;
    });
    return () => sub.remove();
  }, [classroom, onExit]);

  if (!classroom) {
    return (
      <SetupView
        name={teacherName}
        onChangeName={setTeacherName}
        creating={creating}
        error={setupError}
        onCreate={handleCreateClassroom}
        onBack={onExit}
      />
    );
  }

  const isListening = speech.status === "listening" || speech.status === "starting";

  return (
    <LiveView
      classroomId={classroom.id}
      teacherName={classroom.teacher_name}
      language={language}
      onLanguageChange={setLanguage}
      saveFailed={saveFailed}
      translationUnavailable={translationUnavailable && showTranslation}
      code={classroom.code}
      status={status}
      studentCount={studentCount}
      isListening={isListening}
      speechStatus={speech.status}
      speechError={speech.errorMessage}
      volume={speech.volume}
      finalText={finalText}
      interimText={speech.interimText}
      onStart={speech.start}
      onStop={speech.stop}
      confirmingEnd={confirmingEnd}
      ending={ending}
      onRequestEnd={() => setConfirmingEnd(true)}
      onCancelEnd={() => setConfirmingEnd(false)}
      onConfirmEnd={handleEndClassroom}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Setup                                                                      */
/* -------------------------------------------------------------------------- */

interface SetupViewProps {
  name: string;
  onChangeName: (name: string) => void;
  creating: boolean;
  error: string | null;
  onCreate: () => void;
  onBack: () => void;
}

function SetupView({ name, onChangeName, creating, error, onCreate, onBack }: SetupViewProps) {
  const canSubmit = Boolean(name.trim()) && !creating;

  return (
    <Screen scroll maxWidth={480}>
      <Button label="Back" icon="arrow-left" variant="ghost" size="sm" fullWidth={false} onPress={onBack} />

      <View style={styles.setupHeader}>
        <Text variant="overline" tone="accent">
          Teacher
        </Text>
        <Text variant="title">Start a class</Text>
        <Text variant="body" tone="secondary">
          You'll get a 6-letter code. Students enter it on their phones to read your
          words live.
        </Text>
      </View>

      <View style={styles.form}>
        <TextField
          label="Your name"
          hint="Shown to students as the class host."
          placeholder="e.g. Ms. Sharma"
          value={name}
          onChangeText={onChangeName}
          autoCapitalize="words"
          autoComplete="name"
          maxLength={60}
          returnKeyType="go"
          onSubmitEditing={() => canSubmit && onCreate()}
          autoFocus
        />

        {error ? <Banner title="Couldn't start the class" message={error} /> : null}

        <Button
          label={creating ? "Creating class…" : "Create class"}
          iconRight="arrow-right"
          size="lg"
          loading={creating}
          disabled={!canSubmit}
          onPress={onCreate}
        />
      </View>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Live class                                                                 */
/* -------------------------------------------------------------------------- */

interface LiveViewProps {
  classroomId: string;
  teacherName: string;
  language: SpokenLanguage;
  onLanguageChange: (language: SpokenLanguage) => void;
  saveFailed: boolean;
  translationUnavailable: boolean;
  code: string;
  status: React.ComponentProps<typeof StatusPill>["status"];
  studentCount: number;
  isListening: boolean;
  speechStatus: ReturnType<typeof useSpeechRecognition>["status"];
  speechError: string | null;
  volume: number | null;
  finalText: string;
  interimText: string;
  onStart: () => void;
  onStop: () => void;
  confirmingEnd: boolean;
  ending: boolean;
  onRequestEnd: () => void;
  onCancelEnd: () => void;
  onConfirmEnd: () => void;
}

function LiveView(props: LiveViewProps) {
  const { width } = useWindowDimensions();
  const wide = width >= wideBreakpoint;

  const speechBanner =
    props.speechStatus === "unsupported" ? (
      <Banner
        title="Speech recognition unavailable"
        message="This device or browser can't turn speech into text. Try Chrome, or the app on a phone."
      />
    ) : props.speechStatus === "permission-denied" ? (
      <Banner
        title="Microphone blocked"
        message={
          props.speechError ??
          "Allow microphone and speech recognition access in Settings to send captions."
        }
      />
    ) : props.speechStatus === "error" && props.speechError ? (
      <Banner title="Captions stopped" message={`${props.speechError} Tap Start captions to try again.`} />
    ) : null;

  const serviceBanners = (
    <>
      {props.translationUnavailable ? (
        <Banner
          tone="warning"
          icon="globe"
          title="English translation isn't working"
          message="Students still see your Hindi captions. The translate service may not be set up yet."
        />
      ) : null}
      {props.saveFailed ? (
        <Banner
          tone="warning"
          icon="database"
          title="Transcript isn't being saved"
          message="Live captions still work, but downloads may be missing some sentences."
        />
      ) : null}
    </>
  );

  const transcriptInfo = { code: props.code, teacherName: props.teacherName };
  const download = (
    <TranscriptDownload classroomId={props.classroomId} info={transcriptInfo} />
  );

  const languagePicker = (
    <SegmentedControl
      compact
      label={
        props.isListening
          ? "Spoken language. Pause captions to change it."
          : "Spoken language"
      }
      disabled={props.isListening}
      value={props.language}
      onChange={props.onLanguageChange}
      options={[
        { value: "en", label: LANGUAGES.en.shortLabel, accessibilityLabel: "English" },
        { value: "hi", label: LANGUAGES.hi.shortLabel, accessibilityLabel: "Hindi" },
      ]}
    />
  );

  const captions = (
    <CaptionView
      finalText={props.finalText}
      interimText={props.interimText}
      fontSize={wide ? 30 : 24}
      placeholder={props.isListening ? "Listening…" : "Captions are paused"}
      placeholderHint={
        props.isListening
          ? `Start speaking in ${LANGUAGES[props.language].label}. Your words will appear here and on students' screens.`
          : "Choose the language you'll speak, then tap Start captions."
      }
      header={
        <>
          {languagePicker}
          <LiveBadge live={props.isListening} />
        </>
      }
    />
  );

  const controls = (
    <View style={styles.controls}>
      {props.isListening ? (
        <Button label="Pause captions" icon="pause" variant="secondary" size="lg" onPress={props.onStop} />
      ) : (
        <Button
          label="Start captions"
          icon="mic"
          size="lg"
          disabled={props.speechStatus === "unsupported"}
          onPress={props.onStart}
        />
      )}
      {props.isListening && props.volume !== null ? <MicLevel volume={props.volume} /> : null}

      {props.confirmingEnd ? (
        <Banner
          tone="danger"
          title="End this class?"
          message="Students will stop receiving captions and the code will stop working. The transcript stays downloadable for 24 hours."
        >
          {!wide ? <View style={styles.confirmDownload}>{download}</View> : null}
          <View style={styles.confirmRow}>
            <View style={styles.flex}>
              <Button label="Cancel" variant="secondary" size="sm" onPress={props.onCancelEnd} />
            </View>
            <View style={styles.flex}>
              <Button
                label="End class"
                variant="danger"
                size="sm"
                loading={props.ending}
                onPress={props.onConfirmEnd}
              />
            </View>
          </View>
        </Banner>
      ) : (
        <>
          {!wide && !props.isListening ? download : null}
          <Button label="End class" icon="log-out" variant="ghost" size="sm" onPress={props.onRequestEnd} />
        </>
      )}
    </View>
  );

  const header = (
    <View style={styles.liveHeader}>
      <Logo showWordmark={wide} onPress={props.onRequestEnd} accessibilityLabel="Leave class" />
      <StatusPill status={props.status} />
    </View>
  );

  if (wide) {
    return (
      <Screen maxWidth={1200}>
        {header}
        <View style={styles.wideBody}>
          <View style={styles.sidebar}>
            <CodeCard code={props.code} studentCount={props.studentCount} />
            {speechBanner}
            {serviceBanners}
            {controls}
            <Card padding={spacing.lg} style={styles.downloadCard}>
              <Text variant="overline" tone="muted">
                Transcript
              </Text>
              {download}
            </Card>
          </View>
          <View style={styles.flex}>{captions}</View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen maxWidth={640}>
      {header}
      <View style={styles.stack}>
        <CodeCard code={props.code} studentCount={props.studentCount} compact />
        {speechBanner}
        {serviceBanners}
        {captions}
        {controls}
      </View>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */
/* Class code card                                                            */
/* -------------------------------------------------------------------------- */

const canNativeShare = Platform.OS !== "web";
const canWebShare =
  Platform.OS === "web" && typeof navigator !== "undefined" && typeof navigator.share === "function";
const canWebCopy =
  Platform.OS === "web" && typeof navigator !== "undefined" && Boolean(navigator.clipboard);

function CodeCard({
  code,
  studentCount,
  compact,
}: {
  code: string;
  studentCount: number;
  compact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const message = `Join my class on LiveClass Caption with code ${code}`;

  const handleShare = async () => {
    try {
      if (canNativeShare || canWebShare) {
        await Share.share({ message });
      } else if (canWebCopy) {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // The user closed the share sheet, or the browser refused - nothing to do.
    }
  };

  const shareLabel =
    canNativeShare || canWebShare ? "Share code" : copied ? "Copied" : "Copy code";
  const showShare = canNativeShare || canWebShare || canWebCopy;

  return (
    <Card raised padding={spacing.lg} style={styles.codeCard}>
      <View style={[styles.codeRow, !compact && styles.codeRowStacked]}>
        <View style={styles.codeBlock}>
          <Text variant="overline" tone="muted">
            Class code
          </Text>
          <Text
            style={[typography.code, compact && styles.codeCompact, { color: colors.text }]}
            accessibilityLabel={`Class code ${code.split("").join(" ")}`}
            selectable
          >
            {code}
          </Text>
        </View>
        {showShare && (
          <Button
            label={shareLabel}
            icon={copied ? "check" : canWebCopy && !canWebShare && !canNativeShare ? "copy" : "share"}
            variant="secondary"
            size="sm"
            fullWidth={!compact}
            onPress={handleShare}
          />
        )}
      </View>
      <View style={styles.divider} />
      <View style={styles.countRow} accessibilityLiveRegion="polite">
        <Feather name="users" size={16} color={colors.textSecondary} />
        <Text variant="bodySm" tone="secondary">
          <Text variant="label">{studentCount}</Text>{" "}
          {studentCount === 1 ? "student" : "students"} connected
        </Text>
      </View>
    </Card>
  );
}

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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
    minHeight: 44,
    marginBottom: spacing.md,
  },
  stack: {
    flex: 1,
    gap: spacing.md,
  },
  wideBody: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.lg,
  },
  sidebar: {
    width: 340,
    gap: spacing.md,
  },
  codeCard: {
    gap: spacing.md,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  codeRowStacked: {
    flexDirection: "column",
    alignItems: "stretch",
  },
  codeBlock: {
    gap: spacing.xs,
  },
  codeCompact: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: 5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  controls: {
    gap: spacing.sm + spacing.xs,
  },
  confirmDownload: {
    marginTop: spacing.sm,
  },
  downloadCard: {
    gap: spacing.md,
  },
  confirmRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
