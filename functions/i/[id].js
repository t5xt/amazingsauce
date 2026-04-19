function notFound() {
  return new Response("Not found", { status: 404 });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getDisplayTitle(originalName) {
  const safeName = String(originalName || "lurki.ng");
  const lastDot = safeName.lastIndexOf(".");
  const base = lastDot > 0 ? safeName.slice(0, lastDot) : safeName;
  return base.trim() || "lurki.ng";
}

async function incrementViews(env, id) {
  const current = Number((await env.UPLOADS.get(`views:${id}`)) || 0);
  const next = current + 1;
  const currentGlobalViews = Number((await env.UPLOADS.get("stats:global_view_count")) || 0);
  await Promise.all([
    env.UPLOADS.put(`views:${id}`, String(next)),
    env.UPLOADS.put("stats:global_view_count", String(currentGlobalViews + 1)),
  ]);
  return next;
}

export async function onRequestGet(context) {
  const { env, params, request } = context;

  if (!env.UPLOADS) {
    return new Response("Missing KV binding", { status: 500 });
  }

  const rawId = params.id || "";
  const id = rawId.split(".")[0];

  if (!id) {
    return notFound();
  }

  const { value, metadata } = await env.UPLOADS.getWithMetadata(`image:${id}`, "arrayBuffer");

  if (!value) {
    return notFound();
  }

  const views = await incrementViews(env, id);
  const url = new URL(request.url);
  const imageUrl = `${url.origin}/image/${id}`;
  const title = getDisplayTitle(metadata?.originalName);
  const expiresAt = metadata?.expiresAt ? new Date(metadata.expiresAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }) : "";
  const fileType = metadata?.contentType || "image/*";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="theme-color" content="#050505">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:site_name" content="lurki.ng">
  <meta property="og:image:alt" content="${escapeHtml(title)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:url" content="${escapeHtml(url.href)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #050505;
      color: #f5f5f5;
      font-family: "Space Grotesk", system-ui, sans-serif;
      overflow: hidden;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      background:
        radial-gradient(circle at center, rgba(255,255,255,0.08), transparent 55%),
        url("${escapeHtml(imageUrl)}") center / cover no-repeat;
      filter: blur(36px) saturate(1.1);
      opacity: 0.24;
      transform: scale(1.08);
    }
    main {
      position: relative;
      z-index: 1;
      width: min(960px, calc(100vw - 32px));
      padding: 24px;
      border-radius: 28px;
      border: 1px solid rgba(255,255,255,0.08);
      background: rgba(10, 10, 10, 0.72);
      backdrop-filter: blur(18px);
      box-shadow: 0 30px 90px rgba(0,0,0,0.45);
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-bottom: 18px;
      color: rgba(255,255,255,0.72);
      font-size: 14px;
    }
    .title {
      font-size: clamp(28px, 4vw, 44px);
      line-height: 0.95;
      font-weight: 700;
      margin: 0 0 18px;
      letter-spacing: -0.04em;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
    }
    .chip {
      padding: 9px 12px;
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      color: rgba(255,255,255,0.72);
      font-size: 13px;
    }
    img {
      display: block;
      width: 100%;
      height: auto;
      border-radius: 22px;
      background: #111;
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.45);
    }
    .actions {
      margin-top: 16px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    a {
      color: inherit;
      text-decoration: none;
    }
    .button {
      padding: 10px 14px;
      border-radius: 999px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.04);
      font-size: 14px;
    }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <span>lurki.ng</span>
      <span>${views} view${views === 1 ? "" : "s"}</span>
    </div>
    <h1 class="title">${escapeHtml(title)}</h1>
    <div class="meta">
      <span class="chip">${escapeHtml(fileType)}</span>
      ${expiresAt ? `<span class="chip">Expires ${escapeHtml(expiresAt)}</span>` : ""}
    </div>
    <img src="${escapeHtml(imageUrl)}" alt="Shared image" type="${escapeHtml(fileType)}">
    <div class="actions">
      <a class="button" href="${escapeHtml(imageUrl)}">Open raw image</a>
    </div>
  </main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
}
