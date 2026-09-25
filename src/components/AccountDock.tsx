import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import Icon from "./Icon";
import ConfirmDialog from "./ConfirmDialog";
import { useLanguage } from "../context/LanguageContext";

export default function AccountDock({ onOpenAuth }: { onOpenAuth: () => void }) {
  const { user, profile, signOut, loading } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (loading) return <div className="account-dock is-loading">Connecting…</div>;
  if (!user) return <button type="button" className="account-dock sign-in-dock" onClick={onOpenAuth}><Icon name="login" /> Sign in</button>;

  const name = profile?.display_name || user.email?.split("@")[0] || "Player";
  return (
    <div className="account-wrap">
      <button type="button" className="account-dock" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="account-mini-avatar">{profile?.avatar_url ? <img src={profile.avatar_url} alt="" /> : name.charAt(0).toUpperCase()}</span><span className="account-name">{name}</span><b>⌄</b>
      </button>
      {open && <div className="account-menu"><div><strong>{name}</strong><small>{user.email}</small></div><div className="account-stats"><span><b>{profile?.games_played ?? 0}</b> {t("played")}</span><span><b>{profile?.games_won ?? 0}</b> {t("won")}</span></div><button type="button" onClick={() => { setOpen(false); setLogoutOpen(true); }}>{t("signOut")}</button></div>}
      <ConfirmDialog open={logoutOpen} onCancel={() => setLogoutOpen(false)} onConfirm={() => { setLogoutOpen(false); void signOut(); }} title={t("logoutTitle")} message={t("logoutText")} cancelLabel={t("cancel")} confirmLabel={t("signOut")} icon="login" />
    </div>
  );
}
