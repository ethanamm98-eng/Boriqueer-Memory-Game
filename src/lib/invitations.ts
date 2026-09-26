import { supabase } from "./supabase";

export type InvitationLanguage = "en" | "es";

export type SendRoomInvitationInput = {
  email: string;
  roomCode: string;
  language: InvitationLanguage;
};

export type SendRoomInvitationResult = {
  success: true;
  message: string;
  emailId?: string;
};

export async function sendRoomInvitation({ email, roomCode, language }: SendRoomInvitationInput): Promise<SendRoomInvitationResult> {
  if (!supabase) throw new Error(language === "es" ? "Supabase no está configurado." : "Supabase is not configured.");

  const { data, error } = await supabase.functions.invoke("send-room-invite", {
    body: { email: email.trim().toLowerCase(), roomCode: roomCode.trim().toUpperCase(), language },
  });

  if (error) throw new Error(error.message || (language === "es" ? "No se pudo enviar la invitación." : "The invitation could not be sent."));
  if (!data?.success) throw new Error(data?.error || (language === "es" ? "No se pudo enviar la invitación." : "The invitation could not be sent."));
  return data as SendRoomInvitationResult;
}
