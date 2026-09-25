import type { GameMode } from "../types";
import type { Language } from "../context/LanguageContext";

export const GAME_MODES: GameMode[] = [
  {
    id: "classic",
    icon: "cards",
    name: "Classic Boricuir",
    shortName: "Classic",
    description:
      "Explore the Puerto Rican queer culture and find every matching pair at your own pace.",
    rule: "A match earns 1 point and keeps your turn.",
    accent: "violet",
    featured: true,
  },
  {
    id: "clock",
    icon: "clock",
    name: "Beat the Clock",
    shortName: "Timed",
    description: "Match the Boricuir deck before the countdown reaches zero.",
    rule: "The time limit adapts to the selected deck size.",
    accent: "coral",
  },
  {
    id: "rush",
    icon: "zap",
    name: "Memory Rush",
    shortName: "Rush",
    description:
      "Study every card during a brief preview, then race to match them.",
    rule: "All cards are revealed for 5 seconds before play.",
    accent: "cyan",
  },
  {
    id: "streak",
    icon: "flame",
    name: "Streak Master",
    shortName: "Streak",
    description:
      "Build consecutive matches to earn increasingly valuable points.",
    rule: "Matches score 1×, 2×, 3× and more. A miss resets your streak.",
    accent: "amber",
  },
  {
    id: "last-chance",
    icon: "heart",
    name: "Last Chance",
    shortName: "Lives",
    description: "Complete the board before the group runs out of chances.",
    rule: "The group begins with 5 lives. Every miss costs one.",
    accent: "pink",
  },
];

export const DIFFICULTIES = [
  { pairs: 6, name: "Quick", detail: "12 cards" },
  { pairs: 12, name: "Classic", detail: "24 cards" },
  { pairs: 20, name: "Challenge", detail: "40 cards" },
  { pairs: 40, name: "Expert", detail: "80 cards" },
  { pairs: 80, name: "Full Deck", detail: "160 cards" },
];

const SPANISH_MODES: GameMode[] = [
  {
    id: "classic",
    icon: "sparkles",
    name: "Boricuir Clásico",
    shortName: "Clásico",
    description:
      "Explora la cultura Boricuir y encuentra cada par a tu propio ritmo.",
    rule: "Un par suma 1 punto y conserva tu turno.",
    accent: "violet",
    featured: true,
  },
  {
    id: "clock",
    icon: "clock",
    name: "Contra el Reloj",
    shortName: "Cronómetro",
    description:
      "Combina la baraja Boricuir antes de que el tiempo llegue a cero.",
    rule: "El límite de tiempo se adapta al tamaño de la baraja.",
    accent: "coral",
  },
  {
    id: "rush",
    icon: "zap",
    name: "Ráfaga de Memoria",
    shortName: "Ráfaga",
    description:
      "Estudia las cartas brevemente y luego compite para combinarlas.",
    rule: "Todas las cartas se muestran durante 5 segundos.",
    accent: "cyan",
  },
  {
    id: "streak",
    icon: "flame",
    name: "Maestrx de Rachas",
    shortName: "Racha",
    description: "Crea pares consecutivos para ganar cada vez más puntos.",
    rule: "Los pares suman 1×, 2×, 3× y más. Un fallo reinicia la racha.",
    accent: "amber",
  },
  {
    id: "last-chance",
    icon: "heart",
    name: "Última Oportunidad",
    shortName: "Vidas",
    description:
      "Completa el tablero antes de que el grupo pierda sus oportunidades.",
    rule: "El grupo comienza con 5 vidas. Cada fallo cuesta una.",
    accent: "pink",
  },
];
export function getGameModes(language: Language) {
  return language === "es" ? SPANISH_MODES : GAME_MODES;
}
export function getDifficulties(language: Language) {
  return language === "es"
    ? [
        { pairs: 6, name: "Rápido", detail: "12 cartas" },
        { pairs: 12, name: "Clásico", detail: "24 cartas" },
        { pairs: 20, name: "Desafío", detail: "40 cartas" },
        { pairs: 40, name: "Experto", detail: "80 cartas" },
        { pairs: 80, name: "Baraja completa", detail: "160 cartas" },
      ]
    : DIFFICULTIES;
}

export function getTimeLimit(pairCount: number) {
  if (pairCount <= 6) return 60;
  if (pairCount <= 12) return 120;
  if (pairCount <= 20) return 210;
  if (pairCount <= 40) return 420;
  return 900;
}
