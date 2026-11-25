import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { CaptionMessage, Role } from "../types";

const CAPTION_EVENT = "caption";
const CLASSROOM_ENDED_EVENT = "classroom-ended";

export interface PresenceMeta {
  name: string;
  role: Role;
  [key: string]: unknown;
}

/**
 * Opens (or reuses) the realtime channel for a classroom code.
 * Broadcast carries live caption text; presence tracks who is connected
 * so the teacher can see a student count without polling the database.
 */
export function createClassroomChannel(
  code: string,
  participantId: string
): RealtimeChannel {
  return supabase.channel(`classroom:${code.toUpperCase()}`, {
    config: {
      // Private: joins, sends and presence are checked against the
      // realtime.messages policies in supabase/schema.sql.
      private: true,
      broadcast: { self: false, ack: false },
      presence: { key: participantId },
    },
  });
}

export function broadcastCaption(
  channel: RealtimeChannel,
  message: CaptionMessage
): void {
  channel.send({
    type: "broadcast",
    event: CAPTION_EVENT,
    payload: message,
  });
}

export function onCaption(
  channel: RealtimeChannel,
  callback: (message: CaptionMessage) => void
): void {
  channel.on("broadcast", { event: CAPTION_EVENT }, ({ payload }) => {
    callback(payload as CaptionMessage);
  });
}

/** Tells students the teacher ended the classroom, so they can leave cleanly. */
export async function broadcastClassroomEnded(
  channel: RealtimeChannel
): Promise<void> {
  await channel.send({
    type: "broadcast",
    event: CLASSROOM_ENDED_EVENT,
    payload: { timestamp: Date.now() },
  });
}

export function onClassroomEnded(
  channel: RealtimeChannel,
  callback: () => void
): void {
  channel.on("broadcast", { event: CLASSROOM_ENDED_EVENT }, () => callback());
}
