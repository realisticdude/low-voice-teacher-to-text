import type { SpokenLanguage } from "./languages";
import type { TranscriptSegment } from "../types";

/** A finished sentence on the teacher's device, with its translation state. */
export interface LiveSegment {
  seq: number;
  lang: SpokenLanguage;
  text: string;
  /** English text: the sentence itself for English, the translation for Hindi. */
  en: string | null;
  /** Translation failed; the English view shows the original instead. */
  enFailed: boolean;
}

export function newLiveSegment(seq: number, lang: SpokenLanguage, text: string): LiveSegment {
  return { seq, lang, text, en: lang === "en" ? text : null, enFailed: false };
}

/** The transcript in the language(s) it was spoken. */
export function joinOriginal(segments: LiveSegment[]): string {
  return segments.map((s) => s.text).join(" ");
}

/**
 * The English transcript, in spoken order. Translations can come back out of
 * order, so this stops at the first sentence still waiting for one rather
 * than showing later sentences before earlier ones.
 */
export function joinEnglish(segments: LiveSegment[]): string {
  const parts: string[] = [];
  for (const segment of segments) {
    if (segment.en !== null) parts.push(segment.en);
    else if (segment.enFailed) parts.push(segment.text);
    else break;
  }
  return parts.join(" ");
}

export function hasHindi(segments: { lang: SpokenLanguage }[]): boolean {
  return segments.some((s) => s.lang === "hi");
}

/* -------------------------------------------------------------------------- */
/* Export (download) formats                                                  */
/* -------------------------------------------------------------------------- */

export interface TranscriptInfo {
  code: string;
  teacherName: string;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local "HH:MM" for a segment's timestamp. */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDate(segments: TranscriptSegment[], now: Date): string {
  const d = segments.length ? new Date(segments[0].created_at) : now;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "liveclass-ABC123-2026-11-27.pdf" */
export function transcriptFileName(info: TranscriptInfo, ext: "pdf" | "txt", now = new Date()): string {
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return `liveclass-${info.code}-${date}.${ext}`;
}

export function transcriptToText(
  info: TranscriptInfo,
  segments: TranscriptSegment[],
  now = new Date()
): string {
  const lines = [
    "LiveClass Caption — class transcript",
    `Class ${info.code} · ${info.teacherName} · ${formatDate(segments, now)}`,
    "",
  ];
  if (!segments.length) lines.push("No captions were recorded in this class.");
  for (const s of segments) {
    lines.push(`[${formatTime(s.created_at)}] ${s.text}`);
    if (s.lang === "hi") {
      lines.push(`        English: ${s.text_en ?? "(translation unavailable)"}`);
    }
  }
  lines.push("", "Transcripts are deleted from the server 24 hours after the class.");
  return lines.join("\n");
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string
  );

/** Print-ready HTML, turned into a PDF by the platform's print engine. */
export function transcriptToHtml(
  info: TranscriptInfo,
  segments: TranscriptSegment[],
  now = new Date()
): string {
  const rows = segments.length
    ? segments
        .map(
          (s) => `
      <div class="row">
        <div class="time">${escapeHtml(formatTime(s.created_at))}</div>
        <div class="text">
          <p lang="${s.lang}">${escapeHtml(s.text)}</p>
          ${
            s.lang === "hi"
              ? `<p class="en" lang="en">${
                  s.text_en ? escapeHtml(s.text_en) : "<em>Translation unavailable</em>"
                }</p>`
              : ""
          }
        </div>
      </div>`
        )
        .join("")
    : `<p class="empty">No captions were recorded in this class.</p>`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(transcriptFileName(info, "pdf", now))}</title>
<style>
  @page { margin: 18mm 16mm; }
  body { font-family: Inter, "Noto Sans", "Noto Sans Devanagari", "Nirmala UI", Arial, sans-serif;
         color: #111; font-size: 12pt; line-height: 1.6; }
  h1 { font-size: 18pt; margin: 0 0 4pt; letter-spacing: -0.02em; }
  .meta { color: #555; font-size: 10pt; margin-bottom: 18pt; font-family: "JetBrains Mono", Menlo, Consolas, monospace; }
  .row { display: flex; gap: 12pt; padding: 6pt 0; border-bottom: 1px solid #e5e5e5; page-break-inside: avoid; }
  .time { flex: 0 0 40pt; color: #777; font-size: 9pt; padding-top: 3pt; font-family: "JetBrains Mono", Menlo, Consolas, monospace; }
  .text p { margin: 0; }
  .text .en { color: #444; margin-top: 2pt; }
  .empty, .foot { color: #777; }
  .foot { margin-top: 18pt; font-size: 9pt; }
</style>
</head>
<body>
  <h1>Class transcript</h1>
  <div class="meta">Class ${escapeHtml(info.code)} · ${escapeHtml(info.teacherName)} · ${escapeHtml(
    formatDate(segments, now)
  )}</div>
  ${rows}
  <p class="foot">LiveClass Caption. Transcripts are deleted from the server 24 hours after the class.</p>
</body>
</html>`;
}
