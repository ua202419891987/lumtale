// Cloudflare Pages Function — POST /api/generate
// Proxies a face photo to Replicate's InstantID model (identity-preserving stylization).
// The API token lives server-side in env.REPLICATE_API_TOKEN and is never exposed to the browser.
//
// NOTE: REPLICATE_API_TOKEN MUST be set as a Cloudflare Pages environment variable
// (Pages dashboard → your project → Settings → Environment variables). It is read at
// runtime via the `env` object and is never shipped to the client.

// Model is pinned by VERSION hash (not the /v1/models/{owner}/{name}/predictions
// shortcut), because zsxkib/instant-id-ipadapter-plus-face does NOT support the
// model-name predictions endpoint (returns 404). The version-hash endpoint
// (POST /v1/predictions with `version`) is the reliable path.
const MODEL_VERSION = "32402fb5c493d883aa6cf098ce3e4cc80f1fe6871f6ae7f632a8dbde01a3d161";

// Allowed styles. Anything else is rejected with 400 before we touch Replicate.
const ALLOWED_STYLES = ["dream", "toon", "studio"];

// Style prompts — aesthetic described WITHOUT brand names (IP-safe).
const PROMPTS = {
  dream:
    "soft painterly anime illustration, gentle warm sunlight, flat pastel color palette, dreamy serene atmosphere, clean elegant linework, delicate features, high detail, masterpiece",
  toon:
    "3d cartoon character, soft studio lighting, rounded smooth forms, vibrant cheerful colors, friendly expressive face, clean shading, high quality render",
  studio:
    "refined illustrated portrait, soft diffused studio lighting, clean neutral background, tasteful muted editorial color palette, precise confident linework, elegant balanced composition, high detail, premium art piece",
};

const NEGATIVE =
  "photorealistic, 3d realistic render, low quality, blurry, deformed, extra limbs, bad anatomy, watermark, text, oversaturated, harsh shadows";

// Hard ceiling on decoded image bytes (~10MB). Data URLs inflate by ~4/3 via base64.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// CORS + content-type headers shared by every response.
const BASE_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  "access-control-max-age": "86400",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: BASE_HEADERS });
}

// Validates a data URL: must be image/* and within the size budget.
function parseImageDataUrl(image) {
  if (typeof image !== "string" || image.length === 0) return null;
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(image.trim());
  if (!m) return null;
  const mime = m[1];
  const b64 = m[2];
  if (!/^image\/(png|jpeg|jpg|webp|gif|bmp)$/.test(mime)) return null;
  // Strip whitespace/newlines that some clients add, then measure decoded bytes.
  const clean = b64.replace(/\s/g, "");
  let byteLen;
  try {
    byteLen = Math.floor((clean.length * 3) / 4) -
      (clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0);
  } catch {
    return null;
  }
  if (!Number.isFinite(byteLen) || byteLen <= 0) return null;
  if (byteLen > MAX_IMAGE_BYTES) return null;
  return { mime, byteLen };
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: BASE_HEADERS });
}

export async function onRequestPost({ request, env }) {
  const token = env.REPLICATE_API_TOKEN;
  const kv = env.LUMTALE_KV;
  if (!token) {
    return json(
      { success: false, error: "Server not configured: missing REPLICATE_API_TOKEN." },
      500
    );
  }

  // --- (0) Server-side free quota guard (hard cap: 1 free render per IP per day) ---
  // Backs the client-side localStorage guard. CF-Connecting-IP is set by Cloudflare
  // and cannot be spoofed by the visitor. Cleared caches / new browsers cannot
  // bypass this. The counter is only written after Replicate accepts the job.
  if (kv) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const quotaKey = `free_quota_v1:${day}:${ip}`;
    try {
      const used = await kv.get(quotaKey);
      if (used && Number(used) >= 1) {
        return json(
          {
            success: false,
            code: "FREE_LIMIT",
            message:
              "Your free Lumling is done. Unlock more portraits with a one-time purchase — your photos are still deleted within 24h.",
          },
          429
        );
      }
      // Pass the key along so we can write it once Replicate starts the job.
      request.quotaKey = quotaKey;
    } catch (_) {
      // KV failure must NOT block generation (fail open).
    }
  }

  // --- (1) Parse + validate the request body ---
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid request body: expected JSON." }, 400);
  }

  if (body == null || typeof body !== "object") {
    return json({ success: false, error: "Invalid request body." }, 400);
  }

  const { image, style } = body;

  // (2) Image validation: must be a data URL, image/*, within size budget.
  const parsed = parseImageDataUrl(image);
  if (!parsed) {
    return json(
      {
        success: false,
        error:
          "Missing or invalid 'image'. Expected a base64 data URL of type image/png|jpeg|webp|gif|bmp under ~10MB.",
      },
      400
    );
  }

  // (1) Style validation: must be in the allowed list.
  if (typeof style !== "string" || !ALLOWED_STYLES.includes(style)) {
    return json(
      {
        success: false,
        error: `Invalid 'style'. Allowed values: ${ALLOWED_STYLES.join(", ")}.`,
      },
      400
    );
  }

  // (4) Pass the chosen style through to the model inputs.
  // NOTE: Only parameters confirmed in the model README are sent. `guidance_scale`,
  // `num_outputs` and `scheduler` are NOT in zsxkib/instant-id-ipadapter-plus-face's
  // schema — sending them would cause a 400 from Replicate. Single output keeps cost
  // at ~$0.023/run (the frontend already handles a single URL).
  const prompt = PROMPTS[style];
  const input = {
    image,
    prompt,
    negative_prompt: NEGATIVE,
    width: 1024,
    height: 1024,
    num_inference_steps: 30,
    instantid_weight: 0.8, // keep face structure faithful to the original
    ipadapter_weight: 0.7,
    ipadapter_weight_type: "style transfer precise",
    seed: body.seed != null ? body.seed : Math.floor(Math.random() * 1e9),
  };

  // --- (3) Proxy to Replicate with friendly upstream error handling ---
  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ version: MODEL_VERSION, input }),
    });

    if (!res.ok) {
      // Replicate itself failed — surface a clean 502 to the client, but pass
      // through the upstream detail (e.g. "Insufficient credit") so the caller
      // gets an actionable reason instead of a generic retry message.
      let detail = "";
      try {
        const err = await res.json();
        detail = err?.detail ? ` (${err.detail})` : "";
      } catch (_) {
        /* ignore non-JSON upstream error bodies */
      }
      console.error("Replicate create failed:", res.status, await safeText(res));
      return json(
        { success: false, message: `Render partner unavailable, please retry.${detail}` },
        502
      );
    }

    const pred = await res.json();
    if (pred.status === "failed") {
      console.error("Replicate prediction failed:", pred.error);
      return json(
        { success: false, message: "Render partner unavailable, please retry." },
        502
      );
    }

    // Replicate accepted the job → now consume the free quota (best-effort).
    if (kv && request.quotaKey) {
      try {
        // TTL ~27h so the key dies after the day; UTC-day key handles rollover.
        await kv.put(request.quotaKey, "1", { expirationTtl: 60 * 60 * 27 });
      } catch (_) { /* fail open */ }
    }

    return json({ success: true, id: pred.id, status: pred.status || "starting" });
  } catch (e) {
    console.error("Replicate request error:", e && e.message);
    return json(
      { success: false, message: "Render partner unavailable, please retry." },
      502
    );
  }
}

async function safeText(res) {
  try {
    return (await res.text()).slice(0, 400);
  } catch {
    return "";
  }
}
