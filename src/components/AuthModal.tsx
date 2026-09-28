import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";

type Props = { open: boolean; onClose: () => void };
type Mode = "signin" | "signup" | "reset" | "update";

function isEmailNotConfirmed(cause: unknown) {
  if (!cause || typeof cause !== "object") return false;
  const value = cause as { code?: unknown; message?: unknown };
  const code = typeof value.code === "string" ? value.code.toLowerCase() : "";
  const message = typeof value.message === "string" ? value.message.toLowerCase() : "";
  return code === "email_not_confirmed" || message.includes("email not confirmed") || message.includes("email_not_confirmed");
}

function authErrorMessage(cause: unknown, spanish: boolean, fallback: string) {
  if (isEmailNotConfirmed(cause)) {
    return spanish
      ? "Tu cuenta todavía no ha sido confirmada. Abre el correo de confirmación que recibiste al registrarte y confirma tu cuenta antes de iniciar sesión o restablecer la contraseña."
      : "Your account has not been confirmed yet. Open the confirmation email you received when signing up and confirm your account before signing in or resetting your password.";
  }
  return cause instanceof Error ? cause.message : fallback;
}

export default function AuthModal({ open, onClose }: Props) {
  const { signIn, signUp, resetPassword, updatePassword, recoveryMode } = useAuth();
  const { language, t } = useLanguage();
  const es = language === "es";
  const [mode, setMode] = useState<Mode>("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (recoveryMode) setMode("update");
  }, [recoveryMode]);

  useEffect(() => {
    if (!open) return;
    setError("");
    setMessage("");
    setPassword("");
    setConfirm("");
  }, [open]);

  if (!open) return null;

  const changeMode = (nextMode: Mode) => {
    setMode(nextMode);
    setError("");
    setMessage("");
    setPassword("");
    setConfirm("");
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signin") {
        await signIn(email, password);
        onClose();
      } else if (mode === "signup") {
        if (password !== confirm) throw new Error(es ? "Las contraseñas no coinciden." : "Passwords do not match.");
        const result = await signUp(email, password, displayName);
        if (result.needsConfirmation) setMessage(t("checkEmail"));
        else onClose();
      } else if (mode === "reset") {
        await resetPassword(email);
        setMessage(es
          ? "Si la cuenta está confirmada, recibirás un enlace seguro para restablecer tu contraseña."
          : "If the account is confirmed, you’ll receive a secure link to reset your password.");
      } else {
        if (password !== confirm) throw new Error(es ? "Las contraseñas no coinciden." : "Passwords do not match.");
        await updatePassword(password);
        setPassword("");
        setConfirm("");
        setMode("signin");
        setMessage(es
          ? "Contraseña actualizada. Tu sesión de recuperación se cerró por seguridad. Inicia sesión con tu correo y la nueva contraseña."
          : "Password updated. Your recovery session was signed out for security. Sign in with your email and new password.");
      }
    } catch (cause) {
      setError(authErrorMessage(cause, es, t("authFailed")));
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "signin" ? t("welcomeBack") : mode === "signup" ? t("createPlayer") : mode === "reset" ? (es ? "Restablecer contraseña" : "Reset password") : (es ? "Crea una nueva contraseña" : "Create a new password");

  return (
    <div className="modal-backdrop auth-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="auth-close" type="button" onClick={onClose} aria-label={t("close")}>×</button>
        <div className="auth-logo"><img src="/brand/boricuir-mark.svg" alt="Boricuir Memory" /></div>
        <span className="auth-kicker">{t("community")}</span>
        <h2 id="auth-title">{title}</h2>
        <p>{mode === "reset" ? (es ? "Te enviaremos un enlace seguro por correo." : "We’ll email you a secure recovery link.") : mode === "update" ? (es ? "Escribe y confirma tu nueva contraseña." : "Enter and confirm your new password.") : mode === "signin" ? t("signInHelp") : t("signupHelp")}</p>
        <form onSubmit={submit} className="auth-form">
          {mode === "signup" && <label>{t("displayName")}<input required minLength={2} maxLength={30} value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="nickname" /></label>}
          {mode !== "update" && <label>{t("email")}<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" /></label>}
          {mode !== "reset" && <><label>{t("password")}<span className="password-field"><input required type={showPassword ? "text" : "password"} minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "signin" ? "current-password" : "new-password"} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? (es ? "Ocultar" : "Hide") : (es ? "Ver" : "Show")}</button></span></label>{(mode === "signup" || mode === "update") && <label>{es ? "Confirmar contraseña" : "Confirm password"}<span className="password-field"><input required type={showPassword ? "text" : "password"} minLength={8} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></span></label>}</>}
          {error && <div className="form-message is-error" role="alert">{error}</div>}
          {message && <div className="form-message is-success" role="status">{message}</div>}
          <button className="auth-submit" type="submit" disabled={busy}>{busy ? t("pleaseWait") : mode === "signin" ? t("signIn") : mode === "signup" ? t("createAccount") : mode === "reset" ? (es ? "Enviar enlace" : "Send recovery link") : (es ? "Actualizar contraseña" : "Update password")}</button>
        </form>
        {mode === "signin" && <button className="forgot-password" type="button" onClick={() => changeMode("reset")}>{es ? "¿Olvidaste tu contraseña?" : "Forgot your password?"}</button>}
        <button className="auth-switch" type="button" onClick={() => changeMode(mode === "signup" ? "signin" : mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? t("newHere") : t("alreadyAccount")}</button>
      </section>
    </div>
  );
}
