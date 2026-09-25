import type { CardCategoryId, PlayableCardCategoryId } from "../types";
import type { Language } from "../context/LanguageContext";

export const TOTAL_CARD_PAIRS = 80;

export type CardCategoryDefinition = {
  id: CardCategoryId;
  color: string;
  accent: string;
  start: number;
  end: number;
  count: number;
  backImage: string;
};

export const CARD_CATEGORIES: CardCategoryDefinition[] = [
  { id: "all", color: "#7b4fd3", accent: "rainbow", start: 1, end: 80, count: 80, backImage: "/cards-v2/back.webp" },
  { id: "general", color: "#eb1f9c", accent: "pink", start: 1, end: 33, count: 33, backImage: "/cards-v2/back-general.webp" },
  { id: "puerto-rico", color: "#2ca342", accent: "green", start: 34, end: 54, count: 21, backImage: "/cards-v2/back-puerto-rico.webp" },
  { id: "sexual-health", color: "#f46734", accent: "orange", start: 55, end: 67, count: 13, backImage: "/cards-v2/back-sexual-health.webp" },
  { id: "identities", color: "#7fc0c4", accent: "blue", start: 68, end: 80, count: 13, backImage: "/cards-v2/back-identities.webp" },
];

export const PLAYABLE_CATEGORIES = CARD_CATEGORIES.slice(1) as Array<CardCategoryDefinition & { id: PlayableCardCategoryId }>;
export const ALL_CATEGORY_IDS = PLAYABLE_CATEGORIES.map((category) => category.id);

const LABELS: Record<Exclude<CardCategoryId, "all">, { es: string; en: string }> = {
  general: { es: "Asuntos LGBTQIA+ generales", en: "General LGBTQIA+ topics" },
  "puerto-rico": { es: "Puerto Rico / ser puertorriqueñe", en: "Puerto Rico / being Puerto Rican" },
  "sexual-health": { es: "Salud sexual Queer/LGBTQIA+", en: "Queer/LGBTQIA+ sexual health" },
  identities: { es: "Identidades de género y orientaciones sexuales", en: "Gender identities and sexual orientations" },
};

export function getCategoryLabel(id: CardCategoryId, language: Language) {
  if (id === "all") return language === "es" ? "Todas las categorías" : "All categories";
  return LABELS[id][language];
}

export function getCategory(id: CardCategoryId) {
  return CARD_CATEGORIES.find((category) => category.id === id) ?? CARD_CATEGORIES[0];
}

export function getCardIds(selection: CardCategoryId | readonly PlayableCardCategoryId[]) {
  if (typeof selection === "string") {
    const category = getCategory(selection);
    return Array.from({ length: category.count }, (_, index) => category.start + index);
  }
  return selection.flatMap((id) => {
    const category = getCategory(id);
    return Array.from({ length: category.count }, (_, index) => category.start + index);
  });
}

export function getCardCategory(cardId: number) {
  return CARD_CATEGORIES.slice(1).find((category) => cardId >= category.start && cardId <= category.end) ?? CARD_CATEGORIES[1];
}

export function getSelectedPairCount(categories: readonly PlayableCardCategoryId[]) {
  return categories.reduce((total, id) => total + getCategory(id).count, 0);
}

export function getCategoriesLabel(categories: readonly PlayableCardCategoryId[], language: Language) {
  if (categories.length === PLAYABLE_CATEGORIES.length) return getCategoryLabel("all", language);
  if (categories.length === 1) return getCategoryLabel(categories[0], language);
  return language === "es" ? `${categories.length} categorías` : `${categories.length} categories`;
}

export function getCategoryBoardSizes(categoryId: CardCategoryId, language: Language) {
  const count = getCategory(categoryId).count;
  const base = [
    { pairs: 6, name: language === "es" ? "Rápido" : "Quick" },
    { pairs: 12, name: language === "es" ? "Clásico" : "Classic" },
    { pairs: 20, name: language === "es" ? "Desafío" : "Challenge" },
    { pairs: 40, name: language === "es" ? "Experto" : "Expert" },
  ].filter((size) => size.pairs < count);
  return [...base, {
    pairs: count,
    name: categoryId === "all"
      ? (language === "es" ? "Baraja completa" : "Full deck")
      : (language === "es" ? "Categoría completa" : "Full category"),
  }].map((size) => ({ ...size, detail: `${size.pairs * 2} ${language === "es" ? "cartas" : "cards"}` }));
}
