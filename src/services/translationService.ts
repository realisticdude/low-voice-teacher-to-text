import { supabase } from "../lib/supabase";

export class TranslationUnavailableError extends Error {
  constructor(message = "English translation isn't available right now.") {
    super(message);
    this.name = "TranslationUnavailableError";
  }
}

/**
 * Translates one finished Hindi sentence to English through the `translate`
 * Supabase Edge Function (see supabase/functions/translate), which keeps the
 * Google Cloud Translation API key on the server. Only the classroom's
 * teacher may call it, so the key can't be used by anyone with the app.
 */
export async function translateHindiToEnglish(
  classroomId: string,
  text: string
): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ translatedText?: string }>(
    "translate",
    { body: { classroomId, text } }
  );
  const translated = data?.translatedText;
  if (error || typeof translated !== "string") {
    throw new TranslationUnavailableError();
  }
  return translated;
}
