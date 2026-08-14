# Paddle Setup Guide — LumTale

This guide shows a **non‑expert** how to turn on Paddle payments for LumTale.
Paddle is great for selling digital products worldwide (including the US) because
**Paddle handles the sales tax for you** — you don't register for tax in every state
or country. You just set your prices; Paddle collects, files, and remits the tax.

You only need to do this once. Follow the steps in order.

---

## 1. Create a Paddle account

1. Go to **https://www.paddle.com/** and click **Get started** (or **Sign up**).
2. Choose the option for selling **digital products / software**.
3. Fill in your business details. Paddle is a **MERCHANT OF RECORD**, so they ask for
   your business/legal info and a payout bank account. This is normal.
4. Verify your email and complete the onboarding. It can take a little while for Paddle
   to approve a new account — that's expected.

> 💡 Tip: Use the same email you use for LumTale (e.g. `hello@lumtale.com`) so records match.

---

## 2. Get your API key and Vendor ID

1. Log in to the **Paddle Dashboard**.
2. Open **Developer Tools → Authentication** (sometimes labeled **API keys**).
3. Create / copy your **API key** (also called `vendor_auth_code`). This is a **secret** —
   never paste it into the website code or commit it to GitHub.
4. Open **Developer Tools → Public information** (or **Settings → Account**). Copy your
   **Vendor ID** (a number like `123456`).

You now have two values:
- `PADDLE_API_KEY`  → your API key
- `PADDLE_VENDOR_ID` → your Vendor ID (a number)

---

## 3. Create a Product for each of the 3 tiers

LumTale sells three portrait tiers. Create **one Product per tier** in Paddle:

1. In the Paddle Dashboard go to **Catalog → Products**, click **New product**.
2. Create these three products (one at a time):

| Tier key (used in code) | Product name (in Paddle)        | Description                          | Price (example) |
|-------------------------|----------------------------------|--------------------------------------|-----------------|
| `dream`                 | Lumling Dream                    | One premium dream-style portrait.    | $9.00 one-time  |
| `toon`                  | Lumling Toon                     | One premium toon-style portrait.     | $9.00 one-time  |
| `studio`                | Lumling Studio                   | Studio pack (multiple portraits).    | $24.00 one-time |

3. For each product, set **Billing type = Standard (one‑time)** and enter the **price in USD**.
4. After saving, open the product and copy its **Product ID**
   (looks like `pro_xxxxx` or a long number). You need one Product ID per tier.

> You can change prices later in the Dashboard whenever you want — no code changes needed.

---

## 4. Add the keys + product ids as Cloudflare Pages environment variables

The LumTale site is hosted on **Cloudflare Pages**. We keep all secrets in Cloudflare
**environment variables** (NOT in the code). The code reads them at runtime.

1. Open the **Cloudflare Dashboard** → **Workers & Pages** → your **lumtale** project.
2. Go to **Settings → Environment variables** (or **Functions → Environment variables**).
3. Add the following variables. For "scope" choose **Production** (and **Preview** too if you
   want test purchases in the preview deploy).

| Variable name              | Value                                  | Example            |
|----------------------------|----------------------------------------|--------------------|
| `PADDLE_API_KEY`           | your Paddle API key (secret)           | `pdl_xxxxx`        |
| `PADDLE_VENDOR_ID`         | your Paddle Vendor ID (number)         | `123456`           |
| `PADDLE_PRODUCT_DREAM`     | Product ID for the Dream tier          | `pro_xxxxxxx`      |
| `PADDLE_PRODUCT_TOON`      | Product ID for the Toon tier           | `pro_xxxxxxx`      |
| `PADDLE_PRODUCT_STUDIO`    | Product ID for the Studio tier         | `pro_xxxxxxx`      |

4. *(Optional)* `PADDLE_RETURN_URL` — the page customers return to after paying, e.g.
   `https://lumtale.com/pricing.html`. If you leave this out, Paddle uses its default.
5. Click **Save**. Cloudflare will rebuild the site. **No code changes are required.**

> ⚠️ Never commit the API key to Git. Env vars set here stay in Cloudflare only.

---

## 5. Wire the pricing buttons to the checkout

The function `functions/api/checkout-paddle.js` already exists. When a pricing button is
clicked, the browser should send a `POST` to `/api/checkout-paddle` with the chosen tier,
then redirect the customer to the `url` Paddle returns.

Example (plain JavaScript for a pricing button):

```html
<button id="buy-dream">Buy Lumling Dream</button>

<script>
  document.getElementById("buy-dream").addEventListener("click", async () => {
    const res = await fetch("/api/checkout-paddle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "dream" }), // dream | toon | studio
    });
    const data = await res.json();
    if (data.success && data.url) {
      window.location.href = data.url; // send customer to Paddle Checkout
    } else {
      alert(data.error || "Checkout failed. Please try again.");
    }
  });
</script>
```

That's it — clicking the button opens the secure Paddle checkout in the same tab.

---

## 6. Tax, receipts, and what happens after payment

- **Tax is automatic.** Paddle calculates the correct US state / international tax at
  checkout and shows it to the customer. You don't configure tax rules anywhere.
- **Receipts** are emailed by Paddle automatically.
- **Payouts** to your bank are handled by Paddle on their schedule.

### TODO (not yet built) — fulfillment + webhook

Right now the checkout sends the customer to Paddle. To **deliver the portrait after
payment**, you still need to:

1. Add a **Paddle webhook** (Dashboard → Developer Tools → Notifications) that listens for
   the `payment_succeeded` (classic: `subscription_payment_succeeded` / `order_processed`)
   event and points it at a future `functions/api/paddle-webhook.js`.
2. In that webhook, look up the customer's LumTale account and credit/fulfill their tier.
3. Until that webhook exists, **orders will be paid but not automatically fulfilled** —
   you would need to fulfill manually. This is a planned next step, not part of this setup.

---

## Quick checklist

- [ ] Paddle account created and approved
- [ ] `PADDLE_API_KEY` and `PADDLE_VENDOR_ID` copied
- [ ] 3 Products created (dream / toon / studio) with prices
- [ ] 5 env vars added in Cloudflare Pages (API key, vendor id, 3 product ids)
- [ ] Pricing buttons POST to `/api/checkout-paddle`
- [ ] (Later) Paddle webhook + fulfillment wired up

Need help? Email **hello@lumtale.com**.
