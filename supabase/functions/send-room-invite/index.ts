/// <reference path="../edge-runtime.d.ts" />

type InviteBody = { email?: string; roomCode?: string; language?: "en" | "es" };

type AuthUser = {
  id: string;
  email?: string;
  user_metadata?: { display_name?: unknown };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return respond({ success: false, error: "Method not allowed." }, 405);

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const resendFromEmail = Deno.env.get("RESEND_FROM_EMAIL");
    const gameUrl = Deno.env.get("GAME_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!resendApiKey || !resendFromEmail || !gameUrl || !supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Resend or Supabase function environment variables.");
      return respond({ success: false, error: "Email invitations are not configured yet." }, 500);
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization) return respond({ success: false, error: "Sign in before sending an invitation." }, 401);

    const supabaseHeaders = {
      apikey: supabaseAnonKey,
      Authorization: authorization,
      "Content-Type": "application/json",
    };
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: supabaseHeaders });
    if (!authResponse.ok) return respond({ success: false, error: "Your session is invalid or has expired." }, 401);
    const user = (await authResponse.json()) as AuthUser;
    if (!user.id) return respond({ success: false, error: "Your session is invalid or has expired." }, 401);

    const body = (await request.json()) as InviteBody;
    const email = body.email?.trim().toLowerCase() ?? "";
    const roomCode = body.roomCode?.trim().toUpperCase() ?? "";
    const language = body.language === "es" ? "es" : "en";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond({ success: false, error: "Enter a valid email address." }, 400);
    if (!/^[A-Z0-9]{6}$/.test(roomCode)) return respond({ success: false, error: "The private-room code is invalid." }, 400);

    // Only an authenticated member of this waiting room may send its invitation.
    const roomResponse = await fetch(
      `${supabaseUrl}/rest/v1/game_rooms?select=id&code=eq.${encodeURIComponent(roomCode)}&status=eq.waiting&limit=1`,
      { headers: supabaseHeaders },
    );
    const rooms = roomResponse.ok ? (await roomResponse.json()) as Array<{ id: string }> : [];
    // The game_rooms SELECT policy only exposes rooms to their members.
    if (!rooms[0]) return respond({ success: false, error: "You are not a member of this waiting room." }, 403);

    const profileResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?select=display_name&id=eq.${encodeURIComponent(user.id)}&limit=1`,
      { headers: supabaseHeaders },
    );
    const profiles = profileResponse.ok ? (await profileResponse.json()) as Array<{ display_name?: string }> : [];
    const rawName = user.user_metadata?.display_name;
    const inviterName = profiles[0]?.display_name?.trim() || (typeof rawName === "string" && rawName.trim()) || user.email?.split("@")[0] || "A Boricuir Memory player";
    const safeInviter = escapeHtml(inviterName);
    const safeCode = escapeHtml(roomCode);
    const invitationUrl = `${gameUrl.replace(/\/+$/, "")}/?room=${encodeURIComponent(roomCode)}`;
    const es = language === "es";
    const subject = es ? `${inviterName} te invitó a jugar Boricuir Memory` : `${inviterName} invited you to play Boricuir Memory`;
    const heading = es ? "¡Tienes una invitación!" : "You received an invitation!";
    const description = es ? `${safeInviter} te invitó a una partida privada de Boricuir Memory.` : `${safeInviter} invited you to a private Boricuir Memory game.`;
    const roomLabel = es ? "Código de sala" : "Room code";
    const buttonLabel = es ? "Entrar a la partida" : "Join the game";
    const fallback = es ? "Si el botón no funciona, copia y pega este enlace en tu navegador:" : "If the button does not work, copy and paste this link into your browser:";

    const html = `<!doctype html><html lang="${language}"><body style="margin:0;padding:0;background:#fff4fa;color:#32142e;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff4fa"><tr><td align="center" style="padding:36px 16px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;overflow:hidden;background:#fff;border:1px solid #f3c7df;border-radius:28px;box-shadow:0 18px 50px rgba(113,21,82,.14)">
<tr><td align="center" style="padding:42px 28px 34px;background:#ec168c;background-image:linear-gradient(135deg,#ec168c 0%,#be3ee5 52%,#4e7ee8 100%)"><div style="display:inline-block;padding:9px 16px;border:1px solid rgba(255,255,255,.36);border-radius:999px;color:#fff;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">Private game invitation</div><h1 style="margin:18px 0 6px;color:#fff;font-size:33px;line-height:1.1;font-weight:900">BORICUIR MEMORY</h1><p style="margin:0;color:#fff1f9;font-size:15px">Conecta, descubre y celebra nuestra comunidad.</p></td></tr>
<tr><td><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td height="7" bgcolor="#e63946"></td><td height="7" bgcolor="#ff7b22"></td><td height="7" bgcolor="#ffd447"></td><td height="7" bgcolor="#47a95a"></td><td height="7" bgcolor="#3f7fe8"></td><td height="7" bgcolor="#a96bd5"></td></tr></table></td></tr>
<tr><td align="center" style="padding:42px"><h2 style="margin:0 0 14px;color:#32142e;font-size:27px">${heading}</h2><p style="margin:0;color:#60415b;font-size:16px;line-height:1.7">${description}</p><div style="margin:28px 0;padding:20px;background:#fff5fa;border:1px solid #f4d0e4;border-radius:18px"><div style="margin-bottom:7px;color:#8b617d;font-size:12px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase">${roomLabel}</div><div style="color:#b41170;font-size:28px;font-weight:900;letter-spacing:5px">${safeCode}</div></div><a href="${invitationUrl}" style="display:inline-block;padding:16px 30px;background:#ec168c;border-radius:999px;box-shadow:0 10px 24px rgba(236,22,140,.28);color:#fff;font-size:16px;font-weight:800;text-decoration:none">${buttonLabel} →</a><p style="margin:30px 0 8px;color:#8b6d84;font-size:12px;line-height:1.6">${fallback}</p><p style="margin:0;overflow-wrap:anywhere;font-size:11px;line-height:1.6"><a href="${invitationUrl}" style="color:#b41170">${invitationUrl}</a></p></td></tr>
<tr><td align="center" style="padding:25px;background:#32142e;color:#e8cddd;font-size:12px;line-height:1.6">Created with pride in Puerto Rico by Sexkúl<br>Website created by EA Market</td></tr></table></td></tr></table></body></html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: resendFromEmail, to: [email], subject, html, text: `${subject}\n\n${inviterName}\n${roomLabel}: ${roomCode}\n\n${invitationUrl}` }),
    });
    const resendResult = await resendResponse.json();
    if (!resendResponse.ok) {
      console.error("Resend rejected the invitation:", resendResult);
      return respond({ success: false, error: resendResult?.message ?? "Resend could not deliver the invitation." }, resendResponse.status);
    }
    return respond({ success: true, message: "Invitation sent successfully.", emailId: resendResult.id });
  } catch (error) {
    console.error("send-room-invite failed:", error);
    return respond({ success: false, error: error instanceof Error ? error.message : "Unexpected invitation error." }, 500);
  }
});
