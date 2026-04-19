import {
  getCurrentUser,
  isAdminUser,
  json,
} from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const { env, request } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  const user = await getCurrentUser(env, request);
  if (!isAdminUser(user)) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const listing = await env.UPLOADS.list({ prefix: "image:" });
    const keys = listing.keys || [];

    const images = await Promise.all(keys.map(async (entry) => {
      const metadata = entry.metadata || {};
      let uploader = "Guest";

      if (metadata.ownerUserId) {
        const rawUser = await env.UPLOADS.get(`user:${metadata.ownerUserId}`);
        if (rawUser) {
          try {
            const parsedUser = JSON.parse(rawUser);
            uploader = parsedUser.username || "Unknown";
          } catch {
            uploader = "Unknown";
          }
        }
      }

      const id = String(entry.name || "").replace(/^image:/, "");

      return {
        id,
        fileName: metadata.originalName || `image-${id}`,
        contentType: metadata.contentType || "image/*",
        expiresAt: metadata.expiresAt || null,
        uploader,
      };
    }));

    images.sort((a, b) => {
      const aTime = a.expiresAt ? Date.parse(a.expiresAt) : 0;
      const bTime = b.expiresAt ? Date.parse(b.expiresAt) : 0;
      return bTime - aTime;
    });

    return json({
      images,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load images.";
    return json({ error: message }, { status: 500 });
  }
}
