# LumTale — Stripe Checkout Setup (for the site owner)

This guide wires up **real payments** for LumTale using Stripe Checkout. It is written for a **non-expert owner** — follow the steps in order, copy-paste what you see, and you'll have a working "pay → redirect to Stripe → come back to lumtale.com" flow. No coding required beyond pasting one key into the Cloudflare dashboard.

The function that does the work already exists at:
`functions/api/checkout-stripe.js` (it creates a Stripe Checkout Session and returns the payment URL).

The three buy buttons on the pricing page will call that function.

---

## 1. Create a Stripe account

1. Go to **https://dashboard.stripe.com/register** and sign up.
2. Verify your email and business details (Stripe will ask for this before you can accept real money — that's normal).
3. You will land on the **Stripe Dashboard**. Keep this tab open.

> During testing you can use **Test mode** (toggle in the top-right of the Dashboard). In Test mode no real money moves. Flip it to **Live mode** only when you're ready to charge customers.

---

## 2. Get your Secret Key

1. In the Dashboard, open **Developers → API keys** (left sidebar).
2. You'll see a **Secret key** that starts with `sk_test_...` (test) or `sk_live_...` (live).
3. Click **Reveal**, then **click to copy** it.

⚠️ **Never paste this key into any file, page, or email in plain form.** It stays only in the Cloudflare environment variable (Step 4). The code reads it automatically.

---

## 3. Create the 3 Products & Prices

LumTale sells three tiers. Create each one in Stripe so you can copy its **Price ID** later:

| Tier (button) | Name in Stripe        | Type            | Price     | Notes                                  |
|---------------|-----------------------|-----------------|-----------|----------------------------------------|
| `single`      | Lumling Single        | One-time payment| **$9.00** | One premium Lumling portrait          |
| `pack`        | Lumling Pack          | One-time payment| **$24.00**| Three premium Lumling portraits       |
| `club`        | Lumling Club          | Monthly subscription | **$15.00/mo** | Membership, recurring monthly     |

To create each:

1. Dashboard → **Product catalog → + Add product**.
2. Fill in:
   - **Name**: the Name from the table above.
   - **Description**: e.g. "One premium Lumling-style portrait (Dream or Toon)."
   - **Pricing model**:
     - For `single` and `pack`: choose **One-time**. Enter `9.00` / `24.00`, currency **USD**.
     - For `club`: choose **Recurring**, **Monthly**, enter `15.00`, currency **USD**.
   - **Statement descriptor** (optional): `LumTale`.
3. Click **Save product**.
4. After saving, the product shows a **Price ID** that looks like `price_1A2b3C...`. **Copy it.**

> 💡 You do **not** have to use these Price IDs. The function can also look up a tier by name (`single` / `pack` / `club`) and build the price on the fly. Using Price IDs is cleaner if you later change prices in Stripe without touching code — your choice.

---

## 4. Set `STRIPE_SECRET_KEY` as a Cloudflare Pages env var

The code reads the key from `env.STRIPE_SECRET_KEY`. Add it in the Cloudflare Dashboard:

1. Go to **https://dash.cloudflare.com/** → your **Pages** project (**lumtale**).
2. **Settings → Environment variables** (or **Settings → Functions → Environment variables**).
3. Click **Add variable**:
   - **Variable name**: `STRIPE_SECRET_KEY`
   - **Value**: paste the secret key from Step 2.
4. Under **Environment**, choose **Production** (and **Preview** if you want test buys on preview deploys).
5. **Save**.
6. **Redeploy** the site once so the new variable is picked up:
   - **Deployments → (latest) → Redeploy**, or just push any change to GitHub.

> If the key is missing, the function returns a clean error (`missing_stripe_key`, HTTP 400) instead of crashing.

---

## 5. Wire the pricing page buttons to POST `/api/checkout-stripe`

On the pricing page (`pricing.html`), each buy button should call the function. The function expects a JSON body with either `{ "tier": "single" | "pack" | "club" }` or `{ "priceId": "price_xxx" }`.

Example button + JavaScript (drop this into `pricing.html`; adapt the `data-tier` values to match your buttons):

```html
<button class="buy-btn" data-tier="single">Buy Lumling Single — $9</button>
<button class="buy-btn" data-tier="pack">Buy Lumling Pack — $24</button>
<button class="buy-btn" data-tier="club">Join Lumling Club — $15/mo</button>

<script>
  document.querySelectorAll(".buy-btn").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      btn.disabled = true;
      btn.textContent = "Redirecting…";
      try {
        const res = await fetch("/api/checkout-stripe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier: btn.dataset.tier }),
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          throw new Error(data.message || "Could not start checkout.");
        }
        window.location.href = data.url; // send the customer to Stripe
      } catch (err) {
        alert("Payment setup failed: " + err.message);
        btn.disabled = false;
        btn.textContent = "Try again";
      }
    });
  });
</script>
```

What happens at runtime:
1. Customer clicks a button → browser POSTs `{ "tier": "single" }` to `/api/checkout-stripe`.
2. The function calls Stripe and gets back a Checkout URL.
3. The browser redirects the customer to Stripe to pay.
4. After paying (or cancelling) Stripe sends them back to `lumtale.com` (success → `/thank-you.html`, cancel → `/pricing.html`).

---

## 6. TODO — Webhook & fulfillment (not yet built)

Right now the flow **collects payment** but does **not yet deliver the portrait or mark the order complete**. To finish the loop you will need:

- A **Stripe webhook** (`checkout.session.completed`) so LumTale knows a payment succeeded.
- **Fulfillment logic** to (a) unlock/email the generated Lumling portrait, or (b) start the monthly Club render, and to handle subscription renewals/cancellations.
- Configure the webhook endpoint + signing secret (`STRIPE_WEBHOOK_SECRET`) in the Cloudflare env vars.

This is tracked as a follow-up task and is **out of scope for the current `checkout-stripe.js`**, which intentionally stops at "create session + return URL". Do not claim portraits are delivered until this step is done.

---

## Quick checklist

- [ ] Stripe account created (test mode first)
- [ ] Secret key copied (never committed to code)
- [ ] 3 Products/Prices created (single $9, pack $24, club $15/mo)
- [ ] `STRIPE_SECRET_KEY` set in Cloudflare Pages env vars + site redeployed
- [ ] Pricing buttons POST to `/api/checkout-stripe`
- [ ] Test a purchase in Stripe **Test mode**
- [ ] (Later) Webhook + fulfillment built

Questions? Email **hello@lumtale.com**.
