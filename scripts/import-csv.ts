/**
 * CLI CSV importer.
 *
 * Run it the same way as the seed script:
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-csv.ts ./monday-leads.csv
 *
 * Flags:
 *   --dry-run             Report what would happen, write nothing.
 *   --owner "<name>"      Fallback owner when the CSV owner can't be matched.
 *   --date-format mdy     Read 01/02/2024 as 2 January (US). Default: dmy.
 *   --status <key>        Status for rows with a blank/unknown status. Default: new.
 *   --source <key>        Lead source for rows with no source column.
 *   --delimiter ";"       Force the column separator instead of auto-detecting.
 *   --allow-duplicates    Import rows that match an existing lead instead of skipping.
 *   --no-extra-notes      Don't copy unmapped columns into the lead's notes.
 *   --json                Print the raw JSON summary instead of the report.
 */
import { readFileSync, existsSync } from "fs"
import { PrismaClient } from "@prisma/client"
import {
  prepareImport,
  resolveOwnerId,
  toLeadCreateData,
  formatSummary,
  LEAD_STATUSES,
  LEAD_SOURCES,
  type DateFormat,
  type ImportRowReport,
  type ImportSummary,
  type LeadSource,
  type LeadStatus,
} from "../lib/import"

const prisma = new PrismaClient()

type Args = {
  file: string | null
  dryRun: boolean
  owner: string | null
  dateFormat: DateFormat
  defaultStatus: LeadStatus
  defaultSource: LeadSource | null
  delimiter: string | undefined
  allowDuplicates: boolean
  keepUnmappedInNotes: boolean
  json: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    file: null,
    dryRun: false,
    owner: null,
    dateFormat: "DMY",
    defaultStatus: "new",
    defaultSource: null,
    delimiter: undefined,
    allowDuplicates: false,
    keepUnmappedInNotes: true,
    json: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i] ?? ""

    if (arg === "--dry-run") args.dryRun = true
    else if (arg === "--owner") args.owner = next()
    else if (arg === "--date-format") args.dateFormat = next().toLowerCase() === "mdy" ? "MDY" : "DMY"
    else if (arg === "--status") args.defaultStatus = next().toLowerCase() as LeadStatus
    else if (arg === "--source") args.defaultSource = next().toLowerCase() as LeadSource
    else if (arg === "--delimiter") args.delimiter = next().replace(/^\\t$/, "\t")
    else if (arg === "--allow-duplicates") args.allowDuplicates = true
    else if (arg === "--no-extra-notes") args.keepUnmappedInNotes = false
    else if (arg === "--json") args.json = true
    else if (!arg.startsWith("-")) args.file = arg
  }

  return args
}

function usage() {
  console.log(`
Import leads from a CSV file exported from Monday.com or HubSpot.

  npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/import-csv.ts <file.csv> [flags]

  --dry-run             Show what would happen without saving anything
  --owner "<name>"      Fallback owner (CRM user name, email or initials)
  --date-format mdy     Read 01/02/2024 as 2 January (US exports). Default: dmy
  --status <key>        Default status: ${LEAD_STATUSES.join(" | ")}
  --source <key>        Default lead source: ${LEAD_SOURCES.join(" | ")}
  --delimiter ";"       Force the column separator
  --allow-duplicates    Import duplicates instead of skipping them
  --no-extra-notes      Don't copy unrecognised columns into the notes
  --json                Print the raw JSON summary
`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args.file) {
    usage()
    process.exitCode = 1
    return
  }
  if (!existsSync(args.file)) {
    console.error(`✗ File not found: ${args.file}`)
    process.exitCode = 1
    return
  }
  if (!(LEAD_STATUSES as readonly string[]).includes(args.defaultStatus)) {
    console.error(`✗ Unknown --status "${args.defaultStatus}". Valid: ${LEAD_STATUSES.join(", ")}`)
    process.exitCode = 1
    return
  }
  if (args.defaultSource && !(LEAD_SOURCES as readonly string[]).includes(args.defaultSource)) {
    console.error(`✗ Unknown --source "${args.defaultSource}". Valid: ${LEAD_SOURCES.join(", ")}`)
    process.exitCode = 1
    return
  }

  const csv = readFileSync(args.file, "utf8")

  const [existingLeads, users] = await Promise.all([
    prisma.lead.findMany({ select: { id: true, email: true, firstName: true, lastName: true } }),
    prisma.user.findMany({ select: { id: true, name: true, email: true, initials: true } }),
  ])

  let defaultOwnerId: string | null = null
  if (args.owner) {
    defaultOwnerId = resolveOwnerId(args.owner, users)
    if (!defaultOwnerId) {
      console.error(`✗ No CRM user matches --owner "${args.owner}".`)
      console.error(`  Known users: ${users.map((u) => `${u.name} <${u.email}>`).join(", ") || "(none — run the seed first)"}`)
      process.exitCode = 1
      return
    }
  }

  const plan = prepareImport({
    csv,
    existingLeads,
    options: {
      dateFormat: args.dateFormat,
      defaultStatus: args.defaultStatus,
      defaultLeadSource: args.defaultSource,
      delimiter: args.delimiter,
      skipDuplicates: !args.allowDuplicates,
      keepUnmappedInNotes: args.keepUnmappedInNotes,
    },
  })

  if (plan.totals.rows === 0) {
    console.error("✗ No data rows found. Is the first line of the file the column headers?")
    process.exitCode = 1
    return
  }

  if (!args.json) {
    console.log(`\n📄 ${args.file}`)
    console.log(`   ${plan.totals.rows} data rows, ${plan.headers.length} columns, delimiter "${plan.delimiter === "\t" ? "\\t" : plan.delimiter}"`)
    if (args.dryRun) console.log("   DRY RUN — nothing will be written\n")
    else console.log("")
  }

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
      const where = row.duplicate.duplicateOfRow ? `same as line ${row.duplicate.duplicateOfRow}` : "already in the CRM"
      rows.push({
        row: row.rowNumber,
        name,
        email,
        status: "skipped_duplicate",
        message: `Duplicate ${row.duplicate.matchedBy} (${row.duplicate.value}) — ${where}`,
        warnings,
      })
      continue
    }

    const matchedOwnerId = resolveOwnerId(row.lead.ownerName, users)
    if (row.lead.ownerName && !matchedOwnerId) {
      warnings.push(`Could not match owner "${row.lead.ownerName}" to a CRM user${defaultOwnerId ? " — assigned to the default owner" : " — left unassigned"}`)
    }
    const ownerId = matchedOwnerId ?? defaultOwnerId

    if (args.dryRun) {
      created++
      rows.push({ row: row.rowNumber, name, email, status: "created", warnings })
      continue
    }

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
    dryRun: args.dryRun,
  }

  if (args.json) {
    console.log(JSON.stringify(summary, null, 2))
  } else {
    console.log(formatSummary(summary))
    console.log("")
    if (summary.failed > 0) {
      console.log("Fix the ERROR lines in your spreadsheet and re-run — the rows that")
      console.log("worked are already in the CRM and will be skipped as duplicates.")
    } else if (!args.dryRun) {
      console.log("✅ All done.")
    }
  }

  if (summary.failed > 0) process.exitCode = 2
}

main()
  .catch((err) => {
    console.error("✗ Import failed:", err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
