const textEncoder = new TextEncoder();
const SESSION_COOKIE = "lurking_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const SEEDED_ADMINS = [
  { username: "corpse", password: "Ayaz2903" },
  { username: "kev", password: "kev123!!" },
];

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

export function parseCookies(request) {
  const raw = request.headers.get("cookie") || "";
  return raw.split(";").reduce((cookies, pair) => {
    const [key, ...rest] = pair.trim().split("=");
    if (!key) return cookies;
    cookies[key] = decodeURIComponent(rest.join("="));
    return cookies;
  }, {});
}

export function buildSessionCookie(token, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function hashPassword(password, salt) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(`${salt}:${password}`),
  );
  return toHex(digest);
}

export function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

export function isAdminUser(user) {
  return Boolean(user && user.role === "admin");
}

export async function getBanRecord(env, userId) {
  const rawBan = await env.UPLOADS.get(`ban:${userId}`);
  if (!rawBan) return null;

  try {
    const ban = JSON.parse(rawBan);
    if (ban.expiresAt && Date.parse(ban.expiresAt) <= Date.now()) {
      await env.UPLOADS.delete(`ban:${userId}`);
      return null;
    }
    return ban;
  } catch {
    return null;
  }
}

export async function ensureSeedAdmin(env) {
  let lastSeededUserId = null;

  for (const admin of SEEDED_ADMINS) {
    const existingUserId = await env.UPLOADS.get(`user:name:${admin.username}`);
    if (existingUserId) {
      const rawExistingUser = await env.UPLOADS.get(`user:${existingUserId}`);
      if (rawExistingUser) {
        try {
          const existingUser = JSON.parse(rawExistingUser);
          const needsPasswordReset = !existingUser.salt || !existingUser.passwordHash;
          const shouldPromote = existingUser.role !== "admin";

          if (shouldPromote || needsPasswordReset) {
            const salt = existingUser.salt || crypto.randomUUID().replace(/-/g, "");
            const passwordHash = await hashPassword(admin.password, salt);
            const updatedUser = {
              ...existingUser,
              username: admin.username,
              salt,
              passwordHash,
              role: "admin",
            };

            await env.UPLOADS.put(`user:${existingUserId}`, JSON.stringify(updatedUser));
          }
        } catch {
          // Leave malformed users untouched.
        }
      }
      lastSeededUserId = existingUserId;
      continue;
    }

    const userId = crypto.randomUUID().replace(/-/g, "");
    const salt = crypto.randomUUID().replace(/-/g, "");
    const passwordHash = await hashPassword(admin.password, salt);
    const createdAt = new Date().toISOString();
    const user = {
      id: userId,
      username: admin.username,
      salt,
      passwordHash,
      createdAt,
      role: "admin",
    };

    await Promise.all([
      env.UPLOADS.put(`user:${userId}`, JSON.stringify(user)),
      env.UPLOADS.put(`user:name:${admin.username}`, userId),
      env.UPLOADS.put(`user_uploads:${userId}`, JSON.stringify([])),
    ]);

    lastSeededUserId = userId;
  }

  return lastSeededUserId;
}

export async function getSessionUserId(env, request) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return env.UPLOADS.get(`session:${token}`);
}

export async function getCurrentUser(env, request) {
  await ensureSeedAdmin(env);
  const userId = await getSessionUserId(env, request);
  if (!userId) return null;

  const rawUser = await env.UPLOADS.get(`user:${userId}`);
  if (!rawUser) return null;

  const user = JSON.parse(rawUser);
  const ban = await getBanRecord(env, user.id);
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
    role: user.role || "user",
    ban,
  };
}

export async function createSession(env, userId) {
  const token = crypto.randomUUID().replace(/-/g, "");
  await env.UPLOADS.put(`session:${token}`, userId, {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return token;
}

export async function loadUserUploads(env, userId) {
  const raw = await env.UPLOADS.get(`user_uploads:${userId}`);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveUserUploads(env, userId, uploads) {
  await env.UPLOADS.put(`user_uploads:${userId}`, JSON.stringify(uploads));
}
