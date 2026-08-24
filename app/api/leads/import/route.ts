import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
  prepareImport,
  resolveOwnerId,
  toLeadCreateData,
  type CsvRow,
  type ImportOptions,
  type ImportRowReport,
  type ImportSummary,
} from "@/lib/import"

export const dynamic = "force-dynamic"

type ImportRequestBody = {
  /** Raw CSV text. Either this or `rows` must be supplied. */
  csv?: string
  /** Already-parsed rows, e.g. from a client-side preview step. */
  rows?: CsvRow[]
  headers?: string[]
  options?: ImportOptions
  /** Validate and report without writing anything. */
  dryRun?: boolean
  /** Owner applied when the CSV's "Contact Owner" cannot be matched to a user. */
  defaultOwnerId?: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Accept either JSON ({ csv } / { rows }) or a raw text/csv body.
  let body: ImportRequestBody = {}
  const contentType = req.headers.get("content-type") ?? ""

  try {
    if (contentType.includes("text/csv") || contentType.includes("text/plain")) {
      body = { csv: await req.text() }
    } else {
      body = (await req.json()) as ImportRequestBody
    }
  } catch {
    return NextResponse.json({ error: "Could not read the request body — send JSON or a text/csv payload" }, { status: 400 })
  }

  if (typeof body.csv !== "string" && !Array.isArray(body.rows)) {
    return NextResponse.json({ error: "Provide either `csv` (raw CSV text) or `rows` (parsed rows)" }, { status: 400 })
  }
  if (typeof body.csv === "string" && body.csv.trim() === "") {
    return NextResponse.json({ error: "The CSV file is empty" }, { status: 400 })
  }

  const dryRun = body.dryRun === true

  const [existingLeads, users] = await Promise.all([
    prisma.lead.findMany({ select: { id: true, email: true, firstName: true, lastName: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, initials: true } }),
  ])

  const plan = prepareImport({
    csv: body.csv,
    rows: body.rows,
    headers: body.headers,
    existingLeads,
    options: body.options,
  })

  if (plan.totals.rows === 0) {
    return NextResponse.json({ error: "No data rows found in the file — is the first line the column headers?" }, { status: 400 })
  }

  // Fall back to the importing user when the CSV owner cannot be matched.
  const sessionUserId = (session.user as { id?: string } | undefined)?.id ?? null
  const requestedDefault = body.defaultOwnerId ?? sessionUserId
  const defaultOwnerId = users.some((u) => u.id === requestedDefault) ? (requestedDefault as string) : null

  const rows: ImportRowReport[] = []
  let created = 0
  let skippedDuplicates = 0
  let failed = 0

  for (const row of plan.rows) {
    const name = row.lead ? `${row.lead.firstName} ${row.lead.lastName}`.trim() : ""
    const email = row.lead?.email ?? null
    const warnings = row.warnings.map((w) => w.message)

    if (row.errors.length > 0 || !row.lead) {
      failed++
      rows.push({
        row: row.rowNumber,
        name,
        email,
        status: "error",
        message: row.errors.map((e) => e.message).join("; ") || "Row could not be prepared",
        warnings,
      })
      continue
    }

    if (!row.importable && row.duplicate) {
      skippedDuplicates++
      rows.push({
        row: row.rowNumber,
        name,
        email,
        status: "skipped_duplicate",
        message:
          row.duplicate.matchedBy === "email"
            ? `Duplicate email (${row.duplicate.value})${row.duplicate.duplicateOfRow ? ` — same as line ${row.duplicate.duplicateOfRow}` : " — already in the CRM"}`
            : `Duplicate name (${row.duplicate.value})${row.duplicate.duplicateOfRow ? ` — same as line ${row.duplicate.duplicateOfRow}` : " — already in the CRM"}`,
        warnings,
      })
      continue
    }

    const ownerId = resolveOwnerId(row.lead.ownerName, users) ?? defaultOwnerId
    if (row.lead.ownerName && !resolveOwnerId(row.lead.ownerName, users)) {
      warnings.push(`Could not match owner "${row.lead.ownerName}" to a CRM user — assigned to the default owner`)
    }

    if (dryRun) {
      created++
      rows.push({ row: row.rowNumber, name, email, status: "created", warnings })
      continue
    }

    // One bad row must never abort the whole import.
    try {
      const lead = await prisma.lead.create({ data: toLeadCreateData(row.lead, ownerId) })
      created++
      rows.push({ row: row.rowNumber, name, email, status: "created", warnings, leadId: lead.id })
    } catch (err) {
      failed++
      rows.push({
        row: row.rowNumber,
        name,
        email,
        status: "error",
        message: err instanceof Error ? err.message : "Failed to save this lead",
        warnings,
      })
    }
  }

  const summary: ImportSummary = {
    totalRows: plan.totals.rows,
    created,
    skippedDuplicates,
    failed,
    withWarnings: rows.filter((r) => (r.warnings ?? []).length > 0).length,
    unmappedHeaders: plan.unmappedHeaders,
    mapping: plan.mapping.map((m) => ({ header: m.header, field: m.field })),
    rows,
    dryRun,
  }

  return NextResponse.json(summary, { status: dryRun ? 200 : 201 })
}
