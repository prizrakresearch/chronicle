"use server";

import { currentUser, clerkClient } from "@clerk/nextjs/server";
import nodemailer from "nodemailer";
import { db } from "@/lib/supabase/server";

// ── Auth guard ────────────────────────────────────────────────────────────────

async function assertOwner() {
  const user = await currentUser();
  if (!user) throw new Error("Unauthorized");
  const meta = user.publicMetadata as { role?: string } | undefined;
  if (meta?.role !== "owner") throw new Error("Unauthorized");
}

// ── Clerk error extraction ────────────────────────────────────────────────────

function clerkMsg(err: unknown): string {
  if (!err || typeof err !== "object") return String(err);
  const e = err as Record<string, unknown>;
  if (Array.isArray(e.errors) && e.errors.length > 0) {
    const first = e.errors[0] as Record<string, unknown>;
    return (first.longMessage as string) || (first.message as string) || (e.message as string) || "Clerk error";
  }
  return (e.message as string) || "Unknown error";
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuestUser {
  id:        string;
  email:     string;
  name:      string;
  imageUrl:  string;
  expiresAt: string | null;
  expired:   boolean;
}

export interface PendingInvite {
  id:        string;
  email:     string;
  name:      string | null;
  expiresAt: string | null;
  createdAt: number;
}

export interface AccessEvent {
  id:        number;
  email:     string;
  name:      string | null;
  action:    "granted" | "updated" | "revoked" | "removed";
  expiresAt: string | null;
  createdAt: string;
}

// ── Access event log (Supabase) ───────────────────────────────────────────────

async function logAccessEvent(
  email:     string,
  name:      string | null,
  action:    AccessEvent["action"],
  expiresAt: string | null,
): Promise<void> {
  try {
    await db.from("access_events").insert({
      email,
      name:       name ?? null,
      action,
      expires_at: expiresAt,
    });
  } catch {
    // Logging is best-effort — never let a log failure break the main action
  }
}

// ── List guests + pending invitations ─────────────────────────────────────────

export async function listGuests(): Promise<{ guests: GuestUser[]; pending: PendingInvite[] }> {
  await assertOwner();
  const client = await clerkClient();

  const usersRes = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });
  const now = new Date();

  const guests: GuestUser[] = usersRes.data
    .filter((u) => {
      const meta = u.publicMetadata as { role?: string } | undefined;
      return meta?.role !== "owner";
    })
    .map((u) => {
      const meta      = u.publicMetadata as { expiresAt?: string } | undefined;
      const expiresAt = meta?.expiresAt ?? null;
      return {
        id:        u.id,
        email:     u.emailAddresses[0]?.emailAddress ?? "",
        name:      [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "—",
        imageUrl:  u.imageUrl,
        expiresAt,
        expired:   expiresAt ? new Date(expiresAt) < now : false,
      };
    });

  const invitesRes = await client.invitations.getInvitationList({ status: "pending" });
  const pending: PendingInvite[] = (invitesRes.data ?? []).map((inv) => {
    const meta = inv.publicMetadata as { expiresAt?: string; invitedName?: string } | undefined;
    return {
      id:        inv.id,
      email:     inv.emailAddress,
      name:      meta?.invitedName ?? null,
      expiresAt: meta?.expiresAt ?? null,
      createdAt: inv.createdAt,
    };
  });

  return { guests, pending };
}

// ── Find existing user by email ───────────────────────────────────────────────

async function findUserByEmail(
  client: Awaited<ReturnType<typeof clerkClient>>,
  normalised: string,
) {
  // Exact filter first (most reliable)
  const byFilter = await client.users.getUserList({ emailAddress: [normalised], limit: 5 });
  if (byFilter.data.length > 0) return byFilter.data[0];

  // Fuzzy query + manual exact match (catches secondary / OAuth emails)
  const byQuery = await client.users.getUserList({ query: normalised, limit: 20 });
  return (
    byQuery.data.find((u) =>
      u.emailAddresses.some((e) => e.emailAddress.toLowerCase() === normalised)
    ) ?? null
  );
}

// ── Send the access email via Gmail SMTP ─────────────────────────────────────

async function sendAccessEmail(opts: {
  toEmail:    string;
  toName:     string | null;
  signInUrl:  string;
  expiresAt:  string;
}) {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass || gmailPass === "PASTE_APP_PASSWORD_HERE") {
    throw new Error("Gmail not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: gmailUser, pass: gmailPass },
  });

  const greeting = opts.toName ? `Hi ${opts.toName},` : "Hi,";
  const expiry   = new Date(opts.expiresAt).toLocaleDateString("en-GB", {
    day: "numeric", month: "long", year: "numeric",
  });

  await transporter.sendMail({
    from:    `"Chronicle" <${gmailUser}>`,
    to:      opts.toEmail,
    subject: "You've been invited to Chronicle",
    html: `
<!DOCTYPE html>
<html>
<body style="background:#09090b;color:#e4e4e7;font-family:system-ui,sans-serif;padding:48px 24px;max-width:480px;margin:0 auto">
  <p style="font-size:1.125rem;font-weight:600;color:#ffffff;margin:0 0 8px">${greeting}</p>
  <p style="color:#a1a1aa;margin:0 0 32px;line-height:1.6">
    You've been given access to <strong style="color:#ffffff">Chronicle</strong>.
    Your access is valid until <strong style="color:#ffffff">${expiry}</strong>.
  </p>
  <a href="${opts.signInUrl}"
     style="display:inline-block;background:#a3e635;color:#09090b;font-weight:700;font-size:0.9375rem;
            text-decoration:none;padding:14px 32px;border-radius:999px">
    Sign in to Chronicle →
  </a>
  <p style="color:#52525b;font-size:0.75rem;margin-top:40px;line-height:1.5">
    This link is single-use and expires in 24 hours.
    After signing in, your access will remain active until ${expiry}.
  </p>
  <p style="color:#3f3f46;font-size:0.6875rem;margin-top:24px;font-style:italic">Prizrak Labs</p>
</body>
</html>`,
  });
}

// ── Grant access (invite new or update existing) ──────────────────────────────

export async function inviteGuest(
  email:     string,
  name:      string | null,
  expiresAt: string,
): Promise<{ mode: "invited" | "updated" }> {
  await assertOwner();
  const client = await clerkClient();

  const normalised    = email.trim().toLowerCase();
  const publicMetadata: Record<string, string> = { role: "guest", expiresAt };
  if (name) publicMetadata.invitedName = name;

  const match = await findUserByEmail(client, normalised);

  if (match) {
    // Safety: never downgrade the owner
    const matchMeta = match.publicMetadata as { role?: string } | undefined;
    if (matchMeta?.role === "owner") throw new Error("That email belongs to the owner account.");

    // Update metadata
    try {
      await client.users.replaceUserMetadata(match.id, { publicMetadata });
    } catch (err) {
      throw new Error(clerkMsg(err));
    }

    // Send them a fresh sign-in link so they know their access has been updated
    try {
      const tokenRes  = await client.signInTokens.createSignInToken({ userId: match.id, expiresInSeconds: 86400 });
      const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
      const signInUrl = `${baseUrl}/sign-in#__clerk_ticket=${tokenRes.token}`;
      await sendAccessEmail({ toEmail: normalised, toName: name, signInUrl, expiresAt });
    } catch {
      // Email is best-effort — the metadata update already succeeded
    }

    await logAccessEvent(normalised, name, "updated", expiresAt);
    return { mode: "updated" };
  }

  // ── New user ─────────────────────────────────────────────────────────────────
  // Create their Clerk account, mint a single-use magic sign-in link, send email.

  // Derive first/last name — Clerk instance requires both fields to be non-empty
  const nameParts  = name ? name.trim().split(/\s+/) : [];
  const emailParts = normalised.split("@")[0].split(/[._\-+]/);
  const firstName  = nameParts[0]                    ?? emailParts[0] ?? "User";
  const lastName   = nameParts.slice(1).join(" ") || emailParts[1]   || emailParts[0] || "User";

  let newUserId: string;
  try {
    const created = await client.users.createUser({
      emailAddress:        [normalised],
      publicMetadata,
      skipPasswordRequirement: true,
      firstName,
      lastName,
    });
    newUserId = created.id;
  } catch (err) {
    throw new Error(clerkMsg(err));
  }

  // Magic sign-in link — no password needed
  const tokenRes = await client.signInTokens.createSignInToken({
    userId:           newUserId,
    expiresInSeconds: 86400, // 24 h — plenty of time to click the link
  });
  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const signInUrl = `${baseUrl}/sign-in#__clerk_ticket=${tokenRes.token}`;

  try {
    await sendAccessEmail({ toEmail: normalised, toName: name, signInUrl, expiresAt });
  } catch (err) {
    // If email fails, delete the user so the owner can retry cleanly
    await client.users.deleteUser(newUserId).catch(() => {});
    throw err instanceof Error ? err : new Error("Failed to send email");
  }

  await logAccessEvent(normalised, name, "granted", expiresAt);
  return { mode: "invited" };
}

// ── Revoke ────────────────────────────────────────────────────────────────────

export async function revokeGuest(userId: string): Promise<void> {
  await assertOwner();
  const client = await clerkClient();

  // Grab the user's email + name before revoking so we can log them
  let email = "";
  let name: string | null = null;
  try {
    const u = await client.users.getUser(userId);
    email = u.emailAddresses[0]?.emailAddress ?? "";
    name  = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || null;
  } catch { /* non-fatal */ }

  try {
    await client.users.replaceUserMetadata(userId, {
      publicMetadata: { role: "guest", expiresAt: new Date(0).toISOString() },
    });
  } catch (err) {
    throw new Error(clerkMsg(err));
  }

  if (email) await logAccessEvent(email, name, "revoked", null);
}

// ── Cancel pending invite ─────────────────────────────────────────────────────

export async function revokeInvite(inviteId: string): Promise<void> {
  await assertOwner();
  const client = await clerkClient();
  try {
    await client.invitations.revokeInvitation(inviteId);
  } catch (err) {
    throw new Error(clerkMsg(err));
  }
}

// ── Extend expiry ─────────────────────────────────────────────────────────────

export async function extendGuest(userId: string, expiresAt: string): Promise<void> {
  await assertOwner();
  const client = await clerkClient();
  try {
    await client.users.replaceUserMetadata(userId, {
      publicMetadata: { role: "guest", expiresAt },
    });
  } catch (err) {
    throw new Error(clerkMsg(err));
  }
}

// ── Delete (fully remove from Clerk) ─────────────────────────────────────────

export async function deleteGuest(userId: string): Promise<void> {
  await assertOwner();
  const client = await clerkClient();

  // Grab info before deleting so we can log it
  let email = "";
  let name: string | null = null;
  try {
    const u = await client.users.getUser(userId);
    email = u.emailAddresses[0]?.emailAddress ?? "";
    name  = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || null;
  } catch { /* non-fatal */ }

  try {
    await client.users.deleteUser(userId);
  } catch (err) {
    throw new Error(clerkMsg(err));
  }

  if (email) await logAccessEvent(email, name, "removed", null);
}

// ── Access history (from Supabase log) ───────────────────────────────────────

export async function getAccessHistory(): Promise<AccessEvent[]> {
  await assertOwner();

  const { data, error } = await db
    .from("access_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id:        row.id as number,
    email:     row.email as string,
    name:      (row.name as string | null) ?? null,
    action:    row.action as AccessEvent["action"],
    expiresAt: (row.expires_at as string | null) ?? null,
    createdAt: row.created_at as string,
  }));
}
