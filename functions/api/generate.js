// Cloudflare Pages Function — POST /api/generate
// Proxies a face photo to Replicate's InstantID model (identity-preserving stylization).
// The API token lives server-side in env.REPLICATE_API_TOKEN and is never exposed to the browser.

const MODEL = "zsxkib/instant-id-ipadapter-plus-face";

// Style prompts — aesthetic described WITHOUT brand names (IP-safe).
const PROMPTS = {
  dream:
    "soft painterly anime illustration, gentle warm sunlight, flat pastel color palette, dreamy serene atmosphere, clean elegant linework, delicate features, high detail, masterpiece",
  toon:
    "3d cartoon character, soft studio lighting, rounded smooth forms, vibrant cheerful colors, friendly expressive face, clean shading, high quality render",
};
const NEGATIVE =
  "photorealistic, 3d realistic render, low quality, blurry, deformed, extra limbs, bad anatomy, watermark, text, oversaturated, harsh shadows";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function onRequestPost({ request, env }) {
  const token = env.REPLICATE_API_TOKEN;
  if (!token) {
    return json({ error: "Server not configured: missing REPLICATE_API_TOKEN." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const { image, style } = body;
  if (!image || typeof image !== "string") {
    return json({ error: "Missing 'image' (expected a data URL string)." }, 400);
  }

  const key = style === "toon" ? "toon" : "dream";
  const input = {
    image,
    prompt: PROMPTS[key],
    negative_prompt: NEGATIVE,
    width: 1024,
    height: 1024,
    num_inference_steps: 30,
    guidance_scale: 6.5,
    num_outputs: 4,
    instantid_weight: 0.85,   // keep face structure faithful to the original
    ipadapter_weight: 0.7,
    ipadapter_weight_type: "style transfer precise",
    scheduler: "ddpm",
    seed: body.seed != null ? body.seed : Math.floor(Math.random() * 1e9),
  };

  try {
    const res = await fetch(`https://api.replicate.com/v1/models/${MODEL}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    });
    if (!res.ok) {
      const txt = await res.text();
      return json({ error: "Replicate create failed: " + txt.slice(0, 400) }, 502);
    }
    const pred = await res.json();
    if (pred.status === "failed") {
      return json({ error: "Generation failed: " + (pred.error || "unknown") }, 502);
    }
    return json({ id: pred.id, status: pred.status || "starting" });
  } catch (e) {
    return json({ error: "Replicate request error: " + e.message }, 502);
  }
}
