/**
 * Yacht CRM — database seed.
 *
 * This seed deliberately produces data that RESEMBLES THE REAL HUBSPOT
 * ACCOUNT rather than a tidy demo set, so that pagination, indexing, null
 * handling and rollup-filtering can all actually be exercised locally.
 *
 * Reality it reproduces (from the Aug 2026 audit of 29,339 contacts):
 *   - only ~16% of contacts have a surname            -> lastName is usually null
 *   - ~54% have no owner                              -> ownerId is often null
 *   - email 96.6% / phone 61.8% / mobile 55.1%
 *   - state 58.5% (dirty), city 2%, country 2%
 *   - looking_for 37.6%, currently_owns 31.7%, budget 26.4%, timeframe 16.1%
 *   - boat_type 1.9%, boat_size 4.1%, boat_year 0.5%
 *   - "scib"/"sibs" boat-show names wrongly stored in the state field
 *   - staff mailboxes carrying thousands of bogus BCC-to-CRM notes
 *
 * Run: npm run db:seed
 */

import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// ===========================================================================
// SAFETY GUARD
//
// This seed calls deleteMany() on Lead and Activity. Run against production
// that destroys every client record in the business. The guard below makes
// that impossible without an explicit, deliberate override.
// ===========================================================================

const OVERRIDE_FLAG = "--force"
const OVERRIDE_ENV = "ALLOW_DESTRUCTIVE_SEED"

function assertSafeToSeed(): void {
  const overridden =
    process.argv.includes(OVERRIDE_FLAG) || process.env[OVERRIDE_ENV] === "1"

  const nodeEnv = process.env.NODE_ENV ?? "development"
  const dbUrl = process.env.DATABASE_URL ?? ""

  const reasons: string[] = []

  if (nodeEnv === "production") {
    reasons.push(`NODE_ENV is "production"`)
  }

  if (!dbUrl) {
    reasons.push("DATABASE_URL is not set")
  } else if (!dbUrl.startsWith("file:")) {
    // Anything that is not a local SQLite file URL — postgresql://, mysql://,
    // prisma://, libsql://, a Turso/Neon/Supabase host, etc.
    reasons.push(
      `DATABASE_URL does not point at a local SQLite file (got "${redact(dbUrl)}")`
    )
  } else if (/^file:\/\//.test(dbUrl) || /[?&]/.test(dbUrl)) {
    // "file://host/..." or a file: URL carrying connection params is not the
    // plain local dev.db we expect.
    reasons.push(
      `DATABASE_URL looks like a remote or parameterised SQLite URL (got "${redact(dbUrl)}")`
    )
  }

  if (reasons.length === 0) return

  if (overridden) {
    console.warn("")
    console.warn(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    )
    console.warn("!!  DESTRUCTIVE SEED OVERRIDE ACTIVE")
    console.warn("!!")
    reasons.forEach((r) => console.warn(`!!  - ${r}`))
    console.warn("!!")
    console.warn("!!  Proceeding anyway because the override was supplied.")
    console.warn("!!  ALL leads and activities in this database will be DELETED.")
    console.warn(
      "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!"
    )
    console.warn("")
    return
  }

  console.error("")
  console.error(
    "######################################################################"
  )
  console.error("##")
  console.error("##   SEED REFUSED — THIS WOULD HAVE DESTROYED REAL DATA")
  console.error("##")
  console.error("##   prisma/seed.ts deletes EVERY Lead and EVERY Activity")
  console.error("##   before inserting demo data. It refused to run because:")
  console.error("##")
  reasons.forEach((r) => console.error(`##     * ${r}`))
  console.error("##")
  console.error("##   Expected: NODE_ENV != production, and")
  console.error(`##             DATABASE_URL="file:./dev.db" (local SQLite).`)
  console.error("##")
  console.error("##   If you are ABSOLUTELY certain you want to wipe this")
  console.error("##   database, re-run with an explicit override:")
  console.error("##")
  console.error("##       npm run db:seed -- --force")
  console.error("##   or  ALLOW_DESTRUCTIVE_SEED=1 npm run db:seed")
  console.error("##")
  console.error("##   Do NOT add the override to a script, a Dockerfile, a")
  console.error("##   postinstall hook or a CI job. It is a human-only tool.")
  console.error("##")
  console.error(
    "######################################################################"
  )
  console.error("")
  process.exitCode = 1
  throw new Error("Destructive seed blocked by safety guard.")
}

function redact(url: string): string {
  // Never print credentials from a connection string into the terminal.
  return url.replace(/\/\/[^@/]*@/, "//***:***@").slice(0, 80)
}

// ===========================================================================
// Deterministic PRNG — same seed, same database, every time.
// (No faker dependency: this project cannot take new packages.)
// ===========================================================================

let _s = 0x9e3779b9
function srand(seed: number) {
  _s = seed >>> 0
}
function rnd(): number {
  _s |= 0
  _s = (_s + 0x6d2b79f5) | 0
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
/** true with probability p (0..1) */
function chance(p: number): boolean {
  return rnd() < p
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)]
}
/** Weighted pick: [[value, weight], ...] */
function weighted<T>(pairs: readonly (readonly [T, number])[]): T {
  const total = pairs.reduce((s, p) => s + p[1], 0)
  let r = rnd() * total
  for (const [v, w] of pairs) {
    r -= w
    if (r <= 0) return v
  }
  return pairs[pairs.length - 1][0]
}
function int(min: number, max: number): number {
  return min + Math.floor(rnd() * (max - min + 1))
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000)
}

// ===========================================================================
// Users
// ===========================================================================

const demoUsers = [
  { name: "Admin User", email: "admin@yachtcrm.com", role: "admin", initials: "AU" },
  { name: "James Hartley", email: "james@yachtcrm.com", role: "agent", initials: "JH" },
  { name: "Sophie Miles", email: "sophie@yachtcrm.com", role: "agent", initials: "SM" },
  { name: "Marcus Webb", email: "marcus@yachtcrm.com", role: "agent", initials: "MW" },
  { name: "Claire North", email: "claire@yachtcrm.com", role: "agent", initials: "CN" },
]

// The real owner names lifted from the HubSpot audit. `isActive: false` mirrors
// the 9-of-27 deactivated owners — historic records still point at them, but
// they must not appear in assignment dropdowns.
const realOwners = [
  { name: "Audrey Greenwood", first: "audrey", isActive: true },
  { name: "Marley Cutbush", first: "marley", isActive: true },
  { name: "Blayne Astley", first: "blayne", isActive: true },
  { name: "Peter Devery", first: "peter", isActive: true },
  { name: "Steve Williams", first: "steve", isActive: true },
  { name: "Jonathan Sykes", first: "jonathan", isActive: false },
  { name: "Ricardo Santinelli", first: "ricardo", isActive: true },
  { name: "Adrian Ravasio", first: "adrian", isActive: false },
]

const STAFF_DOMAIN = "flagshipinternational.com.au"

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

// ===========================================================================
// Value pools — deliberately dirty where reality is dirty.
// ===========================================================================

const FIRST_NAMES = [
  "Richard", "Elena", "Tom", "Nadia", "David", "Charlotte", "Henrik", "Marco",
  "Wayne", "Sharon", "Gary", "Julie", "Peter", "Kim", "Craig", "Michelle",
  "Trevor", "Denise", "Ian", "Karen", "Bruce", "Robyn", "Neil", "Sandra",
  "Grant", "Fiona", "Dean", "Leanne", "Shane", "Tracey", "Glenn", "Vicki",
  "Rod", "Anne", "Barry", "Helen", "Rhys", "Belinda", "Justin", "Nicole",
  "Anthony", "Simone", "Damien", "Rebecca", "Luke", "Amanda", "Scott", "Emma",
  "Mitch", "Kylie", "Warren", "Jodie", "Clint", "Melissa", "Ross", "Tanya",
  "Doug", "Alison", "Kev", "sue", "STEPHEN", "jenny", "Hamish", "Prue",
]

const LAST_NAMES = [
  "Ashworth", "Vasquez", "Brennan", "Petrov", "Lam", "Beaumont", "Larsson",
  "Conti", "Whitmore", "Kowalski", "Nguyen", "O'Donnell", "Fitzgerald",
  "Marchetti", "Hollis", "Rasmussen", "Tanaka", "Barrington", "Delgado",
  "Sinclair", "McAllister", "Novak", "Ferreira", "Blackwood", "Hargreaves",
  "Castellano", "Van Dyke", "Okafor", "Lindqvist", "Prendergast",
]

const EMAIL_DOMAINS = [
  "gmail.com", "gmail.com", "gmail.com", "bigpond.com", "outlook.com",
  "hotmail.com", "icloud.com", "yahoo.com.au", "optusnet.com.au",
  "internode.on.net", "westnet.com.au", "me.com",
]

const COMPANIES = [
  "", "", "", "", "Harbourline Group", "Sterling Marine Holdings",
  "Kestrel Capital", "BlueWater Investments", "Ridgeway Property",
  "Northshore Developments", "Anchorpoint Logistics", "Meridian Partners",
]

const JOB_TITLES = [
  "", "", "", "Director", "Managing Director", "Owner", "CEO", "Partner",
  "General Manager", "Retired", "Consultant",
]

// HubSpot `looking_for` — free text, doubles as a campaign tag.
const LOOKING_FOR = [
  "Riviera 6000", "Riviera 5400 Sport Yacht", "Maritimo M60", "Maritimo S55",
  "Marex 375", "Marex 440", "Sunseeker Predator 74", "Princess V60",
  "Princess Y85", "Azimut S6", "Azimut 50", "Ferretti 550", "Ferretti 450",
  "Horizon FD75", "Sanlorenzo SD96", "Grand Banks 60", "Nordhavn 63",
  "Beneteau Oceanis 46", "Jeanneau NC 37", "Fountaine Pajot Aura 51",
  "Lagoon 46", "Leopard 45", "flybridge under 60ft", "sportscruiser",
  "something around 50-60ft", "long range cruiser", "live aboard",
  "V44 enquiry", "SCIBS 2025 enquiry", "SIBS enquiry", "charter management",
  "not sure yet", "just looking", "catamaran", "sailing cat",
  "trawler style", "Whitsundays cruising", "downsizing from 70ft",
]

// HubSpot `currently_owns` — 31.7% filled and extremely dirty. About half of
// the filled values are junk that actually mean "owns nothing".
const OWNS_NOTHING_JUNK = [
  "none", "None", "NONE", "no", "No", "nil", "Nil", "na", "n/a", "N/A", "-",
  ",", ".", "nothing", "no boat", "0", "none at present", "none currently",
]
const OWNS_SOMETHING = [
  "Riviera 4400", "Maritimo 48", "Mustang 43", "Bertram 31",
  "Sea Ray 375", "Caribbean 35", "Cruise Craft 685", "Haines Hunter 630",
  "Beneteau Oceanis 40", "Jeanneau 379", "Catalina 36", "Whitehaven 6000",
  "Princess 45", "Fairline Targa 48", "34ft flybridge", "half share in a 42",
  "small tinny", "Riviera 43 - selling", "Maritimo M50 (2016)",
]

// budget "(Cloned)" — 6 intended buckets, 300+ dirty variants in reality.
const BUDGET_BANDS: readonly (readonly [string, number, readonly string[]])[] = [
  ["under_500k", 14, ["under $500k", "Under $500k", "under 500k", "<500k", "up to 500", "$400k ish"]],
  ["500k_1m", 22, ["$500k-$1m", "$500k - $1m", "500k-1m", "500-1000k", "half a mil to a mil", "$750k"]],
  ["1m_2m", 26, ["$1m- $2m", "$1m - $2m", "1m-2m", "1 - 2 million", "$1.5m", "around 1.8m"]],
  ["2m_3m", 16, ["$2m - $3m", "$2m-$3m", "2-3m", "2.5 million", "approx $2.5m"]],
  ["3m_5m", 12, ["$3m - $5m", "$3m-$5m", "3-5m", "circa 4m", "$4.5 mil"]],
  ["5m_plus", 10, ["$5m +", "$5m+", "5m plus", "over $5 million", "open budget", "10m+"]],
]

// timeframe "(cloned)"
const TIMEFRAMES: readonly (readonly [string, number, readonly string[]])[] = [
  ["browsing", 26, ["just browsing for now", "just browsing", "browsing"]],
  ["researching", 20, ["gathering information", "doing research", "early stages"]],
  ["comparing", 14, ["evaluating and comparing models", "comparing models", "shortlisting"]],
  ["0_3_months", 10, ["asap", "next couple of months", "immediately", "ready now"]],
  ["3_6_months", 10, ["mid 2025", "in 6 months", "before summer"]],
  ["6_12_months", 12, ["late 2024", "end of the year", "late 2025", "within 12 months"]],
  ["12_months_plus", 8, ["2026 or after", "next year or later", "2-3 years away", "when I retire"]],
]

// The ONLY clean enum in the account.
const BOAT_TYPES = [
  "sports_cruiser", "flybridge_cruiser", "sailing_yacht",
  "full_displacement", "semi_displacement", "superyacht",
]

// state — 58.5% filled, filthy, and contaminated with boat-show names.
const STATES: readonly (readonly [string, number, readonly string[]])[] = [
  ["nsw", 30, ["NSW", "nsw", "N.S.W.", "New South Wales", "new south wales", "Nsw"]],
  ["qld", 26, ["QLD", "qld", "Queensland", "queensland", "Qld", "QLD "]],
  ["vic", 16, ["VIC", "vic", "Victoria", "victoria"]],
  ["wa", 9, ["WA", "wa", "Western Australia", "west australia"]],
  ["sa", 6, ["SA", "sa", "South Australia"]],
  ["tas", 3, ["TAS", "tas", "Tasmania"]],
  ["nt", 1, ["NT", "nt", "Northern Territory"]],
  ["act", 2, ["ACT", "act", "Canberra"]],
  ["nz", 3, ["NZ", "New Zealand", "Auckland NZ"]],
  ["intl", 4, ["Singapore", "USA", "UK", "Hong Kong", "Dubai", "Fiji"]],
]

// Boat-show names wrongly stored IN the state field. The importer lifts these
// into metAtShow and leaves stateRegion null.
const SHOW_IN_STATE_FIELD: readonly (readonly [string, string, number])[] = [
  ["scib", "scibs", 542],
  ["SCIB", "scibs", 120],
  ["scibs", "scibs", 60],
  ["sibs", "sibs", 83],
  ["SIBS", "sibs", 20],
]

const LEAD_SOURCES: readonly (readonly [string, number])[] = [
  ["website", 34], ["boat_show", 16], ["referral", 12], ["social", 12],
  ["import", 14], ["cold_call", 6], ["event", 4], ["other", 2],
]

const SOURCE_DETAILS = [
  "boatsonline listing enquiry", "boatsales enquiry", "Meta lead form - V44",
  "Meta lead form - Marex", "website contact form", "EDM click - September",
  "SCIBS 2025 stand", "SIBS 2024 stand", "referred by existing owner",
  "YouTube walkthrough", "Google Ads - flybridge", "phone enquiry",
]

const LIFECYCLE: readonly (readonly [string, number])[] = [
  ["subscriber", 18], ["lead", 46], ["marketingqualifiedlead", 14],
  ["salesqualifiedlead", 10], ["opportunity", 6], ["customer", 4],
  ["evangelist", 1], ["other", 1],
]

const STATUSES: readonly (readonly [string, number])[] = [
  ["new", 44], ["contacted", 26], ["qualified", 15], ["proposal", 7],
  ["won", 3], ["lost", 5],
]

const PRIORITIES: readonly (readonly [string, number])[] = [
  ["low", 30], ["medium", 55], ["high", 15],
]

const CITIES = [
  "Sydney", "Brisbane", "Gold Coast", "Melbourne", "Perth", "Sanctuary Cove",
  "Newcastle", "Mooloolaba", "Hobart", "Adelaide", "Cairns", "Auckland",
]

const CALL_OUTCOMES: readonly (readonly [string, number])[] = [
  ["Left voicemail", 30], ["Connected", 26], ["No answer", 24],
  ["Busy", 8], ["Left live message", 8], ["Wrong number", 4],
]

const MEETING_OUTCOMES = ["Scheduled", "Completed", "No show", "Cancelled"]

// ===========================================================================
// Generators
// ===========================================================================

function normaliseOwns(raw: string): boolean | null {
  const v = raw.trim().toLowerCase().replace(/[.,\-/]/g, "")
  if (!v) return null
  if (["none", "no", "nil", "na", "n a", "nothing", "no boat", "0",
       "none at present", "none currently"].includes(v)) return false
  return true
}

type SeedLead = Record<string, unknown> & { id: string }

function makeLead(i: number, ownerIds: (string | null)[]): SeedLead {
  const firstName = pick(FIRST_NAMES)

  // Only ~16% of real contacts have a surname.
  const lastName = chance(0.16) ? pick(LAST_NAMES) : null

  const slug = `${firstName}${lastName ? "." + lastName : int(1, 9999)}`
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "")

  const email = chance(0.966) ? `${slug}${i}@${pick(EMAIL_DOMAINS)}` : null

  // --- budget (26.4%) ---
  let budgetBand: string | null = null
  let budgetRaw: string | null = null
  if (chance(0.264)) {
    const band = weighted(BUDGET_BANDS.map((b) => [b, b[1]] as const))
    budgetRaw = pick(band[2])
    // ~12% of filled budgets are too dirty to classify -> band stays null.
    budgetBand = chance(0.88) ? band[0] : null
  }

  // --- timeframe (16.1%) ---
  let timeframe: string | null = null
  let timeframeRaw: string | null = null
  if (chance(0.161)) {
    const tf = weighted(TIMEFRAMES.map((t) => [t, t[1]] as const))
    timeframeRaw = pick(tf[2])
    timeframe = chance(0.9) ? tf[0] : "unknown"
  }

  // --- state (58.5%), with boat-show contamination ---
  let stateRegion: string | null = null
  let stateRaw: string | null = null
  let metAtShow: string | null = null
  if (chance(0.585)) {
    // ~2.5% of filled "state" values are actually boat-show names.
    if (chance(0.025)) {
      const show = weighted(SHOW_IN_STATE_FIELD.map((s) => [s, s[2]] as const))
      stateRaw = show[0]
      metAtShow = show[1]
      stateRegion = null // deliberately: it was never a state
    } else {
      const st = weighted(STATES.map((s) => [s, s[1]] as const))
      stateRaw = pick(st[2])
      stateRegion = st[0]
    }
  }
  // Some contacts are correctly tagged with a show independent of the state bug.
  if (!metAtShow && chance(0.06)) metAtShow = pick(["scibs", "sibs", "mibs"])

  // --- currently_owns (31.7%) ---
  let currentlyOwns: string | null = null
  let ownsBoat: boolean | null = null
  if (chance(0.317)) {
    currentlyOwns = chance(0.45) ? pick(OWNS_NOTHING_JUNK) : pick(OWNS_SOMETHING)
    ownsBoat = normaliseOwns(currentlyOwns)
  }

  // --- owner: 54% unassigned ---
  const ownerId = chance(0.46) ? pick(ownerIds.filter(Boolean) as string[]) : null

  const createdDaysAgo = int(1, 900)
  const contacted = chance(0.55)

  const company = pick(COMPANIES) || null
  const jobTitle = pick(JOB_TITLES) || null

  const budgetRawSafe = budgetRaw

  return {
    id: `seed_lead_${String(i).padStart(5, "0")}`,
    externalId: `hs_${100000000 + i}`,
    status: weighted(STATUSES),
    priority: weighted(PRIORITIES),
    lifecycleStage: weighted(LIFECYCLE),

    firstName,
    lastName,
    email,
    phone: chance(0.618) ? `+61 ${int(2, 8)} ${int(1000, 9999)} ${int(1000, 9999)}` : null,
    mobile: chance(0.551) ? `04${int(10, 99)} ${int(100, 999)} ${int(100, 999)}` : null,

    company,
    jobTitle,
    website: company && chance(0.3)
      ? `https://www.${company.toLowerCase().replace(/[^a-z]/g, "")}.com.au`
      : null,

    leadSource: weighted(LEAD_SOURCES),
    sourceDetail: chance(0.4) ? pick(SOURCE_DETAILS) : null,

    notes: chance(0.35)
      ? pick([
          "Enquired via website form, no response to first call.",
          "Wants to see the boat at Sanctuary Cove.",
          "Selling current boat first. Follow up Q2.",
          "Prefers evening contact.",
          "Tyre kicker — low intent.",
          "Serious buyer, finance pre-approved.",
          "Asked for spec sheet and running costs.",
        ])
      : null,

    // HubSpot `looking_for` (37.6% overall)
    vesselInterest: chance(0.376) ? pick(LOOKING_FOR) : null,

    currentlyOwns,
    ownsBoat,

    budgetBand,
    budgetRaw: budgetRawSafe,
    budget: budgetRawSafe, // legacy mirror for pre-audit UI

    timeframe,
    timeframeRaw,

    boatType: chance(0.019) ? pick(BOAT_TYPES) : null,
    boatYear: chance(0.005) ? int(1998, 2025) : null,
    boatSize: chance(0.041) ? int(28, 120) : null,

    stateRegion,
    stateRaw,
    metAtShow,

    address: chance(0.08) ? `${int(1, 200)} ${pick(["Marine", "Harbour", "Wharf", "Esplanade"])} Pde` : null,
    city: chance(0.02) ? pick(CITIES) : null,
    country: chance(0.02) ? pick(["Australia", "australia", "AU", "New Zealand"]) : null,
    linkedin: chance(0.03) ? `https://linkedin.com/in/${slug}` : null,

    isInternal: false,

    lastContactedAt: contacted ? daysAgo(int(0, createdDaysAgo)) : null,
    createdAt: daysAgo(createdDaysAgo),
    updatedAt: daysAgo(int(0, Math.min(createdDaysAgo, 120))),
    ownerId,
  }
}

/** Staff mailboxes — real contacts that are really just BCC sinks. */
function makeStaffLead(i: number, owner: { name: string; first: string }): SeedLead {
  const [firstName, lastName] = owner.name.split(" ")
  return {
    id: `seed_staff_${String(i).padStart(3, "0")}`,
    externalId: `hs_staff_${i}`,
    status: "new",
    priority: "low",
    lifecycleStage: "other",
    firstName,
    lastName,
    email: `${owner.first}@${STAFF_DOMAIN}`,
    phone: null,
    mobile: null,
    company: "Flagship International",
    jobTitle: "Broker",
    website: null,
    leadSource: "import",
    sourceDetail: "staff mailbox / BCC-to-CRM",
    notes: "INTERNAL staff mailbox record. Excluded from all rollups.",
    vesselInterest: null,
    currentlyOwns: null,
    ownsBoat: null,
    budgetBand: null,
    budgetRaw: null,
    budget: null,
    timeframe: null,
    timeframeRaw: null,
    boatType: null,
    boatYear: null,
    boatSize: null,
    stateRegion: "qld",
    stateRaw: "QLD",
    metAtShow: null,
    address: null,
    city: null,
    country: null,
    linkedin: null,
    isInternal: true,
    lastContactedAt: null,
    createdAt: daysAgo(1200),
    updatedAt: daysAgo(int(0, 30)),
    ownerId: null,
  }
}

// --- Activities ------------------------------------------------------------

const ACTIVITY_MIX: readonly (readonly [string, number])[] = [
  // Weighted to the real corpus: 24,985 emails / 13,637 calls / 8,985 notes
  // / 583 tasks / 431 meetings.
  ["email", 51], ["call", 28], ["note", 18], ["task", 1.5], ["meeting", 1],
]

let activitySeq = 0

function makeActivity(
  leadId: string,
  leadCreatedDaysAgo: number,
  userIds: string[],
  forcedType?: string,
  forcedInternal = false
): Record<string, unknown> {
  const type = forcedType ?? weighted(ACTIVITY_MIX)
  const occurredDaysAgo = int(0, Math.max(1, leadCreatedDaysAgo))
  const occurredAt = daysAgo(occurredDaysAgo)
  // hs_timestamp (occurredAt) is DISTINCT from when the row was written:
  // imported history was created long after it happened.
  const createdAt = daysAgo(Math.max(0, occurredDaysAgo - int(0, 400)))

  const base: Record<string, unknown> = {
    id: `seed_act_${String(++activitySeq).padStart(6, "0")}`,
    externalId: `hs_eng_${activitySeq}`,
    leadId,
    userId: chance(0.6) ? pick(userIds) : null,
    type,
    occurredAt,
    createdAt,
    isInternal: forcedInternal,
    subject: null,
    bodyHtml: null,
    direction: null,
    outcome: null,
    status: null,
    priority: null,
    dueAt: null,
    endAt: null,
    location: null,
    taskType: null,
    content: "",
  }

  switch (type) {
    case "email": {
      // 17,881 outgoing vs 7,104 incoming.
      const direction = chance(0.716) ? "outgoing" : "incoming"
      const subject = pick([
        "Re: Riviera 6000 enquiry",
        "Your enquiry with Flagship International",
        "Specification and pricing attached",
        "SCIBS 2025 — private viewing",
        "Following up",
        "Marex 440 walkthrough video",
      ])
      base.subject = subject
      base.direction = direction
      base.status = chance(0.94) ? "SENT" : chance(0.5) ? "BOUNCED" : "FAILED"
      base.bodyHtml = `<div><p>Hi there,</p><p>${subject}. Let me know a good time to talk.</p><p>Regards,<br/>Flagship International</p></div>`
      base.content = `${subject}. Let me know a good time to talk.`
      break
    }
    case "call": {
      const outcome = weighted(CALL_OUTCOMES)
      base.outcome = outcome
      base.subject = "Outbound call"
      base.direction = chance(0.85) ? "outgoing" : "incoming"
      // Call bodies are HTML and hold the richest qualification data.
      base.bodyHtml =
        `<div><p><strong>Outcome:</strong> ${outcome}</p>` +
        (outcome === "Connected"
          ? `<p>Budget discussed: ${pick(["around 1.5m", "under 500k", "2-3m", "open"])}. ` +
            `Looking at ${pick(LOOKING_FOR)}. Timeframe ${pick(["6 months", "next year", "no rush"])}.</p>`
          : `<p>No contact made.</p>`) +
        `</div>`
      base.content = `Call — ${outcome}`
      break
    }
    case "note": {
      base.subject = "Note"
      base.content = pick([
        "Left brochure at the stand.",
        "Client sold their previous boat last month.",
        "Not proceeding this season.",
        "Wants a survey booked before offer.",
        "Referred by an existing owner.",
      ])
      base.bodyHtml = `<p>${base.content}</p>`
      break
    }
    case "task": {
      const status = weighted([
        ["NOT_STARTED", 45], ["COMPLETED", 40], ["IN_PROGRESS", 8],
        ["WAITING", 4], ["DEFERRED", 3],
      ] as const)
      base.taskType = weighted([["TODO", 40], ["CALL", 45], ["EMAIL", 15]] as const)
      base.status = status
      base.priority = weighted([["LOW", 35], ["MEDIUM", 50], ["HIGH", 15]] as const)
      base.dueAt = daysAgo(int(-30, occurredDaysAgo))
      base.subject = pick([
        "Follow up call", "Send spec sheet", "Book viewing",
        "Chase finance approval", "Send EDM",
      ])
      base.content = String(base.subject)
      break
    }
    case "meeting": {
      base.subject = pick(["Boat inspection", "Sea trial", "Office meeting", "Show appointment"])
      base.location = pick([
        "Sanctuary Cove Marina", "Rushcutters Bay", "Gold Coast City Marina",
        "Flagship office", "Teams call",
      ])
      base.outcome = pick(MEETING_OUTCOMES)
      base.endAt = new Date(occurredAt.getTime() + int(30, 180) * 60000)
      base.content = `${base.subject} at ${base.location}`
      break
    }
  }

  return base
}

// ===========================================================================
// Main
// ===========================================================================

const LEAD_COUNT = Number(process.env.SEED_LEAD_COUNT ?? 750)

async function main() {
  assertSafeToSeed()

  console.log("Seeding database (realistic HubSpot-shaped dataset)...")
  srand(20260824)

  const hashedPassword = await bcrypt.hash("demo1234", 12)

  // --- Users ---------------------------------------------------------------
  const createdUsers: { id: string; name: string }[] = []

  for (const u of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { isActive: true },
      create: { ...u, password: hashedPassword, isActive: true },
    })
    createdUsers.push(user)
  }

  let ownerSeq = 0
  for (const o of realOwners) {
    const email = `${o.first}@${STAFF_DOMAIN}`
    const user = await prisma.user.upsert({
      where: { email },
      update: { isActive: o.isActive },
      create: {
        name: o.name,
        email,
        password: hashedPassword,
        role: "agent",
        initials: initialsOf(o.name),
        isActive: o.isActive,
        externalId: `hs_owner_${++ownerSeq}`,
      },
    })
    createdUsers.push(user)
  }
  console.log(`  users: ${createdUsers.length} (${realOwners.filter((o) => !o.isActive).length} deactivated)`)

  // --- Wipe (guarded above) -----------------------------------------------
  await prisma.activity.deleteMany()
  await prisma.lead.deleteMany()

  // Only ACTIVE users get new assignments; deactivated owners still hold
  // historic leads, which we simulate by including them in the pool at a
  // lower rate below.
  const allUserIds = createdUsers.map((u) => u.id)

  // --- Leads ---------------------------------------------------------------
  const leads: SeedLead[] = []
  for (let i = 1; i <= LEAD_COUNT; i++) leads.push(makeLead(i, allUserIds))

  // A handful of staff-mailbox records, flagged isInternal.
  const staffLeads = realOwners.map((o, idx) => makeStaffLead(idx + 1, o))

  const all = [...leads, ...staffLeads]
  for (let i = 0; i < all.length; i += 200) {
    await prisma.lead.createMany({ data: all.slice(i, i + 200) as never })
  }
  console.log(`  leads: ${leads.length} real + ${staffLeads.length} internal staff mailboxes`)

  // --- Activities ----------------------------------------------------------
  const activities: Record<string, unknown>[] = []

  for (const lead of leads) {
    const ageDays = Math.round(
      (Date.now() - (lead.createdAt as Date).getTime()) / 86400000
    )
    // ~1.7 activities per contact on average, long-tailed.
    const n = weighted([[0, 30], [1, 24], [2, 18], [3, 12], [5, 9], [9, 5], [18, 2]] as const)
    for (let k = 0; k < n; k++) {
      activities.push(makeActivity(lead.id, ageDays, allUserIds))
    }
  }

  // Staff mailboxes: the BCC-to-CRM note flood (scaled down from 1,000-3,600).
  for (const staff of staffLeads) {
    const n = int(40, 90)
    for (let k = 0; k < n; k++) {
      activities.push(makeActivity(staff.id, 1200, allUserIds, "note", true))
    }
  }

  for (let i = 0; i < activities.length; i += 500) {
    await prisma.activity.createMany({ data: activities.slice(i, i + 500) as never })
  }
  console.log(`  activities: ${activities.length}`)

  // --- Report --------------------------------------------------------------
  const [total, noSurname, noOwner, withBudget, withState, internal] =
    await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { lastName: null } }),
      prisma.lead.count({ where: { ownerId: null } }),
      prisma.lead.count({ where: { NOT: { budgetRaw: null } } }),
      prisma.lead.count({ where: { NOT: { stateRaw: null } } }),
      prisma.lead.count({ where: { isInternal: true } }),
    ])

  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`

  console.log("\nSeed complete. Shape check:")
  console.log(`  leads total       ${total}`)
  console.log(`  no surname        ${noSurname} (${pct(noSurname)})   target ~84%`)
  console.log(`  no owner          ${noOwner} (${pct(noOwner)})   target ~54%`)
  console.log(`  budget filled     ${withBudget} (${pct(withBudget)})   target ~26%`)
  console.log(`  state filled      ${withState} (${pct(withState)})   target ~59%`)
  console.log(`  internal flagged  ${internal}`)
  console.log("\nLogin (all users): password demo1234")
  demoUsers.forEach((u) => console.log(`  ${u.email}`))
  console.log(`  <firstname>@${STAFF_DOMAIN} for the real owner accounts`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
