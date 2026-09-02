export type Role = "teacher" | "student";

export interface Classroom {
  id: string;
  code: string;
  teacher_name: string;
  created_at: string;
  active: boolean;
}

export interface Participant {
  id: string;
  classroom_id: string;
  name: string;
  role: Role;
  joined_at: string;
}

export interface CaptionMessage {
  id: string;
  text: string;
  isFinal: boolean;
  senderName: string;
  timestamp: number;
}

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";
