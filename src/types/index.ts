import type { SpokenLanguage } from "../lib/languages";

export type Role = "teacher" | "student";

export interface Classroom {
  id: string;
  code: string;
  teacher_name: string;
  created_at: string;
  active: boolean;
}

export interface Participant {
  id: string;
  classroom_id: string;
  name: string;
  role: Role;
  joined_at: string;
}

export interface CaptionMessage {
  id: string;
  /** Transcript in the language the teacher is speaking. */
  text: string;
  isFinal: boolean;
  senderName: string;
  timestamp: number;
  /** Language the teacher is currently speaking. Missing from older senders (treat as "en"). */
  lang?: SpokenLanguage;
  /**
   * English version of the finished sentences, when any were spoken in Hindi.
   * Lags `text` by the sentence in progress, since only finished sentences
   * are translated.
   */
  translatedText?: string;
  /** "unavailable" once a translation has failed (e.g. service not set up). */
  translationStatus?: "ok" | "unavailable";
}

/** One finished sentence, as stored for the 24-hour transcript. */
export interface TranscriptSegment {
  seq: number;
  lang: SpokenLanguage;
  text: string;
  /** English translation for Hindi sentences; null until translated. */
  text_en: string | null;
  created_at: string;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
