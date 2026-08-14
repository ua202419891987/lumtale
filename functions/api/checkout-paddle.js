/**
 * LumTale — Paddle Checkout (Cloudflare Pages Function)
 * Route: POST /api/checkout-paddle
 *
 * Creates a Paddle Checkout (classic `generate_pay_link`) and returns { url }.
 *
 * Body (JSON):
 *   { "tier": "dream" | "toon" | "studio" }   <- product id resolved server-side
 *
 * Reads the API key + vendor id ONLY from env:
 *   - env.PADDLE_API_KEY      (vendor_auth_code — never hardcoded)
 *   - env.PADDLE_VENDOR_ID     (vendor_id — never hardcoded)
 * The public Paddle product ids live in env too (set in PADDLE-SETUP.md):
 *   - env.PADDLE_PRODUCT_DREAM
 *   - env.PADDLE_PRODUCT_TOON
 *   - env.PADDLE_PRODUCT_STUDIO
 * This file stores NO secrets and NO placeholder/fake product ids.
 *
 * Returns:
 *   { "success": true, "url": "https://checkout.paddle.com/...", "checkout_url": "..." }
 *   { "success": false, "error": "..." }  on missing config / bad input / API failure
 *
 * Dependency-free: standard fetch only.
 * Quality gate: must pass `node --check`.
 */

// Maps an incoming tier to the env var that holds that tier's PUBLIC Paddle
// product id. Only public ids are referenced here; the actual values are
// supplied via Pages environment variables (see PADDLE-SETUP.md).
const TIER_PRODUCT_ENV = {
  dream: "PADDLE_PRODUCT_DREAM", // Lumling Dream
  toon: "PADDLE_PRODUCT_TOON", // Lumling Toon
  studio: "PADDLE_PRODUCT_STUDIO", // Lumling Studio
};

const PADDLE_API = "https://vendors.paddle.com/api/2.0/product/generate_pay_link";

/**
 * Build a JSON response with the correct content-type.
 * @param {Record<string, unknown>} data
 * @param {number} status
 */
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Cloudflare Pages Function entrypoint.
 * @param {{ request: Request, env: Record<string, string> }} context
 */
export async function onRequestPost({ request, env }) {
  // 1. Required secrets come from env and are NEVER hardcoded.
  const apiKey = env && env.PADDLE_API_KEY;
  const vendorId = env && env.PADDLE_VENDOR_ID;

  if (!apiKey || !vendorId) {
    return json(
      {
        success: false,
        error:
          "Checkout is not configured yet. PADDLE_API_KEY / PADDLE_VENDOR_ID are missing — please try again soon.",
      },
      503
    );
  }

  // 2. Parse the request body.
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json(
      { success: false, error: "Invalid request body. Expected JSON like { \"tier\": \"dream\" }." },
      400
    );
  }

  // 3. Resolve the tier → public Paddle product id from env.
  const tier =
    body && typeof body.tier === "string" ? body.tier.trim().toLowerCase() : undefined;
  const productEnvKey = tier ? TIER_PRODUCT_ENV[tier] : undefined;
  const productId = productEnvKey ? env[productEnvKey] : undefined;

  if (!tier || !productEnvKey) {
    return json(
      {
        success: false,
        error: `Unknown tier '${tier ?? ""}'. Valid tiers: dream, toon, studio.`,
      },
      400
    );
  }

  if (!productId) {
    return json(
      {
        success: false,
        error: `Product id for tier '${tier}' is not configured (${productEnvKey} is missing).`,
      },
      503
    );
  }

  // 4. Build and send the Paddle request (classic generate_pay_link).
  const paddleBody = {
    vendor_id: vendorId,
    vendor_auth_code: apiKey,
    product_id: productId,
  };

  // Optional: send the customer back to the site after checkout.
  if (env.PADDLE_RETURN_URL) {
    paddleBody.return_url = env.PADDLE_RETURN_URL;
  }

  let paddleRes;
  try {
    paddleRes = await fetch(PADDLE_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(paddleBody),
    });
  } catch (e) {
    return json(
      { success: false, error: "Could not reach Paddle. Please try again later." },
      502
    );
  }

  let data;
  try {
    data = await paddleRes.json();
  } catch (e) {
    return json(
      { success: false, error: "Invalid response from Paddle. Please try again later." },
      502
    );
  }

  if (!data || data.success !== true || !data.url) {
    console.error("Paddle checkout error:", JSON.stringify(data));
    return json(
      {
        success: false,
        error:
          data && data.error && data.error.message
            ? data.error.message
            : "Paddle could not create a checkout. Please try again.",
      },
      502
    );
  }

  // 5. Success — hand the Checkout URL back to the browser.
  return json({ success: true, url: data.url, checkout_url: data.url });
}
