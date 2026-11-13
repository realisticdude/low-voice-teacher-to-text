import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  broadcastCaption,
  broadcastClassroomEnded,
  createClassroomChannel,
  onCaption,
  onClassroomEnded,
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
  /** True once the teacher has ended the classroom (students only). */
  ended: boolean;
  /** False when a student is connected but the teacher has left the channel. */
  teacherPresent: boolean;
  sendCaption: (message: CaptionMessage) => void;
  /** Teacher only: tells students the classroom has ended. Best-effort. */
  announceEnded: () => Promise<void>;
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
  const [ended, setEnded] = useState(false);
  const [teacherPresent, setTeacherPresent] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onCaptionRef = useRef(onCaptionReceived);
  onCaptionRef.current = onCaptionReceived;

  useEffect(() => {
    if (!code || !participantId) return;

    setStatus("connecting");
    setEnded(false);
    setTeacherPresent(true);
    const channel = createClassroomChannel(code, participantId);
    channelRef.current = channel;
    let subscribed = false;
    let classroomEnded = false;
    // Only treat a missing teacher as "left" after we've actually seen them,
    // so a student who joins before presence syncs isn't told they're gone.
    let teacherSeen = false;

    onCaption(channel, (message) => {
      onCaptionRef.current?.(message);
    });

    onClassroomEnded(channel, () => {
      classroomEnded = true;
      setEnded(true);
      setStatus("disconnected");
      channel.unsubscribe();
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<{ name: string; role: Role }>();
      const entries = Object.values(state);
      const students = entries.filter((presences) =>
        presences.some((p) => p.role === "student")
      );
      setStudentCount(students.length);

      if (role === "student" && !classroomEnded) {
        const present = entries.some((presences) =>
          presences.some((p) => p.role === "teacher")
        );
        if (present) teacherSeen = true;
        if (teacherSeen) {
          // Fallback for when the "classroom-ended" broadcast never arrives
          // (e.g. the teacher lost connection): show the channel as broken.
          setTeacherPresent(present);
          if (subscribed) setStatus(present ? "connected" : "disconnected");
        }
      }
    });

    channel.subscribe(async (subscribeStatus) => {
      if (subscribeStatus === "SUBSCRIBED") {
        subscribed = true;
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

  const announceEnded = useCallback(async () => {
    if (channelRef.current) {
      await broadcastClassroomEnded(channelRef.current);
    }
  }, []);

  return { status, studentCount, ended, teacherPresent, sendCaption, announceEnded };
}
