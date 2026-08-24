/**
 * HubSpot free-tier data cleaning layer — UI, database and dependency free.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The HubSpot free tier does not allow dropdown/picklist properties, so every
 * high-value field on the 29,339-contact export is *free text*. The intended
 * buckets are in there, but so are 300+ hand-typed variants, whitespace and
 * underscore spellings of the same answer, bare numbers, junk, and values that
 * belong in a completely different field (a boat show typed into "State", a
 * date typed into "Budget").
 *
 * Every function here obeys the same rules:
 *
 *   1. TOTAL      — never throws, for any input, including null/undefined/""/junk.
 *   2. LOSSLESS   — the result always carries `raw`, the original string exactly
 *                   as it came out of HubSpot. Nothing is ever destroyed.
 *   3. HONEST     — `value` is non-null if and only if `recognised` is true, and
 *                   `reason` is non-null if and only if `value` is null. We never
 *                   guess: an unclassifiable value comes back as null with a
 *                   reason, and scripts/normalize-report.ts surfaces it so the
 *                   owner can extend the tables below.
 *
 * Nothing in this file imports anything. It is safe to use from a server
 * component, an API route, the CLI report, or a future import wizard.
 *
 * See docs/DATA-NORMALISATION.md for the plain-English version of all of this.
 */

/* -------------------------------------------------------------------------- */
/* Shared types                                                                */
/* -------------------------------------------------------------------------- */

/** Why a value could not be normalised. Always reported, never swallowed. */
export type FailureReason =
  /** Nothing there — null, undefined, "" or whitespace only. */
  | "empty"
  /** Filler that carries no information (",", "n/a", "tbc", "none"). */
  | "placeholder"
  /** Clearly a value for a *different* field (a date in the budget column, a
   *  boat show in the state column, the property label typed as the answer). */
  | "wrong_field"
  /** Understandable, but not specific enough to pick one bucket. */
  | "ambiguous"
  /** Not in any lookup table and no pattern matched. Extend the tables. */
  | "unrecognised"

/** Common shape of every normalisation result. */
export type Normalised<T> = {
  /** The original string, byte for byte (null only when there was nothing). */
  raw: string | null
  /** The normalised key, or null when we refused to guess. */
  value: T | null
  /** true exactly when `value` is non-null. */
  recognised: boolean
  /** Non-null exactly when `value` is null. */
  reason: FailureReason | null
}

/* -------------------------------------------------------------------------- */
/* Shared helpers                                                              */
/* -------------------------------------------------------------------------- */

const ODD_SPACE = /[   -​  　]/g
const ODD_DASH = /[‐-―−⁃]/g

/** Preserve the caller's string exactly; "" and non-strings become null. */
function keepRaw(raw: string | null | undefined): string | null {
  return typeof raw === "string" && raw !== "" ? raw : null
}

/**
 * Trimmed text to work from. The type says `string`, but CSV/JSON data at
 * runtime is whatever it wants to be, and rule 1 is "never throws" — so
 * anything that is not a string is treated as blank.
 */
function asText(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : ""
}

/**
 * Lookup key with words kept: lowercase, exotic spaces/dashes flattened, and
 * every run of punctuation (including "_") turned into a single space.
 *
 *   "early-_mid_2024"  -> "early mid 2024"
 *   "early - mid 2024" -> "early mid 2024"
 *   "early- mid 2024"  -> "early mid 2024"
 *
 * The three spellings of the same answer therefore collapse onto one key —
 * whitespace and underscore variants cost no extra rows in the tables.
 */
export function wordKey(value: string | null | undefined): string {
  return (typeof value === "string" ? value : "")
    .toLowerCase()
    .replace(ODD_SPACE, " ")
    .replace(ODD_DASH, "-")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Lookup key with everything except letters and digits removed, so spacing,
 * "$", "," and "-" variants of the same answer collapse onto one key.
 *
 *   "$1m - $2 m" -> "1m2m"
 *   "$1m- $2m"   -> "1m2m"
 *   "$5m +"      -> "5mplus"
 */
export function compactKey(value: string | null | undefined): string {
  return (typeof value === "string" ? value : "")
    .toLowerCase()
    .replace(ODD_SPACE, " ")
    .replace(ODD_DASH, "-")
    .replace(/\+/g, " plus ")
    .replace(/\bmillions?\b|\bmil\b|\bmm\b/g, "m")
    .replace(/\bthousands?\b/g, "k")
    .replace(/[^a-z0-9]+/g, "")
}

/** Collapse whitespace and strip wrapping punctuation, keeping letter case. */
function tidyText(value: string): string {
  return value
    .replace(ODD_SPACE, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.\-–—/\\|'"()]+/, "")
    .replace(/[\s,;:.\-–—/\\|'"()]+$/, "")
    .trim()
}

/**
 * Filler meaning "the person typing had nothing to say". Keyed by wordKey(),
 * so "N/A", "n.a." and "NA" all arrive here as "n a" or "na".
 */
const PLACEHOLDER_KEYS = [
  "", "na", "n a", "nil", "none", "no", "nothing", "null", "nan", "tbc", "tba",
  "unknown", "unsure", "not sure", "not applicable", "not specified", "no answer",
  "no idea", "n", "x", "xx", "xxx", "test", "asdf", "abc", "0", "00", "000",
  "poa", "open", "flexible", "negotiable", "any", "no budget", "undecided",
  "not decided", "not yet decided", "unspecified",
]

function isPlaceholder(key: string): boolean {
  return PLACEHOLDER_KEYS.indexOf(key) !== -1
}

const MONTH_WORDS =
  /\b(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december)\b/

/** Words that only ever appear in a *timeframe* answer, never in a price. */
const TIMEFRAME_WORDS =
  /\b(early|mid|late|browsing|browse|gather|gathering|evaluat|comparing|asap|immediately|quarter|onwards|before|during|season|summer|winter|christmas|xmas|months?|weeks?)\b/

/* -------------------------------------------------------------------------- */
/* 1. BUDGET                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * The six buckets the business actually uses. These are what HubSpot *should*
 * have stored; everything in the export is an attempt at one of them.
 */
export const BUDGET_BUCKETS = [
  "under_500k",
  "500k_1m",
  "1m_2m",
  "2m_3m",
  "3m_5m",
  "5m_plus",
] as const
export type BudgetBucket = (typeof BUDGET_BUCKETS)[number]

/** Human labels, for the UI and the coverage report. */
export const BUDGET_LABELS: Record<BudgetBucket, string> = {
  under_500k: "Under $500k",
  "500k_1m": "$500k - $1m",
  "1m_2m": "$1m - $2m",
  "2m_3m": "$2m - $3m",
  "3m_5m": "$3m - $5m",
  "5m_plus": "$5m +",
}

/** min inclusive, max exclusive (AUD). */
const BUDGET_BOUNDS: Array<{ bucket: BudgetBucket; min: number; max: number }> = [
  { bucket: "under_500k", min: 0, max: 500000 },
  { bucket: "500k_1m", min: 500000, max: 1000000 },
  { bucket: "1m_2m", min: 1000000, max: 2000000 },
  { bucket: "2m_3m", min: 2000000, max: 3000000 },
  { bucket: "3m_5m", min: 3000000, max: 5000000 },
  { bucket: "5m_plus", min: 5000000, max: Infinity },
]

/** Which bucket a dollar amount falls in. Negative/NaN return null. */
export function bucketForAmount(amount: number): BudgetBucket | null {
  if (typeof amount !== "number" || !isFinite(amount) || amount < 0) return null
  for (let i = 0; i < BUDGET_BOUNDS.length; i++) {
    if (amount < BUDGET_BOUNDS[i].max) return BUDGET_BOUNDS[i].bucket
  }
  return "5m_plus"
}

function boundsFor(bucket: BudgetBucket): { min: number; max: number } {
  for (let i = 0; i < BUDGET_BOUNDS.length; i++) {
    if (BUDGET_BOUNDS[i].bucket === bucket) return BUDGET_BOUNDS[i]
  }
  return { min: 0, max: Infinity }
}

/**
 * Exact answers seen in the export, keyed by compactKey(). The parser below
 * gets all of these right on its own — the table exists so the six intended
 * buckets and their commonest typos can never drift, and so a non-developer
 * can read the mapping.
 */
export const BUDGET_ALIASES: Record<string, BudgetBucket> = {
  // --- the six intended buckets, exactly as stored -----------------------
  under500k: "under_500k",
  "500k1m": "500k_1m",
  "1m2m": "1m_2m",
  "2m3m": "2m_3m",
  "3m5m": "3m_5m",
  "5mplus": "5m_plus",

  // --- long-hand dollar spellings of the same six ------------------------
  under500000: "under_500k",
  "5000001m": "500k_1m",
  "500k1000000": "500k_1m",
  "5000001000000": "500k_1m",
  "10000002m": "1m_2m",
  "1m2000000": "1m_2m",
  "10000002000000": "1m_2m",
  "20000003000000": "2m_3m",
  "30000005000000": "3m_5m",
  "5000000plus": "5m_plus",

  // --- other hand-typed shapes -------------------------------------------
  lessthan500k: "under_500k",
  below500k: "under_500k",
  upto500k: "under_500k",
  "0500k": "under_500k",
  sub500k: "under_500k",
  "500kunder": "under_500k",
  "500kandunder": "under_500k",
  "500kto1m": "500k_1m",
  "05m1m": "500k_1m",
  "1mto2m": "1m_2m",
  "1m15m": "1m_2m",
  "15m2m": "1m_2m",
  "2mto3m": "2m_3m",
  "3mto5m": "3m_5m",
  "5m": "5m_plus",
  over5m: "5m_plus",
  above5m: "5m_plus",
  morethan5m: "5m_plus",
  "5mabove": "5m_plus",
  "5mandabove": "5m_plus",
  "5mandover": "5m_plus",
  "5mover": "5m_plus",
}

/** How the bucket was arrived at — shown in the report so it can be audited. */
export type BudgetMatch = "alias" | "range" | "under" | "over" | "amount" | "none"

export type BudgetResult = Normalised<BudgetBucket> & {
  /** The dollar figure the bucket was decided from (low end of a range). */
  amount: number | null
  /** Both ends when the value was a range; null where the range is open. */
  low: number | null
  high: number | null
  matchedBy: BudgetMatch
}

type MoneyToken = { value: number; hadSuffix: boolean }

const MONEY_RE = /(\d[\d,]*(?:\.\d+)?)\s*(k|m|b|bn)?\b/gi

function suffixMultiplier(suffix: string): number {
  const s = suffix.toLowerCase()
  if (s === "k") return 1000
  if (s === "m") return 1000000
  if (s === "b" || s === "bn") return 1000000000
  return 1
}

/**
 * Pull the dollar figures out of a budget string.
 *
 * A bare number sitting next to a suffixed one inherits the magnitude that
 * keeps the range ascending: "$500 - $1m" reads as 500k-1m (500m would not be
 * ascending), and "$1m - 2" reads as 1m-2m.
 */
function extractMoney(text: string): MoneyToken[] {
  const tokens: MoneyToken[] = []
  MONEY_RE.lastIndex = 0
  let match = MONEY_RE.exec(text)
  while (match) {
    const digits = Number(match[1].replace(/,/g, ""))
    if (!isNaN(digits)) {
      const suffix = match[2] ?? ""
      tokens.push({ value: digits * suffixMultiplier(suffix), hadSuffix: suffix !== "" })
    }
    match = MONEY_RE.exec(text)
  }

  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].hadSuffix || tokens[i].value >= 1000) continue

    const next = tokens[i + 1]
    if (next && next.hadSuffix) {
      const candidates = [tokens[i].value * 1000000, tokens[i].value * 1000, tokens[i].value]
      for (let c = 0; c < candidates.length; c++) {
        if (candidates[c] < next.value) {
          tokens[i].value = candidates[c]
          break
        }
      }
      continue
    }

    const prev = tokens[i - 1]
    if (prev && prev.hadSuffix) {
      const candidates = [tokens[i].value, tokens[i].value * 1000, tokens[i].value * 1000000]
      for (let c = 0; c < candidates.length; c++) {
        if (candidates[c] > prev.value) {
          tokens[i].value = candidates[c]
          break
        }
      }
    }
  }

  return tokens
}

function budgetFailure(raw: string | null, reason: FailureReason): BudgetResult {
  return { raw, value: null, recognised: false, reason, amount: null, low: null, high: null, matchedBy: "none" }
}

/**
 * Normalise a free-text budget into one of the six buckets.
 *
 * Handles the six intended answers and their whitespace/underscore/dollar-sign
 * variants, ranges ("$500,000 - $1m"), open ranges ("under $500k", "$5m +") and
 * bare numbers ("69950", "420000", "299000"), which are bucketed by value.
 *
 * Returns null — never a guess — for values that are not budgets at all: dates
 * such as "early- mid 2024", bare years, placeholders and junk.
 */
export function normaliseBudget(raw: string | null | undefined): BudgetResult {
  const original = keepRaw(raw)
  const text = asText(raw)
  if (text === "") return budgetFailure(original, "empty")

  const alias = BUDGET_ALIASES[compactKey(text)]
  if (alias) {
    const bounds = boundsFor(alias)
    return {
      raw: original,
      value: alias,
      recognised: true,
      reason: null,
      amount: bounds.min,
      low: bounds.min,
      high: isFinite(bounds.max) ? bounds.max : null,
      matchedBy: "alias",
    }
  }

  const words = wordKey(text)
  if (isPlaceholder(words)) return budgetFailure(original, "placeholder")

  // A budget column holding a timeframe. These must be reported, not forced
  // into a price bucket — "early- mid 2024" is not a number of dollars.
  const hasMoneyMarker = /[$€£]|\d\s*[km]\b|\d{1,3}(,\d{3})+|\d{5,}/i.test(text)
  const bareYear = /^\s*(19|20)\d{2}\s*$/.test(text)
  if (bareYear || MONTH_WORDS.test(words) || (TIMEFRAME_WORDS.test(words) && !hasMoneyMarker)) {
    return budgetFailure(original, "wrong_field")
  }

  if (!/\d/.test(text)) return budgetFailure(original, "unrecognised")

  const tokens = extractMoney(text)
  if (tokens.length === 0) return budgetFailure(original, "unrecognised")

  const isUnder = /\b(under|below|less than|lower than|up to|upto|max|maximum|no more than)\b|^</.test(words)
  const isOver = /\+/.test(text) || /\b(over|above|more than|at least|plus|minimum|starting at)\b/.test(words)

  // A range: two or more figures. The LOW end decides the bucket, which is
  // what makes "$3m - $5m" land in 3m_5m rather than straddling two buckets.
  if (tokens.length >= 2) {
    const values = tokens.map((t) => t.value).sort((a, b) => a - b)
    const low = values[0]
    const high = values[values.length - 1]
    const bucket = bucketForAmount(low)
    if (!bucket) return budgetFailure(original, "unrecognised")
    return { raw: original, value: bucket, recognised: true, reason: null, amount: low, low, high, matchedBy: "range" }
  }

  const amount = tokens[0].value

  // "$5m +" / "over $2m" — the figure is the floor.
  if (isOver && !isUnder) {
    const bucket = bucketForAmount(amount)
    if (!bucket) return budgetFailure(original, "unrecognised")
    return { raw: original, value: bucket, recognised: true, reason: null, amount, low: amount, high: null, matchedBy: "over" }
  }

  // "under $500k" — the figure is the ceiling, so bucket the dollar below it.
  if (isUnder) {
    const bucket = bucketForAmount(Math.max(0, amount - 1))
    if (!bucket) return budgetFailure(original, "unrecognised")
    return { raw: original, value: bucket, recognised: true, reason: null, amount, low: 0, high: amount, matchedBy: "under" }
  }

  // A bare number under $1,000 could be dollars, thousands or millions —
  // "2" is as likely to mean $2m as $2. Refuse to guess.
  if (!tokens[0].hadSuffix && amount < 1000) return budgetFailure(original, "ambiguous")

  const bucket = bucketForAmount(amount)
  if (!bucket) return budgetFailure(original, "unrecognised")
  return { raw: original, value: bucket, recognised: true, reason: null, amount, low: amount, high: amount, matchedBy: "amount" }
}

/* -------------------------------------------------------------------------- */
/* 2. TIMEFRAME                                                                */
/* -------------------------------------------------------------------------- */

export const TIMEFRAME_CATEGORIES = [
  "just_browsing",
  "gathering_info",
  "evaluating",
  "ready_to_buy",
  "period_specific",
] as const
export type TimeframeCategory = (typeof TIMEFRAME_CATEGORIES)[number]

export const TIMEFRAME_LABELS: Record<TimeframeCategory, string> = {
  just_browsing: "Just browsing",
  gathering_info: "Gathering information",
  evaluating: "Evaluating / comparing models",
  ready_to_buy: "Ready to buy",
  period_specific: "Specific period given",
}

/** The structured half of a "period_specific" answer. */
export type TimeframePeriod = {
  /** Calendar year, when one was given. */
  year: number | null
  /** H1 = Jan-Jun ("early", "mid", Q1/Q2); H2 = Jul-Dec ("late", Q3/Q4). */
  half: "H1" | "H2" | null
  /** "in" that period, "or_after" it, or "before" it. */
  qualifier: "in" | "or_after" | "before" | null
  /** For relative answers such as "6-12 months". */
  monthsAway: { min: number | null; max: number | null } | null
}

export type TimeframeResult = Normalised<TimeframeCategory> & {
  period: TimeframePeriod | null
}

/**
 * Exact answers, keyed by wordKey(). The three spellings of the same answer in
 * the export — "early - mid 2024", "early- mid 2024" and "early-_mid_2024" —
 * all collapse to "early mid 2024", so they need no extra rows anywhere.
 */
export const TIMEFRAME_ALIASES: Record<string, TimeframeCategory> = {
  // --- just browsing ------------------------------------------------------
  "just browsing for now": "just_browsing",
  "just browsing": "just_browsing",
  browsing: "just_browsing",
  "just looking": "just_browsing",
  "looking only": "just_browsing",
  "no timeframe": "just_browsing",
  "no time frame": "just_browsing",
  "not looking to buy": "just_browsing",
  "no rush": "just_browsing",
  dreaming: "just_browsing",
  someday: "just_browsing",
  "one day": "just_browsing",

  // --- gathering information ---------------------------------------------
  "starting to gather information": "gathering_info",
  "gathering information": "gathering_info",
  "gathering info": "gathering_info",
  "information gathering": "gathering_info",
  "still gathering information": "gathering_info",
  researching: "gathering_info",
  research: "gathering_info",
  "doing research": "gathering_info",
  "early stages": "gathering_info",
  "early stage": "gathering_info",

  // --- evaluating ---------------------------------------------------------
  "evaluating and comparing models": "evaluating",
  "evaluating and comparing": "evaluating",
  "comparing models": "evaluating",
  "comparing options": "evaluating",
  evaluating: "evaluating",
  shortlisting: "evaluating",
  "narrowing down": "evaluating",
  "sea trials": "evaluating",

  // --- ready to buy -------------------------------------------------------
  "ready to buy": "ready_to_buy",
  "ready to purchase": "ready_to_buy",
  "ready to order": "ready_to_buy",
  "looking to buy now": "ready_to_buy",
  "buying now": "ready_to_buy",
  "purchasing now": "ready_to_buy",
  asap: "ready_to_buy",
  "as soon as possible": "ready_to_buy",
  immediately: "ready_to_buy",
  immediate: "ready_to_buy",
  now: "ready_to_buy",
  "right now": "ready_to_buy",
  "this month": "ready_to_buy",
  "next few weeks": "ready_to_buy",
  "within weeks": "ready_to_buy",
}

/**
 * Values we deliberately refuse to classify. "buying stage" is the HubSpot
 * *property label* leaking into the value — it is the question, not an answer,
 * so it must never become a category. 139 records; they are reported instead.
 */
const TIMEFRAME_REFUSALS: Record<string, FailureReason> = {
  "buying stage": "wrong_field",
  "time frame": "wrong_field",
  timeframe: "wrong_field",
  "purchase timeframe": "wrong_field",
  "when are you looking to buy": "wrong_field",
}

const HALF_ONE =
  /\b(early|mid|middle|first half|1st half|h1|q1|q2|jan|january|feb|february|mar|march|apr|april|may|jun|june)\b/
const HALF_TWO =
  /\b(late|later|second half|2nd half|h2|q3|q4|end of|jul|july|aug|august|sep|sept|september|oct|october|nov|november|dec|december|christmas|xmas)\b/

function parsePeriod(words: string, original: string): TimeframePeriod | null {
  const yearMatch = words.match(/\b((?:19|20)\d{2})\b/)
  const year = yearMatch ? Number(yearMatch[1]) : null

  let monthsAway: TimeframePeriod["monthsAway"] = null
  const monthRange = words.match(/\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*months?\b/)
  const withinMonths = words.match(/\bwithin\s*(\d{1,2})\s*months?\b/)
  const monthsPlain = words.match(/\b(\d{1,2})\s*months?\b/)
  if (monthRange) {
    monthsAway = { min: Number(monthRange[1]), max: Number(monthRange[2]) }
  } else if (withinMonths) {
    monthsAway = { min: 0, max: Number(withinMonths[1]) }
  } else if (monthsPlain) {
    const openEnded = /\+|\bplus\b|\bor more\b|\bonwards?\b/.test(original.toLowerCase())
    const n = Number(monthsPlain[1])
    monthsAway = openEnded ? { min: n, max: null } : { min: n, max: n }
  }

  if (year === null && monthsAway === null) return null

  // "early - mid 2024" contains both "early" and "mid"; both are H1, so an
  // explicit "early" wins over anything H2-ish that may also be present.
  let half: TimeframePeriod["half"] = null
  if (HALF_TWO.test(words)) half = "H2"
  if (HALF_ONE.test(words)) half = half === "H2" && !/\bearly\b/.test(words) ? "H2" : "H1"

  let qualifier: TimeframePeriod["qualifier"] = "in"
  if (/\b(or after|or later|onwards|onward|and beyond|and after|or beyond)\b/.test(words) || /\+/.test(original)) {
    qualifier = "or_after"
  } else if (/\b(before|by|prior to|no later than)\b/.test(words)) {
    qualifier = "before"
  }

  return { year, half, qualifier, monthsAway }
}

/**
 * Normalise a free-text purchase timeframe into one of five categories, and —
 * when the answer names a period — return the structured year/half alongside.
 *
 *   "late 2024"       -> period_specific + { year: 2024, half: "H2" }
 *   "early- mid 2024" -> period_specific + { year: 2024, half: "H1" }
 *   "2026 or after"   -> period_specific + { year: 2026, qualifier: "or_after" }
 */
export function normaliseTimeframe(raw: string | null | undefined): TimeframeResult {
  const original = keepRaw(raw)
  const text = asText(raw)
  if (text === "") return { raw: original, value: null, recognised: false, reason: "empty", period: null }

  const words = wordKey(text)

  const refusal = TIMEFRAME_REFUSALS[words]
  if (refusal) return { raw: original, value: null, recognised: false, reason: refusal, period: null }

  const alias = TIMEFRAME_ALIASES[words]
  if (alias) return { raw: original, value: alias, recognised: true, reason: null, period: null }

  if (isPlaceholder(words)) return { raw: original, value: null, recognised: false, reason: "placeholder", period: null }

  const period = parsePeriod(words, text)
  if (period) return { raw: original, value: "period_specific", recognised: true, reason: null, period }

  // Phrase matching for the long free-text answers that are not in the table.
  if (/\b(brows|just look|no rush|not in a hurry|someday|one day|dream)/.test(words)) {
    return { raw: original, value: "just_browsing", recognised: true, reason: null, period: null }
  }
  if (/\b(gather|research|early stage|starting out|information|initial enquiry)/.test(words)) {
    return { raw: original, value: "gathering_info", recognised: true, reason: null, period: null }
  }
  if (/\b(evaluat|compar|shortlist|narrow|assess|sea trial|inspect)/.test(words)) {
    return { raw: original, value: "evaluating", recognised: true, reason: null, period: null }
  }
  if (/\b(ready|asap|immediat|buying now|purchase now|this month|next few weeks|urgent)/.test(words)) {
    return { raw: original, value: "ready_to_buy", recognised: true, reason: null, period: null }
  }

  return { raw: original, value: null, recognised: false, reason: "unrecognised", period: null }
}

/* -------------------------------------------------------------------------- */
/* 3. STATE / REGION  (+ boat shows wrongly typed into it)                     */
/* -------------------------------------------------------------------------- */

export const AU_STATES = ["NSW", "QLD", "VIC", "WA", "SA", "TAS", "ACT", "NT"] as const
export type AuState = (typeof AU_STATES)[number]

/** AU states plus the two other buckets the CRM needs. */
export const REGION_CODES = ["NSW", "QLD", "VIC", "WA", "SA", "TAS", "ACT", "NT", "NZ", "INTL"] as const
export type RegionCode = (typeof REGION_CODES)[number]

export const REGION_LABELS: Record<RegionCode, string> = {
  NSW: "New South Wales",
  QLD: "Queensland",
  VIC: "Victoria",
  WA: "Western Australia",
  SA: "South Australia",
  TAS: "Tasmania",
  ACT: "Australian Capital Territory",
  NT: "Northern Territory",
  NZ: "New Zealand",
  INTL: "International",
}

/** Boat shows that were typed into the STATE field. These get lifted out. */
export const BOAT_SHOWS = ["SCIBS", "SIBS"] as const
export type BoatShow = (typeof BOAT_SHOWS)[number]

export const BOAT_SHOW_LABELS: Record<BoatShow, string> = {
  SCIBS: "Sanctuary Cove International Boat Show",
  SIBS: "Sydney International Boat Show",
}

/**
 * 625 records have a boat show name in the state column. These MUST NOT become
 * a state — the show says where you met someone, not where they live. (SCIBS
 * is held in QLD and SIBS in NSW, but attendees fly in from everywhere, so
 * mapping the show to its host state would be inventing data.)
 */
export const BOAT_SHOW_ALIASES: Record<string, BoatShow> = {
  scib: "SCIBS",
  scibs: "SCIBS",
  "scib s": "SCIBS",
  "sanctuary cove": "SCIBS",
  "sanctuary cove boat show": "SCIBS",
  "sanctuary cove international boat show": "SCIBS",
  sibs: "SIBS",
  sib: "SIBS",
  "sydney boat show": "SIBS",
  "sydney international boat show": "SIBS",
}

/**
 * Every state spelling seen in the export, plus the capital cities and regions
 * that get typed into a state field. Keys are wordKey() output.
 */
export const REGION_ALIASES: Record<string, RegionCode> = {
  // --- NSW ----------------------------------------------------------------
  nsw: "NSW",
  "n s w": "NSW",
  "new south wales": "NSW",
  newsouthwales: "NSW",
  sydney: "NSW",
  newcastle: "NSW",
  wollongong: "NSW",
  "central coast": "NSW",
  "port macquarie": "NSW",
  "pittwater": "NSW",

  // --- QLD ----------------------------------------------------------------
  qld: "QLD",
  "q l d": "QLD",
  queensland: "QLD",
  brisbane: "QLD",
  "gold coast": "QLD",
  goldcoast: "QLD",
  "sunshine coast": "QLD",
  cairns: "QLD",
  townsville: "QLD",
  mackay: "QLD",
  "hervey bay": "QLD",
  whitsundays: "QLD",
  "airlie beach": "QLD",

  // --- VIC ----------------------------------------------------------------
  vic: "VIC",
  victoria: "VIC",
  melbourne: "VIC",
  geelong: "VIC",
  "mornington peninsula": "VIC",

  // --- WA -----------------------------------------------------------------
  wa: "WA",
  "w a": "WA",
  "western australia": "WA",
  westernaustralia: "WA",
  perth: "WA",
  fremantle: "WA",
  mandurah: "WA",
  broome: "WA",

  // --- SA -----------------------------------------------------------------
  sa: "SA",
  "s a": "SA",
  "south australia": "SA",
  southaustralia: "SA",
  adelaide: "SA",

  // --- TAS ----------------------------------------------------------------
  tas: "TAS",
  tasmania: "TAS",
  tassie: "TAS",
  hobart: "TAS",
  launceston: "TAS",

  // --- ACT ----------------------------------------------------------------
  act: "ACT",
  "a c t": "ACT",
  "australian capital territory": "ACT",
  canberra: "ACT",

  // --- NT -----------------------------------------------------------------
  nt: "NT",
  "n t": "NT",
  "northern territory": "NT",
  darwin: "NT",

  // --- New Zealand --------------------------------------------------------
  nz: "NZ",
  "n z": "NZ",
  "new zealand": "NZ",
  newzealand: "NZ",
  "auckland region": "NZ",
  auckland: "NZ",
  wellington: "NZ",
  christchurch: "NZ",
  "bay of plenty": "NZ",
  tauranga: "NZ",
  "north island": "NZ",
  "south island": "NZ",
  whangarei: "NZ",

  // --- International ------------------------------------------------------
  usa: "INTL",
  us: "INTL",
  "u s a": "INTL",
  "united states": "INTL",
  america: "INTL",
  florida: "INTL",
  california: "INTL",
  uk: "INTL",
  "u k": "INTL",
  "united kingdom": "INTL",
  england: "INTL",
  scotland: "INTL",
  ireland: "INTL",
  singapore: "INTL",
  "hong kong": "INTL",
  hongkong: "INTL",
  china: "INTL",
  japan: "INTL",
  korea: "INTL",
  malaysia: "INTL",
  indonesia: "INTL",
  bali: "INTL",
  philippines: "INTL",
  vietnam: "INTL",
  thailand: "INTL",
  phuket: "INTL",
  india: "INTL",
  dubai: "INTL",
  uae: "INTL",
  canada: "INTL",
  france: "INTL",
  italy: "INTL",
  spain: "INTL",
  greece: "INTL",
  turkey: "INTL",
  germany: "INTL",
  netherlands: "INTL",
  monaco: "INTL",
  "south africa": "INTL",
  fiji: "INTL",
  "papua new guinea": "INTL",
  png: "INTL",
  "new caledonia": "INTL",
  vanuatu: "INTL",
  tahiti: "INTL",
  international: "INTL",
  overseas: "INTL",
}

/** Country-only answers: real information, but they do not name a state. */
const COUNTRY_ONLY: Record<string, "AU" | "NZ" | "INTL"> = {
  australia: "AU",
  aus: "AU",
  au: "AU",
  aussie: "AU",
  oz: "AU",
}

/**
 * Values we deliberately refuse to map. Each is genuinely ambiguous, and the
 * owner — not the mapper — has to decide what they meant.
 */
const REGION_REFUSALS: Record<string, FailureReason> = {
  // 95 records. "th" is either Thailand (INTL) or a two-character mis-key /
  // truncation. Guessing would move 95 contacts to the wrong continent.
  th: "ambiguous",
  // Northern Ireland, or a truncated "NI"/"NT"/"NZ".
  ni: "ambiguous",
}

export type StateResult = Normalised<RegionCode> & {
  /** Country the answer implies, even when no state could be picked. */
  country: "AU" | "NZ" | "INTL" | null
  /** LIFTED OUT: a boat show name found in the state field. */
  metAtShow: BoatShow | null
  /** Set when the cell named more than one region and we had to choose. */
  warning: string | null
}

function regionCountry(code: RegionCode): "AU" | "NZ" | "INTL" {
  if (code === "NZ") return "NZ"
  if (code === "INTL") return "INTL"
  return "AU"
}

function stateResult(
  raw: string | null,
  value: RegionCode | null,
  reason: FailureReason | null,
  country: "AU" | "NZ" | "INTL" | null,
  metAtShow: BoatShow | null,
  warning: string | null
): StateResult {
  return { raw, value, recognised: value !== null, reason: value === null ? (reason ?? "unrecognised") : null, country, metAtShow, warning }
}

function lookupRegion(key: string): RegionCode | undefined {
  return key ? REGION_ALIASES[key] : undefined
}

function lookupShow(key: string): BoatShow | undefined {
  return key ? BOAT_SHOW_ALIASES[key] : undefined
}

/**
 * Normalise a free-text state/region.
 *
 * CRITICAL BEHAVIOUR: boat show names ("scib", "scibs", "sibs" — 625 records)
 * are not states. They are lifted into `metAtShow` and the state comes back as
 * null, so nobody ends up filed under a trade show.
 *
 * Compound values ("Sydney, NSW", "USA NSW") are token-scanned; an Australian
 * state wins over a country token because this is the state column, and the
 * conflict is reported in `warning`.
 */
export function normaliseState(raw: string | null | undefined): StateResult {
  const original = keepRaw(raw)
  const text = asText(raw)
  if (text === "") return stateResult(original, null, "empty", null, null, null)

  const words = wordKey(text)

  // 1. A value that is nothing but a boat show.
  const showExact = lookupShow(words)
  if (showExact) return stateResult(original, null, "wrong_field", null, showExact, null)

  if (isPlaceholder(words)) return stateResult(original, null, "placeholder", null, null, null)

  const refusal = REGION_REFUSALS[words]
  if (refusal) return stateResult(original, null, refusal, null, null, null)

  // 2. Exact match on the whole value.
  const exact = lookupRegion(words)
  if (exact) return stateResult(original, exact, null, regionCountry(exact), null, null)

  const countryExact = COUNTRY_ONLY[words]
  if (countryExact) {
    // "australia" is true and useful, but it does not name a state.
    return stateResult(original, null, "ambiguous", countryExact, null, "Country only - no state given")
  }

  // 3. Compound values: scan every token, pair and triple.
  const tokens = words.split(" ").filter(Boolean)
  const found: RegionCode[] = []
  let show: BoatShow | null = null
  let country: "AU" | "NZ" | "INTL" | null = null

  for (let i = 0; i < tokens.length; i++) {
    const two = i + 1 < tokens.length ? `${tokens[i]} ${tokens[i + 1]}` : ""
    const three = i + 2 < tokens.length ? `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}` : ""

    const hit = lookupRegion(three) ?? lookupRegion(two) ?? lookupRegion(tokens[i])
    if (hit && found.indexOf(hit) === -1) found.push(hit)

    if (!show) show = lookupShow(two) ?? lookupShow(tokens[i]) ?? null
    if (!country) country = COUNTRY_ONLY[tokens[i]] ?? null
  }

  if (found.length === 1) {
    return stateResult(original, found[0], null, regionCountry(found[0]), show, null)
  }

  if (found.length > 1) {
    // Several regions in one cell. The state column should hold a state, so an
    // Australian state beats "NZ"/"INTL"; the conflict is reported.
    const auHit = found.filter((c) => c !== "NZ" && c !== "INTL")[0]
    const chosen = auHit ?? found[0]
    return stateResult(original, chosen, null, regionCountry(chosen), show, `Value mentioned ${found.join(", ")} - kept ${chosen}`)
  }

  // No region, but a show name in there somewhere ("met at SCIBS 2023").
  if (show) return stateResult(original, null, "wrong_field", null, show, null)

  if (country) return stateResult(original, null, "ambiguous", country, null, "Country only - no state given")

  return stateResult(original, null, "unrecognised", null, null, null)
}

/* -------------------------------------------------------------------------- */
/* 4. CURRENTLY OWNS                                                           */
/* -------------------------------------------------------------------------- */

/** Answers meaning "I do not own a boat". Keyed by wordKey(). */
export const OWNS_NEGATIONS = [
  "no", "none", "nil", "na", "n a", "nothing", "no boat", "no boats", "no vessel",
  "no yacht", "not yet", "none yet", "none at present", "none currently",
  "no current boat", "no current vessel", "don t own", "do not own", "dont own",
  "i don t own", "i do not own", "never owned", "first boat", "first time buyer",
  "first time", "no i don t", "no i do not", "nope", "negative", "not currently",
  "not an owner", "no not yet", "n a n a",
]

/** Answers meaning "yes, but they did not say what". */
export const OWNS_AFFIRMATIONS = [
  "yes", "y", "yes i do", "i do", "currently own", "own a boat", "own one",
  "yes own a boat", "yes i own a boat", "have a boat", "own", "owner",
  "yes currently own", "boat owner",
]

export type CurrentlyOwnsResult = {
  raw: string | null
  /** true = owns something, false = explicitly owns nothing, null = unknown. */
  ownsBoat: boolean | null
  /** The boat, tidied but not re-cased. null for negations and junk. */
  currentlyOwns: string | null
  /** true exactly when `ownsBoat` is non-null. */
  recognised: boolean
  /** Non-null exactly when `ownsBoat` is null. */
  reason: FailureReason | null
}

function ownsResult(
  raw: string | null,
  ownsBoat: boolean | null,
  currentlyOwns: string | null,
  reason: FailureReason | null
): CurrentlyOwnsResult {
  return {
    raw,
    ownsBoat,
    currentlyOwns,
    recognised: ownsBoat !== null,
    reason: ownsBoat === null ? (reason ?? "unrecognised") : null,
  }
}

/**
 * Normalise the "currently owns" column — 9,308 values that are mostly junk
 * (1,650 of them are the literal string ",  ").
 *
 *   ",  " / "n/a" -> { ownsBoat: null,  currentlyOwns: null }  (unknown)
 *   "none" / "no" -> { ownsBoat: false, currentlyOwns: null }
 *   "yes"         -> { ownsBoat: true,  currentlyOwns: null }  (unspecified)
 *   "riviera"     -> { ownsBoat: true,  currentlyOwns: "riviera" }
 *
 * Letter case is preserved deliberately: "M/Y SEA WOLF" must not be mangled
 * into "M/y Sea Wolf" by a well-meaning title-caser.
 */
export function normaliseCurrentlyOwns(raw: string | null | undefined): CurrentlyOwnsResult {
  const original = keepRaw(raw)
  const text = asText(raw)
  if (text === "") return ownsResult(original, null, null, "empty")

  const words = wordKey(text)

  // ",  " and friends: characters, but no information at all.
  if (words === "") return ownsResult(original, null, null, "placeholder")

  if (OWNS_NEGATIONS.indexOf(words) !== -1) return ownsResult(original, false, null, null)
  if (OWNS_AFFIRMATIONS.indexOf(words) !== -1) return ownsResult(original, true, null, null)

  // Placeholders that are not a "no" — we simply do not know.
  if (isPlaceholder(words)) return ownsResult(original, null, null, "placeholder")

  // "no boat at the moment", "don't own anything yet"
  if (/^(no|not|never|nil|none)\b/.test(words) && /\b(boat|vessel|yacht|own|currently|yet|anything|nothing|longer)\b/.test(words)) {
    return ownsResult(original, false, null, null)
  }
  if (/\b(do not own|don t own|dont own|never owned|not a boat owner)\b/.test(words)) {
    return ownsResult(original, false, null, null)
  }

  // "yes - Riviera 43" -> keep the boat, drop the "yes".
  const afterYes = text.replace(/^\s*(yes|yep|yeah|i do)\b[\s,;:.\-–—]*/i, "")
  const saidYes = afterYes !== text
  const candidate = tidyText(saidYes ? afterYes : text)

  if (candidate === "" || wordKey(candidate) === "") {
    // The whole value was "yes" plus punctuation, or punctuation alone.
    return saidYes ? ownsResult(original, true, null, null) : ownsResult(original, null, null, "placeholder")
  }

  // Anything left is a real boat: "riviera", "tinny", "Maritimo 52".
  return ownsResult(original, true, candidate, null)
}

/* -------------------------------------------------------------------------- */
/* 5. BOAT TYPE                                                                */
/* -------------------------------------------------------------------------- */

export const BOAT_TYPES = [
  "sports_cruiser",
  "flybridge_cruiser",
  "sailing_yacht",
  "full_displacement",
  "semi_displacement",
  "superyacht",
] as const
export type BoatType = (typeof BOAT_TYPES)[number]

export const BOAT_TYPE_LABELS: Record<BoatType, string> = {
  sports_cruiser: "Sports Cruiser",
  flybridge_cruiser: "Flybridge Cruiser",
  sailing_yacht: "Sailing Yacht",
  full_displacement: "Full Displacement",
  semi_displacement: "Semi Displacement",
  superyacht: "Superyacht",
}

/**
 * The one field HubSpot got right — these six values are already clean, so
 * this table only has to fix casing/spacing and catch obvious shorthands.
 * Keyed by wordKey().
 */
export const BOAT_TYPE_ALIASES: Record<string, BoatType> = {
  "sports cruiser": "sports_cruiser",
  "sport cruiser": "sports_cruiser",
  "sports cruisers": "sports_cruiser",
  sportscruiser: "sports_cruiser",

  "flybridge cruiser": "flybridge_cruiser",
  "fly bridge cruiser": "flybridge_cruiser",
  flybridge: "flybridge_cruiser",
  "fly bridge": "flybridge_cruiser",
  flybridgecruiser: "flybridge_cruiser",

  "sailing yacht": "sailing_yacht",
  "sail yacht": "sailing_yacht",
  sailingyacht: "sailing_yacht",
  sailing: "sailing_yacht",
  sail: "sailing_yacht",
  sailboat: "sailing_yacht",
  yacht: "sailing_yacht",

  "full displacement": "full_displacement",
  "full displacement cruiser": "full_displacement",
  fulldisplacement: "full_displacement",

  "semi displacement": "semi_displacement",
  "semi displacement cruiser": "semi_displacement",
  semidisplacement: "semi_displacement",

  superyacht: "superyacht",
  "super yacht": "superyacht",
  superyachts: "superyacht",
}

export type BoatTypeResult = Normalised<BoatType> & {
  /** Every type found — HubSpot multi-selects export as "A;B". */
  values: BoatType[]
}

/**
 * Normalise a boat type. Multi-value cells ("Sports Cruiser;Flybridge Cruiser")
 * return every match in `values`; `value` is the first one.
 */
export function normaliseBoatType(raw: string | null | undefined): BoatTypeResult {
  const original = keepRaw(raw)
  const text = asText(raw)
  if (text === "") return { raw: original, value: null, recognised: false, reason: "empty", values: [] }

  const words = wordKey(text)
  if (isPlaceholder(words)) return { raw: original, value: null, recognised: false, reason: "placeholder", values: [] }

  const exact = BOAT_TYPE_ALIASES[words]
  if (exact) return { raw: original, value: exact, recognised: true, reason: null, values: [exact] }

  const parts = text.split(/[;,/|]|\band\b|\+/i)
  const values: BoatType[] = []
  for (let i = 0; i < parts.length; i++) {
    const hit = BOAT_TYPE_ALIASES[wordKey(parts[i])]
    if (hit && values.indexOf(hit) === -1) values.push(hit)
  }
  if (values.length > 0) return { raw: original, value: values[0], recognised: true, reason: null, values }

  // "displacement" alone could be full or semi — refuse to guess.
  if (/\bdisplacement\b/.test(words) && !/\b(full|semi)\b/.test(words)) {
    return { raw: original, value: null, recognised: false, reason: "ambiguous", values: [] }
  }

  return { raw: original, value: null, recognised: false, reason: "unrecognised", values: [] }
}

/* -------------------------------------------------------------------------- */
/* 6. INTERNAL (STAFF) RECORDS                                                 */
/* -------------------------------------------------------------------------- */

/** Mailboxes on these domains are staff, not customers. */
export const INTERNAL_EMAIL_DOMAINS = ["flagshipinternational.com.au"]

/**
 * True when an email address belongs to the brokerage itself. Tolerates
 * surrounding whitespace, mixed case, a display name ("Bob <bob@x>") and
 * subdomains (info@mail.flagshipinternational.com.au).
 */
export function isInternalEmail(email: string | null | undefined): boolean {
  if (typeof email !== "string") return false

  const angle = email.match(/<([^>]+)>/)
  const address = (angle ? angle[1] : email).trim().toLowerCase()

  const at = address.lastIndexOf("@")
  if (at === -1) return false

  const domain = address.slice(at + 1).replace(/[>,;\s]+$/, "").replace(/\.+$/, "")
  if (domain === "") return false

  for (let i = 0; i < INTERNAL_EMAIL_DOMAINS.length; i++) {
    const internal = INTERNAL_EMAIL_DOMAINS[i]
    if (domain === internal) return true
    if (domain.length > internal.length && domain.slice(-(internal.length + 1)) === `.${internal}`) return true
  }
  return false
}

/* -------------------------------------------------------------------------- */
/* 7. Uniform registry — used by scripts/normalize-report.ts                   */
/* -------------------------------------------------------------------------- */

export const NORMALISABLE_FIELDS = ["budget", "timeframe", "state", "currentlyOwns", "boatType"] as const
export type NormalisableField = (typeof NORMALISABLE_FIELDS)[number]

export const FIELD_LABELS: Record<NormalisableField, string> = {
  budget: "Budget",
  timeframe: "Timeframe",
  state: "State / Region",
  currentlyOwns: "Currently owns",
  boatType: "Boat type",
}

/** The buckets each field can produce, for the distribution table. */
export const FIELD_BUCKETS: Record<NormalisableField, readonly string[]> = {
  budget: BUDGET_BUCKETS,
  timeframe: TIMEFRAME_CATEGORIES,
  state: REGION_CODES,
  currentlyOwns: ["owns", "does_not_own"],
  boatType: BOAT_TYPES,
}

/** One row of the coverage report — the same shape for every field. */
export type FieldNormalisation = {
  field: NormalisableField
  raw: string | null
  /** Printable normalised key, or null when nothing could be decided. */
  value: string | null
  recognised: boolean
  reason: FailureReason | null
  /** Information lifted out of the field (a boat show, a period, a boat name). */
  extra: string | null
}

/**
 * Run one field's normaliser and flatten the result into a uniform shape.
 * Never throws, whatever the field name or value.
 */
export function normaliseField(field: NormalisableField, raw: string | null | undefined): FieldNormalisation {
  if (field === "budget") {
    const r = normaliseBudget(raw)
    return {
      field,
      raw: r.raw,
      value: r.value,
      recognised: r.recognised,
      reason: r.reason,
      extra: r.amount === null ? null : `$${r.amount}`,
    }
  }

  if (field === "timeframe") {
    const r = normaliseTimeframe(raw)
    let extra: string | null = null
    if (r.period) {
      const bits: string[] = []
      if (r.period.year !== null) bits.push(String(r.period.year))
      if (r.period.half) bits.push(r.period.half)
      if (r.period.qualifier && r.period.qualifier !== "in") bits.push(r.period.qualifier)
      if (r.period.monthsAway) bits.push(`${r.period.monthsAway.min ?? "?"}-${r.period.monthsAway.max ?? "+"}mo`)
      extra = bits.join(" ")
    }
    return { field, raw: r.raw, value: r.value, recognised: r.recognised, reason: r.reason, extra }
  }

  if (field === "state") {
    const r = normaliseState(raw)
    const extra = r.metAtShow ? `show:${r.metAtShow}` : !r.value && r.country ? `country:${r.country}` : r.warning
    return { field, raw: r.raw, value: r.value, recognised: r.recognised, reason: r.reason, extra }
  }

  if (field === "currentlyOwns") {
    const r = normaliseCurrentlyOwns(raw)
    const value = r.ownsBoat === true ? "owns" : r.ownsBoat === false ? "does_not_own" : null
    return { field, raw: r.raw, value, recognised: r.recognised, reason: r.reason, extra: r.currentlyOwns }
  }

  const r = normaliseBoatType(raw)
  return {
    field,
    raw: r.raw,
    value: r.value,
    recognised: r.recognised,
    reason: r.reason,
    extra: r.values.length > 1 ? r.values.join("+") : null,
  }
}

/* -------------------------------------------------------------------------- */
/* 8. Column detection                                                         */
/* -------------------------------------------------------------------------- */

/** CSV header text -> which normaliser to run. Keys are wordKey() output. */
export const NORMALISE_HEADER_ALIASES: Record<string, NormalisableField> = {
  budget: "budget",
  "budget range": "budget",
  "budget guide": "budget",
  "price range": "budget",
  "approx budget": "budget",
  "approximate budget": "budget",
  "purchase budget": "budget",
  "what is your budget": "budget",

  timeframe: "timeframe",
  "time frame": "timeframe",
  "purchase timeframe": "timeframe",
  "buying timeframe": "timeframe",
  "buying stage": "timeframe",
  "when are you looking to buy": "timeframe",
  "time to purchase": "timeframe",
  "purchase timing": "timeframe",

  state: "state",
  "state region": "state",
  region: "state",
  "state province": "state",
  "state territory": "state",

  "currently owns": "currentlyOwns",
  "currently own": "currentlyOwns",
  "current boat": "currentlyOwns",
  "current vessel": "currentlyOwns",
  "do you currently own a boat": "currentlyOwns",
  "existing boat": "currentlyOwns",
  "boat owned": "currentlyOwns",

  "boat type": "boatType",
  "type of boat": "boatType",
  "vessel type": "boatType",
  "boat style": "boatType",
  "type of vessel": "boatType",
}

/**
 * Which normaliser a CSV column should be run through, or null. Exact alias
 * first, then a conservative keyword fallback.
 */
export function detectNormalisableField(header: string | null | undefined): NormalisableField | null {
  const key = wordKey(header)
  if (key === "") return null

  const exact = NORMALISE_HEADER_ALIASES[key]
  if (exact) return exact

  if (/\bbudget\b|\bprice range\b/.test(key)) return "budget"
  if (/\btime ?frame\b|\bbuying stage\b|\bpurchase timing\b|\bwhen .*buy\b/.test(key)) return "timeframe"
  if (/\bcurrently owns?\b|\bcurrent (boat|vessel|yacht)\b|\bown a boat\b/.test(key)) return "currentlyOwns"
  if (/\bboat type\b|\bvessel type\b|\btype of (boat|vessel)\b/.test(key)) return "boatType"
  if (/\bstate\b|\bregion\b|\bprovince\b/.test(key)) return "state"

  return null
}

/** True for a column that holds an email address. */
export function isEmailHeader(header: string | null | undefined): boolean {
  const key = wordKey(header)
  return /\bemail\b|\be mail\b/.test(key)
}
