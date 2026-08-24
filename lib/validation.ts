/**
 * Request validation, query parsing and error mapping for the JSON API.
 *
 * Everything the API routes need to turn *untrusted* input (query strings and
 * request bodies) into something safe to hand to Prisma lives here. Two rules
 * drive the whole file:
 *
 *   1. NEVER spread a raw request body into Prisma. Every writable field is
 *      listed explicitly below, so a client cannot set `id`, `createdAt`,
 *      `updatedAt` or any column we did not intend to expose. Overwriting `id`
 *      would silently orphan every existing link to that record.
 *   2. NEVER interpolate user input into a query shape. `sort`/`dir` are
 *      matched against allowlists and fall back to the default when unknown.
 *
 * This module deliberately does not import from `next`, so it can be unit
 * tested or reused from a script. Routes convert the plain objects it returns
 * into NextResponse.
 */

import { Prisma } from "@prisma/client"

/* -------------------------------------------------------------------------- */
/* Domain constants                                                           */
/* -------------------------------------------------------------------------- */

// NOTE: these mirror STATUS_CONFIG / PRIORITY_CONFIG in lib/utils.ts, the
// constants in lib/import.ts and the comments in prisma/schema.prisma. They are
// duplicated rather than imported so that the API layer keeps validating input
// even while those files are being edited elsewhere.
export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]
export const DEFAULT_STATUS: LeadStatus = "new"

export const LEAD_PRIORITIES = ["low", "medium", "high"] as const
export type LeadPriority = (typeof LEAD_PRIORITIES)[number]
export const DEFAULT_PRIORITY: LeadPriority = "medium"

export const ACTIVITY_TYPES = ["note", "call", "email", "meeting", "task"] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

// The remaining enum-ish columns documented in prisma/schema.prisma. SQLite has
// no enums, so the values are only enforced here — which is exactly why the
// write path has to do it.
export const LEAD_SOURCES = [
  "referral",
  "website",
  "cold_call",
  "social",
  "event",
  "boat_show",
  "import",
  "other",
] as const
export const LIFECYCLE_STAGES = [
  "subscriber",
  "lead",
  "marketingqualifiedlead",
  "salesqualifiedlead",
  "opportunity",
  "customer",
  "evangelist",
  "other",
] as const
export const BUDGET_BANDS = ["under_500k", "500k_1m", "1m_2m", "2m_3m", "3m_5m", "5m_plus"] as const
export const TIMEFRAMES = [
  "browsing",
  "researching",
  "comparing",
  "0_3_months",
  "3_6_months",
  "6_12_months",
  "12_months_plus",
  "unknown",
] as const
export const BOAT_TYPES = [
  "sports_cruiser",
  "flybridge_cruiser",
  "sailing_yacht",
  "full_displacement",
  "semi_displacement",
  "superyacht",
] as const
export const STATE_REGIONS = ["nsw", "vic", "qld", "wa", "sa", "tas", "nt", "act", "nz", "intl"] as const
export const ACTIVITY_DIRECTIONS = ["incoming", "outgoing"] as const

/** Columns a client is allowed to sort by. Anything else falls back to the default. */
export const LEAD_SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "lastName",
  "firstName",
  "company",
  "lastContactedAt",
] as const
export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number]
export const DEFAULT_SORT: LeadSortField = "updatedAt"
export const DEFAULT_DIR: "asc" | "desc" = "desc"

export const DEFAULT_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 200
export const DEFAULT_ACTIVITY_PAGE_SIZE = 50
export const MAX_ACTIVITY_PAGE_SIZE = 200
export const DEFAULT_PER_COLUMN = 25
export const MAX_PER_COLUMN = 100

/** Longest search term we will send to the database. */
const MAX_SEARCH_LENGTH = 200
/** Longest value accepted for a free-text field (`notes` gets its own limit). */
const MAX_TEXT_LENGTH = 5_000
const MAX_NOTES_LENGTH = 20_000

/** Standard `owner`/`user` projection used by every route that returns a lead. */
export const OWNER_SELECT = { id: true, name: true, initials: true } as const

/* -------------------------------------------------------------------------- */
/* Case-insensitive search — the SQLite / PostgreSQL footgun                   */
/* -------------------------------------------------------------------------- */

/**
 * Is the active datasource PostgreSQL?
 *
 * Read from DATABASE_URL rather than the schema because the schema provider is
 * swapped at deploy time (see prisma/schema.prisma).
 */
function isPostgres(): boolean {
  const url = process.env.DATABASE_URL ?? ""
  return /^postgres(ql)?:\/\//i.test(url)
}

const POSTGRES = isPostgres()

/**
 * Build a case-insensitive `contains` filter that behaves the same on both
 * engines.
 *
 * THE FOOTGUN: Prisma's `contains` compiles to SQL `LIKE`, and `LIKE` is
 * case-INSENSITIVE on SQLite (for ASCII) but case-SENSITIVE on PostgreSQL.
 * Local dev runs on SQLite, so searching "ashworth" happily matches "Ashworth"
 * — and then silently stops matching the moment production moves to Postgres.
 * Nothing errors; search just quietly returns fewer rows, which is the worst
 * kind of bug.
 *
 * The fix is `mode: "insensitive"`, which makes Postgres use ILIKE. But that
 * argument is NOT supported by the SQLite connector — passing it there is a
 * validation error — so it has to be added conditionally at runtime. Hence the
 * `as` cast: the generated client types only carry `mode` when the schema
 * provider is postgresql.
 */
export function containsInsensitive(value: string): Prisma.StringFilter {
  return (
    POSTGRES ? { contains: value, mode: "insensitive" } : { contains: value }
  ) as Prisma.StringFilter
}

/* -------------------------------------------------------------------------- */
/* Query-string parsing                                                       */
/* -------------------------------------------------------------------------- */

/** Query-string booleans: `1`, `true` and `yes` all mean true. */
function isTruthy(raw: string | null): boolean {
  if (raw === null) return false
  const v = raw.trim().toLowerCase()
  return v === "1" || v === "true" || v === "yes"
}

/** Parse a bounded positive integer, falling back to `fallback` on any garbage. */
function intParam(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw.trim() === "") return fallback
  const n = Number(raw)
  if (!Number.isFinite(n)) return fallback
  const i = Math.floor(n)
  if (i < min) return min
  if (i > max) return max
  return i
}

export type Pagination = {
  page: number
  pageSize: number
  skip: number
  take: number
}

/**
 * `page` is 1-based and clamped to >= 1; `pageSize` is clamped into
 * [1, maxPageSize]. Client values are never trusted: a missing, negative,
 * non-numeric or absurd value degrades to a sane default instead of erroring,
 * because a paging control should not be able to 400 the whole page.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  opts: {
    pageParam?: string
    pageSizeParam?: string
    defaultPageSize?: number
    maxPageSize?: number
  } = {}
): Pagination {
  const {
    pageParam = "page",
    pageSizeParam = "pageSize",
    defaultPageSize = DEFAULT_PAGE_SIZE,
    maxPageSize = MAX_PAGE_SIZE,
  } = opts

  const page = intParam(searchParams.get(pageParam), 1, 1, Number.MAX_SAFE_INTEGER)
  const pageSize = intParam(searchParams.get(pageSizeParam), defaultPageSize, 1, maxPageSize)

  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize }
}

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

export function paginationMeta(page: number, pageSize: number, total: number): PaginationMeta {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize)
  return { page, pageSize, total, totalPages, hasMore: page * pageSize < total }
}

/**
 * Resolve `sort`/`dir` against the allowlist.
 *
 * Unknown values fall back to the default rather than 400-ing, so a stale
 * bookmark or a renamed column cannot break the list view. The returned value
 * is always one of our own literals — no user string ever reaches the query.
 *
 * A secondary `id` sort is appended for deterministic paging: without a unique
 * tie-break, rows with equal sort keys (very common for `company`, and for
 * `lastName` now that most imported contacts have none) can appear on two
 * pages or on none.
 */
export function parseLeadOrderBy(searchParams: URLSearchParams): Prisma.LeadOrderByWithRelationInput[] {
  const rawSort = searchParams.get("sort")
  const rawDir = searchParams.get("dir")

  const sort = (LEAD_SORT_FIELDS as readonly string[]).includes(rawSort ?? "")
    ? (rawSort as LeadSortField)
    : DEFAULT_SORT
  const dir: "asc" | "desc" = rawDir === "asc" || rawDir === "desc" ? rawDir : DEFAULT_DIR

  // Name sorts get the other half of the name as a secondary key: 84% of
  // imported contacts have no lastName, so sorting on lastName alone dumps most
  // of the database into one undifferentiated NULL bucket (see the naming note
  // in prisma/schema.prisma, which the @@index([lastName, firstName]) matches).
  const keys: Prisma.LeadOrderByWithRelationInput[] =
    sort === "lastName"
      ? [{ lastName: dir }, { firstName: dir }]
      : sort === "firstName"
        ? [{ firstName: dir }, { lastName: dir }]
        : [{ [sort]: dir } as Prisma.LeadOrderByWithRelationInput]

  return [...keys, { id: "asc" }]
}

/**
 * Build the `where` clause for a lead list/board query.
 *
 * `status` and `ownerId` are equality filters on indexed-able columns; `search`
 * is an OR of case-insensitive `contains` (see containsInsensitive above).
 * Unknown status values are dropped rather than passed through, so a typo
 * returns the unfiltered list instead of an empty one caused by a bad column
 * comparison.
 */
export function buildLeadWhere(searchParams: URLSearchParams): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {}

  // Staff mailboxes are stored as contacts and carry thousands of BCC-to-CRM
  // notes each (see prisma/schema.prisma). They are excluded from every list,
  // board and count by default; `?includeInternal=1` is the escape hatch for an
  // admin who genuinely needs to see them.
  if (!isTruthy(searchParams.get("includeInternal"))) {
    where.isInternal = false
  }

  const status = searchParams.get("status")?.trim()
  if (status && (LEAD_STATUSES as readonly string[]).includes(status)) {
    where.status = status
  }

  const ownerId = searchParams.get("ownerId")?.trim()
  if (ownerId) {
    // "unassigned" is a useful pseudo-filter for the owner dropdown.
    where.ownerId = ownerId === "unassigned" ? null : ownerId
  }

  const search = searchParams.get("search")?.trim().slice(0, MAX_SEARCH_LENGTH)
  if (search) {
    where.OR = [
      { firstName: containsInsensitive(search) },
      { lastName: containsInsensitive(search) },
      { email: containsInsensitive(search) },
      { company: containsInsensitive(search) },
    ]
  }

  return where
}

/**
 * Where/orderBy for a lead's activity timeline.
 *
 * ORDER BY occurredAt, NOT createdAt: `occurredAt` is when the call/email/note
 * actually happened, `createdAt` is when the importer wrote the row. On
 * imported history the two differ by months, so sorting on createdAt produces a
 * timeline in import order rather than chronological order. `id` tie-breaks
 * rows sharing a timestamp (bulk imports produce these constantly) so paging
 * cannot drop or duplicate an entry.
 */
export function buildActivityWhere(leadId: string, searchParams: URLSearchParams): Prisma.ActivityWhereInput {
  const where: Prisma.ActivityWhereInput = { leadId }
  // BCC-to-CRM noise is hidden by default, same rationale as leads above.
  if (!isTruthy(searchParams.get("includeInternal"))) {
    where.isInternal = false
  }
  return where
}

export const ACTIVITY_ORDER_BY: Prisma.ActivityOrderByWithRelationInput[] = [
  { occurredAt: "desc" },
  { id: "desc" },
]

/* -------------------------------------------------------------------------- */
/* Body validation — the mass-assignment allowlist                            */
/* -------------------------------------------------------------------------- */

/**
 * Every column a client may write, and how to coerce it.
 *
 * Anything absent from this map (`id`, `createdAt`, `updatedAt`, relation
 * payloads such as `activities`/`owner`, or an entirely unknown key) is dropped
 * silently — never forwarded to Prisma.
 */
const LEAD_STRING_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "mobile",
  "company",
  "jobTitle",
  "website",
  "notes",
  "sourceDetail",
  "vesselInterest",
  "currentlyOwns",
  "budget", // legacy free-text column, still read by the existing UI
  "budgetRaw",
  "timeframeRaw",
  "stateRaw",
  "metAtShow",
  "address",
  "city",
  "country",
  "linkedin",
] as const
type LeadStringField = (typeof LEAD_STRING_FIELDS)[number]

/**
 * Enum-ish columns: value must be one of the documented options.
 *
 * SQLite cannot enforce these and Postgres will not either until they become
 * real enums, so this is the only thing standing between the columns and
 * whatever a client feels like sending.
 */
const LEAD_ENUM_FIELDS: Record<string, readonly string[]> = {
  status: LEAD_STATUSES,
  priority: LEAD_PRIORITIES,
  leadSource: LEAD_SOURCES,
  lifecycleStage: LIFECYCLE_STAGES,
  budgetBand: BUDGET_BANDS,
  timeframe: TIMEFRAMES,
  boatType: BOAT_TYPES,
  stateRegion: STATE_REGIONS,
}

/** Bounded integers. */
const LEAD_INT_FIELDS: Record<string, { min: number; max: number }> = {
  boatYear: { min: 1900, max: new Date().getFullYear() + 5 },
  boatSize: { min: 1, max: 1000 }, // length in feet
}

const LEAD_BOOLEAN_FIELDS = ["ownsBoat", "isInternal"] as const

/**
 * NOT writable, deliberately:
 *   id, createdAt, updatedAt — server-owned. Rewriting `id` would orphan every
 *     existing link to the record; that was the original bug.
 *   externalId — the importer's idempotency key. A client that could set it
 *     could make the next import overwrite or duplicate an unrelated contact.
 *   activities / owner — relation payloads; nested writes are never accepted.
 */

/**
 * Is `Lead.lastName` optional in the generated client?
 *
 * 84% of the real contact export has no surname, so the column is being made
 * nullable. Until that lands we must not write `null` into a NOT NULL column,
 * and afterwards we must not write `""` where `null` is meant. Asking the
 * runtime DMMF keeps this correct under either schema instead of guessing.
 */
const LAST_NAME_NULLABLE: boolean = (() => {
  try {
    const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "Lead")
    const field = model?.fields.find((f) => f.name === "lastName")
    return field ? !field.isRequired : false
  } catch {
    return false // safest assumption: treat as still-required
  }
})()

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; error: string }

function coerceString(
  key: string,
  raw: unknown,
  maxLength: number
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null) return { ok: true, value: null }
  if (typeof raw === "number" || typeof raw === "boolean") {
    // Be forgiving about JSON that arrived from a form/CSV as a scalar.
    return { ok: true, value: String(raw) }
  }
  if (typeof raw !== "string") {
    return { ok: false, error: `${key} must be a string` }
  }
  const trimmed = raw.trim()
  if (trimmed.length > maxLength) {
    return { ok: false, error: `${key} must be ${maxLength} characters or fewer` }
  }
  // An empty string from a cleared form field means "no value".
  return { ok: true, value: trimmed === "" ? null : trimmed }
}

function coerceDate(key: string, raw: unknown): { ok: true; value: Date | null } | { ok: false; error: string } {
  if (raw === null || raw === "") return { ok: true, value: null }
  if (typeof raw !== "string" && typeof raw !== "number") {
    return { ok: false, error: `${key} must be an ISO date string` }
  }
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return { ok: false, error: `${key} must be a valid date` }
  return { ok: true, value: d }
}

function coerceBoolean(
  key: string,
  raw: unknown
): { ok: true; value: boolean | null } | { ok: false; error: string } {
  if (raw === null || raw === "") return { ok: true, value: null }
  if (typeof raw === "boolean") return { ok: true, value: raw }
  if (raw === "true" || raw === 1 || raw === "1") return { ok: true, value: true }
  if (raw === "false" || raw === 0 || raw === "0") return { ok: true, value: false }
  return { ok: false, error: `${key} must be a boolean` }
}

function coerceInt(
  key: string,
  raw: unknown,
  min: number,
  max: number
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (raw === null || raw === "") return { ok: true, value: null }
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN
  if (!Number.isFinite(n)) return { ok: false, error: `${key} must be a number` }
  const i = Math.trunc(n)
  if (i < min || i > max) return { ok: false, error: `${key} must be between ${min} and ${max}` }
  return { ok: true, value: i }
}

type LeadWritable = Partial<Record<LeadStringField, string | null>> & {
  [key: string]: string | number | boolean | Date | null | undefined
}

/**
 * Pick and coerce the allowlisted lead fields present in `body`.
 *
 * `mode: "create"` requires a usable `firstName`; `mode: "update"` treats every
 * field as optional so a PATCH-style partial update works. In both cases the
 * result contains ONLY keys from the allowlist.
 */
export function parseLeadInput(body: unknown, mode: "create" | "update"): ValidationResult<LeadWritable> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" }
  }
  const input = body as Record<string, unknown>
  const data: LeadWritable = {}

  for (const key of LEAD_STRING_FIELDS) {
    if (!(key in input)) continue
    const limit = key === "notes" ? MAX_NOTES_LENGTH : MAX_TEXT_LENGTH
    const res = coerceString(key, input[key], limit)
    if (!res.ok) return res
    data[key] = res.value
  }

  for (const [key, allowed] of Object.entries(LEAD_ENUM_FIELDS)) {
    if (!(key in input)) continue
    const raw = input[key]
    // Clearing an optional enum-ish field is allowed; status/priority have
    // defaults and are checked for emptiness below.
    if (raw === null || raw === "") {
      data[key] = null
      continue
    }
    const value = typeof raw === "string" ? raw.trim().toLowerCase() : ""
    if (!allowed.includes(value)) {
      return { ok: false, error: `${key} must be one of: ${allowed.join(", ")}` }
    }
    data[key] = value
  }

  if (data.status === null) return { ok: false, error: "status cannot be empty" }
  if (data.priority === null) return { ok: false, error: "priority cannot be empty" }

  for (const [key, range] of Object.entries(LEAD_INT_FIELDS)) {
    if (!(key in input)) continue
    const res = coerceInt(key, input[key], range.min, range.max)
    if (!res.ok) return res
    data[key] = res.value
  }

  for (const key of LEAD_BOOLEAN_FIELDS) {
    if (!(key in input)) continue
    const res = coerceBoolean(key, input[key])
    if (!res.ok) return res
    // isInternal is NOT NULL with a default; null means "not internal".
    data[key] = key === "isInternal" ? res.value ?? false : res.value
  }

  if ("ownerId" in input) {
    // Assigning an owner is a legitimate UI action (the owner dropdown is fed
    // by GET /api/users), so this stays writable — but only as a plain id or an
    // explicit unassignment. A bad id is rejected by the FK and mapped to 400.
    const res = coerceString("ownerId", input.ownerId, 200)
    if (!res.ok) return res
    data.ownerId = res.value
  }

  if ("lastContactedAt" in input) {
    const res = coerceDate("lastContactedAt", input.lastContactedAt)
    if (!res.ok) return res
    data.lastContactedAt = res.value
  }

  if (mode === "create") {
    if (!data.firstName) {
      return { ok: false, error: "firstName is required" }
    }
    // lastName is optional: most imported contacts are first-name only. Write
    // null when the column allows it, otherwise "" so the insert still works
    // against the pre-migration schema.
    if (data.lastName == null) {
      data.lastName = LAST_NAME_NULLABLE ? null : ""
    }
    data.status ??= DEFAULT_STATUS
    data.priority ??= DEFAULT_PRIORITY
  } else {
    if ("firstName" in input && !data.firstName) {
      return { ok: false, error: "firstName cannot be empty" }
    }
    if ("lastName" in input && data.lastName == null && !LAST_NAME_NULLABLE) {
      data.lastName = ""
    }
    if (Object.keys(data).length === 0) {
      return { ok: false, error: "No updatable fields supplied" }
    }
  }

  return { ok: true, data }
}

/**
 * Typed wrappers used by the routes.
 *
 * The single cast lives here: `parseLeadInput` has already guaranteed that every
 * key comes from the allowlist and every value is coerced, so the object is a
 * valid *unchecked* input (scalars only — no nested relation writes). Casting
 * here means no route ever needs to loosen its own types.
 */
export function parseLeadCreate(body: unknown): ValidationResult<Prisma.LeadUncheckedCreateInput> {
  const parsed = parseLeadInput(body, "create")
  if (!parsed.ok) return parsed
  return { ok: true, data: parsed.data as unknown as Prisma.LeadUncheckedCreateInput }
}

export function parseLeadUpdate(body: unknown): ValidationResult<Prisma.LeadUncheckedUpdateInput> {
  const parsed = parseLeadInput(body, "update")
  if (!parsed.ok) return parsed
  return { ok: true, data: parsed.data as unknown as Prisma.LeadUncheckedUpdateInput }
}

/** Optional free-text columns on an activity. */
const ACTIVITY_STRING_FIELDS = [
  "subject",
  "outcome",
  "status",
  "priority",
  "location",
  "taskType",
] as const

export type ActivityWritable = {
  type: ActivityType
  content: string
  [key: string]: string | Date | null | undefined
}

/**
 * Allowlist for a logged activity.
 *
 * Not writable, deliberately:
 *   bodyHtml   — raw HTML that the timeline renders. Accepting it from a client
 *                would be a stored-XSS hole the moment anything renders it; the
 *                importer is the only writer, and it must be sanitised at
 *                render time regardless.
 *   externalId — importer idempotency key (same reasoning as on Lead).
 *   userId     — always taken from the session, never the body, so an activity
 *                cannot be attributed to another user.
 *   isInternal — set by the importer to flag BCC noise; not a client concern.
 */
export function parseActivityInput(body: unknown): ValidationResult<ActivityWritable> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Request body must be a JSON object" }
  }
  const input = body as Record<string, unknown>

  const type = typeof input.type === "string" ? input.type.trim().toLowerCase() : ""
  if (!(ACTIVITY_TYPES as readonly string[]).includes(type)) {
    return { ok: false, error: `type must be one of: ${ACTIVITY_TYPES.join(", ")}` }
  }

  const content = typeof input.content === "string" ? input.content.trim() : ""
  if (!content) return { ok: false, error: "content is required" }
  if (content.length > MAX_NOTES_LENGTH) {
    return { ok: false, error: `content must be ${MAX_NOTES_LENGTH} characters or fewer` }
  }

  const data: ActivityWritable = { type: type as ActivityType, content }

  for (const key of ACTIVITY_STRING_FIELDS) {
    if (!(key in input)) continue
    const res = coerceString(key, input[key], MAX_TEXT_LENGTH)
    if (!res.ok) return res
    data[key] = res.value
  }

  if ("direction" in input && input.direction !== null && input.direction !== "") {
    const direction = typeof input.direction === "string" ? input.direction.trim().toLowerCase() : ""
    if (!(ACTIVITY_DIRECTIONS as readonly string[]).includes(direction)) {
      return { ok: false, error: `direction must be one of: ${ACTIVITY_DIRECTIONS.join(", ")}` }
    }
    data.direction = direction
  }

  for (const key of ["occurredAt", "dueAt", "endAt"] as const) {
    if (!(key in input)) continue
    const res = coerceDate(key, input[key])
    if (!res.ok) return res
    // occurredAt has a NOT NULL default: never write null over it.
    if (key === "occurredAt" && res.value === null) continue
    data[key] = res.value
  }

  return { ok: true, data }
}

/**
 * Typed wrapper for the route. `leadId` and `userId` are supplied by the route
 * itself (from the URL and the session), never from the body.
 */
export function parseActivityCreate(
  body: unknown
): ValidationResult<Omit<Prisma.ActivityUncheckedCreateInput, "leadId" | "userId">> {
  const parsed = parseActivityInput(body)
  if (!parsed.ok) return parsed
  return {
    ok: true,
    data: parsed.data as unknown as Omit<Prisma.ActivityUncheckedCreateInput, "leadId" | "userId">,
  }
}

/** Reads a JSON body without letting malformed JSON throw a raw 500. */
export async function readJsonBody(req: { json(): Promise<unknown> }): Promise<ValidationResult<unknown>> {
  try {
    return { ok: true, data: await req.json() }
  } catch {
    return { ok: false, error: "Request body must be valid JSON" }
  }
}

/* -------------------------------------------------------------------------- */
/* Authorization                                                              */
/* -------------------------------------------------------------------------- */

export type SessionUser = { id?: string; role?: string } | undefined

/**
 * ACCESS POLICY (deliberate, not an oversight):
 *
 *   read  — any authenticated user
 *   write — any authenticated user (create / edit / move on the board / log
 *           activity). This is an 8–27 person brokerage where leads are
 *           routinely covered for colleagues; per-owner write locks would
 *           create more friction than they prevent.
 *   DELETE — role "admin" ONLY. Deletion is the one irreversible action
 *           (activities cascade with the lead), so it is restricted to the
 *           handful of admins. Agents mark leads "lost" instead.
 *
 * The `role` claim is set in lib/auth.ts and carried on the JWT.
 */
export function isAdmin(user: SessionUser): boolean {
  return user?.role === "admin"
}

/* -------------------------------------------------------------------------- */
/* Error mapping                                                              */
/* -------------------------------------------------------------------------- */

export type ApiErrorResponse = { status: number; body: { error: string } }

export const UNAUTHORIZED: ApiErrorResponse = { status: 401, body: { error: "Unauthorized" } }
export const FORBIDDEN_DELETE: ApiErrorResponse = {
  status: 403,
  body: { error: "Only an admin can delete a lead" },
}

export function badRequest(message: string): ApiErrorResponse {
  return { status: 400, body: { error: message } }
}

export function notFound(what = "Not found"): ApiErrorResponse {
  return { status: 404, body: { error: what } }
}

/**
 * Turn any thrown error into a safe client response.
 *
 * The real error is logged server-side; the client only ever sees a short,
 * generic message. Prisma error messages embed the connection string, the
 * failing SQL and the model shape, so they must never be forwarded.
 */
export function toErrorResponse(error: unknown, context: string): ApiErrorResponse {
  // Server-side only. Never included in the response body.
  console.error(`[api] ${context}:`, error)

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2025": // "An operation failed because it depends on one or more records that were required but not found."
        return notFound("Not found")
      case "P2003": // foreign key constraint failed — e.g. an ownerId that does not exist
        return badRequest("Related record does not exist")
      case "P2002": // unique constraint failed
        return badRequest("A record with that value already exists")
      default:
        return { status: 500, body: { error: "Database error" } }
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    // Almost always our own bug or a field the schema no longer has.
    return badRequest("Invalid request")
  }

  return { status: 500, body: { error: "Internal server error" } }
}
