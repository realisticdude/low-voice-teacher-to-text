import { pruneRecentClasses, TRANSCRIPT_RETENTION_MS, type RecentClass } from "../recentClasses";

const entry = (classroomId: string, joinedAt: number): RecentClass => ({
  classroomId,
  code: classroomId.toUpperCase(),
  teacherName: "Ms. Rao",
  role: "student",
  joinedAt,
});

describe("pruneRecentClasses", () => {
  const now = 10 * TRANSCRIPT_RETENTION_MS;

  it("drops classes whose transcript the server has already deleted (older than 24h)", () => {
    const result = pruneRecentClasses(
      [entry("fresh", now - 1000), entry("expired", now - TRANSCRIPT_RETENTION_MS)],
      now
    );
    expect(result.map((e) => e.classroomId)).toEqual(["fresh"]);
  });

  it("lists newest first and keeps one entry per class", () => {
    const result = pruneRecentClasses(
      [entry("a", now - 3000), entry("b", now - 1000), entry("a", now - 2000)],
      now
    );
    expect(result.map((e) => [e.classroomId, e.joinedAt])).toEqual([
      ["b", now - 1000],
      ["a", now - 2000],
    ]);
  });
});
