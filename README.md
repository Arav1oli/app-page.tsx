# Yacht CRM

A small, self-hosted CRM for a yacht brokerage. It is built to replace the two
tools most small brokerages end up juggling:

| What you were paying for | What this does instead |
| --- | --- |
| **Monday.com** — the deal board | A drag-and-drop Kanban board of every lead, grouped by pipeline stage |
| **HubSpot (free)** — the contact database | A full lead record: contact details, company, budget, vessel of interest, owner, and a running activity timeline |

It is intentionally small. Around eight people use it, a few times a day. There
is no billing, no marketing automation, no email sync — just leads, the people
who own them, and a record of every call, note and meeting.

---

## What's in it

**The board** (`/board`) — six columns matching the sales pipeline: New Lead,
Contacted, Qualified, Proposal Sent, Won, Lost. Drag a card between columns and
the lead's status is saved immediately.

**The lead list** (`/leads`) — every lead in a filterable, searchable table.
Filter by owner or status, search by name, email or company.

**The lead record** (`/leads/[id]`) — everything known about one person, plus an
activity timeline. Logging a note, call, email, meeting or task against a lead
automatically stamps their "last contacted" date.

**Sign-in** (`/login`) — email and password. Each broker has their own account
and their own initials on the cards they own.

**Health check** (`/api/health`) — a machine-readable status page used by uptime
monitoring. Returns `{"status":"ok"}` when the app can reach its database.

---

## Running it on your own computer

You need [Node.js](https://nodejs.org) version 18 or newer. Everything below is
typed into a terminal, in the project folder.

### 1. Install the dependencies

```bash
npm install
```

This also runs `prisma generate` automatically (there is a `postinstall` hook in
`package.json`), which builds the database client the app talks through.

### 2. Create your settings file

Copy the example file to create your real one:

```bash
cp .env.example .env
```

Then open `.env` and set a real value for `NEXTAUTH_SECRET`. This is the
key that signs the login cookies — anything long and random will do. Generate
one with:

```bash
openssl rand -base64 32
```

Paste the result between the quotes. Your `.env` should end up looking
roughly like this:

```
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="8Xk2p...the long random string you just generated..."
NEXTAUTH_URL="http://localhost:3000"
```

`.env` is listed in `.gitignore`, so it will never be committed or shared.
Never paste a real secret into `.env.example`.

### 3. Create the database

```bash
npm run db:push
```

Locally the database is a single SQLite file — `prisma/dev.db`. It is also
gitignored, so your local data stays local.

### 4. Fill it with sample data

```bash
npm run db:seed
```

This creates five demo users and eight sample leads with activity history.

> **Warning:** the seed script deletes all existing leads and activities before
> inserting the samples. Never run it against a database that has real data in
> it. See `DEPLOYMENT.md` for the production procedure.

### 5. Start it

```bash
npm run dev
```

Open <http://localhost:3000>.

---

## Demo logins

All five seeded accounts share the password **`demo1234`**.

| Email | Name | Role |
| --- | --- | --- |
| `admin@yachtcrm.com` | Admin User | admin |
| `james@yachtcrm.com` | James Hartley | agent |
| `sophie@yachtcrm.com` | Sophie Miles | agent |
| `marcus@yachtcrm.com` | Marcus Webb | agent |
| `claire@yachtcrm.com` | Claire North | agent |

> **These are demo credentials, not production credentials.** The password is
> also printed on the login screen. Before this goes live with real client data,
> every password must be changed and that hint removed — the procedure is in
> `DEPLOYMENT.md` under "Lock down the demo accounts".

---

## Other commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server on port 3000 |
| `npm run build` | Build the production bundle |
| `npm run start` | Run the production build locally |
| `npm run lint` | Check the code for problems |
| `npm run db:push` | Apply the schema in `prisma/schema.prisma` to the database |
| `npm run db:seed` | Wipe leads/activities and insert the sample data |
| `npx prisma studio` | Open a spreadsheet-like browser for the database |

---

## Folder structure

```
.
├── app/                        Next.js App Router — pages and API routes
│   ├── api/
│   │   ├── auth/[...nextauth]/ Sign-in / sign-out handling (NextAuth)
│   │   ├── health/             Health check used by uptime monitoring
│   │   ├── leads/              Create, read, update, delete leads
│   │   │   └── [id]/
│   │   │       └── activities/ Log a note/call/email/meeting against a lead
│   │   ├── seed/               Dev-only stub; refuses to run in production
│   │   └── users/              List of brokers, for the "owner" dropdowns
│   ├── board/                  The Kanban pipeline board
│   ├── leads/                  Lead list, and the single-lead detail page
│   ├── login/                  Sign-in screen
│   ├── layout.tsx              Root HTML shell
│   ├── page.tsx                Redirects to /board (or /login if signed out)
│   ├── providers.tsx           Wraps the app in the NextAuth session provider
│   └── globals.css             Tailwind entry point
│
├── components/
│   ├── board/                  KanbanBoard, LeadCard
│   ├── layout/                 AppShell, Sidebar
│   └── leads/                  Lead list, detail view, modals, timeline
│
├── lib/
│   ├── auth.ts                 NextAuth configuration (email + password)
│   ├── prisma.ts               The shared database client
│   └── utils.ts                Status/priority labels, colours, helpers
│
├── prisma/
│   ├── schema.prisma           The database structure (User, Lead, Activity)
│   └── seed.ts                 Sample data
│
├── .env.example                Template for your .env
├── DEPLOYMENT.md               How to put this on the internet
└── README.md                   This file
```

## How the data is organised

Three tables, and that's the whole system:

- **User** — a broker. Has a name, email, hashed password, role
  (`admin` or `agent`) and initials.
- **Lead** — a prospective buyer. Contact details, company, budget, vessel of
  interest, pipeline `status`, `priority`, and an optional **owner** (a User).
- **Activity** — one entry on a lead's timeline. A `type`
  (`note`, `call`, `email`, `meeting`, `task`), the text, who wrote it, and
  when. Deleting a lead deletes its activities.

---

## Built with

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS ·
Prisma · NextAuth (credentials, JWT sessions) · SQLite locally, PostgreSQL in
production.

To put it on the internet, follow **[DEPLOYMENT.md](./DEPLOYMENT.md)**.
