function notFound() {
  return new Response("Not found", { status: 404 });
}

export async function onRequestGet(context) {
  const { env, params } = context;

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

  return new Response(value, {
    headers: {
      "content-type": metadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=60",
      "content-disposition": "inline",
      "x-robots-tag": "noindex",
    },
  });
}
