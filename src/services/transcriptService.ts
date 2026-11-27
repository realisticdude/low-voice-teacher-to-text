import { ensureSession, supabase } from "../lib/supabase";
import type { SpokenLanguage } from "../lib/languages";
import type { TranscriptSegment } from "../types";

/**
 * Finished sentences are stored in `transcript_segments` so the class can
 * download the full transcript. The database deletes rows after 24 hours
 * (see supabase/schema.sql), and only the class's teacher and joined
 * students can read them.
 */

/** Teacher only: stores one finished sentence. */
export async function saveSegment(
  classroomId: string,
  seq: number,
  lang: SpokenLanguage,
  text: string
): Promise<void> {
  const { error } = await supabase
    .from("transcript_segments")
    .insert({ classroom_id: classroomId, seq, lang, text });
  if (error) throw new Error(error.message);
}

/** Teacher only: adds the English translation to a stored Hindi sentence. */
export async function saveSegmentTranslation(
  classroomId: string,
  seq: number,
  textEn: string
): Promise<void> {
  const { error } = await supabase
    .from("transcript_segments")
    .update({ text_en: textEn })
    .eq("classroom_id", classroomId)
    .eq("seq", seq);
  if (error) throw new Error(error.message);
}

/** Teacher or joined student: the class transcript from the last 24 hours. */
export async function fetchTranscript(classroomId: string): Promise<TranscriptSegment[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from("transcript_segments")
    .select("seq, lang, text, text_en, created_at")
    .eq("classroom_id", classroomId)
    .order("seq", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as TranscriptSegment[];
}
