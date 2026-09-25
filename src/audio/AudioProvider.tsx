import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type SoundEffect =
  | "click"
  | "flip"
  | "match"
  | "mismatch"
  | "win"
  | "lose"
  | "start"
  | "warning"
  | "cheer"
  | "clap";

export type AudioSettings = {
  musicEnabled: boolean;
  effectsEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
};

type AudioContextValue = {
  settings: AudioSettings;
  setMusicEnabled: (enabled: boolean) => void;
  setEffectsEnabled: (enabled: boolean) => void;
  setMusicVolume: (volume: number) => void;
  setEffectsVolume: (volume: number) => void;
  playEffect: (effect: SoundEffect) => void;
  startMusic: () => void;
};

const STORAGE_KEY = "boricuir-audio-settings";

const DEFAULT_SETTINGS: AudioSettings = {
  musicEnabled: true,
  effectsEnabled: true,
  musicVolume: 0.35,
  effectsVolume: 0.7,
};

const EFFECT_FILES: Record<SoundEffect, string> = {
  click: "/sound-effects/click.mp3",
  flip: "/sound-effects/flip.mp3",
  match: "/sound-effects/match.mp3",
  mismatch: "/sound-effects/mismatch.mp3",
  win: "/sound-effects/win.mp3",
  lose: "/sound-effects/lose.mp3",
  start: "/sound-effects/start.mp3",
  warning: "/sound-effects/warning.mp3",
  cheer: "/sound-effects/cheer.mp3",
  clap: "/sound-effects/clap.mp3",
};

const AudioContext = createContext<AudioContextValue | null>(null);

function readStoredSettings(): AudioSettings {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(readStoredSettings);
  const settingsRef = useRef(settings);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const effectsRef = useRef<Partial<Record<SoundEffect, HTMLAudioElement>>>({});
  const musicStartedRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const music = new Audio("/songs/background-music.mp3");
    music.loop = true;
    music.preload = "auto";
    music.volume = settingsRef.current.musicVolume;
    musicRef.current = music;

    (Object.keys(EFFECT_FILES) as SoundEffect[]).forEach((effect) => {
      const audio = new Audio(EFFECT_FILES[effect]);
      audio.preload = "auto";
      effectsRef.current[effect] = audio;
    });

    return () => {
      music.pause();
      music.src = "";
      effectsRef.current = {};
    };
  }, []);

  useEffect(() => {
    const stopMusic = () => {
      const music = musicRef.current;
      if (!music) return;
      music.pause();
      music.currentTime = 0;
    };
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") stopMusic();
      else if (musicStartedRef.current && settingsRef.current.musicEnabled) {
        void musicRef.current?.play().catch(() => undefined);
      }
    };
    window.addEventListener("pagehide", stopMusic);
    window.addEventListener("beforeunload", stopMusic);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopMusic();
      window.removeEventListener("pagehide", stopMusic);
      window.removeEventListener("beforeunload", stopMusic);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    if (!musicRef.current) return;
    musicRef.current.volume = settings.musicVolume;
    if (!settings.musicEnabled) musicRef.current.pause();
    else if (musicStartedRef.current) void musicRef.current.play().catch(() => undefined);
  }, [settings.musicEnabled, settings.musicVolume]);

  const startMusic = useCallback(() => {
    musicStartedRef.current = true;
    const music = musicRef.current;
    if (!music || !settingsRef.current.musicEnabled) return;
    music.volume = settingsRef.current.musicVolume;
    void music.play().catch(() => undefined);
  }, []);

  const playEffect = useCallback((effect: SoundEffect) => {
    const current = settingsRef.current;
    const source = effectsRef.current[effect];
    if (!current.effectsEnabled || !source) return;

    const sound = source.cloneNode(true) as HTMLAudioElement;
    sound.volume = current.effectsVolume;
    void sound.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const button = (event.target as HTMLElement).closest("button");
      if (!button || button.dataset.sound === "custom") return;
      startMusic();
      playEffect("click");
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [playEffect, startMusic]);

  const value = useMemo<AudioContextValue>(() => ({
    settings,
    setMusicEnabled: (enabled) => {
      setSettings((current) => ({ ...current, musicEnabled: enabled }));
      if (enabled) window.setTimeout(startMusic, 0);
    },
    setEffectsEnabled: (enabled) => setSettings((current) => ({ ...current, effectsEnabled: enabled })),
    setMusicVolume: (volume) => setSettings((current) => ({ ...current, musicVolume: volume })),
    setEffectsVolume: (volume) => setSettings((current) => ({ ...current, effectsVolume: volume })),
    playEffect,
    startMusic,
  }), [playEffect, settings, startMusic]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) throw new Error("useAudio must be used inside AudioProvider");
  return context;
}
