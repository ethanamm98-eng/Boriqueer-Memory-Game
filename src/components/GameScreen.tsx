import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { getGameModes, getTimeLimit } from "../data/gameModes";
import type { GameCard, GameConfig } from "../types";
import { useAudio } from "../audio/AudioProvider";
import CardArtPreview from "./CardArtPreview";
import ConfirmDialog from "./ConfirmDialog";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";
import DeckZoomControls, { MOBILE_CARD_WIDTHS } from "./DeckZoomControls";
import Confetti from "./Confetti";
import { useAuth } from "../context/AuthContext";
import LeaderboardOverlay from "./LeaderboardOverlay";
import { recordLocalLeaderboard } from "../lib/leaderboard";
import { getCardCategory, getCardIds } from "../data/cardCategories";

type ResultType = "complete" | "time" | "lives" | null;

type GameScreenProps = {
  config: GameConfig;
  onHome: () => void;
};

function randomSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] || Date.now();
}

function seededShuffle<T>(items: T[], seed: number) {
  const copy = [...items];
  let value = seed || 1;
  const random = () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function createDeck(pairCount: number, categories: GameConfig["categories"], seed = randomSeed()): GameCard[] {
  const selected = seededShuffle(
    getCardIds(categories),
    seed
  ).slice(0, pairCount);

  return seededShuffle(
    selected.flatMap((matchId) => {
      const cardCategory = getCardCategory(matchId);
      const card = {
        matchId,
        image: `/cards-v2/card-${matchId}.webp`,
        category: cardCategory.id as GameCard["category"],
        backImage: cardCategory.backImage,
      };
      return [
        { ...card, uid: `${matchId}-a` },
        { ...card, uid: `${matchId}-b` },
      ];
    }),
    seed + 97
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
}

export default function GameScreen({ config, onHome }: GameScreenProps) {
  const { language, t } = useLanguage();
  const mode = getGameModes(language).find((item) => item.id === config.mode)!;
  const { playEffect } = useAudio();
  const { recordLocalGame, profile } = useAuth();
  const totalPlayers = config.playerCount + config.botCount;
  const botMemoryRef = useRef<Map<number, Set<string>>>(new Map());
  const botThinkingRef = useRef(false);
  const resultRecordedRef = useRef(false);
  const leaderboardRecordedRef = useRef(false);
  const [deck, setDeck] = useState<GameCard[]>([]);
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(
    getTimeLimit(config.pairCount)
  );
  const [started, setStarted] = useState(false);
  const [locked, setLocked] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [streaks, setStreaks] = useState<number[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [lives, setLives] = useState(5);
  const [result, setResult] = useState<ResultType>(null);
  const [previewActive, setPreviewActive] = useState(config.mode === "rush");
  const [previewSeconds, setPreviewSeconds] = useState(5);
  const [artPreview, setArtPreview] = useState<string | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [deckZoom, setDeckZoom] = useState(2);
  const [restarting, setRestarting] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const closeArtPreview = useCallback(() => setArtPreview(null), []);

  const playerName = useCallback(
    (index: number) =>
      index < config.playerCount
        ? index === 0 && profile?.display_name ? profile.display_name : `${t("player")} ${index + 1}`
        : `${t("bot")} ${index - config.playerCount + 1}`,
    [config.playerCount, profile?.display_name, t]
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!result) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [result]);

  const newGame = useCallback(
    () => {
      const seed = randomSeed();
      setDeck(createDeck(config.pairCount, config.categories, seed));
      setFlipped([]);
      setMatched([]);
      setMoves(0);
      setElapsed(0);
      setTimeRemaining(getTimeLimit(config.pairCount));
      setStarted(false);
      setLocked(false);
      setScores(Array.from({ length: totalPlayers }, () => 0));
      setStreaks(Array.from({ length: totalPlayers }, () => 0));
      setCurrentPlayer(0);
      setLives(5);
      setResult(null);
      setPreviewActive(config.mode === "rush");
      setPreviewSeconds(5);
      setArtPreview(null);
      botMemoryRef.current.clear();
      botThinkingRef.current = false;
      resultRecordedRef.current = false;
      leaderboardRecordedRef.current = false;
      setShowLeaderboard(false);
    },
    [config, totalPlayers]
  );

  const restartGame = () => {
    setRestarting(true);
    playEffect("start");
    newGame();
    window.setTimeout(() => setRestarting(false), 850);
  };

  useEffect(() => {
    newGame();
  }, [newGame, config.botCount, config.pairCount, totalPlayers]);

  useEffect(() => {
    if (!previewActive) return;
    const timer = window.setInterval(() => {
      setPreviewSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          setPreviewActive(false);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [previewActive]);

  useEffect(() => {
    if (!started || result || previewActive) return;
    const timer = window.setInterval(
      () => setElapsed((value) => value + 1),
      1000
    );
    return () => window.clearInterval(timer);
  }, [previewActive, result, started]);

  useEffect(() => {
    if (config.mode !== "clock" || !started || result || previewActive) return;
    const timer = window.setInterval(() => {
      setTimeRemaining((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer);
          setStarted(false);
          setLocked(true);
          setResult("time");
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [config.mode, previewActive, result, started]);

  useEffect(() => {
    if (
      config.mode === "clock" &&
      started &&
      !result &&
      timeRemaining <= 10 &&
      timeRemaining > 0
    ) {
      playEffect("warning");
    }
  }, [config.mode, playEffect, result, started, timeRemaining]);

  useEffect(() => {
    if (matched.length !== config.pairCount || !started || result) return;
    const timer = window.setTimeout(() => {
      setStarted(false);
      setResult("complete");
    }, 450);
    return () => window.clearTimeout(timer);
  }, [config.pairCount, matched.length, result, started]);

  useEffect(() => {
    if (result === "complete") {
      playEffect("win");
      playEffect("cheer");
      playEffect("clap");
    }
    if (result === "time" || result === "lives") playEffect("lose");
    if (result && !resultRecordedRef.current) {
      resultRecordedRef.current = true;
      const humanWon =
        result === "complete" && scores[0] === Math.max(...scores);
      void recordLocalGame(humanWon).catch(() => undefined);
    }
    if (result && !leaderboardRecordedRef.current) {
      leaderboardRecordedRef.current = true;
      setShowLeaderboard(true);
      void recordLocalLeaderboard({ mode: config.mode, score: scores[0] || 0, pairs: matched.length, moves, durationSeconds: elapsed }).catch(() => undefined);
    }
  }, [config.mode, elapsed, matched.length, moves, playEffect, recordLocalGame, result, scores]);

  const progress = Math.round((matched.length / config.pairCount) * 100);
  const topScore = Math.max(...scores, 0);
  const leaders = useMemo(
    () =>
      scores
        .map((score, index) => ({ score, name: playerName(index) }))
        .filter((player) => player.score === topScore)
        .map((player) => player.name),
    [playerName, scores, topScore]
  );

  const resultTitle =
    result === "time"
      ? t("timesUp")
      : result === "lives"
      ? t("noChances")
      : totalPlayers === 1
      ? t("boardComplete")
      : leaders.length === 1
      ? `${leaders[0]} ${t("wins")}`
      : `${leaders.join(" & ")} ${t("tied")}`;

  function rememberCard(card: GameCard) {
    const rememberChance =
      config.botDifficulty === "hard"
        ? 1
        : config.botDifficulty === "medium"
        ? 0.72
        : 0.24;
    if (Math.random() > rememberChance) return;
    const known = botMemoryRef.current.get(card.matchId) ?? new Set<string>();
    known.add(card.uid);
    botMemoryRef.current.set(card.matchId, known);
  }

  function handleCardClick(card: GameCard, showArt = true) {
    if (
      locked ||
      previewActive ||
      result ||
      flipped.includes(card.uid) ||
      matched.includes(card.matchId) ||
      flipped.length === 2
    )
      return;
    if (!started) setStarted(true);
    playEffect("flip");
    rememberCard(card);
    if (showArt) setArtPreview(card.image);

    const next = [...flipped, card.uid];
    setFlipped(next);
    if (next.length !== 2) return;

    setMoves((value) => value + 1);
    setLocked(true);
    const first = deck.find((item) => item.uid === next[0]);

    if (first?.matchId === card.matchId) {
      window.setTimeout(() => {
        playEffect("match");
        const nextStreak = streaks[currentPlayer] + 1;
        const earnedPoints = config.mode === "streak" ? nextStreak : 1;
        setMatched((current) => [...current, card.matchId]);
        botMemoryRef.current.delete(card.matchId);
        setScores((current) =>
          current.map((score, index) =>
            index === currentPlayer ? score + earnedPoints : score
          )
        );
        setStreaks((current) =>
          current.map((streak, index) =>
            index === currentPlayer ? nextStreak : streak
          )
        );
        setFlipped([]);
        setLocked(false);
      }, 420);
    } else {
      window.setTimeout(() => {
        playEffect("mismatch");
        const nextLives = lives - 1;
        setFlipped([]);
        setStreaks((current) =>
          current.map((streak, index) => (index === currentPlayer ? 0 : streak))
        );
        setCurrentPlayer((player) => (player + 1) % totalPlayers);
        if (config.mode === "last-chance") {
          setLives(nextLives);
          if (nextLives <= 0) {
            setStarted(false);
            setResult("lives");
            setLocked(true);
            return;
          }
        }
        setLocked(false);
      }, 850);
    }
  }

  useEffect(() => {
    const isBotTurn = currentPlayer >= config.playerCount;
    if (
      !isBotTurn ||
      locked ||
      previewActive ||
      result ||
      deck.length === 0 ||
      flipped.length >= 2 ||
      botThinkingRef.current
    )
      return;

    const available = deck.filter(
      (card) => !matched.includes(card.matchId) && !flipped.includes(card.uid)
    );
    if (!available.length) return;
    const accuracy =
      config.botDifficulty === "hard"
        ? 1
        : config.botDifficulty === "medium"
        ? 0.68
        : 0.12;
    let choice: GameCard | undefined;

    if (flipped.length === 1) {
      const first = deck.find((card) => card.uid === flipped[0]);
      const rememberedMatch = first
        ? available.find(
            (card) =>
              card.matchId === first.matchId &&
              botMemoryRef.current.get(first.matchId)?.has(card.uid)
          )
        : undefined;
      if (rememberedMatch && Math.random() <= accuracy)
        choice = rememberedMatch;
    } else if (Math.random() <= accuracy) {
      for (const [matchId, uids] of botMemoryRef.current) {
        const knownAvailable = available.filter(
          (card) => card.matchId === matchId && uids.has(card.uid)
        );
        if (knownAvailable.length >= 2) {
          choice = knownAvailable[0];
          break;
        }
      }
    }

    choice ??= available[Math.floor(Math.random() * available.length)];
    botThinkingRef.current = true;
    const timer = window.setTimeout(
      () => {
        botThinkingRef.current = false;
        if (choice) handleCardClick(choice, true);
      },
      // Leave enough time for everyone to see the first bot card at full size
      // before the bot reveals its second choice.
      flipped.length === 0 ? 720 : 1650
    );
    return () => {
      window.clearTimeout(timer);
      botThinkingRef.current = false;
    };
  }, [
    config.botDifficulty,
    config.playerCount,
    currentPlayer,
    deck,
    flipped,
    locked,
    matched,
    previewActive,
    result,
  ]);

  return (
    <main className="game-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="game-wrap" aria-label={`${mode.name} memory game`}>
        <header className="game-header enhanced-game-header">
          <div className="game-title-row">
            <button
              className="home-button"
              type="button"
              onClick={() => setConfirmQuit(true)}
              aria-label={t("returnHome")}
            >
              <Icon name="arrowLeft" />
            </button>
            <div>
              <div className="eyebrow">
                <Icon name={mode.icon} /> {mode.shortName} {t("mode")}
              </div>
              <h1>Boricuir Memory</h1>
            </div>
          </div>
          <div className="game-actions">
            <span className={`active-mode-pill accent-${mode.accent}`}>
              <Icon name={mode.icon} /> {mode.name}
            </span>
            <button
              className={`restart-button ${restarting ? "is-restarting" : ""}`}
              type="button"
              data-sound="custom"
              onClick={restartGame}
              disabled={restarting}
            >
              <Icon name="refresh" />{" "}
              {restarting
                ? language === "es"
                  ? "Reiniciando…"
                  : "Restarting…"
                : t("newGame")}
            </button>
          </div>
        </header>

        {previewActive && (
          <div className="preview-banner" role="status">
            <span className="preview-count">{previewSeconds}</span>
            <div>
              <strong>{t("memorize")}</strong>
              <small>{t("cardsFlip")}</small>
            </div>
          </div>
        )}

        <div className="score-strip enhanced-score-strip" aria-live="polite">
          <div className="score-item">
            <span>{t("matches")}</span>
            <strong>
              {matched.length}
              <small> / {config.pairCount}</small>
            </strong>
          </div>
          <div className="score-item">
            <span>{t("moves")}</span>
            <strong>{moves}</strong>
          </div>
          <div
            className={`score-item ${
              config.mode === "clock" && timeRemaining <= 15 ? "is-urgent" : ""
            }`}
          >
            <span>{config.mode === "clock" ? t("timeLeft") : t("time")}</span>
            <strong>
              {formatTime(config.mode === "clock" ? timeRemaining : elapsed)}
            </strong>
          </div>
          {config.mode === "last-chance" && (
            <div className="score-item special-stat">
              <span>{t("lives")}</span>
              <strong className="lives-display">
                {Array.from({ length: 5 }, (_, i) => (
                  <Icon
                    key={i}
                    name="heart"
                    className={i < lives ? "is-filled" : ""}
                  />
                ))}
              </strong>
            </div>
          )}
          {config.mode === "streak" && (
            <div className="score-item special-stat">
              <span>{t("currentStreak")}</span>
              <strong>×{streaks[currentPlayer] + 1}</strong>
            </div>
          )}
          <div className="progress-wrap">
            <div className="progress-label">
              <span>{t("progress")}</span>
              <strong>{progress}%</strong>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {currentPlayer >= config.playerCount && !result && (
          <div className="bot-thinking-banner">
            <span>
              <Icon name="sparkles" />
            </span>
            <div>
              <strong>
                {playerName(currentPlayer)} {t("thinking")}
              </strong>
              <small>
                {t(config.botDifficulty)} {t("difficulty")}
              </small>
            </div>
            <i />
            <i />
            <i />
          </div>
        )}

        <div
          className={`player-board players-${Math.min(totalPlayers, 4)}`}
          aria-label="Player scores"
          aria-live="polite"
        >
          {scores.map((score, index) => {
            const isCurrent = index === currentPlayer && !result;
            return (
              <div
                key={index}
                className={`player-card ${isCurrent ? "is-current" : ""}`}
                aria-current={isCurrent ? "true" : undefined}
              >
                <div className="player-identity">
                  <span
                    className={`player-avatar ${
                      index >= config.playerCount ? "is-bot" : ""
                    }`}
                  >
                    {index >= config.playerCount ? (
                      <Icon name="sparkles" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div>
                    <span className="player-name">{playerName(index)}</span>
                    {index >= config.playerCount && (
                      <span className="bot-level-label">
                        {t(config.botDifficulty)} {t("bot")}
                      </span>
                    )}
                    {isCurrent && (
                      <span className="turn-label">{t("playing")}</span>
                    )}
                  </div>
                </div>
                <div className="player-score-wrap">
                  {config.mode === "streak" && streaks[index] > 0 && (
                    <span className="mini-streak">
                      <Icon name="flame" /> {streaks[index]}
                    </span>
                  )}
                  <strong className="player-score">
                    {score}
                    <small> {score === 1 ? t("point") : t("points")}</small>
                  </strong>
                </div>
              </div>
            );
          })}
        </div>

        <DeckZoomControls level={deckZoom} onChange={setDeckZoom} />
        <div
          className={`card-grid zoomable-card-grid grid-${config.pairCount} ${
            previewActive ? "is-previewing" : ""
          }`}
          style={
            {
              "--mobile-card-width": `${MOBILE_CARD_WIDTHS[deckZoom]}px`,
            } as CSSProperties
          }
        >
          {deck.map((card) => {
            const isFlipped =
              previewActive ||
              flipped.includes(card.uid) ||
              matched.includes(card.matchId);
            const isMatched = matched.includes(card.matchId);
            return (
              <button
                key={card.uid}
                type="button"
                data-sound="custom"
                className={`memory-card ${isFlipped ? "is-flipped" : ""} ${
                  isMatched ? "is-matched" : ""
                }`}
                onClick={() => handleCardClick(card)}
                disabled={
                  isMatched ||
                  previewActive ||
                  Boolean(result) ||
                  currentPlayer >= config.playerCount
                }
                aria-label={
                  isMatched
                    ? t("matchedCard")
                    : isFlipped
                    ? t("revealedCard")
                    : t("hiddenCard")
                }
                aria-pressed={isFlipped}
              >
                <span className="card-inner">
                  <span className="card-face card-back">
                    <img src={card.backImage} alt="" draggable={false} />
                  </span>
                  <span className="card-face card-front">
                    <img src={card.image} alt="" draggable={false} />
                    {isMatched && (
                      <span className="match-mark">
                        <Icon name="check" />
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="game-hint">{mode.rule}</p>
      </section>

      {result && showLeaderboard && (
        <LeaderboardOverlay
          mode={config.mode}
          modeName={mode.name}
          fallbackEntries={scores.map((score, index) => ({ displayName: playerName(index), avatarUrl: index === 0 ? profile?.avatar_url || null : null, score, pairs: matched.length, moves, durationSeconds: elapsed }))}
          onDone={() => setShowLeaderboard(false)}
        />
      )}
      {result && !showLeaderboard && (
        <div className="modal-backdrop" role="presentation">
          {result === "complete" && <Confetti />}
          <section
            className="win-dialog result-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
          >
            <div className={`trophy result-${result}`}>
              <Icon
                name={
                  result === "complete"
                    ? "trophy"
                    : result === "time"
                    ? "clock"
                    : "heart"
                }
              />
            </div>
            <span className="result-mode">{mode.name}</span>
            <h2 id="result-title">{resultTitle}</h2>
            <p>
              {scores
                .map((score, index) => `${playerName(index)}: ${score}`)
                .join(" · ")}
            </p>
            <p>
              {matched.length} {t("of")} {config.pairCount} {t("pairs")} ·{" "}
              {moves} {t("moves")} · {formatTime(elapsed)}
            </p>
            <div className="result-actions">
              <button
                type="button"
                className="secondary-result-button"
                onClick={onHome}
              >
                {t("gameModes")}
              </button>
              <button
                type="button"
                className="play-again-button"
                data-sound="custom"
                onClick={restartGame}
              >
                <Icon className="refresh-icon" name="refresh" /> {t("playAgain")}
              </button>
            </div>
          </section>
        </div>
      )}
      <CardArtPreview image={artPreview} onClose={closeArtPreview} />
      {restarting && (
        <div className="restart-indicator">
          <Icon name="refresh" />
          <strong>
            {language === "es"
              ? "Preparando un tablero nuevo…"
              : "Preparing a fresh board…"}
          </strong>
        </div>
      )}
      <ConfirmDialog
        open={confirmQuit}
        onCancel={() => setConfirmQuit(false)}
        onConfirm={onHome}
      />
    </main>
  );
}
