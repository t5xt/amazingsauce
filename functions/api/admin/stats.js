import {
  getCurrentUser,
  isAdminUser,
  json,
} from "../../_lib/auth.js";

export async function onRequestGet(context) {
  const { env, request } = context;

  if (!env.UPLOADS) {
    return json({ error: "Missing KV binding: UPLOADS" }, { status: 500 });
  }

  const user = await getCurrentUser(env, request);
  if (!isAdminUser(user)) {
    return json({ error: "Unauthorized." }, { status: 401 });
  }

  const [globalUploadsRaw, globalViewsRaw, uploaderCountsRaw] = await Promise.all([
    env.UPLOADS.get("stats:global_upload_count"),
    env.UPLOADS.get("stats:global_view_count"),
    env.UPLOADS.get("stats:uploader_counts"),
  ]);

  let uploaderCounts = {};
  try {
    uploaderCounts = uploaderCountsRaw ? JSON.parse(uploaderCountsRaw) : {};
  } catch {
    uploaderCounts = {};
  }

  const leaderboard = Object.entries(uploaderCounts)
    .map(([username, uploads]) => ({ username, uploads: Number(uploads || 0) }))
    .sort((a, b) => b.uploads - a.uploads)
    .slice(0, 10);

  return json({
    globalUploadCount: Number(globalUploadsRaw || 0),
    globalViewCount: Number(globalViewsRaw || 0),
    topUploaders: leaderboard,
  });
}
