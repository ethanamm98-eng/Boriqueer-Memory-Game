import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

type CardArtPreviewProps = {
  image: string | null;
  onClose: () => void;
  context?: string | null;
  remote?: boolean;
};

export default function CardArtPreview({ image, onClose, context, remote = false }: CardArtPreviewProps) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!image) return;
    const timer = window.setTimeout(onClose, remote ? 1050 : 950);
    return () => window.clearTimeout(timer);
  }, [image, onClose, remote]);

  if (!image) return null;

  return (
    <div className={`card-art-preview${remote ? " is-remote" : ""}`} role="dialog" aria-modal="true" aria-label={t("cardRevealed")} onClick={onClose}>
      <div className="card-art-aura" />
      <div className="card-art-preview-inner">
        <span className="card-art-label">{context || t("cardRevealed")}</span>
        <img src={image} alt={t("enlargedArt")} />
        <small>{t("tapReturn")}</small>
      </div>
    </div>
  );
}
