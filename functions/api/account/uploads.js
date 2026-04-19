import { getCurrentUser, json, loadUserUploads } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const { env, request } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  const user = await getCurrentUser(env, request);
  if (!user) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  const uploads = await loadUserUploads(env, user.id);
  return json({ uploads });
}
