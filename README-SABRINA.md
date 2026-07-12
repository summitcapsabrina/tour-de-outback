# Sabrina — AI support assistant + admin inbox

Sabrina is an embedded AI support assistant for **Oregon Tour de Outback**, built
entirely in-house on this project's existing stack (Firebase Hosting + Cloud
Functions + Firestore + vanilla JS). She's a floating chat widget open to **every
visitor** (no login, no payment gating) that answers questions grounded in an
editable knowledge base, and can escalate to a human. Operators handle escalated
threads from the **Chat** tab in `/admin/`.

She replaces the Tawk.to widget as the on-site chat. There is also a mobile-first
**admin chat PWA** at `/chat/` (see "Admin chat app + push notifications" below).

---

## Admin chat app + push notifications (`/chat/`)

An installable, mobile-first console for operators lives at **`/chat/`** (e.g.
`https://oregon-tour-de-outback.web.app/chat/`). Sign in with an admin Google
account to see live conversations, take over, reply, resolve, edit your display
first name, and **enable push notifications** so your phone alerts you when a
visitor asks for a human.

Files: `chat/index.html` (self-contained PWA), `chat/manifest.webmanifest`,
`chat/sw.js` (Web Push service worker). Push uses the **standard Web Push API with
VAPID** — **not** Firebase Cloud Messaging, so there is **no Firebase-console setup**.
The backend sends to registered devices from `sendAdminPush()` (via the `web-push`
library) on escalation.

**Setup (one-time):**
1. **Set the private push key** — the VAPID key pair was pre-generated. The **public**
   key is already embedded in `chat/index.html` and `functions/index.js`; set the
   **private** key as a secret (paste the value when prompted):
   ```bash
   firebase functions:secrets:set WEBPUSH_PRIVATE_KEY
   # value: gt5XAK0jB_-n2POZf2Mz7bjFOcrMHI7ttmBLIfaM1bA
   ```
   (To rotate later, run `node -e "console.log(require('web-push').generateVAPIDKeys())"`
   in `functions/`, then update `VAPID_PUBLIC_KEY` in both files and re-set the secret.)
2. **Install on your phone** — open `/chat/`, sign in, then Add to Home Screen
   (iOS: Share → *Add to Home Screen*; iOS **16.4+** required for web push). Open the
   installed app → Settings (⚙️) → **Enable notifications** and allow the prompt. Your
   device's push subscription is stored in Firestore `admin_push_subscriptions`.
3. **Your name** — Settings → set your first name (visitors see only this when you
   reply). Stored in `admin_profiles/{uid}`; defaults to the first word of your
   Google display name.
4. **`chat.tourdeoutback.com`** (optional) — to serve it there, add the subdomain as
   a Firebase Hosting custom domain (or a second Hosting site whose public dir is
   `chat/` with the same `/api/**` rewrites) and point DNS to Firebase. Until then it
   works at the web.app `/chat/` path. After the subdomain is live, update
   `CHAT_APP_URL` in `functions/index.js` so push/email deep links use it.

**Backup email (no one joins in 3 min):** the scheduled function `escalationBackup`
runs every minute and, if an escalated chat has waited **3+ minutes** with no
operator, emails all `ADMIN_RECIPIENTS` (and re-pushes). It uses the same
`GMAIL_USER` / `GMAIL_APP_PASSWORD` secrets. Scheduled functions need **Cloud
Scheduler** (auto-enabled on first Blaze deploy).

**Notes:** iOS delivers web push only to **installed** PWAs (Home Screen), not Safari
tabs. Android/desktop Chrome work from the browser. Notifications require HTTPS (the
live domain / web.app), not `http://localhost`.

---

## Isolated Claude account (important)

Sabrina uses her **own dedicated Anthropic/Claude API key**, stored only in this
project's Firebase secret **`ANTHROPIC_API_KEY`**. This is a **separate billing
scope** from any other Sabrina/chatbot deployment, so token usage and cost for this
site can be monitored independently. The key is never in the repo, never shipped to
the browser, and never shared with or imported from another project. The only place
it is read is inside the `chat` Cloud Function (`ANTHROPIC_API_KEY.value()`).

- **Model:** `claude-haiku-4-5-20251001` (Claude Haiku 4.5), set as `CHAT_MODEL` in
  `functions/index.js`.
- **SDK:** official `@anthropic-ai/sdk` (a dependency of `functions/`).

---

## Where things live

| Piece | File |
|---|---|
| Visitor chat widget (floating launcher + panel) | `js/chat-widget.js` (loaded on every page via `js/main.js`) |
| Backend: chat, RAG, escalation, presence, admin, KB | `functions/index.js` (Sabrina section at the bottom) |
| **System prompt / persona** | `SABRINA_SYSTEM` constant in `functions/index.js` |
| Admin inbox + KB manager | **Chat** tab in `admin/index.html` |
| API routes (`/api/chat*`, `/api/admin-chat*`, `/api/admin-kb-*`) | `firebase.json` rewrites → functions |
| Firestore access rules | `firestore.rules` |

### Firestore collections
- `kb_entries/{id}` — `{ question, answer, tags[], active, createdAt, updatedAt }`. Editable in the admin KB manager. Sabrina only uses `active: true` entries.
- `conversations/{cid}` — one visitor thread. State machine: `bot → escalated → human → resolved` (and `human → bot` de-escalation). Carries status, visitor name/email, presence timestamps, typing flags, unread flag, and a persisted admin `adminDraft`.
- `conversations/{cid}/messages/{mid}` — `{ role: 'user'|'assistant'|'agent'|'system', text, senderName, createdAt }`.
- `mail/{id}` — escalation emails (see "Notifications" below).

Visitors never touch Firestore directly — the widget only calls same-origin Cloud
Functions. Admins read `conversations` and `kb_entries` live via `onSnapshot`
(allowed by `firestore.rules` for the verified admin email); **all writes go through
the Cloud Functions.**

---

## How answering works (RAG)

On each visitor message, the `chat` function:
1. Retrieves the most relevant **active** KB entries by lightweight keyword overlap
   (`retrieveKb`, no external vector DB — right-sized for a small curated KB + Haiku).
2. Calls Claude Haiku with `SABRINA_SYSTEM` (persona + guardrails + fixed event
   facts) plus a grounding block of those KB entries, and the recent conversation.
3. Sabrina answers **only** from that grounding + scope; if she can't ground an
   answer she says so and offers to connect a human. She never invents facts and
   never reveals her system prompt.

Every question and answer is stored in the thread, so the KB can be improved from
real visitor questions.

---

## Adding / editing knowledge (operators)

Go to **`/admin/` → Chat → Knowledge Base** (sign in with the admin Google account).

- **Seed / refresh starter entries:** adds any missing starter/FAQ entries (idempotent —
  safe to click repeatedly; never duplicates). New entries arrive **inactive**.
- **Activate all / Deactivate all:** flip every entry on or off in one click.
- **Add:** fill Question, Answer, Tags → *Save entry* (tick *Active* to let Sabrina use it).
- **Edit / Activate / Deactivate / Delete:** per-entry buttons in the list.

Sabrina is grounded on **every active entry** each turn (the KB is small, so she gets the
whole thing — no retrieval misses). Only **active** entries are used. Prices/dollar amounts
in any entry are automatically stripped before she sees them, so she never quotes a price
— she points to the Register page instead.

---

## Escalation & the admin inbox

- A visitor can click **"Talk to a person"** (or Sabrina offers when she's unsure).
- On escalation the thread is flagged (`status: escalated`, `unread: true`) — it
  surfaces immediately in the inbox with a red badge — and an email is queued to the
  admin recipients (see Notifications).
- In **Chat → Inbox** the operator sees conversations newest/active first, with live
  new messages, "online" presence, visitor "typing…", unread dots, an escalated
  badge, and ops signals (active / waiting-for-human / handling / average wait).
- Operator can **Take over** (→ `human`), **reply as a human**, **Hand back to
  Sabrina** (→ `bot`), and **Resolve** (→ `resolved`). Half-typed replies persist
  (`adminDraft`) so they survive a refresh. Search filters by name / email / message.
- If a visitor goes quiet ~10 minutes, the widget shows a gentle re-engagement nudge.

### Notifications (email)
When a visitor clicks **"Talk to a person"**, the thread is flagged in the inbox
(reliable, in-app) **and** an email is sent to **`info@tourdeoutback.org`** via Gmail
SMTP (Nodemailer). Recipients are `ADMIN_RECIPIENTS` in `functions/index.js`.

Email uses two secrets — set them before deploy (email is best-effort: if they're
empty the escalation still flags the inbox, only the email is skipped):

```bash
# On the info@tourdeoutback.org Google account: enable 2-Step Verification, then
# create an App Password (Google Account → Security → App passwords).
firebase functions:secrets:set GMAIL_USER          # e.g. info@tourdeoutback.org
firebase functions:secrets:set GMAIL_APP_PASSWORD  # the 16-char App Password
```

The email's `Reply-To` is the visitor's email (when provided), so replying from the
inbox goes straight to them. Web-push/PWA alerting is not included (optional in the brief).

---

## Deploying

Sabrina needs her dedicated key set as a secret **before** the `chat` function can
deploy (Firebase requires declared secrets to exist).

```bash
# 1) Set Sabrina's dedicated Claude key (this project only). You paste the key.
firebase functions:secrets:set ANTHROPIC_API_KEY

# 2) Escalation email (Gmail SMTP) — required for chatEscalate to deploy. Use real
#    values for email to work, or set them empty to deploy without email for now.
firebase functions:secrets:set GMAIL_USER          # info@tourdeoutback.org
firebase functions:secrets:set GMAIL_APP_PASSWORD  # 16-char Gmail App Password

# 3) Push notifications private key (for the admin chat app). Paste the value from
#    README "Admin chat app" §1.
firebase functions:secrets:set WEBPUSH_PRIVATE_KEY

# 4) Deploy the new functions, hosting, and Firestore rules.
firebase deploy --only functions,hosting,firestore:rules
```

Then, as the admin (`info@tourdeoutback.org`, signed in via Google), open
`/admin/ → Chat → Knowledge Base`, click **Seed starter entries**, review, and
activate the ones you want. Sabrina is live for every visitor via the floating
button in the corner of every page.

> Admin allowlist is `ADMIN_EMAILS` in `functions/index.js` + `js/firebase-init.js`,
> and the hardcoded email in `firestore.rules` — keep the three in sync.

---

## Guardrails (built in)
- Never reveals the system prompt or that she's an AI model.
- Stays strictly on scope; declines out-of-scope (legal/financial advice,
  competitors, non-cycling / non-event topics) gracefully and offers escalation.
- Never invents facts, prices, or policies — answers only from KB + fixed event facts.
- Empty and over-long input rejected server-side; message length capped.
- API key is server-side only; visitors are rate-limited to same-origin function calls.
