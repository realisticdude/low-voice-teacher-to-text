/** Languages the teacher can speak. Students can always read English. */
export type SpokenLanguage = "en" | "hi";

export const LANGUAGES: Record<
  SpokenLanguage,
  { label: string; shortLabel: string; recognitionLocale: string }
> = {
  en: { label: "English", shortLabel: "EN", recognitionLocale: "en-US" },
  // en-IN/hi-IN recognizers handle Indian accents and code-switching better.
  hi: { label: "हिन्दी", shortLabel: "हिं", recognitionLocale: "hi-IN" },
};

export const DEFAULT_LANGUAGE: SpokenLanguage = "en";
