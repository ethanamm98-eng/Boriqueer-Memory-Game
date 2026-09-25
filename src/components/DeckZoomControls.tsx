import Icon from "./Icon";
import { useLanguage } from "../context/LanguageContext";

export const MOBILE_CARD_WIDTHS = [42, 56, 72, 92, 118] as const;

export default function DeckZoomControls({ level, onChange }: { level: number; onChange: (level: number) => void }) {
  const { language } = useLanguage();
  const label = language === "es" ? "Tamaño de cartas" : "Card size";
  return <div className="deck-zoom-controls" aria-label={label}>
    <span>{label}</span>
    <button type="button" onClick={() => onChange(Math.max(0, level - 1))} disabled={level === 0} aria-label={language === "es" ? "Alejar" : "Zoom out"}>−</button>
    <div className="zoom-meter">{MOBILE_CARD_WIDTHS.map((_, index) => <i key={index} className={index <= level ? "is-active" : ""} />)}</div>
    <button type="button" onClick={() => onChange(Math.min(MOBILE_CARD_WIDTHS.length - 1, level + 1))} disabled={level === MOBILE_CARD_WIDTHS.length - 1} aria-label={language === "es" ? "Acercar" : "Zoom in"}><Icon name="plus" /></button>
  </div>;
}
