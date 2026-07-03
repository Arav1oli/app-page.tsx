# Deploying Yacht CRM live

The app is a standard **Next.js 14 (App Router) + NextAuth (Credentials) + Prisma**
app. It needs a **Node runtime** and a **hosted Postgres** database.

## Fastest reliable path — live in ~30–45 min (mostly your clicks)

Host: **Vercel** (native Next.js, no adapter, Prisma + bcryptjs work as-is).
DB: **Neon** free Postgres (works with Vercel and locally).

1. **Create the database** — sign in at neon.tech → New Project → copy the
   `postgresql://…` connection string (use the *pooled* one).
2. **Push the schema** (from your machine or a session, with `DATABASE_URL` set to
   the Neon string):
   ```
   npx prisma db push
   npm run db:seed        # creates demo users/leads — optional
   ```
3. **Import the repo** — vercel.com → Add New → Project → pick
   `arav1oli/app-page.tsx` → branch `main`.
4. **Set env vars** in the Vercel project (Settings → Environment Variables):
   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | the Neon pooled `postgresql://…` string |
   | `NEXTAUTH_SECRET` | run `openssl rand -base64 32` and paste the output |
   | `NEXTAUTH_URL` | your final URL, e.g. `https://yourapp.vercel.app` |
5. **Deploy.** Build command `next build`, install runs `prisma generate` via the
   existing `postinstall`. Done → visit the URL and log in.

## Cloudflare path (what you have credentials for) — NOT a 1-hour job

Hosting this exact stack on Cloudflare Pages/Workers means the **edge runtime**,
which does not run Node/Prisma/bcryptjs as-is. It requires:
- the OpenNext Cloudflare adapter (`@opennextjs/cloudflare`),
- a Prisma **driver adapter** + an edge-reachable DB (Neon over HTTP, Cloudflare
  D1, or Hyperdrive),
- NextAuth reconfigured for edge, and bcryptjs swapped for a WebCrypto hash.
- Also: this container's egress currently **blocks `api.cloudflare.com`**, so
  `wrangler` can't even authenticate from here until that host is allowlisted.

Realistic effort: several hours + testing. Use Vercel to hit the 1-hour goal;
migrate to Cloudflare later if it's a hard requirement.

## What only you can do (no tool can do these for me)
- Create the DB and the host project (accounts + clicks).
- Paste secrets into the host's env-var panel and, for reuse in web sessions,
  into this environment's **Secrets** panel (`CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL`, `NEXTAUTH_SECRET`).
- Add `api.cloudflare.com` to the environment's egress allowlist if you go the
  Cloudflare route.
