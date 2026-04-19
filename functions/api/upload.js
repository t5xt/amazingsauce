const ALLOWED_HOURS = new Set([3, 24, 48]);

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
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

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  const expiresHours = Number(formData.get("expiresHours"));

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return json({ error: "Please upload an image file." }, { status: 400 });
  }

  if (!ALLOWED_HOURS.has(expiresHours)) {
    return json({ error: "Invalid expiry duration." }, { status: 400 });
  }

  const id = crypto.randomUUID().replace(/-/g, "");
  const extension = getExtension(file);
  const ttlSeconds = expiresHours * 60 * 60;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const key = `image:${id}`;
  const buffer = await file.arrayBuffer();

  await env.UPLOADS.put(key, buffer, {
    expirationTtl: ttlSeconds,
    metadata: {
      contentType: file.type || "application/octet-stream",
      originalName: file.name,
    },
  });

  const url = new URL(request.url);
  const publicUrl = `${url.origin}/image/${id}.${extension}`;

  return json({
    id,
    url: publicUrl,
    expiresAt,
    expiresHours,
    size: file.size,
    contentType: file.type,
  });
}
