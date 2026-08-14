// Cloudflare Pages Function — GET /api/status?id=...
// Polls a Replicate prediction by id. Token stays server-side.
//
// NOTE: REPLICATE_API_TOKEN is a Cloudflare Pages environment variable
// (set in Dashboard → Pages → your project → Settings → Environment variables,
// scoped to "Production" and/or "Preview"). It is injected at runtime as
// `env.REPLICATE_API_TOKEN` and must NEVER be exposed to the browser.
//
// Each call is a single fast GET, so it stays well within function limits while the
// actual (slow) generation runs on Replicate.

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...CORS_HEADERS,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestGet({ request, env }) {
  const token = env.REPLICATE_API_TOKEN;
  if (!token) {
    return json(
      { success: false, status: "error", message: "Server not configured: missing REPLICATE_API_TOKEN." },
      500
    );
  }

  // (1) Validate the `id` param — reject empty / non-string with 400.
  const id = new URL(request.url).searchParams.get("id");
  if (typeof id !== "string" || id.trim() === "") {
    return json(
      { success: false, status: "error", message: "Missing or invalid 'id' query parameter." },
      400
    );
  }

  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    // (3) On upstream non-200, return a friendly error (no raw upstream text leaked).
    if (!res.ok) {
      let detail = "";
      try {
        const err = await res.json();
        detail = err?.detail ? ` (${err.detail})` : "";
      } catch (_) {
        /* ignore non-JSON upstream error bodies */
      }
      return json(
        {
          success: false,
          status: "error",
          message: `Could not reach the rendering service right now. Please try again in a moment.${detail}`,
        },
        502
      );
    }

    const p = await res.json();
    const status = p.status;

    // (2) Handle Replicate terminal / in-progress states explicitly.
    if (status === "succeeded") {
      // Output may be a string URL or an array of URLs depending on the model.
      let images = [];
      if (Array.isArray(p.output)) {
        images = p.output;
      } else if (typeof p.output === "string") {
        images = [p.output];
      } else if (p.output && typeof p.output === "object") {
        // Some models nest output under keys like { "image": [...] } or { "images": [...] }
        images = p.output.images || p.output.image || [];
        if (typeof images === "string") images = [images];
      }
      return json({ success: true, status: "done", images });
    }

    if (status === "failed" || status === "canceled") {
      return json(
        { success: false, status: "failed", message: "Render failed" },
        200
      );
    }

    if (status === "starting" || status === "processing") {
      return json({ success: true, status: "processing" });
    }

    // Unknown status — surface it safely without crashing the client.
    return json({ success: true, status: status || "processing" });
  } catch (e) {
    return json(
      { success: false, status: "error", message: "Something went wrong while checking your render. Please try again." },
      500
    );
  }
}
