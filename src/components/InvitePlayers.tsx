import { useState, type FormEvent } from "react";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import { sendRoomInvitation } from "../lib/invitations";
import Icon from "./Icon";

export default function InvitePlayers({ code }: { code: string }) {
  const { language } = useLanguage();
  const { profile, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !email.trim()) return;
    setSending(true);
    setError("");
    setSuccess("");
    try {
      await sendRoomInvitation({ email, roomCode: code, language });
      setSuccess(es ? `Invitación enviada a ${email.trim()}.` : `Invitation sent to ${email.trim()}.`);
      setEmail("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : (es ? "No se pudo enviar la invitación." : "The invitation could not be sent."));
    } finally {
      setSending(false);
    }
  }

  return <section className={`invite-players${emailOpen ? " email-is-open" : ""}`}>
    <div className="invite-summary"><strong>{es ? "Invita a tus jugadores" : "Invite your players"}</strong><small>{es ? "Comparte el código o envía una invitación personalizada." : "Share the code or send a personalized invitation."}</small></div>
    <div className="invite-actions">
      <button type="button" className="native-share-button" onClick={() => void share()}><Icon name={copied ? "check" : "external"} />{copied ? (es ? "Copiado" : "Copied") : (es ? "Compartir" : "Share")}</button>
      <a href={`sms:?&body=${encodedMessage}`}><Icon name="wifi" />SMS</a>
      <button type="button" className={emailOpen ? "email-toggle is-active" : "email-toggle"} aria-expanded={emailOpen} onClick={() => { setEmailOpen((current) => !current); setError(""); setSuccess(""); }}><Icon name="mail" />Email</button>
    </div>
    {emailOpen && <form className="invite-email-form" onSubmit={submitEmail}>
      <label htmlFor="room-invite-email">{es ? "Correo de la persona invitada" : "Guest email address"}</label>
      <div className="invite-email-row">
        <div className="invite-email-field"><Icon name="mail" /><input id="room-invite-email" type="email" inputMode="email" autoComplete="email" required disabled={sending} value={email} onChange={(event) => setEmail(event.target.value)} placeholder={es ? "amistad@correo.com" : "friend@email.com"} /></div>
        <button type="submit" className="send-email-invite" disabled={sending || !email.trim()}><Icon name={sending ? "refresh" : "arrowRight"} />{sending ? (es ? "Enviando…" : "Sending…") : (es ? "Enviar" : "Send")}</button>
      </div>
      {error && <p className="invite-email-message is-error" role="alert">{error}</p>}
      {success && <p className="invite-email-message is-success" role="status">{success}</p>}
      <small className="invite-email-note">{es ? "La invitación incluirá tu nombre, el código y el enlace completo de la sala." : "The invitation includes your name, room code, and complete room link."}</small>
    </form>}
  </section>;
}
