import { useCallback, useEffect, useState } from "react";
import HomeScreen from "./components/HomeScreen";
import GameScreen from "./components/GameScreen";
import Settings from "./components/Settings";
import AuthModal from "./components/AuthModal";
import AppHeader from "./components/AppHeader";
import OnlineHub from "./components/OnlineHub";
import OnlineGameScreen from "./components/OnlineGameScreen";
import AppFooter from "./components/AppFooter";
import CardLibrary from "./components/CardLibrary";
import LoadingScreen from "./components/LoadingScreen";
import type { GameConfig } from "./types";
import "./styles.css";
import { useAuth } from "./context/AuthContext";

const DEFAULT_CONFIG: GameConfig = {
  mode: "classic",
  pairCount: 80,
  playerCount: 1,
  onlinePlayerCount: 2,
  botCount: 1,
  botDifficulty: "medium",
  categories: ["general", "puerto-rico", "sexual-health", "identities"],
};

export default function App() {
  const { recoveryMode } = useAuth();
  const invitedCode = new URLSearchParams(window.location.search).get("room")?.toUpperCase() || "";
  const [screen, setScreen] = useState<"home" | "game" | "online" | "library">(invitedCode ? "online" : "home");
  const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
  const [authOpen, setAuthOpen] = useState(false);
  const [onlineRoomId, setOnlineRoomId] = useState<string | null>(null);
  const [startupLoading, setStartupLoading] = useState(true);
  const finishStartup = useCallback(() => setStartupLoading(false), []);
  useEffect(() => { if (recoveryMode) setAuthOpen(true); }, [recoveryMode]);

  if (startupLoading) return <LoadingScreen onComplete={finishStartup} />;

  return (
    <>
      <AppHeader onOpenAuth={() => setAuthOpen(true)} onHome={() => {
        // Active games use their own translated confirmation dialog.
        if (screen === "game" || onlineRoomId) return;
        setScreen("home");
      }} />
      {onlineRoomId ? (
        <OnlineGameScreen roomId={onlineRoomId} onLeave={() => { setOnlineRoomId(null); setScreen("online"); }} />
      ) : screen === "game" ? (
        <GameScreen config={config} onHome={() => setScreen("home")} />
      ) : screen === "library" ? (
        <CardLibrary onBack={() => setScreen("home")} />
      ) : screen === "online" ? (
        <OnlineHub config={config} initialCode={invitedCode} onBack={() => setScreen("home")} onEnterRoom={setOnlineRoomId} onRequestAuth={() => setAuthOpen(true)} />
      ) : (
        <HomeScreen config={config} onChange={setConfig} onStart={() => setScreen("game")} onOnline={() => setScreen("online")} onLibrary={() => setScreen("library")} />
      )}
      <Settings />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <AppFooter />
    </>
  );
}
