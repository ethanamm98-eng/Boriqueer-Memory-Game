import type { CardCategoryId } from "../types";

type Props = {
  category: CardCategoryId;
  className?: string;
};

const artwork: Record<CardCategoryId, Array<{ src: string; label: string }>> = {
  all: [
    { src: "/images/island.svg", label: "Puerto Rico" },
    { src: "/images/rainbow.svg", label: "Rainbow" },
  ],
  general: [{ src: "/images/rainbow-flag.svg", label: "LGBTQIA+ flag" }],
  "puerto-rico": [{ src: "/images/puerto-rico-flag.svg", label: "Puerto Rico" }],
  "sexual-health": [{ src: "/images/heart-rainbow.svg", label: "Rainbow heart" }],
  identities: [
    { src: "/images/non-binary-flag.svg", label: "Non-binary flag" },
    { src: "/images/transgender-flag.svg", label: "Transgender flag" },
  ],
};

export default function CategoryArtwork({ category, className = "" }: Props) {
  const images = artwork[category];

  return (
    <span
      className={`category-artwork category-artwork-${category} ${className}`.trim()}
      aria-hidden="true"
    >
      {images.map((image) => (
        <img key={image.src} src={image.src} alt="" title={image.label} />
      ))}
    </span>
  );
}
