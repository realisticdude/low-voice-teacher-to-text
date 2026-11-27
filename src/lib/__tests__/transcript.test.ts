import {
  joinEnglish,
  joinOriginal,
  newLiveSegment,
  transcriptFileName,
  transcriptToHtml,
  transcriptToText,
  type LiveSegment,
} from "../transcript";
import type { TranscriptSegment } from "../../types";

describe("live transcript", () => {
  it("joins sentences in spoken order", () => {
    const segments = [newLiveSegment(1, "en", "Good morning."), newLiveSegment(2, "hi", "आज हम पढ़ेंगे।")];
    expect(joinOriginal(segments)).toBe("Good morning. आज हम पढ़ेंगे।");
  });

  it("uses English sentences as-is and waits for Hindi translations in order", () => {
    const segments: LiveSegment[] = [
      newLiveSegment(1, "en", "Hello."),
      { ...newLiveSegment(2, "hi", "पहला वाक्य।"), en: null }, // translation pending
      { ...newLiveSegment(3, "hi", "दूसरा वाक्य।"), en: "Second sentence." }, // came back early
    ];
    // Sentence 3 must not appear before sentence 2.
    expect(joinEnglish(segments)).toBe("Hello.");

    segments[1] = { ...segments[1], en: "First sentence." };
    expect(joinEnglish(segments)).toBe("Hello. First sentence. Second sentence.");
  });

  it("shows the original sentence when its translation failed, instead of stalling", () => {
    const segments: LiveSegment[] = [
      { ...newLiveSegment(1, "hi", "पहला।"), enFailed: true },
      { ...newLiveSegment(2, "hi", "दूसरा।"), en: "Second." },
    ];
    expect(joinEnglish(segments)).toBe("पहला। Second.");
  });
});

describe("transcript export", () => {
  const info = { code: "ABC234", teacherName: "Ms. Rao" };
  const at = (h: number, m: number) => new Date(2026, 10, 27, h, m).toISOString();
  const segments: TranscriptSegment[] = [
    { seq: 1, lang: "en", text: "Welcome.", text_en: null, created_at: at(9, 5) },
    { seq: 2, lang: "hi", text: "नमस्ते।", text_en: "Hello.", created_at: at(9, 6) },
    { seq: 3, lang: "hi", text: "धन्यवाद।", text_en: null, created_at: at(9, 7) },
  ];

  it("writes a readable text file with both languages", () => {
    const text = transcriptToText(info, segments, new Date(2026, 10, 27));
    expect(text).toContain("Class ABC234 · Ms. Rao");
    expect(text).toContain("[09:05] Welcome.");
    expect(text).toContain("[09:06] नमस्ते।\n        English: Hello.");
    expect(text).toContain("[09:07] धन्यवाद।\n        English: (translation unavailable)");
    // English sentences don't get a redundant "English:" line.
    expect(text).not.toContain("Welcome.\n        English");
  });

  it("escapes spoken text in the PDF's HTML", () => {
    const html = transcriptToHtml(info, [
      { seq: 1, lang: "en", text: '<script>alert("x")</script> & more', text_en: null, created_at: at(9, 0) },
    ]);
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; more");
  });

  it("says so when nothing was captioned", () => {
    expect(transcriptToText(info, [])).toContain("No captions were recorded in this class.");
  });

  it("names files by class code and date", () => {
    expect(transcriptFileName(info, "pdf", new Date(2026, 10, 7))).toBe("liveclass-ABC234-2026-11-07.pdf");
  });
});
