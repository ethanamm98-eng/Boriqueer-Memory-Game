import { useCallback, useEffect, useState } from "react";
import type { OnlineRoom, RoomEvent, RoomPlayer } from "../types";
import { getOnlineRoom } from "../lib/onlineGame";
import { supabase } from "../lib/supabase";

export function useOnlineRoom(roomId: string) {
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [events, setEvents] = useState<RoomEvent[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await getOnlineRoom(roomId);
      setRoom(data.room);
      setPlayers(data.players);
      setEvents(data.events);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load the room.");
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void refresh();
    if (!supabase) return;
    const client = supabase;

    const channel = client
      .channel(`game-room:${roomId}`, { config: { presence: { key: crypto.randomUUID() } } })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` },
        (payload) => setRoom(payload.new as OnlineRoom))
      .on("postgres_changes", { event: "*", schema: "public", table: "room_players", filter: `room_id=eq.${roomId}` },
        () => void refresh())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "room_events", filter: `room_id=eq.${roomId}` },
        (payload) => setEvents((current) => [payload.new as RoomEvent, ...current].slice(0, 20)))
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id?: string }>();
        setOnlineUserIds([...new Set(Object.values(state).flat().map((entry) => entry.user_id).filter(Boolean) as string[])]);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data } = await client.auth.getUser();
          if (data.user) await channel.track({ user_id: data.user.id, online_at: new Date().toISOString() });
        }
      });

    return () => { void client.removeChannel(channel); };
  }, [refresh, roomId]);

  return { room, players, events, onlineUserIds, loading, error, refresh };
}
