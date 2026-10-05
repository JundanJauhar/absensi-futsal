export type AttendanceState = "NO_ACTIVE_SESSION" | "UPCOMING_SESSION" | "ACTIVE_ATTENDANCE" | "ATTENDANCE_CLOSED";

export type TrainingSession = {
  id: number;
  title?: string;
  training_schedule_id: number | null;
  training_date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: "scheduled" | "active" | "completed" | "cancelled";
  attendance_state?: AttendanceState;
  attendance_open_at?: string | null;
  attendance_close_at?: string | null;
  effective_open_at?: string | null;
  effective_close_at?: string | null;
  attendances_count?: number;
  reschedules?: Array<{ original_date: string; new_date: string; reason: string }>;
};

export type ActiveSessionResponse = {
  state: AttendanceState;
  server_time: string;
  timezone: string;
  session: TrainingSession | null;
  stats: {
    total_players: number;
    attended_count: number;
    attended_player_ids: number[];
  };
  available_sessions: Array<{
    id: number;
    title: string | null;
    training_date: string;
    start_time: string;
    end_time: string;
    location: string;
    status: string;
  }>;
};

export type PaginatedSessions = {
  data: TrainingSession[];
  meta: { current_page: number; last_page: number; total: number };
};

export type Attendance = {
  id: number;
  player_id: number;
  training_session_id: number;
  player_name?: string;
  jersey_number?: number;
  status: "present" | "late" | "absent" | "excused";
  verification_method?: "manual" | "face_recognition";
  method?: "manual" | "face" | "face_recognition";
  confidence?: number;
  check_in_at: string;
  player?: {
    id: number;
    full_name: string;
    jersey_number: number;
    profile_photo?: string | null;
    primary_position?: string;
  };
};
