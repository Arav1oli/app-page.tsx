# Deploying Yacht CRM

This guide takes you from "it runs on my laptop" to "it runs on the internet, on
our own domain, with a proper backed-up database". No prior devops experience is
assumed. Every command is something you paste into a terminal in the project
folder, and every click is spelled out.

Budget about an hour for the first time. Set aside a quiet morning — don't do it
the day before a boat show.

**What you'll end up with**

- The app hosted on **Vercel** (the company that makes Next.js, the framework
  this is built on).
- The database hosted on **Neon** (managed PostgreSQL).
- A custom domain with automatic HTTPS.
- Deploys that swap over instantly with no downtime, and a rollback button that
  puts the previous version back in about ten seconds.

**Cost:** both Vercel and Neon have free tiers that comfortably fit eight users.
Expect £0/month to start. Vercel Pro (~$20/user/month) is only needed if you
want commercial-use terms, longer log retention, or the built-in firewall — the
firewall is worth it eventually, see "Rate limiting" at the end.

---

## Before you start

You need:

- The code in a **GitHub repository** (Vercel deploys by watching GitHub).
- A **Vercel** account — sign up at [vercel.com](https://vercel.com) with GitHub.
- A **Neon** account — sign up at [neon.tech](https://neon.tech) with GitHub.
- Node.js installed locally, and the project working on your laptop as described
  in the README.

---

## Why Neon, and not Supabase?

Both are good. Both are managed PostgreSQL with a free tier. Pick **Neon** here
for three specific reasons:

1. **Built-in connection pooling, clearly labelled.** Neon hands you two
   connection strings side by side — a pooled one and a direct one — and names
   them as such. This distinction is the single most common thing that breaks
   Prisma apps on serverless hosting (explained in Step 2), and Neon makes it
   hard to get wrong.
2. **It's the smallest thing that does the job.** Supabase bundles its own
   authentication, file storage, realtime and auto-generated APIs. This app uses
   none of that — it has its own login system. Every unused feature is another
   thing to configure, another thing to keep patched, another door to leave
   open. Neon is a database and nothing else.
3. **It scales to zero.** With eight people using it a few times a day, the
   database is idle most of the time. Neon suspends an idle database and wakes
   it on the next query, which is why the free tier goes a long way. (The
   trade-off: the first query after a long idle period takes a second or two.
   Nobody will notice.)

If your brokerage already uses Supabase for something else, use Supabase — the
steps are near-identical, and its pooled connection is on port `6543` with the
direct connection on `5432`. Everything else in this guide applies unchanged.

---

## Step 1 — Create the database

1. Log in to [console.neon.tech](https://console.neon.tech).
2. Click **New Project**.
3. Name it `yacht-crm`.
4. **Region:** pick the one closest to your brokerage — e.g. *AWS eu-central-1
   (Frankfurt)* or *AWS eu-west-2 (London)* for Europe. Write this down; you'll
   match Vercel to it in Step 6.
5. Leave the Postgres version at the default.
6. Click **Create Project**.

Neon creates the database and immediately shows you the connection details.
**Leave this tab open** — you need it in the next step.

---

## Step 2 — Get the two connection strings

This is the part that trips everybody up, so here is what is actually going on.

**The problem.** Vercel doesn't run your app on one long-lived server. It runs
it as dozens of short-lived instances that spin up on demand. Each one wants its
own connection to the database. PostgreSQL only accepts a limited number of
connections at once (on Neon's free tier, around 100). Under any real load your
app will exhaust them and start throwing `too many connections` errors.

**The fix.** A *connection pooler* (Neon uses PgBouncer) sits in front of the
database and shares a small pool of real connections between thousands of
callers. Your app talks to the pooler; the pooler talks to Postgres.

**The catch.** Database *migrations* — the commands that create and alter
tables — cannot go through the pooler. They need a real, exclusive, session-long
connection to take out locks. Through the pooler they hang or fail.

**So you need both strings:**

| String | Host looks like | Used for |
| --- | --- | --- |
| **Pooled** | `ep-xxx-pooler.eu-central-1.aws.neon.tech` | The running app — every page load and every query |
| **Direct** | `ep-xxx.eu-central-1.aws.neon.tech` | Migrations and seeding only — run by hand, rarely |

Note the difference: the pooled host has **`-pooler`** in it. That is the only
difference. Miss it and things break in confusing ways.

**To copy them:**

1. In the Neon dashboard, find the **Connection string** panel.
2. Make sure **Connection pooling** is toggled **ON**. Copy that string — this
   is your **pooled** URL. It should contain `-pooler`.
3. Toggle **Connection pooling** **OFF**. Copy that string — this is your
   **direct** URL.

Paste both into a scratch note for a minute. They look like:

```
postgresql://neondb_owner:PASSWORD@ep-cool-name-123456-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
postgresql://neondb_owner:PASSWORD@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

> These strings contain the database password in plain text. Treat them like the
> keys to the office. Don't email them, don't paste them into Slack, and never
> commit them to git. When you're finished with the scratch note, delete it.

---

## Step 3 — Switch the code from SQLite to PostgreSQL

The app uses SQLite (a single file) on your laptop and PostgreSQL in production.
That means one small change to the schema file.

Open **`prisma/schema.prisma`**. At the top you'll find:

```prisma
datasource db {
  // LOCAL: SQLite — swap to "postgresql" for production (Neon, Supabase, etc.)
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

Change it to:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

Three things happened there:

- `provider` is now `postgresql`.
- `url` still reads `DATABASE_URL` — that will be the **pooled** string, used by
  the running app.
- A new `directUrl` reads `DIRECT_URL` — the **direct** string. Prisma uses this
  automatically, and *only*, for migrations. This is exactly the pooled/direct
  split from Step 2, wired up.

Save the file and commit it.

> **One consequence to know about.** SQLite treats text searches as
> case-insensitive; PostgreSQL does not. The lead search box (`/api/leads?search=`)
> uses Prisma's `contains`, so after this switch, searching `ashworth` will no
> longer find "Ashworth". Fixing it means adding `mode: "insensitive"` to each
> `contains` clause in `app/api/leads/route.ts`. It is a small change and worth
> doing, but it is a code change, not a deployment step — flag it to whoever
> maintains the code.

### Does `prisma generate` run on the build?

Yes — this is already handled, but verify it yourself so you know. Open
`package.json` and look in `"scripts"`:

```json
"postinstall": "prisma generate"
```

That line is present. It matters because Vercel caches `node_modules` between
builds, and Prisma's generated client is written *into* `node_modules`. Without
a `postinstall` hook, a cached build would reuse a stale client and fail at
runtime with `@prisma/client did not initialize yet`. Because the hook is there,
`prisma generate` runs on every install, and you don't need to touch the build
command.

---

## Step 4 — Generate your session secret

`NEXTAUTH_SECRET` is the key that signs your users' login cookies. If it is
missing, NextAuth refuses to start in production. If it is guessable, someone
can forge a session and log in as your admin.

Generate a real one:

```bash
openssl rand -base64 32
```

You'll get something like `k9Jx2mQp7vR4tY8nB3wZ6cF1aH5dG0sL2eU7iO9pK4M=`. Copy it.

Rules:

- **Never reuse** your local development secret in production.
- **Never commit it.** It goes into Vercel's dashboard, nowhere else.
- Store a copy in your password manager. If you lose it and have to set a new
  one, every user is instantly signed out (harmless, but confusing if it happens
  unexpectedly).

---

## Step 5 — Create the tables in the production database

Do this from your laptop, once, before the first deploy.

The safe way to do it without disturbing your local setup is to pass the
production connection strings inline, for one command only:

**macOS / Linux:**

```bash
DATABASE_URL="<your DIRECT string>" DIRECT_URL="<your DIRECT string>" npx prisma db push
```

**Windows (PowerShell):**

```powershell
$env:DATABASE_URL="<your DIRECT string>"; $env:DIRECT_URL="<your DIRECT string>"; npx prisma db push
```

Use the **direct** string in both places here. This is the one situation where
the pooled string is wrong — you are creating tables, which is a migration.

You should see `Your database is now in sync with your Prisma schema.`

Verify it worked:

```bash
DATABASE_URL="<your DIRECT string>" npx prisma studio
```

A browser window opens showing three empty tables: `User`, `Lead`, `Activity`.
Close it when you're satisfied.

### Creating the first user accounts

Your production database is empty — there is nobody to log in as. You have two
options.

**Option A — seed, then immediately change every password (fastest).**

```bash
DATABASE_URL="<your DIRECT string>" DIRECT_URL="<your DIRECT string>" npm run db:seed
```

> ### Read this before running the seed
>
> **The seed script deletes every lead and every activity in the database
> before inserting its samples.** It is safe exactly once — on a brand new,
> empty database. Running it again later will destroy real client data with no
> undo. After your first successful deploy, do not run it again. Ever.

This gives you the five demo accounts, all with password `demo1234`, plus eight
fictional sample leads. Delete the sample leads from the UI once you're
satisfied everything works, then **change every password immediately** — see
"Lock down the demo accounts" below.

**Option B — create only real accounts (cleaner).**

Skip the seed. Create your brokers directly. Save this as `create-user.js` in
the project folder:

```js
// Usage: DATABASE_URL="<direct string>" node create-user.js "Jane Smith" jane@yourbrokerage.com "a-strong-password" admin JS
const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")
const [name, email, password, role = "agent", initials = ""] = process.argv.slice(2)
const prisma = new PrismaClient()

prisma.user
  .create({
    data: { name, email, password: bcrypt.hashSync(password, 12), role, initials },
  })
  .then((u) => console.log("Created:", u.email))
  .catch((e) => console.error(e.message))
  .finally(() => prisma.$disconnect())
```

Run it once per broker. Then delete the file, or add it to `.gitignore` — it
does not belong in the repository.

---

## Step 6 — Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. **Import** your GitHub repository. Vercel detects Next.js automatically.
3. Leave **Framework Preset**, **Build Command**, **Output Directory** and
   **Install Command** exactly as they are. The defaults are correct — do not
   override the build command to add `prisma generate`, because the
   `postinstall` hook already handles it.
4. Expand **Environment Variables** and add these three, one at a time. For each
   one, make sure **Production**, **Preview** and **Development** are all ticked
   unless noted:

   | Name | Value | Notes |
   | --- | --- | --- |
   | `DATABASE_URL` | your **pooled** string (the one with `-pooler`) | The running app |
   | `DIRECT_URL` | your **direct** string (no `-pooler`) | Migrations |
   | `NEXTAUTH_SECRET` | the value from Step 4 | Never share |
   | `NEXTAUTH_URL` | leave until Step 7 | Set it after you have a domain |

   Double-check `DATABASE_URL` has `-pooler` in it. This is the mistake to
   avoid.

5. Click **Deploy**.

The build takes two or three minutes. When it's done you get a URL like
`yacht-crm-abc123.vercel.app`.

**Set the region to match your database.** In the project's
**Settings → Functions**, set the **Function Region** to the same region you
chose for Neon in Step 1. Every page load makes several database queries; if the
app is in Washington and the database is in Frankfurt, each query pays an
80ms round trip and the app feels sluggish for no reason. Match them and it
feels instant.

**Check it's alive:**

```
https://your-app.vercel.app/api/health
```

You want `{"status":"ok","database":"connected","latencyMs":...}`. If you get
`"database":"unreachable"`, jump to "When something breaks" below.

---

## Step 7 — Custom domain and HTTPS

1. In your Vercel project, go to **Settings → Domains**.
2. Type the domain you want, e.g. `crm.yourbrokerage.com`, and click **Add**.
3. Vercel shows you the DNS record to create. For a subdomain it's usually:

   | Type | Name | Value |
   | --- | --- | --- |
   | `CNAME` | `crm` | `cname.vercel-dns.com` |

4. Log in wherever your domain is registered (GoDaddy, Cloudflare, 123-reg,
   Namecheap…), find the DNS settings for your domain, and add that record.
5. Go back to Vercel and wait. It usually verifies within a few minutes; DNS can
   occasionally take a couple of hours.

**HTTPS is automatic.** Once the domain verifies, Vercel issues and renews a
free Let's Encrypt certificate for it, and redirects `http://` to `https://`.
There is nothing to buy, install or renew. You should never see a certificate
warning; if you do, the domain hasn't finished verifying.

**Now set `NEXTAUTH_URL`.** Go to **Settings → Environment Variables** and add:

```
NEXTAUTH_URL = https://crm.yourbrokerage.com
```

This must be the **exact** address your team will type: `https://`, no trailing
slash, the custom domain and not the `.vercel.app` one. NextAuth uses it to
build sign-in and callback URLs, and a mismatch produces a maddening bug where
login appears to succeed but bounces you straight back to the login page.

**Environment variable changes only take effect on the next deploy.** After
adding it, go to **Deployments**, find the most recent one, click the **⋯** menu
and choose **Redeploy**.

---

## Step 8 — Lock down the demo accounts

**Do not skip this.** Straight out of the seed, five accounts — including an
admin — share the password `demo1234`, and the login page prints that password
on screen. Anyone who finds your URL is one guess from your entire client list.

For each account, generate a proper password hash:

```bash
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 12))" 'the-new-strong-password'
```

Then open the production database and paste the hash in:

```bash
DATABASE_URL="<your DIRECT string>" npx prisma studio
```

In the `User` table, find the row, replace the `password` field with the hash
you generated (the long `$2a$12$...` string, not the plain password), and save.
Repeat for every user. Delete any demo account you aren't actually using.

Use your password manager to generate and store the real passwords. Since there
is no password-reset screen in the app, a lost password means repeating this
procedure — so store them properly the first time.

Finally, ask whoever maintains the code to remove the
`Demo password: demo1234` hint from `app/login/page.tsx`.

---

## Why this is zero-downtime, and how to roll back

### Why there's no downtime

Vercel deployments are **atomic and immutable**. When you push to your main
branch:

1. Vercel builds the new version in a completely separate environment. Your
   live site is untouched and still serving traffic the whole time.
2. If the build fails — a typo, a broken import, a type error — **it simply
   never goes live**. Your users see the previous version and never know
   anything happened. This alone eliminates the most common cause of outages.
3. If the build succeeds, Vercel flips your domain to point at the new
   deployment. The flip is a routing change, not a restart: requests already in
   flight finish against the old version, new requests go to the new one. There
   is no window where nothing is listening.
4. The old deployment isn't deleted. It keeps its own permanent URL and stays
   ready to serve.

Compare that to a traditional server, where deploying means stopping the app,
copying files, running a migration and starting it again — thirty seconds to
several minutes of a broken site, and if the new version doesn't start, a
broken site until you fix it by hand.

**One honest caveat.** Zero-downtime applies to *your code*. It does not apply
to your *database*. The database is shared between old and new versions, so a
destructive schema change — renaming a column, dropping a table — will break the
old version the moment you apply it, and rolling the code back won't undo it.
For a CRM of this size that rarely comes up, but the rule is: **make schema
changes additive** (add a column, don't rename one), deploy the code that uses
it, and only remove the old column in a later, separate deploy.

### How to roll back

Something went out that shouldn't have. Fix it in under a minute:

1. Open your project on [vercel.com](https://vercel.com).
2. Click the **Deployments** tab.
3. Find the last deployment that was working — deployments are listed newest
   first, with the commit message and timestamp.
4. Click the **⋯** menu on that row, then **Promote to Production**
   (older interfaces call it **Instant Rollback**).
5. Confirm.

The domain re-points to that build within seconds. Nothing is rebuilt, because
the old build already exists — that's why it's instant.

Then fix the problem properly in git and deploy again. Promoting an old
deployment does not change your code; the next push will still deploy whatever
is on your main branch.

**Practice this once, on purpose, before you need it.** Deploy a trivial change,
roll it back, roll it forward. Five minutes now saves a very bad ten minutes
later.

---

## When something breaks

**First, always: `https://your-domain.com/api/health`.** It tells you instantly
whether this is an app problem or a database problem.

- `{"status":"ok"}` — the app and database are both fine. The problem is in a
  specific page or feature.
- `{"status":"error","database":"unreachable"}` — the app is running but can't
  reach the database. Look at `DATABASE_URL` and at Neon.
- The page doesn't load at all / 500 — the app itself isn't starting. Check the
  logs.

**Second: read the logs.** Vercel project → **Logs** tab (or **Deployments** →
click a deployment → **Runtime Logs**). The actual error will be there in plain
English. Set the filter to Errors and look at the most recent entry.

### Common problems

| What you see | What it means | Fix |
| --- | --- | --- |
| Build fails: `Environment variable not found: DATABASE_URL` | The variable isn't set, or isn't ticked for that environment | Settings → Environment Variables; make sure Production is ticked; redeploy |
| `the URL must start with the protocol postgresql://` | `prisma/schema.prisma` still says `provider = "sqlite"` | Redo Step 3, commit, push |
| `@prisma/client did not initialize yet` | `prisma generate` didn't run | Confirm `"postinstall": "prisma generate"` is still in `package.json` |
| `Can't reach database server` / health says unreachable | Wrong host, or Neon project suspended/deleted | Re-copy the connection string from Neon; check the Neon dashboard |
| `too many connections` / `prepared statement "s0" already exists` | `DATABASE_URL` is the **direct** string instead of the pooled one | Set `DATABASE_URL` to the string containing `-pooler`; redeploy |
| Migration command hangs forever | You used the **pooled** string for a migration | Use the **direct** string for `db push` / `migrate deploy` |
| `There is a problem with the server configuration` on login | `NEXTAUTH_SECRET` is missing in production | Add it (Step 4); redeploy |
| Login succeeds then bounces back to `/login` | `NEXTAUTH_URL` doesn't exactly match the address in the browser | Fix it — `https://`, no trailing slash, custom domain; redeploy |
| Everyone was signed out after a deploy | `NEXTAUTH_SECRET` changed | Harmless. Everyone signs in again. Don't change it again |
| Search stopped finding leads | PostgreSQL is case-sensitive where SQLite wasn't | Code change: add `mode: "insensitive"` in `app/api/leads/route.ts` |
| First page load of the day is slow | Neon suspended the idle database and is waking it | Normal. Upgrade Neon's plan if it bothers you |

### If you're truly stuck

Roll back to the last known-good deployment (above). That restores service for
your team immediately and takes all the time pressure off diagnosing the actual
problem.

---

## Housekeeping once you're live

**Backups.** Neon keeps a rolling history that lets you restore the database to
any moment in the recent past (7 days on the free tier). Find it under
**Branches → Restore** in the Neon console. Try a restore once so you know how
it works. For a proper off-site copy, run occasionally:

```bash
pg_dump "<your DIRECT string>" > yacht-crm-backup-$(date +%F).sql
```

Keep those somewhere that isn't Vercel and isn't Neon.

**Uptime monitoring.** Point a free monitor (UptimeRobot, BetterStack) at
`https://your-domain.com/api/health` every five minutes, alerting to your phone.
That endpoint returns HTTP 503 when the database is down, which every monitoring
service understands, so you'll know before your brokers do.

**Rate limiting.** There is currently nothing stopping someone submitting
thousands of password guesses at the login form. With eight users and eight
passwords, that matters. The simplest fix is Vercel's built-in **Firewall**
(Settings → Firewall), where you can rate-limit `/api/auth/*` to something like
10 requests per minute per IP without writing any code. If you're on the free
plan, the alternative is an Upstash Redis rate limiter in a `middleware.ts` file
— that's a code change, so raise it with whoever maintains the app.

**Preview deployments.** Every pull request gets its own URL. By default those
previews use the same environment variables you ticked "Preview" for — which
means they hit your **production database**. For a two-person operation that's
usually acceptable; if it isn't, create a second Neon branch and set
Preview-scoped `DATABASE_URL` / `DIRECT_URL` pointing at it.

**Later schema changes.** This guide used `prisma db push`, which is the fast
path for getting started and fine for one person making occasional changes. Once
the schema starts changing regularly, switch to proper migrations: run
`npx prisma migrate dev --name describe-the-change` locally against a scratch
database, commit the generated `prisma/migrations/` folder, and run
`npx prisma migrate deploy` (with the **direct** URL) against production before
the deploy that needs it. That gives you a reviewable, repeatable, ordered
history of every change instead of "whatever the schema file says today".
