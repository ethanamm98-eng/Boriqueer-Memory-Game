import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useAuth } from "../context/AuthContext";
import { useAudio } from "../audio/AudioProvider";
import { useOnlineRoom } from "../hooks/useOnlineRoom";
import { finishTimedOutRoom, flipOnlineCard, leaveOnlineRoom, resolveOnlineTurn, setPlayerReady, startOnlineRoom } from "../lib/onlineGame";
import { getGameModes } from "../data/gameModes";
import CardArtPreview from "./CardArtPreview";
import ConfirmDialog from "./ConfirmDialog";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";
import DeckZoomControls, { MOBILE_CARD_WIDTHS } from "./DeckZoomControls";
import InvitePlayers from "./InvitePlayers";
import Confetti from "./Confetti";
import LeaderboardOverlay from "./LeaderboardOverlay";
import { ALL_CATEGORY_IDS, getCardCategory, getCategoriesLabel } from "../data/cardCategories";

type OnlineGameScreenProps = { roomId: string; onLeave: () => void };

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.max(0, seconds % 60).toString().padStart(2, "0")}`;
}

export default function OnlineGameScreen({ roomId, onLeave }: OnlineGameScreenProps) {
  const { user, refreshProfile } = useAuth();
  const { language, t } = useLanguage();
  const { playEffect, startMusic } = useAudio();
  const { room, players, events, onlineUserIds, loading, error, refresh } = useOnlineRoom(roomId);
  const [actionError, setActionError] = useState("");
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const [artPreview, setArtPreview] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [deckZoom, setDeckZoom] = useState(2);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const closeArtPreview = useCallback(() => setArtPreview(null), []);
  const previousMatchedRef = useRef(0);
  const previousStatusRef = useRef<string | null>(null);
  const previousFlippedIndicesRef = useRef<number[]>([]);

  const me = players.find((player) => player.user_id === user?.id);
  const currentPlayer = players.find((player) => player.seat_index === room?.current_player_index);
  const isMyTurn = room?.status === "playing" && room.turn_state === "ready" && currentPlayer?.user_id === user?.id;
  const mode = getGameModes(language).find((item) => item.id === room?.mode);
  const canStart = Boolean(room && user?.id === room.host_id && players.length >= 2 && players.every((player) => player.is_ready));

  useEffect(() => {
    startMusic();
  }, [startMusic]);

  useEffect(() => { const warn=(event:BeforeUnloadEvent)=>{if(room?.status==="playing"){event.preventDefault();event.returnValue=""}};window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn)},[room?.status]);

  useEffect(() => {
    if (room?.status !== "playing") return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [room?.status]);

  useEffect(() => {
    if (!room || room.mode !== "clock" || room.status !== "playing" || !room.started_at) return;
    const update = () => {
      const end = new Date(room.started_at!).getTime() + room.time_limit_seconds * 1000;
      const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setSecondsRemaining(remaining);
      if (remaining === 0) void finishTimedOutRoom(room.id).catch(() => undefined);
    };
    update();
    const timer = window.setInterval(update, 500);
    return () => window.clearInterval(timer);
  }, [room?.id, room?.mode, room?.started_at, room?.status, room?.time_limit_seconds]);

  const flippedPairKey = room?.flipped_indices.join("-") ?? "";

  useEffect(() => {
    if (!room) {
      previousFlippedIndicesRef.current = [];
      return;
    }

    const previous = previousFlippedIndicesRef.current;
    const newlyFlipped = room.flipped_indices.filter((index) => !previous.includes(index));
    previousFlippedIndicesRef.current = [...room.flipped_indices];

    // The local click handler already opens this preview for the current user.
    // Realtime updates open it for everyone else watching the turn.
    if (currentPlayer?.user_id === user?.id || newlyFlipped.length === 0) return;
    const latestIndex = newlyFlipped[newlyFlipped.length - 1];
    const matchId = room.deck[latestIndex];
    if (!matchId) return;
    playEffect("flip");
    setArtPreview(`/cards-v2/card-${matchId}.webp`);
  }, [currentPlayer?.user_id, flippedPairKey, playEffect, room, user?.id]);

  useEffect(() => {
    if (!room?.id || room.turn_state !== "resolving" || room.flipped_indices.length !== 2) return;

    // Realtime player/event updates can replace the room object while this timer
    // is running. Primitive dependencies keep those unrelated updates from
    // cancelling the pair resolver before it fires.
    const timer = window.setTimeout(async () => {
      try {
        await resolveOnlineTurn(room.id);
        await refresh();
      } catch (cause) {
        setActionError(cause instanceof Error ? cause.message : "The pair could not be resolved. Please try again.");
      }
    }, room.last_flip_was_match ? 450 : 900);

    return () => window.clearTimeout(timer);
  }, [flippedPairKey, refresh, room?.id, room?.last_flip_was_match, room?.turn_state]);

  useEffect(() => {
    if (!room) return;
    if (room.matched_pair_ids.length > previousMatchedRef.current) playEffect("match");
    else if (room.turn_state === "resolving" && room.last_flip_was_match === false) playEffect("mismatch");
    previousMatchedRef.current = room.matched_pair_ids.length;
  }, [playEffect, room?.last_flip_was_match, room?.matched_pair_ids.length, room?.turn_state]);

  useEffect(() => {
    if (!room) return;
    if (previousStatusRef.current === "playing" && room.status === "finished") {
      const won = Boolean(user?.id && room.winner_ids.includes(user.id));
      playEffect(won ? "win" : "lose");
      if (won) { playEffect("cheer"); playEffect("clap"); }
      void refreshProfile().catch(() => undefined);
      setShowLeaderboard(true);
    }
    previousStatusRef.current = room.status;
  }, [playEffect, room?.status, room?.winner_ids, user?.id]);

  useEffect(() => {
    if (room?.mode === "clock" && room.status === "playing" && secondsRemaining > 0 && secondsRemaining <= 10) playEffect("warning");
  }, [playEffect, room?.mode, room?.status, secondsRemaining]);

  const winnerNames = useMemo(() => players.filter((player) => room?.winner_ids.includes(player.user_id)).map((player) => player.profile?.display_name || `Player ${player.seat_index + 1}`), [players, room?.winner_ids]);

  async function perform(action: () => Promise<void>) {
    setActionError("");
    try { await action(); }
    catch (cause) { setActionError(cause instanceof Error ? cause.message : "That action could not be completed."); }
  }

  async function leave() {
    await perform(async () => { await leaveOnlineRoom(roomId); onLeave(); });
  }

  if (loading) return <main className="online-shell centered-state"><div className="loading-spinner" /><p>{t("joiningRoom")}</p></main>;
  if (error || !room) return <main className="online-shell centered-state"><h1>{t("roomUnavailable")}</h1><p>{error || t("roomMissing")}</p><button onClick={onLeave}>{t("returnHome")}</button></main>;

  if (room.status === "waiting") {
    return (
      <main className="online-shell lobby-shell">
        <section className="lobby-wrap">
          <header className="lobby-header"><button className="home-button" type="button" onClick={leave}><Icon name="arrowLeft" /></button><div><span className="hero-kicker">{t("privateRoom")}</span><h1>{t("waitingPlayers")}</h1></div><span className="live-pill"><i /> {t("online")}</span></header>
          <section className="invite-code-panel"><small>{t("shareCode")}</small><strong>{room.code}</strong><button type="button" onClick={() => void navigator.clipboard.writeText(room.code)}>{t("copyCode")}</button></section>
          <InvitePlayers code={room.code} />
          <section className="lobby-panel">
            <div className="lobby-title"><div><h2>{t("players")}</h2><p>{players.length} / {room.max_players} {t("players")}</p></div><span>{players.filter((player) => player.is_ready).length}/{players.length} {t("ready")}</span></div>
            <div className="lobby-player-list">{Array.from({ length: room.max_players }, (_, index) => {
              const player = players.find((item) => item.seat_index === index);
              return player ? <div className="lobby-player" key={player.id}><span className="online-avatar">{player.profile?.avatar_url ? <img src={player.profile.avatar_url} alt="" /> : (player.profile?.display_name || "P").charAt(0)}</span><div><strong title={player.profile?.display_name || `${t("player")} ${index + 1}`}>{player.profile?.display_name || `${t("player")} ${index + 1}`}{player.user_id === room.host_id && <small> {t("host")}</small>}</strong><span>{onlineUserIds.includes(player.user_id) ? t("onlineNow") : t("connectingDots")}</span></div><b className={player.is_ready ? "is-ready" : ""}>{player.is_ready ? t("ready") : t("notReady")}</b></div>
              : <div className="lobby-player empty-player" key={index}><span><Icon name="plus" /></span><p>{t("waitingForPlayer")} {index + 1}</p></div>;
            })}</div>
            <div className="lobby-actions">
              {me && user?.id !== room.host_id && <button type="button" className="online-secondary" onClick={() => perform(() => setPlayerReady(room.id, !me.is_ready))}>{me.is_ready ? t("notReady") : t("imReady")}</button>}
              {user?.id === room.host_id && <button type="button" className="online-primary" disabled={!canStart} data-sound="custom" onClick={() => perform(async () => { playEffect("start"); await startOnlineRoom(room.id); })}>{players.length < 2 ? t("waitingAnother") : !players.every((player) => player.is_ready) ? t("waitingReady") : t("startGame")}</button>}
            </div>
          </section>
          {(actionError || events[0]) && <div className={`room-toast ${actionError ? "is-error" : ""}`}>{actionError || events[0]?.message}</div>}
        </section>
      </main>
    );
  }

  const elapsed = room.started_at ? Math.max(0, Math.floor((nowMs - new Date(room.started_at).getTime()) / 1000)) : 0;
  const rushPreviewSeconds = room.mode === "rush" && room.status === "playing" ? Math.max(0, 5 - elapsed) : 0;
  const displayTime = room.mode === "clock" ? secondsRemaining : elapsed;

  return (
    <main className="game-shell online-game-shell">
      <section className="game-wrap">
        <header className="game-header enhanced-game-header"><div className="game-title-row"><button className="home-button" type="button" onClick={() => setConfirmQuit(true)}><Icon name="arrowLeft" /></button><div><div className="eyebrow"><Icon name="wifi" /> {t("online").toUpperCase()} · {t("roomCode").toUpperCase()} {room.code}</div><h1>Boricuir Memory</h1></div></div><div className="game-actions"><span className={`active-mode-pill accent-${mode?.accent || "pink"}`}>{mode && <Icon name={mode.icon} />} {mode?.name}</span><span className="category-pill">{getCategoriesLabel(room.categories?.length ? room.categories : ALL_CATEGORY_IDS, language)}</span></div></header>
        <div className="score-strip enhanced-score-strip"><div className="score-item"><span>{t("matches")}</span><strong>{room.matched_pair_ids.length}<small> / {room.pair_count}</small></strong></div><div className="score-item"><span>{t("moves")}</span><strong>{room.moves}</strong></div><div className={`score-item ${room.mode === "clock" && secondsRemaining <= 10 ? "is-urgent" : ""}`}><span>{room.mode === "clock" ? t("timeLeft") : t("time")}</span><strong>{formatTime(displayTime)}</strong></div>{room.mode === "last-chance" && <div className="score-item special-stat"><span>{t("lives")}</span><strong className="lives-display">{Array.from({length:5},(_,i)=><Icon key={i} name="heart" className={i<room.lives?"is-filled":""}/>)}</strong></div>}<div className="progress-wrap"><div className="progress-label"><span>{t("progress")}</span><strong>{Math.round(room.matched_pair_ids.length / room.pair_count * 100)}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${room.matched_pair_ids.length / room.pair_count * 100}%` }} /></div></div></div>
        {rushPreviewSeconds > 0 && <div className="preview-banner"><span className="preview-count">{rushPreviewSeconds}</span><div><strong>{t("memorize")}</strong><small>{t("devicesBegin")}</small></div></div>}
        <div className={`turn-banner ${isMyTurn && rushPreviewSeconds === 0 ? "is-mine" : ""}`}><span>{rushPreviewSeconds > 0 ? t("memoryPreview") : isMyTurn ? t("yourTurn") : `${currentPlayer?.profile?.display_name || t("player")} ${t("isPlaying")}`}</span><small>{rushPreviewSeconds > 0 ? t("previewEnds") : room.turn_state === "resolving" ? t("checkingPair") : isMyTurn ? t("chooseTwo") : t("liveUpdates")}</small></div>
        <div className={`player-board players-${players.length}`}>{players.map((player) => { const playerName = player.profile?.display_name || `${t("player")} ${player.seat_index + 1}`; return <div key={player.id} className={`player-card ${player.seat_index === room.current_player_index && room.status === "playing" ? "is-current" : ""}`}><div className="player-identity"><span className="player-avatar">{player.profile?.avatar_url ? <img src={player.profile.avatar_url} alt="" /> : playerName.charAt(0)}</span><div><span className="player-name" title={playerName}>{playerName}</span><span className="presence-label"><i className={onlineUserIds.includes(player.user_id) ? "online" : ""} />{onlineUserIds.includes(player.user_id) ? t("online") : t("away")}</span></div></div><strong className="player-score">{player.score}<small>{t("points")}</small></strong></div>;})}</div>
        <DeckZoomControls level={deckZoom} onChange={setDeckZoom} />
        <div className={`card-grid zoomable-card-grid grid-${room.pair_count}`} style={{ "--mobile-card-width": `${MOBILE_CARD_WIDTHS[deckZoom]}px` } as CSSProperties}>{room.deck.map((matchId, index) => {
          const shown = rushPreviewSeconds > 0 || room.flipped_indices.includes(index) || room.matched_pair_ids.includes(matchId);
          const matched = room.matched_pair_ids.includes(matchId);
          const cardCategory = getCardCategory(matchId);
          return <button key={index} type="button" data-sound="custom" className={`memory-card ${shown ? "is-flipped" : ""} ${matched ? "is-matched" : ""}`} disabled={!isMyTurn || shown || room.turn_state !== "ready" || rushPreviewSeconds > 0} onClick={() => { playEffect("flip"); setArtPreview(`/cards-v2/card-${matchId}.webp`); void perform(() => flipOnlineCard(room.id, index)); }}><span className="card-inner"><span className="card-face card-back"><img src={cardCategory.backImage} alt="" /></span><span className="card-face card-front"><img src={`/cards-v2/card-${matchId}.webp`} alt="" />{matched && <span className="match-mark"><Icon name="check" /></span>}</span></span></button>;
        })}</div>
        {actionError && <div className="online-error" role="alert">{actionError}</div>}
      </section>
      {room.status === "finished" && showLeaderboard && <LeaderboardOverlay mode={room.mode} modeName={mode?.name || room.mode} fallbackEntries={players.map((player) => ({ displayName: player.profile?.display_name || `${t("player")} ${player.seat_index + 1}`, avatarUrl: player.profile?.avatar_url || null, score: player.score, pairs: player.score, moves: room.moves, durationSeconds: elapsed }))} onDone={() => setShowLeaderboard(false)} />}
      {room.status === "finished" && !showLeaderboard && <div className="modal-backdrop"><Confetti /><section className="win-dialog"><div className="trophy"><Icon name="trophy" /></div><span className="result-mode">{t("onlineComplete")}</span><h2>{winnerNames.length ? `${winnerNames.join(" & ")} ${t("wins")}` : t("gameOver")}</h2><p>{players.map((player) => `${player.profile?.display_name || `${t("player")} ${player.seat_index + 1}`}: ${player.score}`).join(" · ")}</p><button type="button" className="play-again-button" onClick={leave}>{t("returnLobby")}</button></section></div>}
      <CardArtPreview image={artPreview} onClose={closeArtPreview} />
      <ConfirmDialog open={confirmQuit} onCancel={() => setConfirmQuit(false)} onConfirm={onLeave} />
    </main>
  );
}
