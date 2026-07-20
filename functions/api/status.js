// Cloudflare Pages Function — GET /api/status?id=...
// Polls a Replicate prediction by id. Token stays server-side.
// Each call is a single fast GET, so it stays well within function limits while the
// actual (slow) generation runs on Replicate.

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

export async function onRequestGet({ request, env }) {
  const token = env.REPLICATE_API_TOKEN;
  if (!token) {
    return json({ error: "Server not configured: missing REPLICATE_API_TOKEN." }, 500);
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return json({ error: "Missing 'id' query parameter." }, 400);
  }

  try {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const txt = await res.text();
      return json({ error: "Replicate status failed: " + txt.slice(0, 300) }, 502);
    }
    const p = await res.json();
    return json({
      status: p.status,
      output: p.output || null,
      error: p.error || null,
    });
  } catch (e) {
    return json({ error: "Status fetch error: " + e.message }, 500);
  }
}
