import { json } from "../../_lib/auth.js";

export async function onRequestPost() {
  return json({
    error: "Manual transaction-hash premium claims are disabled. Premium now activates automatically when a matching payment is detected.",
  }, { status: 410 });
}
