# LumTale — US TikTok Growth Strategy

> Owner: Growth / Marketing (P2). Audience: solo founder running LumTale.
> Brand guardrails (from AGENT-BRIEF): **LumTale** = the product/site. **Lumling** = the art style
> (Lumling Dream, Lumling Toon, Lumling Studio). Never swap the two.
> Core promise: *Fair AI portraits that look like you* — no whitening, no warping, identity-preserving,
> honest about where your photo goes.
> Site: lumtale.com · Contact: hello@lumtale.com
> Current state: Door 1 = privacy promise page (no upload, local demo). Door 2 = Lumling Studio, live now
> (cloud render via Replicate, identity-preserving). Waitlist form live on the homepage. Payments not yet
> enabled — UI shows "Coming soon," so "Door 2 conversions" below = completed portrait renders, not revenue.

---

## 1. Goal & KPIs (90-day targets)

**North-star goal:** Build a privacy- and fairness-led audience on US TikTok that converts into waitlist
signups and Door 2 portrait creations, positioning LumTale as the anti-whitening alternative to mainstream
AI avatar apps.

### 90-day rough targets (solo founder, ~$0–$300 ad budget)

| KPI | Day 30 | Day 60 | Day 90 |
|---|---|---|---|
| TikTok followers | 1,500 | 5,000 | 10,000 |
| Waitlist signups (lumtale.com) | 800 | 2,500 | 5,000 |
| Door 2 completed portraits | 150 | 500 | 1,000 |
| Bio-link click-through rate | 2% | 3.5% | 5% |
|_avg views per post_ | 2,000 | 6,000 | 12,000 |

**How we count:**
- Followers = TikTok native analytics.
- Waitlist signups = homepage `/waitlist` submissions (currently logged; wire `WAITLIST_WEBHOOK` to a
  sheet/CRM so you can segment by source — e.g. add `?utm_source=tiktok` to the bio link).
- Door 2 conversions = successful `/api/generate` + `/api/status` "succeeded" events in Pages Functions logs.
- Bio-link CTR = link-in-bio clicks ÷ profile views (track with a UTM-tagged link to lumtale.com).

**Weekly founder dashboard (5 mins, every Monday):** followers delta, new waitlist emails, Door 2 renders,
top 3 videos by view-rate, and one sentence on what to repeat.

---

## 2. Target Audience (US, 18–34)

Lead with **fairness + privacy + identity**, not "cute filters." The wedge is people who feel misrepresented
by mainstream AI avatar apps.

1. **Privacy-conscious consumers (broad)** — worried about where selfies go, model training, biometric data.
   They like that Door 1 needs no upload and Door 2 is honest about the GPU partner.
2. **Identity-representation-minded users** — people who are tired of AI "standardizing" faces and want tech
   that respects who they are. Our strongest emotional hook.
3. **Anime / Ghibli / illustration fans** — already searching #gidle, #aiavatar, #aifilter for stylized PFPs.
   Lumling's warm, collectible-toy look is a natural fit; we just promise it won't reshape them.
4. **POC creators who hate face-whitening apps** — Black, Latino, Asian, mixed creators burned by apps that
   lighten/narrow their features. This is our loudest, most shareable segment and our moral core.

**Message-to-segment mapping:**
- Privacy crowd → "Your photo never has to leave your device. Meet Door 1."
- Representation crowd → "Your face stays your face. No whitening, no warping — ever."
- Anime/Ghibli crowd → "A Ghibli-feel portrait that still looks like *you*."
- POC creators → stitch/duet whitening apps and show the Lumling result side by side.

---

## 3. Content Pillars

Four repeatable pillars. Aim for a ~40/30/15/15 mix across a month.

### Pillar A — Fair-AI Education (40%)
Call out the industry problem and our refusal. This is the differentiator and the shareability engine.
- "Why every AI avatar app quietly whitens your face (and we don't)"
- "POV: you upload a selfie and the app gives you a whiter, narrower version of you"
- "What 'identity-preserving' actually means — demo with a real before/after"
- Stitch/duet of a whitening app, then cut to the Lumling result.

### Pillar B — Satisfying Before/After Renders (30%)
Pure dopamine. Show a plain selfie → Lumling Dream / Lumling Toon.
- Trending audio + smooth zoom on the render.
- "Turn your photo into a Lumling portrait (no filter that changes your face)"
- Show 2–3 style options in one clip; end on the download screen.

### Pillar C — Behind-the-Style Lumling (15%)
Make the style a character/brand people follow.
- "Lumling isn't a copy of any artist — it's a style we built for LumTale"
- "Lumling Dream vs Lumling Toon — which is you?"
- "Collectible-toy energy: why Lumling feels like a figure, not a filter"

### Pillar D — Privacy / Local Demo (15%)
Use Door 1 as proof, not just a claim.
- Screen-record scrolling lumtale.com/door1.html: "Read our promise — no photo needed."
- "Most apps won't tell you where your selfie goes. We put it on the page."
- "Local demo = your face never leaves the device. Here's the proof."

---

## 4. Posting Cadence, Best Times & Hook Formulas

**Cadence:** minimum **5 posts/week** (e.g. Mon, Tue, Thu, Fri, Sat). Add 1–2 bonus posts when a video is
clearly taking off (ride the algorithm within 48h). Reply to every comment in the first 60 minutes — early
engagement is the single biggest reach lever for a small account.

**Best US posting windows** (account set to Eastern Time; these are US engagement peaks, adjust after 2 weeks
of your own analytics):
- Tue–Thu: **11:00–13:00 ET** and **18:00–21:00 ET**
- Fri–Sat: **12:00–15:00 ET** and **19:00–22:00 ET**
- Sun: **10:00–12:00 ET** (lighter posting)
- Avoid mass-posting 00:00–06:00 ET (low US engagement).

**Hook formulas** (first 1–2 seconds decide everything — put the hook in text-on-screen AND spoken):
1. **Contrarian:** "Stop using AI avatar apps that whiten your face. Here's what fair AI looks like."
2. **POV/relatable:** "POV: you finally find an AI portrait that looks like YOU and not a lighter version."
3. **Curiosity gap:** "This app tells you exactly where your selfie goes. Most won't."
4. **Result-first:** "Plain selfie → Lumling portrait. No face surgery, just style."
5. **Identity claim:** "Your skin tone is not a bug. We don't 'fix' it."
6. **Demo proof:** "No upload. No account. Just our promise. (watch)"
7. **Trend hijack:** take a viral audio, but the visual is always a fair before/after or the Door 1 page.

**Caption rule:** one short line + the CTA + 3–5 hashtags. Never write a paragraph. Example:
*"Your face stays your face. Try Lumling 🤍 Link in bio. #fairai #lumling #noWhitening"*

---

## 5. Hashtag Sets

Rotate sets per post (never reuse the exact same block — TikTok flags spammy repetition). Mix 1–2 broad
reach tags with 3–4 niche tags. Keep total to 5–8.

**Broad (high volume, use 1–2 max):**
- `#aiavatar`
- `#aifilter`
- `#gidle` (Ghibli/animation interest)
- `#aiart`
- `#avatar`

**Niche / brand (use 3–5):**
- `#fairai`
- `#noWhitening`
- `#noFaceWhitening`
- `#identitypreserving`
- `#lumling`
- `#privacymatters`
- `#privateai`
- `#aiportrait`
- `#ai ProfilePicture` → use `#aipfp` (no spaces in hashtags)
- `#blackcreator` / `#asiancreator` / `#latinocreator` (segment-specific, only when the video targets that group)

**Three ready-made rotations:**
- *Education:* `#fairai #noWhitening #aifilter #lumling #privacymatters`
- *Render porn (satisfying):* `#aiavatar #gidle #lumling #aipfp #aiart`
- *Privacy/local:* `#privateai #noFaceWhitening #identitypreserving #lumling #aiportrait`

---

## 6. Funnel: TikTok → lumtale.com (Waitlist / Door 2)

**Bio line (keep ≤ 80 chars):**
`Fair AI portraits that look like you 👇 No whitening, ever.`

**Bio link:** use a single link with UTM, e.g.
`https://lumtale.com/?utm_source=tiktok&utm_medium=bio`
(If you later add a link-in-bio tool, keep lumtale.com as the primary; don't bury it under 6 links.)

**Two paths from the link:**
1. **Waitlist** (top priority for cold traffic): homepage hero + "Join the waitlist" form. This is the
   lowest-friction ask and builds your owned audience for launch/pricing.
2. **Door 2 (Lumling Studio):** for viewers ready to *try now* — `/door2.html` live render. Great for
   proof and word-of-mouth; currently free while payments are "Coming soon."

**Using the local Door 1 demo as a trust differentiator in video:**
- Screen-record `lumtale.com/door1.html` and say: *"Before you upload anything, we show you exactly what we
  do and don't do. No photo required — that's the promise."*
- Contrast cut: a competitor's "we need your selfie + card" vs LumTale's "read our promise, zero upload."
- Put the Door 1 URL in a pinned comment occasionally: *"See our no-upload promise 👉 lumtale.com/door1"*
- This is a differentiator no big avatar app can easily copy — lean on it whenever trust is the objection.

**On-video CTA pattern:** hook → value → *"Link in bio to try Lumling or join the waitlist."* Say it out loud
AND show it as text in the last 2 seconds.

---

## 7. Five Low-Budget Growth Tactics

1. **Creator collabs (micro-influencers, $0–$150 each).**
   Target US creators 5k–50k followers in: privacy-tech, Black/Latino/Asian creator, anime/art, and
   "honest app reviews." Offer: free Lumling portraits + $50–$150 for a dedicated video, OR a revenue share
   once payments launch. Always require FTC disclosure (see §8). Brief them with one line: *"Show your real
   before/after and say we don't whiten your face."*

2. **Stitch / Duet the whitening apps.**
   Find viral clips of people shocked their avatar got lightened/narrowed. Stitch with: *"This is why we
   built LumTale."* then show your fair result. Zero production cost, high outrage-share potential. Keep it
   about the *pattern*, not attacking a person.

3. **UGC reposts (free).**
   When a viewer posts their Lumling portrait, ask permission and repost to the LumTale account with credit
   + their handle. Create a lightweight sound/DP challenge: *"Show your Lumling, keep your face."* Reposts
   signal social proof and fill your calendar for free.

4. **Pinned comment with the link + a question.**
   On every post, pin: *"Try Lumling or join the waitlist 👉 link in bio. What style are you — Dream or Toon?"*
   The question drives comments (reach) and the link drives the funnel. Rotate the question weekly.

5. **Small Spark Ads test ($50–$300 total).**
   Once a video hits ~5k organic views with >8% view-rate, put $20–$50 Spark Ads behind it (boost, not
   create-new — Spark uses your native post so it keeps social proof). Start with 2–3 winners, kill anything
   above $0.30 per profile-visit. Goal: cheap waitlist emails, not vanity views.

---

## 8. Risks & Compliance Notes

- **TikTok US uncertainty:** ownership/policy changes in the US market could affect reach or the app itself.
  Mitigation: never rely on TikTok as the only channel — push every viewer to the **waitlist** (owned email)
  and cross-post short versions to Instagram Reels / YouTube Shorts. Email is the asset you control.
- **FTC disclosure for paid collabs:** any creator you pay (cash, free product, future rev-share) MUST use a
  clear disclosure — `#ad`, "#paidpartner", or "Paid partnership with LumTale" label. Put it in the caption,
  not just a hidden tag. Keep a simple log: creator, date, compensation, disclosure used.
- **No medical or celebrity claims:** do NOT say Lumling "fixes," "heals," "beautifies," or implies health
  benefits. Do NOT imply affiliation with, or impersonation of, any celebrity, artist, or brand (Lumling is
  explicitly *not* a copy of any existing artist — say so). Avoid "Ghibli" as a literal claim; use
  "Ghibli-feel" / "illustration-style" phrasing to avoid trademark friction.
- **Privacy claims must stay true:** only say "never stored/trained on" because the product honors it
  (Door 2 sends to a vetted GPU partner, processed on demand, not kept for training). Don't overstate Door 1
  as a "generator" — it's the promise/local demo page; real renders happen in Door 2.
- **Payments not live:** don't advertise prices or "buy now." Use "Join the waitlist for early-access pricing"
  and "Coming soon" language only, matching the site's current state.
- **Children / age:** target 18–34; don't aim content at minors and don't collect known-minor emails.
- **Music rights:** use TikTok's commercial-safe / "For Business" sounds or original audio to avoid takedowns
  on a brand account.
- **Community moderation:** racist/white-supremacist pushback on fairness posts is likely — have a calm,
  pre-written reply ("We just don't reshape faces — your features stay yours") and don't argue in threads.

---

### Solo-founder weekly checklist
- [ ] 5 posts published at the windows above.
- [ ] Every comment replied to within 60 min of posting.
- [ ] 1 stitch/duet of a whitening app or competitor clip.
- [ ] 1 creator outreach message sent (collab tactic #1).
- [ ] Pinned comment + link live on all new posts.
- [ ] Monday: update the 5-metric dashboard; double down on the week's best hook.
- [ ] Watch for a video >5k views / >8% view-rate → queue a $20–$50 Spark test.
