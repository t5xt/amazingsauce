function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}

export async function onRequestGet(context) {
  const { env, params } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  const rawId = params.id || "";
  const id = rawId.split(".")[0];

  if (!id) {
    return json({ error: "Missing image id." }, { status: 400 });
  }

  const [viewCount, metadata] = await Promise.all([
    env.UPLOADS.get(`views:${id}`),
    env.UPLOADS.getWithMetadata(`image:${id}`, "arrayBuffer"),
  ]);

  if (!metadata.value) {
    return json({ error: "Not found." }, { status: 404 });
  }

  return json({
    id,
    views: Number(viewCount || 0),
    expiresAt: metadata.metadata?.expiresAt || null,
  });
}
