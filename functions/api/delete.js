import { getCurrentUser, json, loadUserUploads, saveUserUploads } from "../_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  try {
    const payload = await request.json();
    const id = String(payload?.id || "").trim();
    const token = String(payload?.token || "").trim();

    if (!id || !token) {
      return json({ error: "Missing delete credentials." }, { status: 400 });
    }

    const storedToken = await env.UPLOADS.get(`delete:${id}`);

    if (!storedToken || storedToken !== token) {
      return json({ error: "Invalid delete token." }, { status: 403 });
    }

    const user = await getCurrentUser(env, request);

    await Promise.all([
      env.UPLOADS.delete(`image:${id}`),
      env.UPLOADS.delete(`delete:${id}`),
      env.UPLOADS.delete(`views:${id}`),
    ]);

    if (user) {
      const uploads = await loadUserUploads(env, user.id);
      const nextUploads = uploads.map((upload) => (
        upload.id === id ? { ...upload, status: "Deleted" } : upload
      ));
      await saveUserUploads(env, user.id, nextUploads);
    }

    return json({ ok: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed.";
    return json({ error: message }, { status: 500 });
  }
}
