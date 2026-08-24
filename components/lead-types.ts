/**
 * Shared lead types + display helpers for the CRM UI.
 *
 * `lastName` is NULLABLE: only ~4,586 of 29,339 imported contacts have a
 * surname, so every render path has to cope with it being missing. Never do
 * `{lead.firstName} {lead.lastName}` or `lead.lastName[0]` directly — use
 * `displayName()` / `leadInitials()` instead.
 */

export type UserRef = { id: string; name: string; initials: string }

export type Lead = {
  id: string
  firstName: string
  lastName?: string | null
  email?: string | null
  phone?: string | null
  mobile?: string | null
  company?: string | null
  jobTitle?: string | null
  website?: string | null
  linkedin?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  status: string
  priority: string
  leadSource?: string | null
  notes?: string | null
  budget?: string | null
  vesselInterest?: string | null
  lastContactedAt?: string | null
  createdAt?: string
  updatedAt: string
  ownerId?: string | null
  owner?: UserRef | null
}

/** A lead loaded on the detail page, where createdAt is always present. */
export type LeadDetail = Lead & { createdAt: string }

export type Activity = {
  id: string
  type: string
  content: string
  createdAt: string
  user?: UserRef | null
}

export type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

/** Sort keys the API allowlists. */
export const SORT_FIELDS = [
  "updatedAt",
  "createdAt",
  "lastName",
  "firstName",
  "company",
  "lastContactedAt",
] as const
export type SortField = (typeof SORT_FIELDS)[number]

type NamedLead = { firstName?: string | null; lastName?: string | null }

/** Human-readable name that never renders "Homer undefined". */
export function displayName(lead: NamedLead): string {
  const name = [lead.firstName, lead.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
  return name || "Unnamed contact"
}

/** Avatar initials. Falls back to two letters of whichever name exists. */
export function leadInitials(lead: NamedLead): string {
  const first = lead.firstName?.trim() ?? ""
  const last = lead.lastName?.trim() ?? ""
  if (first && last) return (first[0] + last[0]).toUpperCase()
  const only = first || last
  if (!only) return "?"
  return only.slice(0, 2).toUpperCase()
}

/**
 * Null-safe name comparator. Contacts with no surname fall back to their first
 * name so they interleave alphabetically instead of clustering under "".
 * (Listing order is server-side now; this is for any client-side ordering.)
 */
export function compareLeadsByName(a: NamedLead, b: NamedLead): number {
  const key = (l: NamedLead) =>
    (l.lastName?.trim() || l.firstName?.trim() || "").toLowerCase()
  const result = key(a).localeCompare(key(b))
  if (result !== 0) return result
  return (a.firstName?.trim() ?? "")
    .toLowerCase()
    .localeCompare((b.firstName?.trim() ?? "").toLowerCase())
}

/** Best-effort message out of a failed fetch Response. */
export async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json()
    if (typeof body?.error === "string") return body.error
    if (typeof body?.message === "string") return body.message
  } catch {
    /* non-JSON body */
  }
  return `${fallback} (HTTP ${res.status})`
}
