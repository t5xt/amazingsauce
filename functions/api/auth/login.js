import {
  ensureSeedAdmin,
  buildSessionCookie,
  createSession,
  getBanRecord,
  hashPassword,
  json,
  normalizeUsername,
} from "../../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  try {
    await ensureSeedAdmin(env);
    const payload = await request.json();
    const username = normalizeUsername(payload?.username);
    const password = String(payload?.password || "");

    const userId = await env.UPLOADS.get(`user:name:${username}`);
    if (!userId) {
      return json({ error: "Invalid username or password." }, { status: 401 });
    }

    const rawUser = await env.UPLOADS.get(`user:${userId}`);
    if (!rawUser) {
      return json({ error: "Account not found." }, { status: 404 });
    }

    const user = JSON.parse(rawUser);
    const ban = await getBanRecord(env, user.id);
    if (ban) {
      return json({
        error: `This account is banned until ${ban.expiresAt}. Reason: ${ban.reason}`,
        ban,
      }, { status: 403 });
    }
    const passwordHash = await hashPassword(password, user.salt);

    if (passwordHash !== user.passwordHash) {
      return json({ error: "Invalid username or password." }, { status: 401 });
    }

    const token = await createSession(env, user.id);

    return json(
      {
        ok: true,
        user: {
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
          role: user.role || "user",
        },
      },
      {
        headers: {
          "set-cookie": buildSessionCookie(token),
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Log in failed.";
    return json({ error: message }, { status: 500 });
  }
}
