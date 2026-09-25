import { useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

type CardArtPreviewProps = {
  image: string | null;
  onClose: () => void;
};

export default function CardArtPreview({ image, onClose }: CardArtPreviewProps) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!image) return;
    const timer = window.setTimeout(onClose, 1450);
    return () => window.clearTimeout(timer);
  }, [image, onClose]);

  if (!image) return null;

  return (
    <div className="card-art-preview" role="dialog" aria-modal="true" aria-label={t("cardRevealed")} onClick={onClose}>
      <div className="card-art-aura" />
      <div className="card-art-preview-inner">
        <span className="card-art-label">{t("cardRevealed")}</span>
        <img src={image} alt={t("enlargedArt")} />
        <small>{t("tapReturn")}</small>
      </div>
    </div>
  );
}
