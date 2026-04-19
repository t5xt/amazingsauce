import {
  getCurrentUser,
  json,
  loadUserUploads,
  saveUserUploads,
} from "../_lib/auth.js";

const ALLOWED_HOURS = new Set([3, 24, 48]);
const ID_LENGTH = 12;

function createShortId() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, ID_LENGTH);
}

function getExtension(file) {
  const byType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/avif": "avif",
  };

  if (byType[file.type]) {
    return byType[file.type];
  }

  const parts = file.name.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "bin";
}

export async function onRequestGet() {
  return json({
    ok: true,
    route: "/api/upload",
    methods: ["POST"],
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    if (!env.UPLOADS) {
      return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("image");
    const expiresHours = Number(formData.get("expiresHours"));

    if (!file || typeof file.arrayBuffer !== "function") {
      return json({ error: "Please upload an image file." }, { status: 400 });
    }

    if (!String(file.type || "").startsWith("image/")) {
      return json({ error: "Only image uploads are allowed." }, { status: 400 });
    }

    if (!ALLOWED_HOURS.has(expiresHours)) {
      return json({ error: "Invalid expiry duration." }, { status: 400 });
    }

    const id = createShortId();
    const ttlSeconds = expiresHours * 60 * 60;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    const key = `image:${id}`;
    const deleteToken = crypto.randomUUID().replace(/-/g, "");
    const buffer = await file.arrayBuffer();
    const user = await getCurrentUser(env, request);

    if (user?.ban) {
      return json({
        error: `This account is banned until ${user.ban.expiresAt}. Reason: ${user.ban.reason}`,
      }, { status: 403 });
    }

    await env.UPLOADS.put(key, buffer, {
      expirationTtl: ttlSeconds,
      metadata: {
        contentType: file.type || "application/octet-stream",
        originalName: file.name || "image",
        expiresAt,
        ownerUserId: user?.id || null,
      },
    });
    await env.UPLOADS.put(`delete:${id}`, deleteToken, { expirationTtl: ttlSeconds });

    const url = new URL(request.url);
    const publicUrl = `${url.origin}/i/${id}`;
    const rawUrl = `${url.origin}/image/${id}`;
    const statsUrl = `${url.origin}/api/stats/${id}`;

    if (user) {
      const uploads = await loadUserUploads(env, user.id);
      uploads.unshift({
        id,
        fileName: file.name || "image",
        url: publicUrl,
        rawUrl,
        statsUrl,
        size: file.size,
        expiresAt,
        durationHours: expiresHours,
        views: 0,
        status: "Live",
        createdAt: new Date().toISOString(),
      });
      await saveUserUploads(env, user.id, uploads.slice(0, 200));

      const uploaderCountsRaw = await env.UPLOADS.get("stats:uploader_counts");
      let uploaderCounts = {};
      try {
        uploaderCounts = uploaderCountsRaw ? JSON.parse(uploaderCountsRaw) : {};
      } catch {
        uploaderCounts = {};
      }
      uploaderCounts[user.username] = Number(uploaderCounts[user.username] || 0) + 1;
      await env.UPLOADS.put("stats:uploader_counts", JSON.stringify(uploaderCounts));
    }

    const currentGlobalUploads = Number((await env.UPLOADS.get("stats:global_upload_count")) || 0);
    await env.UPLOADS.put("stats:global_upload_count", String(currentGlobalUploads + 1));

    return json({
      id,
      url: publicUrl,
      rawUrl,
      statsUrl,
      expiresAt,
      expiresHours,
      size: file.size,
      contentType: file.type,
      views: 0,
      deleteToken,
      ownerUserId: user?.id || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload failed on the server.";
    return json({ error: message }, { status: 500 });
  }
}
