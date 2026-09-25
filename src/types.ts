export type GameModeId =
  | "classic"
  | "clock"
  | "rush"
  | "streak"
  | "last-chance";

export type CardCategoryId = "all" | "general" | "puerto-rico" | "sexual-health" | "identities";
export type PlayableCardCategoryId = Exclude<CardCategoryId, "all">;

export type GameConfig = {
  mode: GameModeId;
  pairCount: number;
  playerCount: number;
  onlinePlayerCount: number;
  botCount: number;
  botDifficulty: BotDifficulty;
  categories: PlayableCardCategoryId[];
};

export type BotDifficulty = "easy" | "medium" | "hard";

export type GameCard = {
  uid: string;
  matchId: number;
  image: string;
  category: PlayableCardCategoryId;
  backImage: string;
};

export type GameMode = {
  id: GameModeId;
  icon: import("./components/Icon").IconName;
  name: string;
  shortName: string;
  description: string;
  rule: string;
  accent: string;
  featured?: boolean;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  games_played: number;
  games_won: number;
  created_at: string;
  updated_at: string;
};

export type OnlineRoomStatus = "waiting" | "playing" | "finished";

export type OnlineRoom = {
  id: string;
  code: string;
  host_id: string;
  status: OnlineRoomStatus;
  mode: GameModeId;
  categories: PlayableCardCategoryId[];
  pair_count: number;
  max_players: number;
  deck: number[];
  flipped_indices: number[];
  matched_pair_ids: number[];
  current_player_index: number;
  moves: number;
  lives: number;
  started_at: string | null;
  finished_at: string | null;
  time_limit_seconds: number;
  last_flip_was_match: boolean | null;
  turn_state: "ready" | "resolving";
  winner_ids: string[];
  created_at: string;
  updated_at: string;
};

export type RoomPlayer = {
  id: string;
  room_id: string;
  user_id: string;
  seat_index: number;
  score: number;
  streak: number;
  is_ready: boolean;
  joined_at: string;
  profile?: Pick<Profile, "display_name" | "avatar_url"> | null;
};

export type RoomEvent = {
  id: number;
  room_id: string;
  user_id: string | null;
  event_type: "joined" | "left" | "started" | "match" | "miss" | "turn" | "win" | "system";
  message: string;
  payload: Record<string, unknown>;
  created_at: string;
};
