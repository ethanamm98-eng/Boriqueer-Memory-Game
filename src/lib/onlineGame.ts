import { supabase } from "./supabase";
import type { GameConfig, OnlineRoom, RoomEvent, RoomPlayer } from "../types";

function requireSupabase() {
  if (!supabase) throw new Error("Add your Supabase URL and anon key to the .env file first.");
  return supabase;
}

export async function createOnlineRoom(config: GameConfig) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_game_room", {
    p_mode: config.mode,
    p_pair_count: config.pairCount,
    p_max_players: config.onlinePlayerCount,
    p_categories: config.categories,
  });
  if (error) throw error;
  if (!data) throw new Error("Supabase did not return a room. Run supabase/upgrade_fix_private_rooms.sql and try again.");
  return data as string;
}

export async function joinOnlineRoom(code: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("join_game_room", { p_code: code.trim().toUpperCase() });
  if (error) throw error;
  return data as string;
}

export async function leaveOnlineRoom(roomId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("leave_game_room", { p_room_id: roomId });
  if (error) throw error;
}

export async function setPlayerReady(roomId: string, ready: boolean) {
  const client = requireSupabase();
  const { error } = await client.rpc("set_player_ready", { p_room_id: roomId, p_ready: ready });
  if (error) throw error;
}

export async function startOnlineRoom(roomId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("start_game_room", { p_room_id: roomId });
  if (error) throw error;
}

export async function flipOnlineCard(roomId: string, cardIndex: number) {
  const client = requireSupabase();
  const { error } = await client.rpc("flip_game_card", { p_room_id: roomId, p_card_index: cardIndex });
  if (error) throw error;
}

export async function resolveOnlineTurn(roomId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("resolve_game_turn", { p_room_id: roomId });
  if (error) throw error;
}

export async function finishTimedOutRoom(roomId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("finish_timed_out_room", { p_room_id: roomId });
  if (error) throw error;
}

export async function getOnlineRoom(roomId: string) {
  const client = requireSupabase();
  const [{ data: room, error: roomError }, { data: players, error: playersError }, { data: events }] = await Promise.all([
    client.from("game_rooms").select("*").eq("id", roomId).single(),
    client.from("room_players").select("*, profile:profiles(display_name, avatar_url)").eq("room_id", roomId).order("seat_index"),
    client.from("room_events").select("*").eq("room_id", roomId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (roomError) throw roomError;
  if (playersError) throw playersError;
  return {
    room: room as OnlineRoom,
    players: (players ?? []) as unknown as RoomPlayer[],
    events: (events ?? []) as RoomEvent[],
  };
}
