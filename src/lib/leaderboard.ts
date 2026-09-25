import { supabase } from "./supabase";
import type { GameModeId } from "../types";

export type LeaderboardEntry = {
  id?: string;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  pairs: number;
  moves: number;
  durationSeconds: number;
};

export async function getModeLeaderboard(mode: GameModeId): Promise<LeaderboardEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("get_mode_leaderboard", { p_mode: mode });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    displayName: row.display_name || "Player",
    avatarUrl: row.avatar_url || null,
    score: row.score,
    pairs: row.pairs,
    moves: row.moves,
    durationSeconds: row.duration_seconds,
  }));
}

export async function recordLocalLeaderboard(input: {
  mode: GameModeId;
  score: number;
  pairs: number;
  moves: number;
  durationSeconds: number;
}) {
  if (!supabase) return;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { error } = await supabase.rpc("record_local_leaderboard", {
    p_mode: input.mode,
    p_score: input.score,
    p_pairs: input.pairs,
    p_moves: input.moves,
    p_duration_seconds: input.durationSeconds,
  });
  if (error) throw error;
}
