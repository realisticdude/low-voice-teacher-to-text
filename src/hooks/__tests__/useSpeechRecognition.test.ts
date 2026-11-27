import { act, renderHook } from "@testing-library/react-native";
import { ExpoSpeechRecognitionModule } from "expo-speech-recognition";
import { useSpeechRecognition } from "../useSpeechRecognition";

// Fake recognizer: the hook subscribes through useSpeechRecognitionEvent, and
// the test fires events the way the native/web module would.
const mockHandlers: Record<string, (event: any) => void> = {};

jest.mock("expo-speech-recognition", () => ({
  ExpoSpeechRecognitionModule: {
    start: jest.fn(),
    stop: jest.fn(),
    isRecognitionAvailable: jest.fn(() => true),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  },
  useSpeechRecognitionEvent: (name: string, handler: (event: any) => void) => {
    mockHandlers[name] = handler;
  },
}));

const startMock = ExpoSpeechRecognitionModule.start as jest.Mock;
const stopMock = ExpoSpeechRecognitionModule.stop as jest.Mock;

async function emit(name: string, event: unknown = null) {
  await act(async () => {
    mockHandlers[name](event);
  });
}

const finalResult = (transcript: string) => ({
  isFinal: true,
  results: [{ transcript, confidence: 0.9, segments: [] }],
});

const interimResult = (transcript: string) => ({
  isFinal: false,
  results: [{ transcript, confidence: 0.9, segments: [] }],
});

/** Starts listening at t=0 and returns the transcript sink. */
async function startListening() {
  const finals: string[] = [];
  const hook = await renderHook(() => useSpeechRecognition((text) => finals.push(text)));
  await act(async () => {
    await hook.result.current.start();
  });
  await emit("start");
  return { hook, finals };
}

/**
 * Plays `seconds` of continuous speech, one recognizer event every
 * `everySeconds`. Like the real module, a stop() makes the recognizer end the
 * session; the hook's "end" handler then decides whether to start again.
 */
async function speakFor(
  seconds: number,
  everySeconds: number,
  makeEvent: (i: number) => object
) {
  for (let t = everySeconds, i = 1; t <= seconds; t += everySeconds, i++) {
    jest.setSystemTime(t * 1000);
    const stopsBefore = stopMock.mock.calls.length;
    await emit("result", makeEvent(i));
    if (stopMock.mock.calls.length > stopsBefore) {
      const startsBefore = startMock.mock.calls.length;
      await emit("end");
      if (startMock.mock.calls.length > startsBefore) await emit("start");
    }
  }
}

beforeEach(() => {
  jest.useFakeTimers({ now: 0 });
  startMock.mockClear();
  stopMock.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("useSpeechRecognition session recycling", () => {
  it("restarts a long continuous session at a sentence boundary so the recognizer stays fast", async () => {
    const { hook, finals } = await startListening();

    // 90s of lecturing, one finished sentence every 5s.
    await speakFor(90, 5, (i) => finalResult(`sentence ${i}`));

    // The session was recycled at least once, and listening carried on.
    expect(stopMock).toHaveBeenCalled();
    expect(startMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(hook.result.current.status).toBe("listening");
    // No sentence was lost or duplicated across the restarts.
    expect(finals).toEqual(Array.from({ length: 18 }, (_, i) => `sentence ${i + 1}`));
  });

  it("leaves a short session alone", async () => {
    await startListening();

    await speakFor(20, 5, (i) => finalResult(`sentence ${i}`));

    expect(stopMock).not.toHaveBeenCalled();
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it("caps sessions that never produce a final result (iOS before 18)", async () => {
    const { finals } = await startListening();

    // One ever-growing interim transcript, as iOS < 18 reports in continuous mode.
    let spoken = "";
    await speakFor(70, 1, (i) => {
      spoken = `${spoken} word${i}`.trim();
      return interimResult(spoken);
    });

    expect(stopMock).toHaveBeenCalled();
    expect(startMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    // Words heard before the cap aren't dropped: stop() asks the recognizer to
    // finalize them, which arrives as a normal final result.
    await emit("result", finalResult("word1 word2"));
    expect(finals).toEqual(["word1 word2"]);
  });

  it("does not restart after the teacher taps Stop", async () => {
    const { hook } = await startListening();

    await act(async () => {
      hook.result.current.stop();
    });
    await emit("end");

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(hook.result.current.status).toBe("stopped");
  });
});

describe("useSpeechRecognition language", () => {
  it("recognizes the chosen language, including on automatic restarts", async () => {
    const hook = await renderHook(() => useSpeechRecognition(() => {}, "hi-IN"));
    await act(async () => {
      await hook.result.current.start();
    });
    await emit("start");
    await speakFor(40, 5, (i) => finalResult(`वाक्य ${i}`));

    expect(startMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    for (const [options] of startMock.mock.calls) {
      expect(options.lang).toBe("hi-IN");
    }
  });
});
