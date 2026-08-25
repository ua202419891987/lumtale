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

// Two portrait styles — "headshot" (real photo) and "anime" (modern semi-realistic
// Japanese illustration). Per product decision 2026-08-25 (v3): keep the clean-white
// Professional Headshot (the "white-studio" look the user picked), and switch the
// dark Cinematic Portrait to a modern Anime portrait, gendered via the `gender`
// field. InstantID still locks the user's face; for anime we lower its weight and
// raise the ipadapter weight so the style template wins over the face map.
const ALLOWED_STYLES = ["headshot", "anime"];
const ALLOWED_GENDERS = ["male", "female"];

// Style prompts — 2026-08-25 v3 (user picked the white-studio reference and the
// Makoto-Shinkai-style anime illustration; we drop the dark cinematic direction).
// Beauty directives that carry over from v2: ① smooth the forehead / reduce
// wrinkles, ② slightly enlarge the eyes for a more flattering look, ③ KEEP the
// original hairstyle & hair length, ④ hard-block watermarks/text. The headshot
// stays on a clean white studio backdrop. The anime prompt is split by gender so
// the model draws the right body / wardrobe / facial proportions.
const PROMPTS = {
  headshot:
    "professional headshot, highly detailed natural skin texture with subtle smoothing, smooth wrinkle-free forehead, slightly enlarged bright expressive eyes, preserve original hairstyle and hair length, no watermark, no text overlay, no logo, no signature, soft studio lighting, clean white studio background with subtle warm-gray gradient, shallow depth of field, sharp focus, 8k, photorealistic, masterpiece",
};

// Modern semi-realistic Japanese anime portrait. GENDER AWARE — body, wardrobe
// and styling differ by gender. Inspired by the user's reference (Makoto Shinkai
// / modern anime key visual): large expressive eyes, refined features, painterly
// watercolor-style background, vibrant color grade, cel shading, intricate hair.
const ANIME_PROMPTS = {
  male:
    "modern anime key visual portrait, handsome young man, semi-realistic Japanese illustration style, large expressive detailed eyes, refined masculine features, soft cinematic lighting, painterly watercolor background, intricate hair details, cel shading, vibrant colors, high quality anime artwork, smooth skin, no watermark, no text, no logo, no signature, masterpiece, illustration",
  female:
    "modern anime key visual portrait, beautiful young woman, semi-realistic Japanese illustration style, large expressive detailed eyes, soft refined feminine features, gentle expression, soft cinematic lighting, painterly watercolor background, intricate hair details, cel shading, vibrant colors, high quality anime artwork, smooth skin, no watermark, no text, no logo, no signature, masterpiece, illustration",
};

// Negative list shared by both styles. We removed the "anime, illustration,
// cartoon, painting, sketch, disney" bans because the anime style is now a
// first-class style — keeping those here would sabotage it. Watermark, low
// quality, deformed anatomy and aging marks stay banned across the board.
const NEGATIVE =
  "deformed, bad anatomy, extra limbs, watermark, text, logo, signature, stamp, date overlay, frame, border, stock photo watermark, gettyimages, shutterstock, alamy, adobe stock, blurry, low quality, oversaturated, harsh shadows, 3d render, plastic skin, airbrushed, doll-like, mutated hands, extra fingers, double exposure, wrinkled forehead, frown lines, tired eyes, sagging skin, western cartoon, chibi";

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

  // --- (1) Parse + validate the request body (must run first so we can read `promo`) ---
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: "Invalid request body: expected JSON." }, 400);
  }

  if (body == null || typeof body !== "object") {
    return json({ success: false, error: "Invalid request body." }, 400);
  }

  const { image, style, gender, promo } = body;

  // --- (0) Admin bypass: requests carrying the admin token skip ALL quota
  // checks (unlimited for the owner). The token lives in the
  // LUMTALE_ADMIN_TOKEN environment variable; the browser sends it via the
  // `x-admin-token` header after the owner unlocks admin mode on door2.html.
  const ADMIN_TOKEN = env.LUMTALE_ADMIN_TOKEN;
  const reqAdmin = request.headers.get("x-admin-token") || "";
  const isAdmin = !!ADMIN_TOKEN && reqAdmin === ADMIN_TOKEN;

  // --- (0) Free-quota guard: ONE free render per IP, ever (not per day).
  // Backs the client-side localStorage guard. CF-Connecting-IP is set by
  // Cloudflare and cannot be spoofed by the visitor. Cleared caches / new
  // browsers cannot bypass this. The counter is only written after Replicate
  // accepts the job. Admin requests skip this entirely.
  //
  // Promo ("osrsguru") users get a SEPARATE one-time bucket, so OSRS Guru
  // readers can claim one extra free portrait on top of the normal one.
  const PROMO_CODE = "osrsguru";
  const isPromo = typeof promo === "string" && promo.trim().toLowerCase() === PROMO_CODE;
  if (kv && !isAdmin) {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    // One-time keys: no date component, so a given IP gets exactly 1 render
    // from the free bucket and 1 from the promo bucket, ever.
    const quotaKey = isPromo
      ? `promo_${PROMO_CODE}:${ip}`
      : `free_quota_v1:${ip}`;
    try {
      const used = await kv.get(quotaKey);
      if (used && Number(used) >= 1) {
        const code = isPromo ? "PROMO_LIMIT" : "FREE_LIMIT";
        const message = isPromo
          ? "Your OSRS Guru free portrait is claimed. Unlock more with a one-time purchase — your photos are deleted within 24h."
          : "Your free Lumling is done. Unlock more portraits with a one-time purchase — your photos are still deleted within 24h.";
        return json({ success: false, code, message }, 429);
      }
      // Pass the key along so we can write it once Replicate starts the job.
      request.quotaKey = quotaKey;
      request.isPromo = isPromo;
    } catch (_) {
      // KV failure must NOT block generation (fail open).
    }
  }

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

  // (1c) Gender validation: anime style REQUIRES a gender (male/female) so the
  // model draws the right body, wardrobe and facial proportions. Headshot
  // doesn't need it (the face is locked; lighting is neutral).
  let effectiveGender = null;
  if (style === "anime") {
    if (typeof gender !== "string" || !ALLOWED_GENDERS.includes(gender)) {
      return json(
        {
          success: false,
          error: `Anime style requires 'gender' = one of ${ALLOWED_GENDERS.join(", ")}.`,
        },
        400
      );
    }
    effectiveGender = gender;
  }

  // (1b) Pass the chosen style through to the model inputs.
  // NOTE: Only parameters confirmed in the model README are sent. `guidance_scale`,
  // `num_outputs` and `scheduler` are NOT in zsxkib/instant-id-ipadapter-plus-face's
  // schema — sending them would cause a 400 from Replicate. Single output keeps cost
  // at ~$0.023/run (the frontend already handles a single URL).
  const prompt = style === "anime" ? ANIME_PROMPTS[effectiveGender] : PROMPTS[style];
  // For anime we lower instantid weight and raise ipadapter weight so the style
  // template (Shinkai-style illustration) wins over the raw face map; for the
  // headshot we keep the high-face-lock setting so the user looks like themselves.
  const isAnime = style === "anime";
  const input = {
    image,
    prompt,
    negative_prompt: NEGATIVE,
    width: 1024,
    height: 1024,
    num_inference_steps: 30,
    instantid_weight: isAnime ? 0.7 : 0.9,
    ipadapter_weight: isAnime ? 0.85 : 0.7,
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
        // No TTL → the one-time key persists (1 free render per IP, ever).
        await kv.put(request.quotaKey, "1");
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
