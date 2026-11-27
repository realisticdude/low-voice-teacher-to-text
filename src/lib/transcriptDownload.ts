import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import {
  transcriptFileName,
  transcriptToHtml,
  transcriptToText,
  type TranscriptInfo,
} from "./transcript";
import type { TranscriptSegment } from "../types";

export type TranscriptFormat = "pdf" | "txt";

/**
 * Saves the transcript on the user's device, so it survives the server
 * deleting it after 24 hours.
 * - Phone app: writes a PDF/TXT file and opens the share sheet (Save to
 *   Files, Drive, WhatsApp...).
 * - Web: downloads the .txt directly; for PDF opens the print dialog with
 *   "Save as PDF", which renders Hindi text correctly without bundling fonts.
 */
export async function saveTranscript(
  format: TranscriptFormat,
  info: TranscriptInfo,
  segments: TranscriptSegment[]
): Promise<void> {
  const fileName = transcriptFileName(info, format);

  if (Platform.OS === "web") {
    if (format === "txt") {
      downloadOnWeb(fileName, transcriptToText(info, segments), "text/plain;charset=utf-8");
    } else {
      printOnWeb(transcriptToHtml(info, segments));
    }
    return;
  }

  let uri: string;
  let mimeType: string;
  let UTI: string;
  if (format === "pdf") {
    ({ uri } = await Print.printToFileAsync({ html: transcriptToHtml(info, segments) }));
    mimeType = "application/pdf";
    UTI = "com.adobe.pdf";
  } else {
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(transcriptToText(info, segments));
    uri = file.uri;
    mimeType = "text/plain";
    UTI = "public.plain-text";
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available on this device.");
  }
  await Sharing.shareAsync(uri, { mimeType, UTI, dialogTitle: fileName });
}

function downloadOnWeb(fileName: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Prints from a hidden iframe so no popup window (or popup blocker) is involved. */
function printOnWeb(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, { position: "fixed", width: "0", height: "0", border: "0", right: "0", bottom: "0" });
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    throw new Error("Couldn't open the print view.");
  }
  doc.open();
  doc.write(html);
  doc.close();

  win.addEventListener("afterprint", () => frame.remove());
  // Give the document a moment to lay out before opening the dialog.
  setTimeout(() => {
    win.focus();
    win.print();
  }, 250);
}
