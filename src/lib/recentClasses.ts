import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Role } from "../types";

/**
 * Classes this device created or joined, kept locally so the transcript can
 * still be downloaded from the Home screen after leaving the class. Only
 * entries from the last 24 hours are shown: after that the server has
 * deleted the transcript anyway.
 */
export interface RecentClass {
  classroomId: string;
  code: string;
  teacherName: string;
  role: Role;
  /** Epoch ms when this device joined. */
  joinedAt: number;
}

const KEY = "recentClasses";
export const TRANSCRIPT_RETENTION_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 20;

/** Newest first, de-duplicated, without entries past the retention window. */
export function pruneRecentClasses(entries: RecentClass[], now = Date.now()): RecentClass[] {
  const seen = new Set<string>();
  return [...entries]
    .sort((a, b) => b.joinedAt - a.joinedAt)
    .filter((e) => {
      if (now - e.joinedAt >= TRANSCRIPT_RETENTION_MS || seen.has(e.classroomId)) return false;
      seen.add(e.classroomId);
      return true;
    })
    .slice(0, MAX_ENTRIES);
}

async function read(): Promise<RecentClass[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentClass[]) : [];
  } catch {
    return [];
  }
}

export async function listRecentClasses(): Promise<RecentClass[]> {
  return pruneRecentClasses(await read());
}

export async function rememberClass(entry: RecentClass): Promise<void> {
  try {
    const next = pruneRecentClasses([entry, ...(await read())]);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best-effort: the in-class download button still works without this.
  }
}
