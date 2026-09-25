import { useState } from "react";
import type { GameConfig } from "../types";
import { createOnlineRoom, joinOnlineRoom } from "../lib/onlineGame";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";
import { getCategoriesLabel } from "../data/cardCategories";

type OnlineHubProps = {
  config: GameConfig;
  onBack: () => void;
  onEnterRoom: (roomId: string) => void;
  onRequestAuth: () => void;
  initialCode?: string;
};

function errorMessage(cause: unknown, fallback: string) {
  if (cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string") {
    const message = cause.message;
    if (message.includes("create_game_room") || message.includes("integer[]") || message.includes("record")) {
      return `${message} Run supabase/upgrade_card_categories.sql once in the Supabase SQL Editor.`;
    }
    return message;
  }
  return fallback;
}

export default function OnlineHub({ config, initialCode = "", onBack, onEnterRoom, onRequestAuth }: OnlineHubProps) {
  const { user, profile, configured } = useAuth();
  const { language, t } = useLanguage();
  const [code, setCode] = useState(initialCode.slice(0, 6));
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState("");

  async function createRoom() {
    setBusy("create");
    setError("");
    try { onEnterRoom(await createOnlineRoom({ ...config, playerCount: config.onlinePlayerCount })); }
    catch (cause) { setError(errorMessage(cause, "Could not create the room.")); }
    finally { setBusy(null); }
  }

  async function joinRoom() {
    if (code.trim().length !== 6) return;
    setBusy("join");
    setError("");
    try { onEnterRoom(await joinOnlineRoom(code)); }
    catch (cause) { setError(errorMessage(cause, "Could not join the room.")); }
    finally { setBusy(null); }
  }

  return (
    <main className="online-shell">
      <div className="home-orb home-orb-one" /><div className="home-orb home-orb-two" />
      <section className="online-wrap">
        <header className="online-header">
          <button type="button" className="home-button" onClick={onBack}><Icon name="arrowLeft" /></button>
          <div><span className="hero-kicker">{t("liveMultiplayer")}</span><h1>{t("onlineTitle1")}<br /><em>{t("onlineTitle2")}</em></h1></div>
        </header>

        {!configured ? (
          <section className="online-notice">
            <span><Icon name="zap" /></span><div><h2>{t("connectSupabase")}</h2><p>{t("supabaseHelp")}</p></div>
          </section>
        ) : !user ? (
          <section className="online-notice sign-in-notice">
            <span><Icon name="user" /></span><div><h2>{t("accountRequired")}</h2><p>{t("accountHelp")}</p><button type="button" onClick={onRequestAuth}>{t("signInOrCreate")}</button></div>
          </section>
        ) : (
          <>
            <div className="online-welcome"><span className="online-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : (profile?.display_name || user.email || "P").charAt(0).toUpperCase()}</span><div><small>{t("playingAs")}</small><strong>{profile?.display_name || user.email}</strong></div><span className="live-pill"><i /> {t("online")}</span></div>
            <div className="online-choice-grid">
              <section className="online-choice-card create-card">
                <span className="choice-icon"><Icon name="plus" /></span><small>{t("hostGame")}</small><h2>{t("createRoom")}</h2>
                <p>{t("createRoomHelp")}</p>
                <div className="room-config-summary"><span>{config.onlinePlayerCount} {t("players")}</span><span>{config.pairCount} {t("pairs")}</span><span>{config.mode}</span><span>{getCategoriesLabel(config.categories, language)}</span></div>
                <button type="button" className="online-primary" onClick={createRoom} disabled={Boolean(busy)}>{busy === "create" ? t("creating") : t("createPrivateRoom")}</button>
              </section>
              <section className="online-choice-card join-card">
                <span className="choice-icon"><Icon name="arrowRight" /></span><small>{t("invitation")}</small><h2>{t("joinRoom")}</h2>
                <p>{t("joinHelp")}</p>
                <label className="room-code-field">{t("roomCode")}<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))} placeholder="ABC123" maxLength={6} autoCapitalize="characters" /></label>
                <button type="button" className="online-secondary" onClick={joinRoom} disabled={code.length !== 6 || Boolean(busy)}>{busy === "join" ? t("joining") : t("joinGame")}</button>
              </section>
            </div>
          </>
        )}
        {error && <div className="online-error" role="alert">{error}</div>}
      </section>
    </main>
  );
}
