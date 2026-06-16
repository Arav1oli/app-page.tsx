// Scalar fields a client is allowed to set on a lead. Everything else
// (id, createdAt, updatedAt, relations) is managed server-side, so the
// raw request body must never be passed straight into Prisma.
export const LEAD_FIELDS = [
  "status", "priority", "firstName", "lastName", "email", "phone", "mobile",
  "company", "jobTitle", "website", "leadSource", "notes", "budget",
  "vesselInterest", "address", "city", "country", "linkedin", "ownerId",
] as const

// Pick only the allowed keys from an arbitrary request body. When
// `keepEmpty` is false, blank strings are dropped (create); when true,
// blank strings become null so a field can be cleared on edit.
export function pickLeadFields(body: any, keepEmpty: boolean) {
  const out: Record<string, unknown> = {}
  if (!body || typeof body !== "object") return out
  for (const key of LEAD_FIELDS) {
    if (!(key in body)) continue
    const value = body[key]
    if (typeof value === "string" && value.trim() === "") {
      if (keepEmpty) out[key] = null
      continue
    }
    out[key] = value
  }
  return out
}
