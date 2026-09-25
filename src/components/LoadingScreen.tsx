import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const startedAt = performance.now();
    const duration = 2200;
    let frame = 0;
    const update = (now: number) => {
      const ratio = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - ratio, 3);
      setProgress(Math.round(eased * 100));
      if (ratio < 1) frame = requestAnimationFrame(update);
      else window.setTimeout(onComplete, 180);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [onComplete]);
  return <div className="startup-loader" role="status" aria-live="polite">
    <div className="startup-orb orb-one" /><div className="startup-orb orb-two" />
    <section>
      <div className="startup-cards"><img src="/cards-v2/back.webp" alt="" /><img src="/cards-v2/card-11.webp" alt="" /></div>
      <span>{t("creatorExperience")}</span>
      <h1>Boricuir <em>Memory</em></h1>
      <p>{t("preparingGame")}</p>
      <div className="startup-progress"><span style={{ width: `${progress}%` }} /></div>
      <strong>{progress}%</strong>
    </section>
  </div>;
}
