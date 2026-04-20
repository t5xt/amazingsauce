import { processPendingPremiumOrders } from "./functions/_lib/premium.js";

export default {
  async fetch() {
    return new Response("lurki.ng premium cron worker", {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  },

  async scheduled(_controller, env) {
    if (!env.UPLOADS) {
      return;
    }

    await processPendingPremiumOrders(env);
  },
};
