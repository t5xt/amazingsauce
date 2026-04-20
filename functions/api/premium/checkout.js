import { onDemandRefreshPremium } from "../../_lib/premium.js";

export async function onRequestGet(context) {
  const { env, request } = context;

  if (!env.UPLOADS) {
    return new Response(JSON.stringify({ error: "Missing KV binding: UPLOADS" }), {
      status: 500,
      headers: {
        "content-type": "application/json; charset=utf-8",
      },
    });
  }

  return onDemandRefreshPremium(env, request);
}
