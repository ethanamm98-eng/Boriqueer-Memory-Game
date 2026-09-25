import { useState } from "react";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";

export default function InvitePlayers({ code }: { code: string }) {
  const { language } = useLanguage();
  const { profile, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const es = language === "es";
  const title = es ? "Invitación a Boricuir Memory" : "Boricuir Memory invitation";
  const inviter = profile?.display_name || user?.email?.split("@")[0] || (es ? "Un jugador" : "A player");
  const fullLink = `${window.location.origin}${window.location.pathname}?room=${encodeURIComponent(code)}`;
  const message = es ? `${inviter} te invitó a jugar Boricuir Memory. Código: ${code}. Entra aquí: ${fullLink}` : `${inviter} invited you to play Boricuir Memory. Room code: ${code}. Join here: ${fullLink}`;
  const encodedMessage = encodeURIComponent(message);

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title, text: message, url: fullLink }); return; } catch { return; }
    }
    await navigator.clipboard.writeText(message);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  return <section className="invite-players">
    <div><strong>{es ? "Invita a tus jugadores" : "Invite your players"}</strong><small>{es ? "Comparte el código por tu aplicación preferida." : "Share the code using your preferred app."}</small></div>
    <div className="invite-actions">
      <button type="button" className="native-share-button" onClick={() => void share()}><Icon name={copied ? "check" : "external"} />{copied ? (es ? "Copiado" : "Copied") : (es ? "Compartir" : "Share")}</button>
      <a href={`sms:?&body=${encodedMessage}`}><Icon name="wifi" />SMS</a>
      <a href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodedMessage}`}><Icon name="mail" />Email</a>
    </div>
  </section>;
}
