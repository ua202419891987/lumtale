/**
 * LumTale — Stripe Checkout Session (Cloudflare Pages Function)
 * Route: POST /api/checkout-stripe
 *
 * Creates a Stripe Checkout Session and returns { url }.
 *
 * Body (JSON), one of:
 *   { "tier": "single" | "pack" | "club" }   <- amount/name resolved server-side
 *   { "priceId": "price_xxx" }                <- use a pre-created Stripe Price
 *
 * Reads the secret key ONLY from env.STRIPE_SECRET_KEY. The key is never
 * hardcoded. Prices for the `tier` map are public amounts (USD cents), not secrets.
 *
 * Dependency-free: standard fetch + Basic auth (Base64 of `key:`).
 * Quality gate: must pass `node --check`.
 */

// Public, non-secret pricing map. Amounts are in the smallest currency unit
// (USD cents). `mode` matches the Stripe Checkout Session mode:
//   - "payment"      -> one-time charge
//   - "subscription" -> recurring monthly charge (the "club" tier)
const TIERS = {
  single: {
    name: "Lumling Single",
    description: "One premium Lumling-style portrait (Dream or Toon).",
    amount: 900, // $9.00 one-time
    mode: "payment",
  },
  pack: {
    name: "Lumling Pack",
    description: "Three premium Lumling-style portraits to keep and share.",
    amount: 2400, // $24.00 one-time
    mode: "payment",
  },
  club: {
    name: "Lumling Club",
    description: "Monthly membership: fresh Lumling renders + early styles.",
    amount: 1500, // $15.00 / month
    mode: "subscription",
  },
};

const CURRENCY = "usd";
const SITE = "https://lumtale.com";

/**
 * Build the Stripe Checkout Session request body (form-encoded).
 * @param {{tier?: string, priceId?: string}} input
 * @returns {URLSearchParams}
 */
function buildSessionBody(input) {
  const params = new URLSearchParams();

  // Where Stripe sends the customer after paying / after cancelling.
  params.set("success_url", `${SITE}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${SITE}/pricing.html`);

  if (input.priceId) {
    // Pre-created Price in the Stripe Dashboard — use it directly.
    const tierMode = TIERS.club.mode; // club is the only subscription tier
    params.set("mode", tierMode);
    params.append("line_items[0][price]", input.priceId);
    params.append("line_items[0][quantity]", "1");
    return params;
  }

  const tier = TIERS[input.tier];
  params.set("mode", tier.mode);

  if (tier.mode === "subscription") {
    params.append("line_items[0][price_data][currency]", CURRENCY);
    params.append("line_items[0][price_data][unit_amount]", String(tier.amount));
    params.append("line_items[0][price_data][recurring][interval]", "month");
    params.append("line_items[0][price_data][product_data][name]", tier.name);
    params.append("line_items[0][price_data][product_data][description]", tier.description);
  } else {
    params.append("line_items[0][price_data][currency]", CURRENCY);
    params.append("line_items[0][price_data][unit_amount]", String(tier.amount));
    params.append("line_items[0][price_data][product_data][name]", tier.name);
    params.append("line_items[0][price_data][product_data][description]", tier.description);
  }
  params.append("line_items[0][quantity]", "1");

  return params;
}

/**
 * Cloudflare Pages Function entrypoint.
 * @param {{ request: Request, env: Record<string, string> }} context
 */
export async function onRequestPost({ request, env }) {
  // 1. Secret key is REQUIRED and must come from the environment.
  const secretKey = env && env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response(
      JSON.stringify({
        error: "missing_stripe_key",
        message: "STRIPE_SECRET_KEY is not configured in this environment.",
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // 2. Parse the request body.
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "invalid_json", message: "Request body must be valid JSON." }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const tier = typeof body.tier === "string" ? body.tier.trim().toLowerCase() : undefined;
  const priceId = typeof body.priceId === "string" ? body.priceId.trim() : undefined;

  if (!tier && !priceId) {
    return new Response(
      JSON.stringify({
        error: "missing_parameter",
        message: "Provide a 'tier' (single|pack|club) or a 'priceId'.",
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  if (tier && !TIERS[tier]) {
    return new Response(
      JSON.stringify({
        error: "unknown_tier",
        message: `Unknown tier '${tier}'. Valid tiers: single, pack, club.`,
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  // 3. Build and send the Stripe request.
  const sessionBody = buildSessionBody({ tier, priceId });

  let stripeRes;
  try {
    stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: "Basic " + btoa(secretKey + ":"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: sessionBody.toString(),
    });
  } catch (e) {
    return new Response(
      JSON.stringify({
        error: "stripe_unreachable",
        message: "Could not reach Stripe. Please try again later.",
      }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  let session;
  try {
    session = await stripeRes.json();
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "stripe_bad_response", message: "Invalid response from Stripe." }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  if (!stripeRes.ok || !session.url) {
    return new Response(
      JSON.stringify({
        error: "stripe_error",
        message: session && session.error && session.error.message
          ? session.error.message
          : "Stripe returned an error creating the checkout session.",
      }),
      { status: 502, headers: { "content-type": "application/json" } }
    );
  }

  // 4. Success — hand the Checkout URL back to the browser.
  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
