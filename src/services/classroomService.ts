import { ensureSession, supabase } from "../lib/supabase";
import type { Classroom, Role } from "../types";

// Excludes visually-ambiguous characters (0/O, 1/I/L) to keep codes easy to read aloud.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateClassroomCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export class ClassroomServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "NETWORK"
      | "NOT_FOUND"
      | "INACTIVE"
      | "UNKNOWN" = "UNKNOWN"
  ) {
    super(message);
    this.name = "ClassroomServiceError";
  }
}

// Supabase returns plain `{ message, details, ... }` objects rather than Error
// instances, e.g. "TypeError: Network request failed" when offline.
function errorField(error: unknown, field: "message" | "details"): string {
  if (!error || typeof error !== "object") return "";
  const value = (error as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

function wrapError(error: unknown): ClassroomServiceError {
  if (error instanceof ClassroomServiceError) return error;
  const message = errorField(error, "message");
  const isNetwork = /network|fetch|timed? ?out|offline/i.test(
    `${message} ${errorField(error, "details")}`
  );
  return new ClassroomServiceError(
    isNetwork
      ? "Could not reach the server. Check your internet connection."
      : message || "Something went wrong.",
    isNetwork ? "NETWORK" : "UNKNOWN"
  );
}

/** Creates a classroom, retrying on the rare chance of a code collision. */
export async function createClassroom(
  teacherName: string
): Promise<Classroom> {
  const trimmedName = teacherName.trim();
  if (!trimmedName) {
    throw new ClassroomServiceError("Please enter your name.");
  }

  try {
    await ensureSession();
  } catch (error) {
    throw wrapError(error);
  }

  // owner_id defaults to the signed-in user, which makes this device the
  // only one allowed to end the classroom or broadcast captions to it.
  const MAX_ATTEMPTS = 5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generateClassroomCode();
    const { data, error } = await supabase
      .from("classrooms")
      .insert({ code, teacher_name: trimmedName, active: true })
      .select()
      .single();

    if (!error && data) {
      return data as Classroom;
    }

    // Unique-constraint violation on the code column -> retry with a new code.
    const isCollision = error?.code === "23505";
    if (!isCollision) {
      throw wrapError(error);
    }
  }

  throw new ClassroomServiceError(
    "Could not generate a unique classroom code. Please try again."
  );
}

export async function findActiveClassroomByCode(
  code: string
): Promise<Classroom> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    throw new ClassroomServiceError("Please enter a classroom code.");
  }

  try {
    await ensureSession();
  } catch (error) {
    throw wrapError(error);
  }

  // Classrooms can't be read directly (that would let anyone list every
  // code), so look one up by its exact code through a database function.
  const { data, error } = await supabase
    .rpc("find_classroom_by_code", { p_code: normalizedCode })
    .maybeSingle<Classroom>();

  if (error) throw wrapError(error);

  if (!data) {
    throw new ClassroomServiceError(
      "No classroom found with that code. Double-check and try again.",
      "NOT_FOUND"
    );
  }

  if (!data.active) {
    throw new ClassroomServiceError(
      "This classroom is no longer active.",
      "INACTIVE"
    );
  }

  return data as Classroom;
}

export async function addParticipant(
  classroomId: string,
  name: string,
  role: Role
): Promise<void> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new ClassroomServiceError("Please enter your name.");
  }

  try {
    await ensureSession();
  } catch (error) {
    throw wrapError(error);
  }

  // user_id defaults to the signed-in user; the realtime policies only let
  // registered participants join the classroom's channel.
  const { error } = await supabase.from("participants").insert({
    classroom_id: classroomId,
    name: trimmedName,
    role,
  });

  if (error) throw wrapError(error);
}

export async function setClassroomActive(
  classroomId: string,
  active: boolean
): Promise<void> {
  const { error } = await supabase
    .from("classrooms")
    .update({ active })
    .eq("id", classroomId);

  if (error) throw wrapError(error);
}
