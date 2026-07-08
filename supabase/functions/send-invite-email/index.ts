// Supabase Edge Function: send-invite-email
//
// Sends a workspace-invitation email via Gmail SMTP. It is invoked from the
// taskflow client AFTER `invite_to_workspace` has queued a pending invite, so
// this function only delivers the notification — the DB is the source of truth
// and the invitee still accepts inside the app.
//
// It re-verifies, using the caller's JWT, that the caller is the OWNER of the
// workspace before sending, so it can't be used as an open email relay by any
// authenticated user.
//
// Required secrets (set with `supabase secrets set ...`):
//   GMAIL_USER           the Gmail address that sends the mail
//   GMAIL_APP_PASSWORD   a Google App Password (NOT the account password)
// SUPABASE_URL / SUPABASE_ANON_KEY are injected automatically.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function inviteHtml(opts: {
  workspaceName: string;
  inviterName: string;
  role: string;
  email: string;
  acceptUrl: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <div style="background:#4f46e5;padding:20px 24px;color:#fff;font-weight:600;font-size:18px;">TaskFlow</div>
      <div style="padding:24px;color:#111827;font-size:15px;line-height:1.55;">
        <p style="margin:0 0 12px;"><strong>${opts.inviterName}</strong> invited you to join the workspace
          <strong>${opts.workspaceName}</strong> as <strong>${opts.role}</strong>.</p>
        <p style="margin:0 0 20px;color:#4b5563;">Sign in (or create an account) with
          <strong>${opts.email}</strong> to accept the invitation.</p>
        <a href="${opts.acceptUrl}"
           style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;">
          Open TaskFlow
        </a>
        <p style="margin:20px 0 0;color:#9ca3af;font-size:13px;">
          If you weren't expecting this, you can safely ignore this email.</p>
      </div>
    </div>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!gmailUser || !gmailPass) {
    return json({ error: "Email is not configured (missing GMAIL_USER / GMAIL_APP_PASSWORD)" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  let body: {
    workspaceId?: string;
    email?: string;
    role?: string;
    acceptUrl?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const workspaceId = body.workspaceId ?? "";
  const role = body.role ?? "member";
  const acceptUrl = body.acceptUrl || "";
  if (!email || !workspaceId) return json({ error: "workspaceId and email are required" }, 400);

  // A client scoped to the caller's JWT — RLS applies, so these reads only
  // succeed for a user who is actually an owner/member of the workspace.
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return json({ error: "Not authenticated" }, 401);
  const uid = userData.user.id;

  // Authorize: caller must be the workspace owner.
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", uid)
    .maybeSingle();
  if (!membership || membership.role !== "owner") {
    return json({ error: "Only workspace owners can send invitations" }, 403);
  }

  const { data: ws } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();
  const workspaceName = ws?.name ?? "a workspace";

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", uid)
    .maybeSingle();
  const inviterName = profile?.display_name || userData.user.email || "A TaskFlow user";

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: gmailUser, password: gmailPass },
    },
  });

  try {
    await client.send({
      from: `TaskFlow <${gmailUser}>`,
      to: email,
      subject: `You're invited to ${workspaceName} on TaskFlow`,
      content: `${inviterName} invited you to join "${workspaceName}" as ${role}. `
        + `Sign in or create an account with ${email} to accept: ${acceptUrl}`,
      html: inviteHtml({ workspaceName, inviterName, role, email, acceptUrl }),
    });
  } catch (err) {
    console.error("SMTP send failed:", err);
    return json({ error: "Failed to send email", detail: String(err) }, 502);
  } finally {
    await client.close();
  }

  return json({ sent: true });
});
