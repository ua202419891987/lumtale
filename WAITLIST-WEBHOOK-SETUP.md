# LumTale Waitlist → Gmail / Google Sheet Setup Guide

> **Owner:** This file is maintained by the senior full-stack engineer agent.
> **Why this exists:** Your Cloudflare Pages API token does **not** have KV (storage) permission, so the website cannot save waitlist emails by itself. The workaround is a tiny **Google Apps Script** that acts as a free webhook — it writes every signup into a Google Sheet you own and emails you a notification. No paid services, no extra keys.

This guide walks you (a non-coder) through it in exact, copy-paste steps.

---

## 1. The Google Apps Script code (paste this exactly)

Go to **[script.google.com](https://script.google.com)** (sign in with the Google account that owns `hello@lumtale.com` or the Gmail you want signups sent to).

Create a **New project** and replace everything in the editor with this code:

```javascript
// ============ LumTale Waitlist Webhook ============
// Reads email from ?email=..., validates it, appends a row to a Sheet,
// and emails a notification to hello@lumtale.com.
// ===================================================

// The exact name of the tab inside your Google Sheet.
// Change ONLY if you rename the tab later.
var SHEET_NAME = "LumTale Waitlist";

// The address that receives the "new signup" notification.
var NOTIFY_EMAIL = "hello@lumtale.com";

function doGet(e) {
  try {
    var email = e.parameter.email;

    // Basic validation: must exist and contain an @ symbol.
    if (!email || email.indexOf('@') === -1) {
      return ContentService
        .createTextOutput(JSON.stringify({ result: 'error', message: 'invalid email' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    email = email.toString().trim();

    // Append a row: Timestamp, Email
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      // Safety: if the tab is missing, fall back to the first tab.
      sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    }
    sheet.appendRow([new Date(), email]);

    // Send a notification email to the owner.
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: "New LumTale waitlist signup",
      body: "A new person joined the LumTale waitlist:\n\n" + email + "\n\nView all signups in your Google Sheet."
    });

    return ContentService
      .createTextOutput('ok')
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Accept POST requests too (some tools POST instead of GET).
function doPost(e) {
  return doGet(e);
}
```

### Important: the Sheet must exist first
1. Open **Google Sheets** → create a new blank spreadsheet.
2. Rename the **first tab** at the bottom to exactly: `LumTale Waitlist` (matches `SHEET_NAME` above).
3. In row 1, type headers: `Timestamp` (A1) and `Email` (B1).
4. Copy the spreadsheet's URL — you'll connect it in the next step.
5. Back in the Apps Script editor, click **Project Settings** (gear icon) → under **Google Cloud Platform (GCP) Project**, it's fine to leave the default. Just make sure the script is bound to / has access to the Sheet: in the editor menu, go to **Services** is automatic. To link the Sheet, the easiest reliable method is: open your Sheet, then **Extensions → Apps Script** — this creates the script *inside* that Sheet so `SpreadsheetApp.getActiveSpreadsheet()` resolves correctly. If you created the script standalone at script.google.com, instead paste your Sheet ID, or simply create the script *from the Sheet* as just described.

> **Recommended:** Create the Apps Script **from inside the Sheet** (Sheet menu → Extensions → Apps Script). That way `SpreadsheetApp.getActiveSpreadsheet()` always points at the right file with zero configuration.

---

## 2. Deploy the webhook (exact click path)

1. In the Apps Script editor, click **Deploy** (top-right) → **New deployment**.
2. Click the gear icon next to "Select type" → choose **Web app**.
3. Fill it in exactly:
   - **Description:** `LumTale Waitlist Webhook` (anything is fine)
   - **Execute as:** **Me** (your Google account)
   - **Who has access:** **Anyone** (so the Cloudflare site can call it without login)
4. Click **Deploy**.
5. Google will ask to authorize scopes (see "Authorization" note below). Approve them.
6. After deploy succeeds, Google shows a **Web app URL** like:
   `https://script.google.com/macros/s/AKfycbXXX.../exec`
7. **COPY THAT URL** — you need it in step 3.

### Authorization note (do not skip)
The first time you Deploy, Google shows a warning "Google hasn't verified this app." Click **Advanced → Go to (unsafe)**, then **Allow**. This is normal for your own script. The two permissions requested are:
- `https://www.googleapis.com/auth/spreadsheets` (write to your Sheet)
- `https://www.googleapis.com/auth/gmail.send` (send the notification email)

Both are used only by the code above.

---

## 3. Set the URL as a Cloudflare Pages environment variable

Now tell the website where to send signups.

1. Open the **[Cloudflare Dashboard](https://dash.cloudflare.com)**.
2. Go to **Workers & Pages** → click your **lumtale** project.
3. Click **Settings** → **Functions** (or **Environment variables**, depending on layout).
4. Find **Environment variables** → **Production**.
5. Click **Add variable**:
   - **Variable name:** `WAITLIST_WEBHOOK`
   - **Value:** paste the Web app URL you copied in step 2 (the `.../exec` URL)
6. Click **Save**.

### Does it need a redeploy?
Cloudflare Pages **does require a new deployment** for environment variables to take effect in Functions. After saving:
- Go to **Deployments** → click **Retry** / **Redeploy** on the latest production deploy (no code change needed), **or**
- Simply `git push` any small change (even a one-line edit to a comment) to trigger a fresh build.

Until a new deploy happens, `WAITLIST_WEBHOOK` will be empty and the fallback in step 4 applies.

---

## 4. How the website uses it (safe fallback)

Your existing `functions/waitlist.js` (the Cloudflare Pages Function that receives the form POST) is built to:

- **Validate** the submitted email (must contain `@`).
- **If `env.WAITLIST_WEBHOOK` is set:** it forwards the email to your webhook with a `fetch` call:
  ```javascript
  fetch(env.WAITLIST_WEBHOOK + '?email=' + encodeURIComponent(email))
  ```
- **If `WAITLIST_WEBHOOK` is absent:** it only `console.log`s the email (safe fallback — the user still gets a success message, nothing breaks, you just don't capture it in the Sheet).
- **Never blocks the user:** even if the webhook call fails, the function returns `{ success: true }` and only logs the error via `console.error`.

So once you finish steps 1–3 and redeploy, every waitlist submission flows automatically into your Sheet + inbox. No code changes needed on the website side.

---

## 5. How to view your signups

Open the Google Sheet you created in step 1 (the one with the `LumTale Waitlist` tab). New rows appear automatically as people sign up: column A = timestamp, column B = email. You'll also get a Gmail notification at `hello@lumtale.com` for each new signup.

---

## Troubleshooting (quick)

| Symptom | Fix |
|---|---|
| Sheet not found error in logs | Make sure the tab is named exactly `LumTale Waitlist` (or the script falls back to the first tab). |
| "Authorization is required" | Redeploy and approve the Gmail + Sheets scopes (step 2). |
| No rows appearing | Confirm `WAITLIST_WEBHOOK` is set in Cloudflare **and** you redeployed (step 3). Test the URL directly in a browser: `https://script.google.com/macros/s/.../exec?email=test@example.com` — a row should appear. |
| "This app isn't verified" warning | Expected for your own script — click Advanced → Go to (unsafe) → Allow. |

---

*End of setup. After this, LumTale waitlist emails are captured into your Gmail + Google Sheet with no paid storage.*
