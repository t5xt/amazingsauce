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

  const url = new URL(request.url);
  const imageUrl = `${url.origin}/image/${id}`;
  const title = getDisplayTitle(metadata?.originalName);
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
      font-family: system-ui, sans-serif;
    }
    main {
      width: min(920px, calc(100vw - 32px));
      padding: 20px;
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
  </style>
</head>
<body>
  <main>
    <img src="${escapeHtml(imageUrl)}" alt="Shared image" type="${escapeHtml(fileType)}">
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
