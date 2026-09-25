import { useEffect, useState } from "react";
import { useAudio } from "../audio/AudioProvider";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const {
    settings,
    setMusicEnabled,
    setEffectsEnabled,
    setMusicVolume,
    setEffectsVolume,
    playEffect,
  } = useAudio();

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="settings-button"
        onClick={() => setOpen(true)}
        aria-label={t("settings")}
        aria-haspopup="dialog"
      >
        <Icon name="settings" />
        <span>{t("settings")}</span>
      </button>

      {open && (
        <div className="settings-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <header className="settings-header">
              <div>
                <span className="settings-kicker">{t("gamePreferences")}</span>
                <h2 id="settings-title">{t("settings")}</h2>
              </div>
              <button type="button" className="settings-close" onClick={() => setOpen(false)} aria-label={t("close")}>×</button>
            </header>

            <section className="settings-section" aria-labelledby="audio-settings-title">
              <div className="settings-section-heading">
                <span className="settings-section-icon"><Icon name="audio" /></span>
                <div><h3 id="audio-settings-title">{t("audioSettings")}</h3><p>{t("audioSettingsHelp")}</p></div>
              </div>
              <div className="settings-section-content">
            <div className="settings-option">
              <div className="settings-option-copy">
                <span className="settings-option-icon"><Icon name="music" /></span>
                <div><strong>{t("backgroundMusic")}</strong><small>{t("musicHelp")}</small></div>
              </div>
              <button
                type="button"
                className={`toggle-switch ${settings.musicEnabled ? "is-on" : ""}`}
                onClick={() => setMusicEnabled(!settings.musicEnabled)}
                aria-pressed={settings.musicEnabled}
                aria-label={`${settings.musicEnabled ? "Disable" : "Enable"} background music`}
              ><span /></button>
            </div>

            <label className={`volume-control ${!settings.musicEnabled ? "is-disabled" : ""}`}>
              <span><strong>{t("musicVolume")}</strong><b>{Math.round(settings.musicVolume * 100)}%</b></span>
              <input type="range" min="0" max="1" step="0.05" value={settings.musicVolume}
                disabled={!settings.musicEnabled} onChange={(event) => setMusicVolume(Number(event.target.value))} />
            </label>

            <div className="settings-separator" />

            <div className="settings-option">
              <div className="settings-option-copy">
                <span className="settings-option-icon"><Icon name="volume" /></span>
                <div><strong>{t("soundEffects")}</strong><small>{t("effectsHelp")}</small></div>
              </div>
              <button
                type="button"
                className={`toggle-switch ${settings.effectsEnabled ? "is-on" : ""}`}
                onClick={() => setEffectsEnabled(!settings.effectsEnabled)}
                aria-pressed={settings.effectsEnabled}
                aria-label={`${settings.effectsEnabled ? "Disable" : "Enable"} sound effects`}
              ><span /></button>
            </div>

            <label className={`volume-control ${!settings.effectsEnabled ? "is-disabled" : ""}`}>
              <span><strong>{t("effectsVolume")}</strong><b>{Math.round(settings.effectsVolume * 100)}%</b></span>
              <input type="range" min="0" max="1" step="0.05" value={settings.effectsVolume}
                disabled={!settings.effectsEnabled} onChange={(event) => setEffectsVolume(Number(event.target.value))} />
            </label>

            <button type="button" className="test-sound-button" disabled={!settings.effectsEnabled}
              data-sound="custom" onClick={() => playEffect("match")}><Icon name="play" /> {t("testSound")}</button>
              </div>
            </section>
            <section className="settings-section" aria-labelledby="language-settings-title">
              <div className="settings-section-heading">
                <span className="settings-section-icon"><Icon name="globe" /></span>
                <div><h3 id="language-settings-title">{t("languageSettings")}</h3><p>{t("languageHelp")}</p></div>
              </div>
              <div className="settings-section-content">
                <div className="settings-language"><div><strong>{t("language")}</strong><small>English / Español</small></div><div className="language-switch" aria-label={t("language")}><button type="button" className={language === "en" ? "is-active" : ""} onClick={() => setLanguage("en")}>EN</button><button type="button" className={language === "es" ? "is-active" : ""} onClick={() => setLanguage("es")}>ES</button></div></div>
              </div>
            </section>
          </section>
        </div>
      )}
    </>
  );
}
