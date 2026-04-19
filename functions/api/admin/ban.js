import {
  getCurrentUser,
  isAdminUser,
  json,
  normalizeUsername,
} from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  const admin = await getCurrentUser(env, request);
  if (!isAdminUser(admin)) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const username = normalizeUsername(payload?.username);
    const reason = String(payload?.reason || "").trim();
    const durationHours = Number(payload?.durationHours);

    if (!username) {
      return json({ error: "Username is required." }, { status: 400 });
    }

    if (!reason) {
      return json({ error: "Ban reason is required." }, { status: 400 });
    }

    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return json({ error: "Duration must be a positive number of hours." }, { status: 400 });
    }

    const userId = await env.UPLOADS.get(`user:name:${username}`);
    if (!userId) {
      return json({ error: "User not found." }, { status: 404 });
    }

    const rawUser = await env.UPLOADS.get(`user:${userId}`);
    const targetUser = rawUser ? JSON.parse(rawUser) : null;

    if (isAdminUser(targetUser)) {
      return json({ error: "You cannot ban an admin account." }, { status: 400 });
    }

    const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();
    const ban = {
      reason,
      durationHours,
      expiresAt,
      bannedBy: admin.username,
      createdAt: new Date().toISOString(),
    };

    await env.UPLOADS.put(`ban:${userId}`, JSON.stringify(ban), {
      expirationTtl: Math.ceil(durationHours * 60 * 60),
    });

    return json({
      ok: true,
      username,
      ban,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ban failed.";
    return json({ error: message }, { status: 500 });
  }
}
