import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  broadcastCaption,
  createClassroomChannel,
  onCaption,
} from "../services/realtimeService";
import type { CaptionMessage, ConnectionStatus, Role } from "../types";

interface UseClassroomChannelArgs {
  code: string;
  participantId: string;
  name: string;
  role: Role;
  /** Called whenever a caption broadcast arrives (students use this to render captions). */
  onCaptionReceived?: (message: CaptionMessage) => void;
}

interface UseClassroomChannelResult {
  status: ConnectionStatus;
  studentCount: number;
  sendCaption: (message: CaptionMessage) => void;
}

export function useClassroomChannel({
  code,
  participantId,
  name,
  role,
  onCaptionReceived,
}: UseClassroomChannelArgs): UseClassroomChannelResult {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [studentCount, setStudentCount] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onCaptionRef = useRef(onCaptionReceived);
  onCaptionRef.current = onCaptionReceived;

  useEffect(() => {
    if (!code || !participantId) return;

    setStatus("connecting");
    const channel = createClassroomChannel(code, participantId);
    channelRef.current = channel;

    onCaption(channel, (message) => {
      onCaptionRef.current?.(message);
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ name: string; role: Role }>();
      const students = Object.values(state).filter((presences) =>
        presences.some((p) => p.role === "student")
      );
      setStudentCount(students.length);
    });

    channel.subscribe(async (subscribeStatus) => {
      if (subscribeStatus === "SUBSCRIBED") {
        await channel.track({ name, role });
        setStatus("connected");
      } else if (
        subscribeStatus === "CHANNEL_ERROR" ||
        subscribeStatus === "TIMED_OUT"
      ) {
        setStatus("error");
      } else if (subscribeStatus === "CLOSED") {
        setStatus("disconnected");
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, participantId, name, role]);

  const sendCaption = useCallback((message: CaptionMessage) => {
    if (channelRef.current) {
      broadcastCaption(channelRef.current, message);
    }
  }, []);

  return { status, studentCount, sendCaption };
}
