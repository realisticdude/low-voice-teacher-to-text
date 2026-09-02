import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import type { CaptionMessage, Role } from "../types";

const CAPTION_EVENT = "caption";

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
