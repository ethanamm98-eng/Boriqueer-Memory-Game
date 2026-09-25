import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import Icon from "./Icon";
import ProfileSettings from "./ProfileSettings";
import ConfirmDialog from "./ConfirmDialog";
export default function AppHeader({
  onOpenAuth,
  onHome,
}: {
  onOpenAuth: () => void;
  onHome: () => void;
}) {
  const { user, profile, signOut, loading } = useAuth();
  const { language, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const name =
    profile?.display_name || user?.email?.split("@")[0] || t("player");
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  return (
    <>
      <header className="app-header">
        <button
          className="app-brand"
          type="button"
          onClick={onHome}
          aria-label={t("returnHome")}
        >
          <img src="/cards-v2/card-11.webp" alt="" />
          <span>
            <strong>{t("brand")}</strong>
            <small>Sexkúl</small>
          </span>
        </button>
        <div className="app-header-actions">
          {loading ? (
            <span className="header-connecting">{t("connecting")}</span>
          ) : !user ? (
            <button
              type="button"
              className="header-sign-in"
              onClick={onOpenAuth}
            >
              <Icon name="login" /> {t("signIn")}
            </button>
          ) : (
            <div className="header-account" ref={wrapRef}>
              <button
                type="button"
                className="header-account-button"
                onClick={() => setOpen(!open)}
                aria-expanded={open}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <span>{name.charAt(0).toUpperCase()}</span>
                )}
                <b>{name}</b>
                <i>⌄</i>
              </button>
              {open && (
                <div className="header-account-menu">
                  <strong>{name}</strong>
                  <small>{user.email}</small>
                  <div>
                    <span>
                      <b>{profile?.games_played ?? 0}</b> {t("played")}
                    </span>
                    <span>
                      <b>{profile?.games_won ?? 0}</b> {t("won")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setProfileOpen(true);
                    }}
                  >
                    {language === "es" ? "Editar perfil" : "Edit profile"}
                  </button>
                  <button type="button" onClick={() => { setOpen(false); setLogoutOpen(true); }}>
                    {t("signOut")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
      <ProfileSettings
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      <ConfirmDialog
        open={logoutOpen}
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => { setLogoutOpen(false); void signOut(); }}
        title={t("logoutTitle")}
        message={t("logoutText")}
        cancelLabel={t("cancel")}
        confirmLabel={t("signOut")}
        icon="login"
      />
    </>
  );
}
