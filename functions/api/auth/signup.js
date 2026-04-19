import {
  ensureSeedAdmin,
  buildSessionCookie,
  createSession,
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

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return json({ error: "Username must be 3-20 chars: letters, numbers, underscore." }, { status: 400 });
    }

    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters." }, { status: 400 });
    }

    const existingUserId = await env.UPLOADS.get(`user:name:${username}`);
    if (existingUserId) {
      return json({ error: "That username is already taken." }, { status: 409 });
    }

    const userId = crypto.randomUUID().replace(/-/g, "");
    const salt = crypto.randomUUID().replace(/-/g, "");
    const passwordHash = await hashPassword(password, salt);
    const createdAt = new Date().toISOString();
    const user = { id: userId, username, salt, passwordHash, createdAt };

    await Promise.all([
      env.UPLOADS.put(`user:${userId}`, JSON.stringify(user)),
      env.UPLOADS.put(`user:name:${username}`, userId),
      env.UPLOADS.put(`user_uploads:${userId}`, JSON.stringify([])),
    ]);

    const token = await createSession(env, userId);

    return json(
      {
        ok: true,
        user: {
          id: userId,
          username,
          createdAt,
          role: "user",
        },
      },
      {
        headers: {
          "set-cookie": buildSessionCookie(token),
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sign up failed.";
    return json({ error: message }, { status: 500 });
  }
}
