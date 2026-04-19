const textEncoder = new TextEncoder();
const SESSION_COOKIE = "lurking_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

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

export async function getSessionUserId(env, request) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  return env.UPLOADS.get(`session:${token}`);
}

export async function getCurrentUser(env, request) {
  const userId = await getSessionUserId(env, request);
  if (!userId) return null;

  const rawUser = await env.UPLOADS.get(`user:${userId}`);
  if (!rawUser) return null;

  const user = JSON.parse(rawUser);
  return {
    id: user.id,
    username: user.username,
    createdAt: user.createdAt,
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
