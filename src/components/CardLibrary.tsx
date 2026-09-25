import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLanguage } from "../context/LanguageContext";
import { CARD_CATEGORIES, getCardCategory, getCardIds, getCategoryLabel, TOTAL_CARD_PAIRS } from "../data/cardCategories";
import type { CardCategoryId } from "../types";
import Icon from "./Icon";

export default function CardLibrary({ onBack }: { onBack: () => void }) {
  const { language } = useLanguage();
  const es = language === "es";
  const [filter, setFilter] = useState<CardCategoryId>("all");
  const ids = useMemo(() => getCardIds(filter), [filter]);
  const [position, setPosition] = useState(0);
  const cardId = ids[position] ?? ids[0];
  const cardCategory = getCardCategory(cardId);
  const previous = () => setPosition((value) => value === 0 ? ids.length - 1 : value - 1);
  const next = () => setPosition((value) => value === ids.length - 1 ? 0 : value + 1);

  useEffect(() => setPosition(0), [filter]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") setPosition((value) => value === 0 ? ids.length - 1 : value - 1);
      if (event.key === "ArrowRight") setPosition((value) => value === ids.length - 1 ? 0 : value + 1);
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [ids.length]);

  return <main className="library-shell"><section className="library-wrap">
    <header className="library-header"><button className="home-button" type="button" onClick={onBack}><Icon name="arrowLeft" /></button><div><span>{es ? "Colección completa" : "Complete collection"}</span><h1>{es ? "Biblioteca de cartas" : "Card library"}</h1><p>{es ? `Explora las ${TOTAL_CARD_PAIRS} ilustraciones por categoría.` : `Explore all ${TOTAL_CARD_PAIRS} illustrations by category.`}</p></div></header>
    <div className="library-category-filters" role="group" aria-label={es ? "Filtrar por categoría" : "Filter by category"}>{CARD_CATEGORIES.map((category) => <button key={category.id} type="button" className={filter === category.id ? "is-active" : ""} style={{ "--category-color": category.color } as CSSProperties} onClick={() => setFilter(category.id)}><i />{getCategoryLabel(category.id, language)}<small>{category.count}</small></button>)}</div>
    <div className="library-viewer"><button className="library-nav previous" type="button" onClick={previous} aria-label={es ? "Carta anterior" : "Previous card"}><Icon name="arrowLeft" /></button><div className="library-card-stage"><div className="library-counter"><strong>{position + 1}</strong><span>/ {ids.length}</span></div><img key={cardId} src={`/cards-v2/card-${cardId}.webp`} alt={`${es ? "Carta" : "Card"} ${cardId}`} /><div className="library-category-label" style={{ "--category-color": cardCategory.color } as CSSProperties}><i />{getCategoryLabel(cardCategory.id, language)}</div><div className="library-progress"><i style={{ width: `${((position + 1) / ids.length) * 100}%` }} /></div></div><button className="library-nav next" type="button" onClick={next} aria-label={es ? "Carta siguiente" : "Next card"}><Icon name="arrowRight" /></button></div>
    <div className="library-controls"><button type="button" onClick={previous}><Icon name="arrowLeft" />{es ? "Anterior" : "Previous"}</button><label>{es ? "Ir a la carta" : "Go to card"}<input type="number" min="1" max={ids.length} value={position + 1} onChange={(event) => setPosition(Math.min(ids.length - 1, Math.max(0, (Number(event.target.value) || 1) - 1)))} /></label><button type="button" onClick={next}>{es ? "Siguiente" : "Next"}<Icon name="arrowRight" /></button></div>
  </section></main>;
}
