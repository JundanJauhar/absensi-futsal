export type PlayerPosition = "goalkeeper" | "anchor" | "flank" | "pivot";
export type PlayerStatus = "active" | "inactive";

export type Player = {
  id: number;
  full_name: string;
  jersey_number: number;
  profile_photo: string | null;
  primary_position: PlayerPosition;
  secondary_position: PlayerPosition | null;
  joined_at: string;
  status: PlayerStatus;
  notes: string | null;
  face_registered: boolean;
};

export type PaginatedPlayers = {
  data: Player[];
  meta: { current_page: number; last_page: number; total: number };
};
