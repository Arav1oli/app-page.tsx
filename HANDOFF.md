# Marex 440 Online Quoting Tool — Project Handoff

> **Audience:** Incoming AI agent (or human dev) on a different account picking up where this branch left off.
> **From:** Claude Code agent working with Mel C Lawson (melclawson5@gmail.com) at Flagship International Yacht Brokers.
> **Date:** 2026-05-07.
> **Branch:** `claude/read-mel-email-RhjOZ` (push here, do not merge to main without sign-off).

---

## 1. TL;DR — Current State

A working **wireframe** of an online configurator + quoting tool for the Marex 440 yacht (Flagship is the AU distributor for Marex). It's a single self-contained HTML page at `public/tools/marex-440-quote.html` plus a `/fleet` Next.js dashboard hub that links to it. Programmatic Gmail send is wired (NextAuth + Google OAuth + `/api/quote/send`) but **not active until OAuth credentials are pasted into env**. mailto: is the working fallback today.

**Live preview:** https://htmlpreview.github.io/?https://raw.githubusercontent.com/Arav1oli/app-page.tsx/claude/read-mel-email-RhjOZ/public/tools/marex-440-quote.html

**Target:** Sanctuary Cove International Boat Show (SCIBS). MVP only — broker/internal use. Public-facing version is phase 2.

**Status:** Awaiting Steve Williams' (Marex Brand Manager) sign-off on 8 open questions — see §7.

---

## 2. Stakeholders

| Person | Role | Email | Notes |
|---|---|---|---|
| **Mel C Lawson** ("Emmy") | QA / Product owner of this build | melclawson5@gmail.com | Currently signed in to all MCPs (Gmail, Drive, etc.). Working from phone. |
| **Steve Williams** | Marex Brand Manager + Luxury Yacht Broker | steve@flagshipinternational.com.au | Spec author. Has not yet reviewed wireframe. Email draft waiting in Mel's Drafts. |
| **Adrian Ravasio** | Director / lead dev contact | adrian@flagshipinternational.com.au | Forwarded the original spec from Steve on 2026-05-07. Should be CC'd on Steve communications. |
| **Johno (Flagship)** | Receiving this handoff | (TBC) | Will continue the build on a separate account. |
| **Cleo / Angela / etc.** | Other Flagship brokers | various @flagshipinternational.com.au | Listed in the broker dropdown of the quoter. |

---

## 3. Repo

- **GitHub:** https://github.com/Arav1oli/app-page.tsx
- **Working branch:** `claude/read-mel-email-RhjOZ`
- **Repo name:** `app-page.tsx` (yes, the dot in the name is intentional — it's the literal repo name)
- **Project:** Next.js 14 yacht CRM ("Yacht CRM"). Marex 440 quoter is a sub-feature.

**Tech stack:** Next.js 14.2.3 (App Router) · TypeScript · Tailwind CSS · Prisma (SQLite local, swap to Postgres for prod) · NextAuth 4.24 · lucide-react · date-fns

**Don't merge to main yet.** All changes live on the feature branch awaiting product sign-off.

---

## 4. What's Built (commits in chronological order on this branch)

| Commit | Summary |
|---|---|
| 5485ed2 | Add Fleet dashboard + Marex 440 configurator/quoting wireframe |
| f3169da | Fix Marex 440 quoter: engine double-count, conflict enforcement, single-fallback |
| 0ce38a8 | Add Marex hero header to wireframe with brand placeholders |
| d8cb63a | Fix photo placeholder blocking real M440 image when swapped in |
| 949ee1e | Wire Marex 440 quoter to send via Gmail API (NextAuth Google provider) |
| 93c6068 | Polish quote email body for natural tone + clean mobile rendering |
| dfe12bf | Add Marex 440 hero photo (sourced from Drive) |

### 4.1 Marex 440 Configurator (`public/tools/marex-440-quote.html`)

Self-contained single HTML file. No build step. Opens directly in any browser. ~52KB.

**Hero header:**
- Marex wordmark (CSS) with hotlinked Marex SVG logo from `https://marex.no/wp-content/themes/marex2023/dist/images/logo.svg` (white-inverted via CSS filter)
- Photo: `marex-440-photo.webp` (945×650, 112KB) sourced from Mel's Drive folder `1dWhb4vllCwZhg0i4q42UUGX9DWcCtHL8` (Drive file ID `1e9JMfUh2_O4d_KpNXgAKufBvgnUV4lc7`)

**19 priced sections** mapping 1-to-1 to Steve's wire-frame doc:
1. Engine & Drivetrain (single, 5 options)
2. Volvo Penta System Upgrades (multi)
4. Main Deck Layout (single)
5. Lower Deck Layout (single)
6. Stern Platform (single)
7. Standard Equipment (informational, included)
8. Electronics (multi)
9. Electrical System (multi)
10. Lighting (multi)
11. Vessel Operational (multi)
12. Exterior Comfort (multi)
13. Interior Comfort (multi)
14–20. Colour & finish selectors (single)

**Note:** Section 3 missing from Steve's source doc — flagged as Q1 to Steve.

**Dependency rules engine** (in `isAllowed()` + render pre-pass):
- `requiresDrive` — gates option to specific drivetrain (sterndrive/ips/vdrive)
- `requires` — option needs ALL listed option IDs to be selected
- `requiresAny` — option needs AT LEAST ONE of listed option IDs selected
- `conflicts` — multi-select: ticking one auto-unticks listed conflicts (Solar 1k vs 1.5k, UW W/B vs RGB, Tender Manual vs Hyd, Gyro CX16 vs SK6, A/C 2-cab vs 3-cab)
- Single-select fallback: if a selected single becomes invalid (e.g. teak removed → hydraulic stern impossible), it falls back to the section's `std` option in render's pre-pass

**Live tally:**
- EUR subtotal (sum of `state.selections` minus items with `std: true`)
- AUD subtotal at editable spot rate (default 1.65, top right)
- Optional Import Duty 5% + GST 10% toggles (Client section)
- Grand total (AUD)
- Public mode toggle hides all prices (broker can demo without revealing)

**Required client fields:** First, Last, Email, Mobile (validated on send).

**Broker dropdown:** all 12 Flagship brokers, default = Steve (Marex brand manager).

**Quote summary modal:** opens on "Open Quote Summary" or "Email Quote to Broker". Shows full text breakdown. Three actions: Copy to Clipboard, Send via Email, Close.

**Email send flow:**
- Detects host (htmlpreview / file:// / Next.js host)
- If on Next.js host: POSTs to `/api/quote/send` (programmatic Gmail send)
- If on standalone preview or API returns non-200: falls back silently to `mailto:` opening user's default mail app
- Pre-fills To = selected broker, CC = Steve (Marex brand manager always CC'd), Subject = `Marex 440 Quote — {name} — {total}`, Body = polished plaintext

### 4.2 Fleet Dashboard (`app/fleet/page.tsx`)

Server component, gated by NextAuth. Uses existing `AppShell` + Tailwind. Two tile sections:

- **Quoting & Configuration Tools:** M440 (live), M390 (planned), M310 (planned)
- **Reporting:** Lead Pipeline (existing /board), All Leads (existing /leads), EDM QA Log (planned), Quote Activity (planned), Broker Lead Volume (planned), Active Fleet Listings (planned)

Tiles render with status pills (Live / Wireframe / Planned). External tiles open in new tab with ExternalLink icon. Planned tiles render at 60% opacity, non-clickable.

Fleet link added to sidebar (`components/layout/Sidebar.tsx`) using `Ship` icon from lucide-react.

### 4.3 Programmatic Email Send (NextAuth + Gmail API)

**`lib/auth.ts`** — Google provider added alongside existing Credentials provider. Scopes: `openid email profile https://www.googleapis.com/auth/gmail.send`. JWT callback persists `accessToken` + `refreshToken` + `accessTokenExpires`. Auto-refresh via `refreshGoogleAccessToken()` if token within 60s of expiry.

**`app/api/quote/send/route.ts`** — POST endpoint. Reads session, validates Google provider + access token, builds RFC 2822 multipart message, POSTs to `https://gmail.googleapis.com/gmail/v1/users/me/messages/send` with bearer auth. Returns:
- 200: `{ ok: true, id, threadId, sentBy }`
- 401: `Sign in with Google to send via Gmail.`
- 502: Gmail API rejected (with detail)

**Body shape (POST):**
```ts
{ to: string; cc?: string; subject: string; text: string; html?: string }
```

### 4.4 Build Verification

Last verified `npx next build` exit 0. All 11 routes compile:
- Static: `/login`, `/_not-found`
- Dynamic SSR: `/`, `/board`, `/fleet` (1.55kB / 113kB First Load), `/leads`, `/leads/[id]`
- API routes: `/api/auth/*`, `/api/leads/*`, `/api/quote/send`, `/api/seed`, `/api/users`

---

## 5. What's Pending (Priority Order for SCIBS MVP)

**P0 — Required for Steve to demo at SCIBS:**
1. Get Steve's sign-off on the 8 open questions (§7). Email draft is already in Mel's Drafts folder, ready to send.
2. Deploy somewhere with a stable URL. Mel's preference is **Cloudflare Pages via Wrangler CLI** (see §6.2).
3. Replace the 8 open question answers in the data layer once Steve responds.

**P1 — MVP completeness:**
4. Activate Gmail send (Google OAuth client creation in Cloud Console — see §6.1).
5. Wire HubSpot push on quote submit (notify list TBD pending Steve's response).
6. PDF export of completed quote (currently only inline summary modal).

**P2 — Public-facing version:**
7. Add boat photos, GA diagrams, teak decking diagrams to each relevant section.
8. Hide internal-only fields and prices when in Public mode (already partially done — prices hide cleanly, photos still need wiring).
9. Move from static HTML to a Next.js page so SEO + analytics work.

**P3 — Multi-model architecture:**
10. Refactor pricebook from inline `PRICEBOOK` const to data-driven (JSON or DB-backed). Architecture should let M390, M310, M375 etc. plug in with just a new pricelist file, no UI rebuild.
11. Templated rules engine — currently the rules are hand-written per option in the `PRICEBOOK`. Move to a declarative format Steve can edit without touching code.

**Tech debt / nice-to-have:**
- `/fleet` route returns 500 in current sandbox runs because the SQLite DB isn't seeded — works fine in any environment with `prisma db push && db:seed`.
- `lib/auth.ts` has `as any` casts because the NextAuth types for the augmented session weren't extended. Should add a `next-auth.d.ts` declaration.
- The HTML's `buildSummary()` function is ~80 lines — fine for now but extract to a separate file once we move to a Next.js page.

---

## 6. Access & Credentials Required

> **Mel cannot pass these directly via this handoff — the receiving agent needs to coordinate with Mel/Adrian to obtain them.** Below is the full list of what's needed and where.

### 6.1 Google Cloud Console (for Gmail send — required for P1)

- **Need:** OAuth 2.0 Web Application client ID + secret
- **Steps for Mel/Adrian:**
  1. Go to https://console.cloud.google.com/apis/credentials
  2. Create project (or reuse) → **Create Credentials** → **OAuth client ID** → **Web application**
  3. **Authorized redirect URIs:** add `https://<deployed-domain>/api/auth/callback/google` and `http://localhost:3000/api/auth/callback/google` for dev
  4. **OAuth consent screen** → User type External (or Internal if Google Workspace) → add scope `https://www.googleapis.com/auth/gmail.send`
  5. Copy Client ID + Client Secret
- **Where to put them:** `.env.local` (or platform env settings)
  ```
  GOOGLE_CLIENT_ID=...
  GOOGLE_CLIENT_SECRET=...
  ```
- **Activation:** After deploy, Mel signs into the app once with her Google account → grants `gmail.send` permission → from then on, "Email Quote to Broker" sends from her Gmail directly.

### 6.2 Cloudflare Pages (for deployment — Mel's stated preference)

- **Need:** Cloudflare API token + Account ID + Pages project name
- **Mel's status:** *"I need to find it"* (per AskUserQuestion answer earlier in this thread). Mel said she'd come back with these.
- **API token creation:** https://dash.cloudflare.com/profile/api-tokens → Custom Token → permission `Account → Cloudflare Pages → Edit`
- **Wrangler deploy command (once creds exist):**
  ```bash
  npx wrangler pages deploy public --project-name=<project> --branch=main
  # — for the static /public/tools/ wireframe only
  # OR for full Next.js + /fleet route:
  npx @cloudflare/next-on-pages
  npx wrangler pages deploy .vercel/output/static --project-name=<project>
  ```
- **For Next.js full deploy:** repo is not yet adapted with `@cloudflare/next-on-pages`. That's a small bit of work — install the adapter, update build script, add `wrangler.toml` config.

### 6.3 HubSpot (for lead push on submit — required for P1)

- **Need:** HubSpot API access token + Pipeline ID + Stage ID + property mapping
- **Mel may already have an internal CRM workflow** — check with Adrian.
- **Open question Q4 to Steve:** "Which deal pipeline / stage / properties? Should the deal owner default to the selected broker?"
- **What the API route will need:**
  ```
  HUBSPOT_API_TOKEN=...
  HUBSPOT_PIPELINE_ID=...
  HUBSPOT_STAGE_ID=...
  ```
- I have read access to HubSpot via MCP in this session (tools `mcp__1f250459*`). The deployed app will need its own bearer token.

### 6.4 Existing Auth (no action needed but document)

- **NextAuth secret:** set as `NEXTAUTH_SECRET` in env (use `openssl rand -base64 32`)
- **NextAuth URL:** set as `NEXTAUTH_URL=https://<deployed-domain>` in env
- **Database:** Prisma SQLite for local (`file:./dev.db`), swap to Postgres for prod (`DATABASE_URL=postgresql://...` — Mel uses Neon or Supabase typically)

### 6.5 Drive Assets

- **Mel's Drive folder containing the M440 photo:** https://drive.google.com/drive/folders/1dWhb4vllCwZhg0i4q42UUGX9DWcCtHL8
- **Files in folder:**
  - `IMG_7889.WEBP` (id `1e9JMfUh2_O4d_KpNXgAKufBvgnUV4lc7`) — the hero photo, already committed to repo as `public/tools/marex-440-photo.webp`
  - `IMG_7891.PNG` (id `1OrXcw8_NYdVXgNEHPBPx2dyWnVeI2wT4`) — likely a logo (14KB), not used; current build hotlinks logo from marex.no's CDN
- **Marex video reels** (could be used for an animated hero in a future iteration): Drive folder `1PrEWx07CXTK6ySJDsEMDGsPh9AB13inI` contains 10 mp4s including `14-Marex_440.mp4` (16MB), `18-Marex_440_GC.mp4` (1.6MB), `12-Marex_440_Scandinavia.mp4`

---

## 7. Open Questions Awaiting Steve Williams

These are in the email draft sitting in Mel's Drafts folder (Gmail draft ID `r3146012905500028910`, To: steve@flagshipinternational.com.au, CC: Mel + Adrian, Subject: "Marex 440 Online Quoting Tool — Working Wireframe Ready for Your Review").

1. **Section 3 missing from doc** — intentional or numbering skip? Affects whether anything is unaccounted for.
2. **Rudder Position Indicator** (V-Drive only, §8) has no price column — standard with V-Drive, or carries a cost to add?
3. **Notification list on quote submit** — Steve's spec says "myself, the broker and others deemed necessary." Need explicit roster (names + emails).
4. **HubSpot push** — pipeline / stage / properties? Owner = selected broker?
5. **Standard Equipment list (§7) dynamic by engine?** Spec says antifoul incl. shafts if V-Drive — implies yes. Confirm.
6. **Solar 1000W vs 1500W, Underwater W/B vs RGB, Tender Manual vs Hydraulic** — currently mutually exclusive. Confirm correct.
7. **PDF template** — does Marex/Flagship have a brand template, or design one for sign-off?
8. **Multi-model roadmap** — once M440 is signed off, architect as data-driven pricebook for M390/M310/M375 to plug in with just a new pricelist?

**Send instructions for the draft (not yet sent):**
- The draft body says "Mel will share the rendered wireframe link in a separate note." Replace with: `https://htmlpreview.github.io/?https://raw.githubusercontent.com/Arav1oli/app-page.tsx/claude/read-mel-email-RhjOZ/public/tools/marex-440-quote.html`
- Attach Marex logo + 440 photo before sending (Gmail MCP can't attach via API — Mel does this manually in Gmail compose UI).

---

## 8. Architecture Decisions

**Why static HTML, not a Next.js page:**
- Iteration speed during wireframe phase. Open it directly in browser, share via htmlpreview, no build/deploy needed for review.
- Still served by Next.js once deployed (`/public/tools/marex-440-quote.html` → accessible at `/tools/marex-440-quote.html`).
- Phase 2 will move to a Next.js page once design is locked, so we get auth gating, analytics, server-side render.

**Why `mailto:` first, programmatic send second:**
- mailto: works in any browser, on any device, immediately. Zero infra.
- Programmatic Gmail send is wired but inactive until Google Cloud Console is set up (one-time ~10 min job).
- HTML detects host: standalone preview → mailto. Deployed Next.js host → tries `/api/quote/send`, falls back silently on failure.

**Why hotlink logo from marex.no, not bundle:**
- The sandbox in which this was built can't fetch external assets. User provided the URL; we hotlink. Will work in any real browser.
- Local override hook in place: drop `public/tools/marex-logo.svg` and the HTML's `onerror` fallback loads marex.no.
- For production, recommend bundling the logo to avoid third-party CDN dependency.

**Pricing data structure:**
- Inline `PRICEBOOK` array of section objects in the HTML. Each section: `{ id, num, title, type: 'single'|'multi'|'info', hint?, options[] | items[] }`. Each option: `{ id, label, price, note?, std?, drive?, requires?, requiresAny?, requiresDrive?, conflicts?, capability?, layout?, cabins? }`.
- All EUR prices include the 9% Flagship retail uplift baked in (per Steve's spec).
- Standard equipment (§7) is purely informational — `type: 'info'`, has `items[]` not `options[]`.

**Conflict enforcement:**
- On change event, if checked option has `conflicts`, untick conflicting options in both DOM and state.
- This is the "you can't pick both Solar 1kW and Solar 1.5kW" guard.

**Single-fallback cascade:**
- Render pre-pass walks single-select sections. If the currently-selected option fails `isAllowed()` (e.g. user removed teak so hydraulic stern is no longer valid), the option falls back to the section's `std` option, both in state and in the DOM.
- Without this, removing a dependency would leave a "ghost" selection that still added to the price.

---

## 9. Technical Reference

### File Map (changed/new on this branch)

```
HANDOFF.md                                  # this file
app/api/quote/send/route.ts                 # NEW — Gmail API send endpoint
app/fleet/page.tsx                          # NEW — Fleet dashboard hub
public/tools/marex-440-quote.html           # NEW — Marex 440 wireframe
public/tools/marex-440-photo.webp           # NEW — hero photo (945x650, 112KB)
lib/auth.ts                                 # MODIFIED — Google provider added
components/layout/Sidebar.tsx               # MODIFIED — Fleet nav link added
.env.example                                # MODIFIED — GOOGLE_CLIENT_ID/SECRET docs
```

### Local Dev

```bash
git clone -b claude/read-mel-email-RhjOZ https://github.com/Arav1oli/app-page.tsx.git
cd app-page.tsx
npm install
cp .env.example .env.local
# fill in NEXTAUTH_SECRET (openssl rand -base64 32), NEXTAUTH_URL=http://localhost:3000
# add GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET if testing Gmail send locally
npx prisma generate
npx prisma db push
npm run db:seed
npm run dev
# open:
#   http://localhost:3000/tools/marex-440-quote.html  — the quoter
#   http://localhost:3000/fleet                       — the dashboard hub (after login)
#   http://localhost:3000/login                       — credentials login
```

### Build

```bash
npm run build        # exits 0; verified working
npm start            # serves the production build on :3000
```

### Deploy (Cloudflare Pages — Mel's preference)

See §6.2 above. `npx wrangler pages deploy public` for the static-only variant; full Next.js needs `@cloudflare/next-on-pages` adapter.

### Wireframe Preview (no deploy needed)

```
https://htmlpreview.github.io/?https://raw.githubusercontent.com/Arav1oli/app-page.tsx/claude/read-mel-email-RhjOZ/public/tools/marex-440-quote.html
```

Works on phone and desktop. Slow first load (htmlpreview cold-starts). Layout collapses to single column below 1100px wide.

---

## 10. Conversation / Context Notes

- Mel built this from her phone in ~30 min via Claude Code on the web. Heavy iteration cycle — many small commits as decisions evolved. Per Mel's WhatsApp to Johno, this is "MVP only before Scibs" — feature-complete but not fully polished.
- Steve was "bitterly disappointed" not having something for SCIBS — getting this to him in working state is a relationship priority.
- The Gmail draft to Steve is intentionally not yet sent — Mel wants to review the wireframe one more time on a desktop and add the public deploy URL before sending.
- Mel is on melclawson5@gmail.com but Drive files referenced are owned by adrianstock23@gmail.com (Adrian's account) — they share Drive. Auth on this Claude session is Mel's; the next agent's auth will likely be different (Johno's).
- The repo `Arav1oli/app-page.tsx` is **public** on GitHub (verified by raw URL returning 200 to anonymous fetcher). htmlpreview.github.io renders it. Don't commit secrets to this repo.

---

## 11. What I Could NOT Do (and Why)

- **Cannot send the email to Steve programmatically.** The Gmail MCP available in this session has `create_draft` but no `send`. Draft is in Mel's Drafts folder; Mel sends manually.
- **Cannot deploy to Cloudflare.** No Cloudflare credentials in sandbox. Wrangler is installable on demand but needs API token + project name.
- **Cannot fetch from marex.no or flagshipinternational.com.au.** Sandbox network policy ("Host not in allowlist"). Both sites block WebFetch with 403 even where allowed. Logo is hotlinked — works in real browsers. Photo had to be sourced from Drive.
- **Cannot extract chat-attached image binaries to disk.** When Mel attached the M440 photo in chat, I could see it visually but had no file path. She uploaded it to Drive instead and I pulled it from there.
- **Cannot bypass mailto popup on iOS.** The clunky "Open email in default mail application?" dialog is iOS Safari behaviour. Programmatic Gmail send (Option 2 in §6.1) eliminates it.

---

## 12. Recommended First Actions for the Receiving Agent

1. **Pull the branch:** `git fetch origin claude/read-mel-email-RhjOZ && git checkout claude/read-mel-email-RhjOZ`
2. **Run locally** (§9) to verify build is clean on your environment.
3. **Test the wireframe in your phone browser** using the htmlpreview link in §1.
4. **Confirm with Mel/Adrian** which item from §5 to tackle next. Likely order:
   - (a) Wait for Steve's responses to §7 questions
   - (b) Deploy to Cloudflare Pages (need creds from §6.2)
   - (c) Activate Gmail send (need creds from §6.1)
5. **Don't merge to main without explicit user sign-off.** This is a feature branch, code review pending.
6. **Update this HANDOFF.md** as you go — append a §13 with your changes and any new decisions.

---

*End of handoff. Questions about anything in this doc → Mel C Lawson (melclawson5@gmail.com) or Adrian Ravasio (adrian@flagshipinternational.com.au).*
