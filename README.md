# lurki.ng

This project is set up for free-tier Cloudflare Pages + KV so uploaded image links can work without renting a traditional server.

## What changed

- `functions/api/upload.js` accepts image uploads and stores them in Cloudflare KV with a TTL of `3h`, `24h`, or `48h`
- `functions/image/[id].js` serves uploaded images at `/image/:id`
- `script.js` uploads to the live backend instead of faking the link on the client

## Deploy on Cloudflare

1. Create a Cloudflare KV namespace.
2. Put the KV namespace IDs into `wrangler.toml` for `id` and `preview_id`.
3. Create a Cloudflare Pages project connected to this folder.
4. Set the build output directory to `.` if Cloudflare asks.
5. Deploy.

## Notes

- This uses Cloudflare's free infrastructure, not a paid VPS/server.
- A plain static JSON file cannot reliably store public user uploads by itself.
- Links expire because the KV entry is stored with a TTL.
