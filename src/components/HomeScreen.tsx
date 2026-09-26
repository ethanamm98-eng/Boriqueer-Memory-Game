import { useEffect, useState, type CSSProperties } from "react";
import { getGameModes } from "../data/gameModes";
import type { BotDifficulty, GameConfig, GameModeId, PlayableCardCategoryId } from "../types";
import { ALL_CATEGORY_IDS, CARD_CATEGORIES, getCategoriesLabel, getCategoryLabel, getSelectedPairCount, PLAYABLE_CATEGORIES, TOTAL_CARD_PAIRS } from "../data/cardCategories";
import { useAudio } from "../audio/AudioProvider";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";
type Props = {
  config: GameConfig;
  onChange: (value: GameConfig) => void;
  onStart: () => void;
  onOnline: () => void;
  onLibrary: () => void;
};
type PlayType = "local" | "online";
export default function HomeScreen({
  config,
  onChange,
  onStart,
  onOnline,
  onLibrary,
}: Props) {
  const { language, t } = useLanguage();
  const { playEffect, startMusic } = useAudio();
  const modes = getGameModes(language);
  const selectedMode = modes.find((mode) => mode.id === config.mode)!;
  const [playType, setPlayType] = useState<PlayType>("local");
  const [mobileStep, setMobileStep] = useState(1);
  const update = <K extends keyof GameConfig>(key: K, value: GameConfig[K]) =>
    onChange({ ...config, [key]: value });
  useEffect(() => {
    if (config.playerCount !== 1) onChange({ ...config, playerCount: 1 });
  }, [config, onChange]);
  const play = () => {
    startMusic();
    playEffect("start");
    playType === "local" ? onStart() : onOnline();
  };
  const es = language === "es";
  const nav = (step: number) => (
    <div className="mobile-step-nav">
      {step > 1 && (
        <button type="button" onClick={() => setMobileStep(step - 1)}>
          <Icon name="arrowLeft" />
          {es ? "Atrás" : "Back"}
        </button>
      )}
      <span>{step} / 4</span>
      {step < 4 && (
        <button
          type="button"
          className="next-step"
          onClick={() => setMobileStep(step + 1)}
        >
          {es ? "Continuar" : "Continue"}
          <Icon name="arrowRight" />
        </button>
      )}
    </div>
  );
  const selectCategories = (categories: PlayableCardCategoryId[]) => {
    const pairCount = getSelectedPairCount(categories);
    onChange({ ...config, categories, pairCount });
  };
  const toggleCategory = (category: PlayableCardCategoryId) => {
    const selected = config.categories.includes(category);
    if (selected && config.categories.length === 1) return;
    selectCategories(selected ? config.categories.filter((id) => id !== category) : [...config.categories, category]);
  };
  return (
    <main className="home-shell">
      <div className="home-orb home-orb-one" />
      <div className="home-orb home-orb-two" />
      <section className="home-wrap">
        <header className="home-header">
          <div className="home-header-actions">
            {/* <div className="deck-count">
              <span>{TOTAL_CARD_PAIRS}</span> {t("uniquePairs")}
            </div> */}
            {/* Desktop button */}
            {/* <button
              type="button"
              className="quick-join-button"
              onClick={onOnline}
            >
              <Icon name="login" />
              <span>
                <small>{t("quickAction")}</small>
                <strong>{t("joinPrivateRoom")}</strong>
              </span>
            </button> */}
          </div>
        </header>
        <section className="home-hero">
          <div className="hero-copy">
            <div className="hero-kicker">{t("heroKicker")}</div>
            <h1>
              {t("heroTitle1")}
              <br />
              <em>{t("heroTitle2")}</em>
            </h1>
            <p>{t("heroText")}</p>

            {/* Mobile button */}
            <button
              type="button"
              className="mobile-quick-join-button"
              onClick={onOnline}
            >
              <Icon name="login" />
              <span>
                <small>{t("quickAction")}</small>
                <strong>{t("joinPrivateRoom")}</strong>
              </span>
            </button>
          </div>
          <div className="hero-card-stack" aria-hidden="true">
            <div className="stack-card stack-card-back">
              <img src="/cards-v2/back.webp" alt="" />
            </div>
            <div className="stack-card stack-card-middle">
              <img src="/cards-v2/card-23.webp" alt="" />
            </div>
            <div className="stack-card stack-card-front">
              <img src="/cards-v2/card-33.webp" alt="" />
            </div>

            <div className="deck-count">
              <span>{TOTAL_CARD_PAIRS}</span> {t("uniquePairs")}
            </div>
          </div>
        </section>
        <section
          className={`setup-section wizard-section ${mobileStep === 1 ? "is-mobile-active" : ""
            }`}
        >
          <div className="section-heading">
            <div>
              <span className="step-number">01</span>
              <h2>{t("chooseMode")}</h2>
            </div>
            <p>{t("modeHelp")}</p>
          </div>
          <div className="mode-grid">
            {modes.map((mode) => {
              const active = config.mode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`mode-card accent-${mode.accent} ${active ? "is-selected" : ""
                    }`}
                  onClick={() => update("mode", mode.id as GameModeId)}
                  aria-pressed={active}
                >
                  {mode.featured && (
                    <span className="popular-badge">{t("popular")}</span>
                  )}
                  <span className="mode-icon">
                    <Icon name={mode.icon} />
                  </span>
                  <span className="mode-name">{mode.name}</span>
                  <span className="mode-description">{mode.description}</span>
                  <span className="mode-rule">{mode.rule}</span>
                  <span className="mode-check">
                    <Icon name="check" />
                  </span>
                </button>
              );
            })}
          </div>
          {nav(1)}
        </section>
        <section
          className={`category-section setup-section wizard-section ${mobileStep === 2 ? "is-mobile-active" : ""
            }`}
        >
          <div className="section-heading">
            <div><span className="step-number">02</span><h2>{es ? "Elige una o más categorías" : "Choose one or more categories"}</h2></div>
            <p>{es ? "Combina cualquier cantidad de categorías. El tablero se ajustará automáticamente." : "Combine any number of categories. The board adjusts automatically."}</p>
          </div>
          <div className="category-grid">
            {CARD_CATEGORIES.map((category) => {
              const isAll = category.id === "all";
              const active = isAll ? config.categories.length === PLAYABLE_CATEGORIES.length : config.categories.includes(category.id as PlayableCardCategoryId);
              return <button key={category.id} type="button" className={active ? "is-selected" : ""} style={{ "--category-color": category.color } as CSSProperties} onClick={() => {
                if (isAll) selectCategories([...ALL_CATEGORY_IDS]);
                else toggleCategory(category.id as PlayableCardCategoryId);
              }} aria-pressed={active}>
                <i /><span><strong>{getCategoryLabel(category.id, language)}</strong><small>{category.count} {t("pairs")}</small></span><span className="category-check"><Icon name="check" /></span>
              </button>;
            })}
          </div>
          {nav(2)}
        </section>
        <section
          className={`play-type-panel wizard-section ${mobileStep === 3 ? "is-mobile-active" : ""
            }`}
        >
          <div className="section-heading compact">
            <div>
              <span className="step-number">03</span>
              <h2>
                {es ? "¿Cómo quieres jugar?" : "How would you like to play?"}
              </h2>
            </div>
          </div>
          <div className="play-type-grid">
            <button
              type="button"
              className={playType === "local" ? "is-active" : ""}
              onClick={() => setPlayType("local")}
            >
              <Icon name="user" />
              <span>
                <strong>{t("playLocally")}</strong>
                <small>
                  {es
                    ? "Tú contra bots en este dispositivo"
                    : "You versus bots on this device"}
                </small>
              </span>
            </button>
            <button
              type="button"
              className={playType === "online" ? "is-active" : ""}
              onClick={() => setPlayType("online")}
            >
              <Icon name="wifi" />
              <span>
                <strong>{t("playOnline")}</strong>
                <small>
                  {es
                    ? "Personas reales en distintos dispositivos"
                    : "Real players on separate devices"}
                </small>
              </span>
            </button>
          </div>
          {nav(3)}
        </section>
        {playType === "local" ? (
          <section
            className={`bot-setup-panel wizard-section ${mobileStep === 4 ? "is-mobile-active" : ""
              }`}
          >
            <div className="section-heading compact">
              <div>
                <span className="step-number">04</span>
                <h2>{t("localOpponents")}</h2>
              </div>
              <p>{t("localHelp")}</p>
            </div>
            <div className="bot-settings-grid">
              <div>
                <label className="bot-setting-label">{t("numberBots")}</label>
                <div className="bot-count-control">
                  {[1, 2, 3].map((count) => (
                    <button
                      key={count}
                      type="button"
                      className={config.botCount === count ? "is-active" : ""}
                      onClick={() => update("botCount", count)}
                    >
                      <strong>{count}</strong>
                      <span>{count === 1 ? t("bot") : t("bots")}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="bot-setting-label">
                  {t("botDifficulty")}
                </label>
                <div className="bot-difficulty-control">
                  {(["easy", "medium", "hard"] as BotDifficulty[]).map(
                    (level) => (
                      <button
                        key={level}
                        type="button"
                        className={
                          config.botDifficulty === level ? "is-active" : ""
                        }
                        onClick={() => update("botDifficulty", level)}
                      >
                        <span>
                          <Icon
                            name={
                              level === "easy"
                                ? "leaf"
                                : level === "medium"
                                  ? "zap"
                                  : "flame"
                            }
                          />
                        </span>
                        <strong>{t(level)}</strong>
                        <small>
                          {level === "easy"
                            ? t("mostlyRandom")
                            : level === "medium"
                              ? t("remembersSome")
                              : t("sharpMemory")}
                        </small>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
            {nav(4)}
          </section>
        ) : (
          <section
            className={`online-opponents-panel wizard-section ${mobileStep === 4 ? "is-mobile-active" : ""
              }`}
          >
            <div className="section-heading compact">
              <div>
                <span className="step-number">04</span>
                <h2>{t("onlineOpponents")}</h2>
              </div>
              <p>{t("onlineHelp")}</p>
            </div>
            <div className="online-player-picker">
              <label>{t("onlinePlayers")}</label>
              <div className="segmented-control">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={
                      config.onlinePlayerCount === count ? "is-active" : ""
                    }
                    onClick={() => update("onlinePlayerCount", count)}
                  >
                    <strong>{count}</strong>
                    <span>{t("players")}</span>
                  </button>
                ))}
              </div>
            </div>
            {nav(4)}
          </section>
        )}
        <footer
          className={`start-bar ${mobileStep === 4 ? "is-mobile-active" : ""}`}
        >
          <div className="start-summary">
            <span
              className={`mode-icon accent-${selectedMode.accent}`}
            >
              <Icon name={selectedMode.icon} />
            </span>
            <div>
              <small>{t("selectedGame")}</small>
              <strong>{selectedMode.name}</strong>
            </div>
            <div className="summary-stat">
              <small>{t("cards")}</small>
              <strong>{config.pairCount * 2}</strong>
            </div>
            <div className="summary-stat category-summary"><small>{es ? "Categorías" : "Categories"}</small><strong>{getCategoriesLabel(config.categories, language)}</strong></div>
          </div>
          <div className="start-buttons">
            <button
              className={"start-game-button"}
              type="button"
              onClick={play}
            >
              <Icon name="play" />

              {playType === "online" ? t("playOnline") : t("playLocally")}
            </button>
          </div>
        </footer>
        <button
          type="button"
          className="open-library-button"
          onClick={onLibrary}
        >
          <Icon name="library" />

          <span>
            <strong>
              {es
                ? "Explorar biblioteca de cartas"
                : "Explore the card library"}
            </strong>
            <small>
              {es
                ? `Mira las ${TOTAL_CARD_PAIRS} ilustraciones una por una`
                : `View all ${TOTAL_CARD_PAIRS} illustrations one by one`}
            </small>
          </span>
          <Icon name="arrowRight" />
        </button>
      </section>
    </main>
  );
}
