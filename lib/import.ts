/**
 * CSV import engine — UI independent.
 *
 * Nothing in this file touches the database, `next`, or React, so it can be used
 * from the API route (app/api/leads/import/route.ts), the CLI
 * (scripts/import-csv.ts) or a future UI wizard.
 *
 * The pipeline is:
 *   raw CSV text -> parseCsv() -> mapHeaders() -> prepareImport() -> ImportPlan
 * The caller then persists `plan.rows[n].lead` for every row that has no errors
 * and (optionally) no duplicate match.
 */

/* -------------------------------------------------------------------------- */
/* Domain constants                                                            */
/* -------------------------------------------------------------------------- */

// NOTE: these MUST stay in sync with STATUS_CONFIG in lib/utils.ts and the
// comment on Lead.status in prisma/schema.prisma.
export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]
export const DEFAULT_STATUS: LeadStatus = "new"

// Mirrors PRIORITY_CONFIG in lib/utils.ts.
export const LEAD_PRIORITIES = ["low", "medium", "high"] as const
export type LeadPriority = (typeof LEAD_PRIORITIES)[number]
export const DEFAULT_PRIORITY: LeadPriority = "medium"

// Mirrors SOURCE_OPTIONS in lib/utils.ts.
export const LEAD_SOURCES = ["referral", "website", "cold_call", "social", "event", "other"] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

/* -------------------------------------------------------------------------- */
/* CSV parsing                                                                 */
/* -------------------------------------------------------------------------- */

export type CsvRow = Record<string, string>

export type CsvParseResult = {
  headers: string[]
  rows: CsvRow[]
  /** The delimiter that was used (auto-detected unless forced). */
  delimiter: string
  /** 1-based line number in the source file for each row in `rows`. */
  rowNumbers: number[]
}

const DELIMITER_CANDIDATES = [",", ";", "\t", "|"]

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

/**
 * Guess the delimiter by counting candidates in the first *logical* line
 * (i.e. ignoring anything inside quotes). Excel in a European locale and some
 * Monday.com exports use ";", so this is worth doing.
 */
export function detectDelimiter(text: string): string {
  const src = stripBom(text)
  const counts: Record<string, number> = {}
  for (const d of DELIMITER_CANDIDATES) counts[d] = 0

  let inQuotes = false
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]
    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') {
        i++
        continue
      }
      inQuotes = !inQuotes
      continue
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) break
    if (!inQuotes && ch in counts) counts[ch]++
  }

  let best = ","
  for (const d of DELIMITER_CANDIDATES) {
    if (counts[d] > counts[best]) best = d
  }
  return counts[best] > 0 ? best : ","
}

/**
 * RFC-4180-ish CSV tokeniser. Handles:
 *  - quoted fields
 *  - commas (or any delimiter) inside quotes
 *  - newlines (LF or CRLF) inside quotes
 *  - escaped double quotes ("")
 *  - a UTF-8 BOM at the start of the file
 *
 * Returns a matrix of raw cell strings; fully blank lines are dropped.
 */
export function parseCsvToMatrix(text: string, delimiter?: string): { matrix: string[][]; lineNumbers: number[]; delimiter: string } {
  const src = stripBom(text)
  const delim = delimiter ?? detectDelimiter(src)

  const matrix: string[][] = []
  const lineNumbers: number[] = []

  let row: string[] = []
  let field = ""
  let inQuotes = false
  let line = 1
  let rowStartLine = 1
  let sawAnyChar = false

  const endField = () => {
    row.push(field)
    field = ""
  }

  const endRow = () => {
    endField()
    const blank = row.every((c) => c.trim() === "")
    if (!blank) {
      matrix.push(row)
      lineNumbers.push(rowStartLine)
    }
    row = []
    sawAnyChar = false
    rowStartLine = line
  }

  for (let i = 0; i < src.length; i++) {
    const ch = src[i]

    if (!sawAnyChar && ch !== "\r" && ch !== "\n") {
      sawAnyChar = true
      rowStartLine = line
    }

    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
        continue
      }
      if (ch === "\r") {
        // Normalise CRLF inside a quoted field to a plain newline.
        if (src[i + 1] === "\n") i++
        field += "\n"
        line++
        continue
      }
      if (ch === "\n") line++
      field += ch
      continue
    }

    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === delim) {
      endField()
      continue
    }
    if (ch === "\r") {
      if (src[i + 1] === "\n") i++
      endRow()
      line++
      continue
    }
    if (ch === "\n") {
      endRow()
      line++
      continue
    }
    field += ch
  }

  // Flush whatever is left on the last (unterminated) line.
  if (field !== "" || row.length > 0) endRow()

  return { matrix, lineNumbers, delimiter: delim }
}

/**
 * Parse CSV text into header-keyed row objects.
 * Duplicate header names are suffixed (" (2)", " (3)") so no column is lost.
 */
export function parseCsv(text: string, delimiter?: string): CsvParseResult {
  const { matrix, lineNumbers, delimiter: delim } = parseCsvToMatrix(text, delimiter)

  if (matrix.length === 0) {
    return { headers: [], rows: [], delimiter: delim, rowNumbers: [] }
  }

  const seen: Record<string, number> = {}
  const headers = matrix[0].map((h, i) => {
    let name = h.trim()
    if (!name) name = `Column ${i + 1}`
    const key = name.toLowerCase()
    if (seen[key] === undefined) {
      seen[key] = 1
      return name
    }
    seen[key] += 1
    return `${name} (${seen[key]})`
  })

  const rows: CsvRow[] = []
  const rowNumbers: number[] = []

  for (let r = 1; r < matrix.length; r++) {
    const cells = matrix[r]
    const obj: CsvRow = {}
    for (let c = 0; c < headers.length; c++) {
      obj[headers[c]] = (cells[c] ?? "").trim()
    }
    rows.push(obj)
    rowNumbers.push(lineNumbers[r])
  }

  return { headers, rows, delimiter: delim, rowNumbers }
}

/* -------------------------------------------------------------------------- */
/* Column mapping                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Internal field names the mapper can produce. Most correspond 1:1 to a Lead
 * column in prisma/schema.prisma; the exceptions are:
 *   fullName      -> split into firstName + lastName
 *   currentlyOwns -> folded into notes (no such column on Lead)
 *   state         -> folded into address (no such column on Lead)
 *   ownerName     -> resolved to Lead.ownerId by the caller
 */
export type ImportField =
  | "firstName"
  | "lastName"
  | "fullName"
  | "email"
  | "phone"
  | "mobile"
  | "company"
  | "jobTitle"
  | "website"
  | "linkedin"
  | "leadSource"
  | "notes"
  | "budget"
  | "vesselInterest"
  | "currentlyOwns"
  | "address"
  | "city"
  | "state"
  | "country"
  | "status"
  | "priority"
  | "ownerName"
  | "createdAt"
  | "lastContactedAt"

/** Normalise a header for lookup: lowercase, drop "(...)", collapse punctuation. */
export function normaliseHeader(header: string): string {
  return stripBom(header)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

/**
 * Exact (post-normalisation) header aliases. Keys are already normalised.
 * Covers what Monday.com and HubSpot free actually put in their CSV headers,
 * plus the obvious hand-typed variants.
 */
export const HEADER_ALIASES: Record<string, ImportField> = {
  // --- name -------------------------------------------------------------
  "lead": "fullName",
  "leads": "fullName",
  "name": "fullName",
  "full name": "fullName",
  "contact": "fullName",
  "contact name": "fullName",
  "client": "fullName",
  "client name": "fullName",
  "customer": "fullName",
  "customer name": "fullName",
  "item": "fullName",
  "item name": "fullName",
  "lead name": "fullName",
  "person name": "fullName",
  "first name": "firstName",
  "firstname": "firstName",
  "first": "firstName",
  "given name": "firstName",
  "last name": "lastName",
  "lastname": "lastName",
  "last": "lastName",
  "surname": "lastName",
  "family name": "lastName",

  // --- contact details --------------------------------------------------
  "email": "email",
  "e mail": "email",
  "email address": "email",
  "e mail address": "email",
  "primary email": "email",
  "work email": "email",
  "contact email": "email",
  "phone": "phone",
  "phone number": "phone",
  "phone no": "phone",
  "telephone": "phone",
  "tel": "phone",
  "landline": "phone",
  "office phone": "phone",
  "work phone": "phone",
  "home phone": "phone",
  "mobile": "mobile",
  "mobile number": "mobile",
  "mobile phone": "mobile",
  "mobile phone number": "mobile",
  "cell": "mobile",
  "cell phone": "mobile",
  "cellphone": "mobile",
  "cell phone number": "mobile",

  // --- company ----------------------------------------------------------
  "company": "company",
  "company name": "company",
  "associated company": "company",
  "primary associated company": "company",
  "business": "company",
  "business name": "company",
  "organisation": "company",
  "organization": "company",
  "account": "company",
  "account name": "company",
  "job title": "jobTitle",
  "jobtitle": "jobTitle",
  "title": "jobTitle",
  "position": "jobTitle",
  "role": "jobTitle",
  "website": "website",
  "web site": "website",
  "website url": "website",
  "company website": "website",
  "url": "website",
  "domain": "website",
  "company domain name": "website",
  "linkedin": "linkedin",
  "linkedin url": "linkedin",
  "linkedin profile": "linkedin",
  "linkedin bio": "linkedin",

  // --- pipeline ---------------------------------------------------------
  "status": "status",
  "lead status": "status",
  "deal stage": "status",
  "stage": "status",
  "pipeline": "status",
  "pipeline stage": "status",
  "lifecycle stage": "status",
  "lifecycle": "status",
  "priority": "priority",
  "urgency": "priority",
  "importance": "priority",
  "contact owner": "ownerName",
  "owner": "ownerName",
  "account owner": "ownerName",
  "hubspot owner": "ownerName",
  "assigned to": "ownerName",
  "assignee": "ownerName",
  "person": "ownerName",
  "people": "ownerName",
  "broker": "ownerName",
  "agent": "ownerName",
  "salesperson": "ownerName",
  "sales rep": "ownerName",
  "sales owner": "ownerName",

  // --- source -----------------------------------------------------------
  "source": "leadSource",
  "lead source": "leadSource",
  "original source": "leadSource",
  "original traffic source": "leadSource",
  "channel": "leadSource",
  "how did you hear about us": "leadSource",
  "how did you hear": "leadSource",
  "referral source": "leadSource",

  // --- yacht specifics --------------------------------------------------
  "looking for": "vesselInterest",
  "looking for boat": "vesselInterest",
  "vessel interest": "vesselInterest",
  "vessel of interest": "vesselInterest",
  "boat of interest": "vesselInterest",
  "interested in": "vesselInterest",
  "interest": "vesselInterest",
  "vessel": "vesselInterest",
  "boat": "vesselInterest",
  "yacht": "vesselInterest",
  "model": "vesselInterest",
  "model interest": "vesselInterest",
  "product interest": "vesselInterest",
  "enquiry about": "vesselInterest",
  "enquiring about": "vesselInterest",
  "currently owns": "currentlyOwns",
  "currently own": "currentlyOwns",
  "current boat": "currentlyOwns",
  "current vessel": "currentlyOwns",
  "current yacht": "currentlyOwns",
  "existing boat": "currentlyOwns",
  "existing vessel": "currentlyOwns",
  "owns": "currentlyOwns",
  "boat owned": "currentlyOwns",
  "vessel owned": "currentlyOwns",
  "trade in": "currentlyOwns",
  "budget": "budget",
  "budget range": "budget",
  "price range": "budget",
  "price": "budget",
  "price guide": "budget",
  "approx budget": "budget",
  "approximate budget": "budget",
  "budget guide": "budget",
  "spend": "budget",
  "deal amount": "budget",
  "amount": "budget",
  "value": "budget",

  // --- location ---------------------------------------------------------
  "address": "address",
  "street address": "address",
  "street": "address",
  "address line 1": "address",
  "mailing address": "address",
  "city": "city",
  "town": "city",
  "suburb": "city",
  "location": "city",
  "state": "state",
  "state region": "state",
  "region": "state",
  "province": "state",
  "state province": "state",
  "county": "state",
  "country": "country",
  "country region": "country",
  "nation": "country",

  // --- free text --------------------------------------------------------
  "notes": "notes",
  "note": "notes",
  "comment": "notes",
  "comments": "notes",
  "description": "notes",
  "details": "notes",
  "message": "notes",
  "enquiry": "notes",
  "inquiry": "notes",
  "background": "notes",
  "update": "notes",
  "updates": "notes",
  "last update": "notes",

  // --- dates ------------------------------------------------------------
  "date of lead": "createdAt",
  "date of enquiry": "createdAt",
  "lead date": "createdAt",
  "enquiry date": "createdAt",
  "create date": "createdAt",
  "created": "createdAt",
  "created at": "createdAt",
  "created date": "createdAt",
  "date created": "createdAt",
  "creation date": "createdAt",
  "date added": "createdAt",
  "date received": "createdAt",
  "date": "createdAt",
  "last activity date": "lastContactedAt",
  "last activity": "lastContactedAt",
  "last contacted": "lastContactedAt",
  "last contacted date": "lastContactedAt",
  "last contact": "lastContactedAt",
  "last touch": "lastContactedAt",
  "last engagement date": "lastContactedAt",
}

/**
 * Ordered substring fallbacks, tried only when there is no exact alias match.
 * Order matters — the more specific pattern must come first (e.g. "last name"
 * before "name", "mobile" before "phone").
 */
const HEADER_PATTERNS: Array<[RegExp, ImportField]> = [
  [/\bfirst\s*name\b|\bgiven\s*name\b/, "firstName"],
  [/\blast\s*name\b|\bsurname\b|\bfamily\s*name\b/, "lastName"],
  [/\bmobile\b|\bcell\b/, "mobile"],
  [/\bphone\b|\btelephone\b/, "phone"],
  [/\bemail\b|\be mail\b/, "email"],
  [/\blinkedin\b/, "linkedin"],
  [/\bwebsite\b|\bweb site\b/, "website"],
  [/\bcurrently\s*own|\bcurrent\s*(boat|vessel|yacht)\b|\btrade\s*in\b/, "currentlyOwns"],
  [/\blooking\s*for\b|\binterest/, "vesselInterest"],
  [/\bbudget\b|\bprice\b/, "budget"],
  [/\bowner\b|\bassigned\b|\bassignee\b|\bbroker\b|\bsales\s*rep\b/, "ownerName"],
  [/\bsource\b|\bchannel\b/, "leadSource"],
  [/\bstatus\b|\bstage\b|\bpipeline\b|\blifecycle\b/, "status"],
  [/\bpriority\b|\burgency\b/, "priority"],
  [/\bjob\s*title\b|\bposition\b/, "jobTitle"],
  [/\bcompany\b|\borganis|\borganiz/, "company"],
  [/\blast\s*(activity|contact|touch)/, "lastContactedAt"],
  [/\b(create|creation|added|received|enquiry|inquiry|lead)\s*date\b|\bdate\s*(of|created|added)\b/, "createdAt"],
  [/\bstate\b|\bregion\b|\bprovince\b/, "state"],
  [/\bcountry\b/, "country"],
  [/\bcity\b|\btown\b|\bsuburb\b/, "city"],
  [/\baddress\b|\bstreet\b/, "address"],
  [/\bnotes?\b|\bcomments?\b|\bdescription\b|\bmessage\b/, "notes"],
  [/\bname\b/, "fullName"],
]

export type ColumnMapping = {
  header: string
  normalised: string
  field: ImportField | null
  /** How the mapping was decided — useful for showing the user what happened. */
  matchedBy: "exact" | "pattern" | "override" | "none"
}

export type HeaderMappingResult = {
  columns: ColumnMapping[]
  /** header -> field, only for mapped columns. */
  byHeader: Record<string, ImportField>
  unmapped: string[]
}

/**
 * Map CSV headers onto Lead fields.
 * `overrides` lets a UI (or the CLI) force a specific header to a field.
 */
export function mapHeaders(headers: string[], overrides?: Record<string, ImportField | null>): HeaderMappingResult {
  const columns: ColumnMapping[] = []
  const byHeader: Record<string, ImportField> = {}
  const unmapped: string[] = []

  for (const header of headers) {
    const normalised = normaliseHeader(header)

    let field: ImportField | null = null
    let matchedBy: ColumnMapping["matchedBy"] = "none"

    if (overrides && Object.prototype.hasOwnProperty.call(overrides, header)) {
      field = overrides[header]
      matchedBy = field ? "override" : "none"
    } else if (HEADER_ALIASES[normalised]) {
      field = HEADER_ALIASES[normalised]
      matchedBy = "exact"
    } else {
      for (const [pattern, candidate] of HEADER_PATTERNS) {
        if (pattern.test(normalised)) {
          field = candidate
          matchedBy = "pattern"
          break
        }
      }
    }

    columns.push({ header, normalised, field, matchedBy })
    if (field) byHeader[header] = field
    else unmapped.push(header)
  }

  return { columns, byHeader, unmapped }
}

/* -------------------------------------------------------------------------- */
/* Value normalisation                                                         */
/* -------------------------------------------------------------------------- */

function normaliseValue(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

const STATUS_ALIASES: Record<string, LeadStatus> = {
  // new
  "new": "new",
  "new lead": "new",
  "new leads": "new",
  "newlead": "new",
  "lead": "new",
  "leads": "new",
  "open": "new",
  "not started": "new",
  "to do": "new",
  "todo": "new",
  "untouched": "new",
  "incoming": "new",
  "enquiry": "new",
  "inquiry": "new",
  "new enquiry": "new",
  "subscriber": "new",
  // contacted
  "contacted": "contacted",
  "contact made": "contacted",
  "in contact": "contacted",
  "in touch": "contacted",
  "attempted to contact": "contacted",
  "attempting contact": "contacted",
  "follow up": "contacted",
  "following up": "contacted",
  "followed up": "contacted",
  "working": "contacted",
  "working on it": "contacted",
  "in progress": "contacted",
  "nurturing": "contacted",
  "engaged": "contacted",
  "appointment scheduled": "contacted",
  // qualified
  "qualified": "qualified",
  "qualified lead": "qualified",
  "sales qualified lead": "qualified",
  "marketing qualified lead": "qualified",
  "sql": "qualified",
  "mql": "qualified",
  "opportunity": "qualified",
  "hot": "qualified",
  "hot lead": "qualified",
  "inspection booked": "qualified",
  "viewing booked": "qualified",
  "sea trial": "qualified",
  // proposal
  "proposal": "proposal",
  "proposal sent": "proposal",
  "proposal made": "proposal",
  "quote": "proposal",
  "quote sent": "proposal",
  "quoted": "proposal",
  "offer": "proposal",
  "offer sent": "proposal",
  "offer made": "proposal",
  "under offer": "proposal",
  "negotiation": "proposal",
  "negotiating": "proposal",
  "in negotiation": "proposal",
  "decision maker bought in": "proposal",
  "contract sent": "proposal",
  // won
  "won": "won",
  "closed won": "won",
  "closedwon": "won",
  "deal won": "won",
  "sold": "won",
  "done": "won",
  "complete": "won",
  "completed": "won",
  "customer": "won",
  "client": "won",
  "settled": "won",
  // lost
  "lost": "lost",
  "closed lost": "lost",
  "closedlost": "lost",
  "deal lost": "lost",
  "dead": "lost",
  "dead lead": "lost",
  "unqualified": "lost",
  "not interested": "lost",
  "no longer interested": "lost",
  "no response": "lost",
  "stuck": "lost",
  "archived": "lost",
  "other": "lost",
  "junk": "lost",
  "spam": "lost",
  "bought elsewhere": "lost",
}

export type StatusNormalisation = {
  status: LeadStatus
  /** true when the raw value was recognised (blank counts as not recognised). */
  recognised: boolean
}

/** Map a Monday/HubSpot status label onto an internal status key. Never throws. */
export function normaliseStatus(raw: string | null | undefined, fallback: LeadStatus = DEFAULT_STATUS): StatusNormalisation {
  const key = normaliseValue(raw ?? "")
  if (!key) return { status: fallback, recognised: false }

  const direct = STATUS_ALIASES[key]
  if (direct) return { status: direct, recognised: true }

  // Monday labels are often prefixed/suffixed ("Stage 2 - Contacted").
  for (const status of LEAD_STATUSES) {
    if (key.includes(status)) return { status, recognised: true }
  }
  for (const alias of Object.keys(STATUS_ALIASES)) {
    if (alias.length > 3 && key.includes(alias)) return { status: STATUS_ALIASES[alias], recognised: true }
  }

  return { status: fallback, recognised: false }
}

const PRIORITY_ALIASES: Record<string, LeadPriority> = {
  "high": "high",
  "highest": "high",
  "urgent": "high",
  "critical": "high",
  "hot": "high",
  "a": "high",
  "1": "high",
  "p1": "high",
  "medium": "medium",
  "med": "medium",
  "normal": "medium",
  "standard": "medium",
  "warm": "medium",
  "b": "medium",
  "2": "medium",
  "p2": "medium",
  "low": "low",
  "lowest": "low",
  "cold": "low",
  "c": "low",
  "3": "low",
  "p3": "low",
}

export function normalisePriority(raw: string | null | undefined, fallback: LeadPriority = DEFAULT_PRIORITY): LeadPriority {
  const key = normaliseValue(raw ?? "")
  if (!key) return fallback
  return PRIORITY_ALIASES[key] ?? fallback
}

const SOURCE_ALIASES: Record<string, LeadSource> = {
  "referral": "referral",
  "referrals": "referral",
  "referred": "referral",
  "referred by": "referral",
  "word of mouth": "referral",
  "broker referral": "referral",
  "existing client": "referral",
  "repeat client": "referral",
  "website": "website",
  "web": "website",
  "web form": "website",
  "website form": "website",
  "website enquiry": "website",
  "online": "website",
  "organic search": "website",
  "direct traffic": "website",
  "paid search": "website",
  "email marketing": "website",
  "boatsonline": "website",
  "boatsales": "website",
  "yachthub": "website",
  "cold call": "cold_call",
  "coldcall": "cold_call",
  "cold_call": "cold_call",
  "outbound": "cold_call",
  "outbound call": "cold_call",
  "phone": "cold_call",
  "phone call": "cold_call",
  "telemarketing": "cold_call",
  "prospecting": "cold_call",
  "social": "social",
  "social media": "social",
  "paid social": "social",
  "facebook": "social",
  "instagram": "social",
  "meta": "social",
  "linkedin": "social",
  "youtube": "social",
  "event": "event",
  "events": "event",
  "show": "event",
  "boat show": "event",
  "trade show": "event",
  "exhibition": "event",
  "offline event": "event",
  "seminar": "event",
  "open day": "event",
  "other": "other",
  "unknown": "other",
}

/** Returns null when there was nothing to normalise (so we leave the column null). */
export function normaliseSource(raw: string | null | undefined): LeadSource | null {
  const key = normaliseValue(raw ?? "")
  if (!key) return null
  const direct = SOURCE_ALIASES[key]
  if (direct) return direct
  for (const alias of Object.keys(SOURCE_ALIASES)) {
    if (alias.length > 3 && key.includes(alias)) return SOURCE_ALIASES[alias]
  }
  return "other"
}

export type DateFormat = "DMY" | "MDY"

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
}

/**
 * Parse the date shapes Monday and HubSpot actually emit. Returns null when the
 * value is blank or unparseable — a bad date is never fatal.
 *
 * `format` disambiguates 01/02/2024: "DMY" (default, AU/UK) => 1 February.
 */
export function parseDateValue(raw: string | null | undefined, format: DateFormat = "DMY"): Date | null {
  const value = (raw ?? "").trim()
  if (!value) return null

  // ISO-ish: 2024-05-01, 2024-05-01T09:30:00Z, 2024/05/01
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (iso) {
    return buildDate(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), Number(iso[4] ?? 0), Number(iso[5] ?? 0), Number(iso[6] ?? 0))
  }

  // Slash/dot/dash: 01/05/2024, 1-5-24, 01.05.2024 (+ optional time)
  const slash = value.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(?:[T ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?)?/i)
  if (slash) {
    let a = Number(slash[1])
    let b = Number(slash[2])
    let year = Number(slash[3])
    if (year < 100) year += year < 70 ? 2000 : 1900

    let day: number
    let month: number
    if (format === "MDY") {
      month = a
      day = b
    } else {
      day = a
      month = b
    }
    // If the chosen order is impossible but the other works, swap.
    if (month > 12 && day <= 12) {
      const tmp = month
      month = day
      day = tmp
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) return null

    let hours = Number(slash[4] ?? 0)
    const meridiem = (slash[7] ?? "").toLowerCase()
    if (meridiem === "pm" && hours < 12) hours += 12
    if (meridiem === "am" && hours === 12) hours = 0

    return buildDate(year, month - 1, day, hours, Number(slash[5] ?? 0), Number(slash[6] ?? 0))
  }

  // Textual: 1 May 2024 / May 1, 2024 / 01-May-2024
  const text = value.match(/^(\d{1,2})[\s-]+([a-z]{3,})[\s-]+(\d{2,4})/i)
  if (text) {
    const month = MONTHS[text[2].slice(0, 3).toLowerCase()]
    if (month === undefined) return null
    let year = Number(text[3])
    if (year < 100) year += year < 70 ? 2000 : 1900
    return buildDate(year, month, Number(text[1]), 0, 0, 0)
  }

  const text2 = value.match(/^([a-z]{3,})[\s-]+(\d{1,2}),?[\s-]+(\d{2,4})/i)
  if (text2) {
    const month = MONTHS[text2[1].slice(0, 3).toLowerCase()]
    if (month === undefined) return null
    let year = Number(text2[3])
    if (year < 100) year += year < 70 ? 2000 : 1900
    return buildDate(year, month, Number(text2[2]), 0, 0, 0)
  }

  const fallback = new Date(value)
  return isNaN(fallback.getTime()) ? null : fallback
}

function buildDate(year: number, month: number, day: number, h: number, m: number, s: number): Date | null {
  const d = new Date(Date.UTC(year, month, day, h, m, s))
  if (isNaN(d.getTime())) return null
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month || d.getUTCDate() !== day) return null
  return d
}

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;.]+\.[^\s@,;]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/** Splits a display name on the FIRST space; single-word names get an empty lastName. */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const cleaned = fullName.replace(/\s+/g, " ").trim()
  if (!cleaned) return { firstName: "", lastName: "" }

  // "Ashworth, Richard" -> "Richard Ashworth"
  const comma = cleaned.match(/^([^,]+),\s*(.+)$/)
  if (comma) {
    return { firstName: comma[2].trim(), lastName: comma[1].trim() }
  }

  const space = cleaned.indexOf(" ")
  if (space === -1) return { firstName: cleaned, lastName: "" }
  return { firstName: cleaned.slice(0, space), lastName: cleaned.slice(space + 1).trim() }
}

/* -------------------------------------------------------------------------- */
/* Row preparation                                                             */
/* -------------------------------------------------------------------------- */

/** Shape handed to prisma.lead.create({ data }) — plus the unresolved owner name. */
export type PreparedLead = {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  company: string | null
  jobTitle: string | null
  website: string | null
  linkedin: string | null
  leadSource: string | null
  notes: string | null
  budget: string | null
  vesselInterest: string | null
  address: string | null
  city: string | null
  country: string | null
  status: LeadStatus
  priority: LeadPriority
  createdAt: Date | null
  lastContactedAt: Date | null
  /** Raw "Contact Owner" text — resolve to a User id with resolveOwnerId(). */
  ownerName: string | null
}

export type ImportIssue = {
  field?: ImportField | string
  message: string
}

export type DuplicateMatch = {
  matchedBy: "email" | "name"
  value: string
  /** Set when the duplicate is an existing lead in the database. */
  existingLeadId?: string
  /** Set when the duplicate is an earlier row in the same file. */
  duplicateOfRow?: number
}

export type ImportRowResult = {
  /** 1-based line number in the source CSV (header is line 1). */
  rowNumber: number
  raw: CsvRow
  lead: PreparedLead | null
  errors: ImportIssue[]
  warnings: ImportIssue[]
  duplicate: DuplicateMatch | null
  /** Convenience flag: no errors and (not a duplicate || duplicates allowed). */
  importable: boolean
}

export type ExistingLead = {
  id: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
}

export type ImportOptions = {
  /** Force header -> field mappings (header text as it appears in the CSV). */
  mappingOverrides?: Record<string, ImportField | null>
  /** Ambiguous numeric date order. Default "DMY" (AU/UK style). */
  dateFormat?: DateFormat
  /** Status used when the CSV has no status column / an unrecognised label. */
  defaultStatus?: LeadStatus
  defaultPriority?: LeadPriority
  /** Applied when the row has no source column value. */
  defaultLeadSource?: LeadSource | null
  /** Append "Header: value" lines for columns we could not map. Default true. */
  keepUnmappedInNotes?: boolean
  /** Mark rows matching an existing lead / earlier row as duplicates. Default true. */
  detectDuplicates?: boolean
  /** If false, duplicates stay importable (they are still flagged). Default true. */
  skipDuplicates?: boolean
  /** Force the delimiter instead of auto-detecting. */
  delimiter?: string
}

export type ImportPlan = {
  headers: string[]
  mapping: ColumnMapping[]
  unmappedHeaders: string[]
  delimiter: string
  rows: ImportRowResult[]
  totals: {
    rows: number
    importable: number
    duplicates: number
    invalid: number
    warnings: number
  }
}

export type PrepareImportInput = {
  /** Raw CSV text. Mutually exclusive with `rows`. */
  csv?: string
  /** Already-parsed rows (e.g. posted as JSON from a UI). */
  rows?: CsvRow[]
  /** Header order for `rows`; inferred from the first row's keys when omitted. */
  headers?: string[]
  /** Leads already in the database, for cross-file duplicate detection. */
  existingLeads?: ExistingLead[]
  options?: ImportOptions
}

function nullIfBlank(value: string | undefined): string | null {
  const v = (value ?? "").trim()
  return v === "" ? null : v
}

function duplicateKey(email: string | null, firstName: string, lastName: string): { key: string; matchedBy: "email" | "name" } | null {
  if (email) return { key: `e:${email.trim().toLowerCase()}`, matchedBy: "email" }
  const name = `${firstName} ${lastName}`.replace(/\s+/g, " ").trim().toLowerCase()
  if (!name) return null
  return { key: `n:${name}`, matchedBy: "name" }
}

/**
 * Turn CSV text (or pre-parsed rows) into a full import plan: one result per
 * row, with per-row errors instead of an all-or-nothing failure.
 */
export function prepareImport(input: PrepareImportInput): ImportPlan {
  const options = input.options ?? {}
  const dateFormat = options.dateFormat ?? "DMY"
  const defaultStatus = options.defaultStatus ?? DEFAULT_STATUS
  const defaultPriority = options.defaultPriority ?? DEFAULT_PRIORITY
  const keepUnmapped = options.keepUnmappedInNotes !== false
  const detectDuplicates = options.detectDuplicates !== false
  const skipDuplicates = options.skipDuplicates !== false

  let headers: string[]
  let rows: CsvRow[]
  let rowNumbers: number[]
  let delimiter = options.delimiter ?? ","

  if (typeof input.csv === "string") {
    const parsed = parseCsv(input.csv, options.delimiter)
    headers = parsed.headers
    rows = parsed.rows
    rowNumbers = parsed.rowNumbers
    delimiter = parsed.delimiter
  } else {
    rows = input.rows ?? []
    headers = input.headers ?? (rows.length > 0 ? Object.keys(rows[0]) : [])
    rowNumbers = rows.map((_, i) => i + 2) // +2: line 1 is the header
  }

  const { columns, byHeader, unmapped } = mapHeaders(headers, options.mappingOverrides)

  // Pre-index the existing leads so duplicate detection is O(1) per row.
  const seenKeys = new Map<string, DuplicateMatch>()
  if (detectDuplicates) {
    for (const existing of input.existingLeads ?? []) {
      const key = duplicateKey(
        nullIfBlank(existing.email ?? undefined),
        existing.firstName ?? "",
        existing.lastName ?? ""
      )
      if (key && !seenKeys.has(key.key)) {
        seenKeys.set(key.key, { matchedBy: key.matchedBy, value: key.key.slice(2), existingLeadId: existing.id })
      }
    }
  }

  const results: ImportRowResult[] = []

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i]
    const rowNumber = rowNumbers[i] ?? i + 2
    const errors: ImportIssue[] = []
    const warnings: ImportIssue[] = []

    // Collect values per field (a field can receive several columns, e.g. notes).
    const values: Partial<Record<ImportField, string[]>> = {}
    const noteLines: string[] = []

    for (const header of headers) {
      const value = (raw[header] ?? "").trim()
      const field = byHeader[header]

      if (!field) {
        if (keepUnmapped && value) noteLines.push(`${header}: ${value}`)
        continue
      }
      if (!value) continue

      const bucket = values[field] ?? []
      bucket.push(value)
      values[field] = bucket
    }

    const first = (field: ImportField): string | null => {
      const bucket = values[field]
      return bucket && bucket.length > 0 ? bucket[0] : null
    }

    // --- name ----------------------------------------------------------
    let firstName = first("firstName") ?? ""
    let lastName = first("lastName") ?? ""

    if (!firstName && !lastName) {
      const full = first("fullName")
      if (full) {
        const split = splitName(full)
        firstName = split.firstName
        lastName = split.lastName
      }
    } else if (!firstName) {
      // Only a last name column had content — treat it as the display name.
      const split = splitName(lastName)
      firstName = split.firstName
      lastName = split.lastName
    }

    // --- email ---------------------------------------------------------
    let email = first("email")
    if (email) {
      // HubSpot sometimes exports several addresses in one cell.
      const parts = email.split(/[;,]\s*/).map((p) => p.trim()).filter(Boolean)
      const valid = parts.find((p) => isValidEmail(p))
      if (valid) {
        if (parts.length > 1) {
          const extras = parts.filter((p) => p !== valid)
          if (extras.length) noteLines.push(`Other emails: ${extras.join(", ")}`)
        }
        email = valid.toLowerCase()
      } else {
        warnings.push({ field: "email", message: `"${email}" is not a valid email address — kept in notes instead` })
        noteLines.push(`Email (unparsed): ${email}`)
        email = null
      }
    }

    // Last resort: derive a name from the email local part.
    if (!firstName && !lastName && email) {
      const local = email.split("@")[0].replace(/[._-]+/g, " ").trim()
      const split = splitName(local)
      firstName = split.firstName
      lastName = split.lastName
      const derived = `${firstName} ${lastName}`.trim()
      warnings.push({ field: "firstName", message: `No name column had a value — derived "${derived}" from the email address` })
    }

    if (!firstName) {
      errors.push({ field: "firstName", message: "Row has no name and no email address — nothing to create a lead from" })
    }

    // --- status / priority / source ------------------------------------
    const rawStatus = first("status")
    const statusResult = normaliseStatus(rawStatus, defaultStatus)
    if (rawStatus && !statusResult.recognised) {
      warnings.push({ field: "status", message: `Unrecognised status "${rawStatus}" — defaulted to "${statusResult.status}"` })
      noteLines.push(`Original status: ${rawStatus}`)
    }

    const priority = normalisePriority(first("priority"), defaultPriority)
    const leadSource = normaliseSource(first("leadSource")) ?? options.defaultLeadSource ?? null

    // --- dates ---------------------------------------------------------
    const rawCreatedAt = first("createdAt")
    let createdAt: Date | null = null
    if (rawCreatedAt) {
      createdAt = parseDateValue(rawCreatedAt, dateFormat)
      if (!createdAt) {
        warnings.push({ field: "createdAt", message: `Could not read the date "${rawCreatedAt}" — the lead will be dated today` })
        noteLines.push(`Original date of lead: ${rawCreatedAt}`)
      }
    }

    const rawLastContacted = first("lastContactedAt")
    let lastContactedAt: Date | null = null
    if (rawLastContacted) {
      lastContactedAt = parseDateValue(rawLastContacted, dateFormat)
      if (!lastContactedAt) {
        warnings.push({ field: "lastContactedAt", message: `Could not read the date "${rawLastContacted}" — left blank` })
      }
    }

    // --- location ------------------------------------------------------
    // The Lead model has no `state` column, so state/region is folded into
    // `address` alongside the street address.
    const addressParts = [first("address"), first("state")].filter(Boolean) as string[]
    const address = addressParts.length ? addressParts.join(", ") : null

    // --- notes ---------------------------------------------------------
    // Order: real note columns, then "currently owns", then leftovers.
    const noteColumns = values["notes"] ?? []
    const currentlyOwns = first("currentlyOwns")

    const notePieces: string[] = []
    for (const n of noteColumns) notePieces.push(n)
    if (currentlyOwns) notePieces.push(`Currently owns: ${currentlyOwns}`)
    for (const line of noteLines) notePieces.push(line)
    const notes = notePieces.length ? notePieces.join("\n") : null

    const lead: PreparedLead = {
      firstName,
      lastName,
      email,
      phone: first("phone"),
      mobile: first("mobile"),
      company: first("company"),
      jobTitle: first("jobTitle"),
      website: first("website"),
      linkedin: first("linkedin"),
      leadSource,
      notes,
      budget: first("budget"),
      vesselInterest: first("vesselInterest"),
      address,
      city: first("city"),
      country: first("country"),
      status: statusResult.status,
      priority,
      createdAt,
      lastContactedAt,
      ownerName: first("ownerName"),
    }

    // --- duplicates ----------------------------------------------------
    let duplicate: DuplicateMatch | null = null
    if (detectDuplicates && errors.length === 0) {
      const key = duplicateKey(email, firstName, lastName)
      if (key) {
        const hit = seenKeys.get(key.key)
        if (hit) {
          duplicate = { ...hit, matchedBy: key.matchedBy, value: key.key.slice(2) }
        } else {
          seenKeys.set(key.key, { matchedBy: key.matchedBy, value: key.key.slice(2), duplicateOfRow: rowNumber })
        }
      }
    }

    const importable = errors.length === 0 && !(duplicate && skipDuplicates)

    results.push({
      rowNumber,
      raw,
      lead: errors.length === 0 ? lead : null,
      errors,
      warnings,
      duplicate,
      importable,
    })
  }

  return {
    headers,
    mapping: columns,
    unmappedHeaders: unmapped,
    delimiter,
    rows: results,
    totals: {
      rows: results.length,
      importable: results.filter((r) => r.importable).length,
      duplicates: results.filter((r) => r.duplicate).length,
      invalid: results.filter((r) => r.errors.length > 0).length,
      warnings: results.filter((r) => r.warnings.length > 0).length,
    },
  }
}

/* -------------------------------------------------------------------------- */
/* Owner resolution                                                            */
/* -------------------------------------------------------------------------- */

export type ImportUser = {
  id: string
  name: string
  email: string
  initials?: string | null
}

/**
 * Match a free-text "Contact Owner" value against the CRM's users.
 * Tries email, then full name, then initials, then a unique first-name match.
 * Returns null when there is no confident match (caller falls back to a default).
 */
export function resolveOwnerId(ownerName: string | null | undefined, users: ImportUser[]): string | null {
  const raw = (ownerName ?? "").trim()
  if (!raw) return null

  const lower = raw.toLowerCase()

  const byEmail = users.find((u) => u.email.toLowerCase() === lower)
  if (byEmail) return byEmail.id

  const normalisedRaw = normaliseValue(raw)
  const byName = users.find((u) => normaliseValue(u.name) === normalisedRaw)
  if (byName) return byName.id

  const byInitials = users.find((u) => (u.initials ?? "").toLowerCase() === lower && lower.length > 0)
  if (byInitials) return byInitials.id

  // "James" -> "James Hartley", but only when it is unambiguous.
  const firstToken = normalisedRaw.split(" ")[0]
  if (firstToken.length >= 3) {
    const candidates = users.filter((u) => normaliseValue(u.name).split(" ")[0] === firstToken)
    if (candidates.length === 1) return candidates[0].id
  }

  // Email local part, e.g. "sophie@yachtcrm.com" exported as "sophie".
  const byLocalPart = users.filter((u) => u.email.split("@")[0].toLowerCase() === lower)
  if (byLocalPart.length === 1) return byLocalPart[0].id

  return null
}

/* -------------------------------------------------------------------------- */
/* Persistence payload + summary                                               */
/* -------------------------------------------------------------------------- */

/** The exact object to hand to prisma.lead.create({ data }). */
export type LeadCreateData = {
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  mobile: string | null
  company: string | null
  jobTitle: string | null
  website: string | null
  linkedin: string | null
  leadSource: string | null
  notes: string | null
  budget: string | null
  vesselInterest: string | null
  address: string | null
  city: string | null
  country: string | null
  status: string
  priority: string
  ownerId: string | null
  createdAt?: Date
  lastContactedAt: Date | null
}

/** Strip the import-only fields and attach the resolved owner. */
export function toLeadCreateData(lead: PreparedLead, ownerId: string | null): LeadCreateData {
  const { ownerName, createdAt, ...rest } = lead
  return {
    ...rest,
    ownerId,
    ...(createdAt ? { createdAt } : {}),
  }
}

export type ImportRowReport = {
  row: number
  name: string
  email: string | null
  status: "created" | "skipped_duplicate" | "error"
  message?: string
  warnings?: string[]
  leadId?: string
}

export type ImportSummary = {
  totalRows: number
  created: number
  skippedDuplicates: number
  failed: number
  withWarnings: number
  unmappedHeaders: string[]
  mapping: Array<{ header: string; field: ImportField | null }>
  rows: ImportRowReport[]
  dryRun: boolean
}

/** Render an ImportSummary as plain text (used by the CLI, handy for debugging). */
export function formatSummary(summary: ImportSummary): string {
  const lines: string[] = []
  lines.push(summary.dryRun ? "DRY RUN — nothing was written to the database" : "Import complete")
  lines.push("")
  lines.push(`  Rows read .............. ${summary.totalRows}`)
  lines.push(`  Leads created .......... ${summary.created}`)
  lines.push(`  Skipped (duplicates) ... ${summary.skippedDuplicates}`)
  lines.push(`  Failed (errors) ........ ${summary.failed}`)
  lines.push(`  Rows with warnings ..... ${summary.withWarnings}`)
  lines.push("")

  lines.push("Column mapping:")
  for (const m of summary.mapping) {
    lines.push(`  ${m.header.padEnd(28)} -> ${m.field ?? "(not imported — kept in notes)"}`)
  }

  const problems = summary.rows.filter((r) => r.status !== "created" || (r.warnings && r.warnings.length))
  if (problems.length) {
    lines.push("")
    lines.push("Rows needing attention:")
    for (const r of problems) {
      const label = `  Line ${r.row} — ${r.name || "(no name)"}${r.email ? ` <${r.email}>` : ""}`
      if (r.status === "error") lines.push(`${label}: ERROR ${r.message ?? ""}`)
      else if (r.status === "skipped_duplicate") lines.push(`${label}: SKIPPED ${r.message ?? "duplicate"}`)
      else lines.push(`${label}: ok`)
      for (const w of r.warnings ?? []) lines.push(`      warning: ${w}`)
    }
  }

  return lines.join("\n")
}
