import { useEffect, useMemo, useRef, useState } from "react";
import type { GameModeId } from "../types";
import { getModeLeaderboard, type LeaderboardEntry } from "../lib/leaderboard";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";

type Props = {
  mode: GameModeId;
  modeName: string;
  fallbackEntries: LeaderboardEntry[];
  onDone: () => void;
};

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${Math.max(0, seconds % 60).toString().padStart(2, "0")}`;
}

export default function LeaderboardOverlay({ mode, modeName, fallbackEntries, onDone }: Props) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [remaining, setRemaining] = useState(12);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = await getModeLeaderboard(mode);
        if (active) setEntries(rows);
      } catch { /* The current match still provides a useful fallback board. */ }
    };
    const refresh = window.setTimeout(load, 350);
    return () => { active = false; window.clearTimeout(refresh); };
  }, [mode]);
  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const next = Math.max(0, 12 - Math.floor((Date.now() - startedAt) / 1000));
      setRemaining(next);
      if (next === 0) { window.clearInterval(timer); onDoneRef.current(); }
    }, 250);
    return () => window.clearInterval(timer);
  }, []);
  const board = useMemo(() => {
    const source = entries.length ? entries : fallbackEntries;
    return [...source]
      .sort((a, b) => b.score - a.score || a.durationSeconds - b.durationSeconds || a.moves - b.moves)
      .slice(0, 3);
  }, [entries, fallbackEntries]);
  return <div className="leaderboard-overlay" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
    <div className="leaderboard-motion" aria-hidden="true"><i /><i /><i /><i /></div>
    <section className="leaderboard-card">
      <div className="leaderboard-crown"><Icon name="trophy" /></div>
      <span className="result-mode">{modeName}</span>
      <h2 id="leaderboard-title">{t("modeLeaderboard")}</h2>
      <p>{t("topThreeHelp")}</p>
      <ol className="leaderboard-list">
        {board.map((entry, index) => <li key={entry.id || `${entry.displayName}-${index}`} className={`rank-${index + 1}`}>
          <b className="leaderboard-rank">{index + 1}</b>
          <span className="leaderboard-avatar">{entry.avatarUrl ? <img src={entry.avatarUrl} alt="" /> : entry.displayName.charAt(0).toUpperCase()}</span>
          <span className="leaderboard-player"><strong title={entry.displayName}>{entry.displayName}</strong><small>{entry.pairs} {t("pairs")} · {entry.moves} {t("moves")} · {formatTime(entry.durationSeconds)}</small></span>
          <strong className="leaderboard-score">{entry.score}<small>{t("points")}</small></strong>
        </li>)}
        {!board.length && <li className="leaderboard-empty">{t("firstLeaderboardEntry")}</li>}
      </ol>
      <button type="button" className="leaderboard-skip" onClick={onDone}>{t("continueIn")} {remaining}s</button>
      <div className="leaderboard-timer"><span style={{ width: `${(remaining / 12) * 100}%` }} /></div>
    </section>
  </div>;
}
