import { getCurrentUser, json } from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const { env, request } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  const user = await getCurrentUser(env, request);
  return json({ user });
}
