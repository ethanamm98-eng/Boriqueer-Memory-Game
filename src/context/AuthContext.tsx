import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { Profile } from "../types";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  recoveryMode: boolean;
  recordLocalGame: (won: boolean) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const fetchProfile = async (userId: string) => {
    if (!supabase) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    setProfile((data as Profile | null) ?? null);
    return data as Profile | null;
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const client = supabase;

    let active = true;
    const loadProfile = async (userId: string | undefined) => {
      if (!userId) {
        if (active) setProfile(null);
        return;
      }
      const { data } = await client.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (active) setProfile((data as Profile | null) ?? null);
    };

    void client.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setLoading(false);
    });

    const { data: listener } = client.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
      window.setTimeout(() => void loadProfile(nextSession?.user.id), 0);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    recoveryMode,
    loading,
    configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signUp: async (email, password, displayName) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName.trim() } },
      });
      if (error) throw error;
      return { needsConfirmation: !data.session };
    },
    signOut: async () => {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    updateDisplayName: async (displayName) => {
      if (!supabase || !session?.user) throw new Error("You must be signed in.");
      const cleanName = displayName.trim();
      if (cleanName.length < 2) throw new Error("Display name must have at least 2 characters.");
      const { data, error } = await supabase.from("profiles").update({ display_name: cleanName }).eq("id", session.user.id).select().single();
      if (error) throw error;
      setProfile(data as Profile);
    },
    uploadAvatar: async (file) => {
      if (!supabase || !session?.user) throw new Error("You must be signed in.");
      if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
      if (file.size > 5 * 1024 * 1024) throw new Error("Profile pictures must be smaller than 5 MB.");
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
      const avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
      const { data, error } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", session.user.id).select().single();
      if (error) throw error;
      setProfile(data as Profile);
    },
    refreshProfile: async () => { if (session?.user) await fetchProfile(session.user.id); },
    resetPassword: async (email) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
      if (error) throw error;
    },
    updatePassword: async (password) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setRecoveryMode(false);
    },
    recordLocalGame: async (won) => {
      if (!supabase || !session?.user) return;
      const { error } = await supabase.rpc("record_local_game", { p_won: won });
      if (error) throw error;
      await fetchProfile(session.user.id);
    },
  }), [loading, profile, recoveryMode, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
