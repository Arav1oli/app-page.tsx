/**
 * Data normalisation coverage report.
 *
 * Reads a CSV export (HubSpot, Monday, anything), runs every recognised column
 * through lib/normalize.ts and prints, per field:
 *
 *   - how many values normalised cleanly
 *   - how many fell back to null, broken down by WHY
 *   - the distribution across the buckets
 *   - the TOP 20 unrecognised values, with counts
 *
 * That last list is the point of this script: it is how the owner discovers
 * what the mapper is still missing. Add the values to the tables in
 * lib/normalize.ts, re-run, watch the list shrink.
 *
 * Run it the same way as the seed script:
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/normalize-report.ts ./hubspot-contacts.csv
 *
 * Flags:
 *   --top <n>             How many unrecognised values to list. Default 20.
 *   --field <name>        Only report one field (budget|timeframe|state|
 *                         currentlyOwns|boatType). Repeatable.
 *   --map "Header"=field  Force a column to a field when the header is odd.
 *   --delimiter ";"       Force the column separator instead of auto-detecting.
 *   --out <file.csv>      Also write every unrecognised value + count to a CSV.
 *   --json                Print the raw JSON report instead of the text one.
 *
 * Nothing is written to the database. This script only reads.
 */
import { readFileSync, writeFileSync, existsSync } from "fs"
import { parseCsv } from "../lib/import"
import {
  detectNormalisableField,
  isEmailHeader,
  isInternalEmail,
  normaliseField,
  normaliseState,
  normaliseCurrentlyOwns,
  BOAT_SHOW_LABELS,
  FIELD_BUCKETS,
  FIELD_LABELS,
  NORMALISABLE_FIELDS,
  type BoatShow,
  type FailureReason,
  type NormalisableField,
} from "../lib/normalize"

/* -------------------------------------------------------------------------- */
/* Arguments                                                                   */
/* -------------------------------------------------------------------------- */

type Args = {
  file: string | null
  top: number
  fields: NormalisableField[]
  overrides: Record<string, NormalisableField>
  delimiter: string | undefined
  out: string | null
  json: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    file: null,
    top: 20,
    fields: [],
    overrides: {},
    delimiter: undefined,
    out: null,
    json: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i] ?? ""

    if (arg === "--top") {
      const n = Number(next())
      args.top = isFinite(n) && n > 0 ? Math.floor(n) : 20
    } else if (arg === "--field") {
      const f = next() as NormalisableField
      if ((NORMALISABLE_FIELDS as readonly string[]).indexOf(f) !== -1) args.fields.push(f)
    } else if (arg === "--map") {
      const pair = next()
      const eq = pair.lastIndexOf("=")
      if (eq > 0) {
        const header = pair.slice(0, eq).trim()
        const field = pair.slice(eq + 1).trim() as NormalisableField
        if ((NORMALISABLE_FIELDS as readonly string[]).indexOf(field) !== -1) args.overrides[header] = field
      }
    } else if (arg === "--delimiter") {
      args.delimiter = next().replace(/^\\t$/, "\t")
    } else if (arg === "--out") {
      args.out = next()
    } else if (arg === "--json") {
      args.json = true
    } else if (!arg.startsWith("-")) {
      args.file = arg
    }
  }

  return args
}

function usage() {
  console.log(`
Report how well lib/normalize.ts copes with a CSV export.

  npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/normalize-report.ts <file.csv> [flags]

  --top <n>             Unrecognised values to list per field. Default 20
  --field <name>        Only this field: ${NORMALISABLE_FIELDS.join(" | ")}
  --map "Header"=field  Force a column onto a field
  --delimiter ";"       Force the column separator
  --out <file.csv>      Write every unrecognised value + count to a CSV
  --json                Print the raw JSON report

Nothing is written to the database.
`)
}

/* -------------------------------------------------------------------------- */
/* Counting                                                                    */
/* -------------------------------------------------------------------------- */

const REASON_LABELS: Record<FailureReason, string> = {
  empty: "blank",
  placeholder: "junk / placeholder",
  wrong_field: "value belongs to another field",
  ambiguous: "too vague to bucket",
  unrecognised: "NOT IN THE LOOKUP TABLES",
}

const REASON_ORDER: FailureReason[] = ["unrecognised", "ambiguous", "wrong_field", "placeholder", "empty"]

type Counter = Record<string, number>

function bump(counter: Counter, key: string) {
  counter[key] = (counter[key] ?? 0) + 1
}

function sortedEntries(counter: Counter): Array<[string, number]> {
  return Object.keys(counter)
    .map((k): [string, number] => [k, counter[k]])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

type FieldReport = {
  field: NormalisableField
  label: string
  headers: string[]
  total: number
  filled: number
  clean: number
  nulls: number
  reasons: Counter
  distribution: Counter
  /** Values needing a decision — reason "unrecognised" or "ambiguous". */
  unrecognised: Counter
  /** Values understood as belonging to another field. No action needed. */
  explained: Counter
}

function emptyReport(field: NormalisableField, headers: string[], total: number): FieldReport {
  return {
    field,
    label: FIELD_LABELS[field],
    headers,
    total,
    filled: 0,
    clean: 0,
    nulls: 0,
    reasons: {},
    distribution: {},
    unrecognised: {},
    explained: {},
  }
}

type Report = {
  file: string
  rows: number
  columns: number
  delimiter: string
  fields: FieldReport[]
  /** Lifted out of the state column. */
  boatShows: Counter
  stateCountryOnly: number
  /** Currently-owns tri-state. */
  owns: { yes: number; no: number; unknown: number; named: number }
  emails: { column: string | null; filled: number; internal: number }
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                  */
/* -------------------------------------------------------------------------- */

function num(n: number): string {
  return n.toLocaleString("en-AU")
}

function pct(n: number, of: number): string {
  if (of === 0) return "  0.0%"
  return `${((n / of) * 100).toFixed(1).padStart(5)}%`
}

function bar(n: number, of: number, width = 24): string {
  if (of === 0) return ""
  const filled = Math.max(0, Math.min(width, Math.round((n / of) * width)))
  return `${"█".repeat(filled)}${"·".repeat(width - filled)}`
}

function formatReport(report: Report, top: number): string {
  const lines: string[] = []

  lines.push("")
  lines.push(`📄 ${report.file}`)
  lines.push(
    `   ${num(report.rows)} data rows, ${report.columns} columns, delimiter "${report.delimiter === "\t" ? "\\t" : report.delimiter}"`
  )
  lines.push("")

  if (report.fields.length === 0) {
    lines.push("⚠ None of the columns looked like budget / timeframe / state / currently owns / boat type.")
    lines.push("  Use --map \"Your Header\"=budget to point the report at the right column.")
    return lines.join("\n")
  }

  lines.push("Columns being normalised:")
  for (const f of report.fields) {
    lines.push(`  ${f.headers.join(", ").padEnd(34)} -> ${f.field}`)
  }
  lines.push("")

  for (const f of report.fields) {
    lines.push("─".repeat(76))
    lines.push(`${f.label.toUpperCase()}   (column${f.headers.length === 1 ? "" : "s"}: ${f.headers.join(", ")})`)
    lines.push("")
    lines.push(`  Rows ................. ${num(f.total)}`)
    lines.push(`  Filled in ............ ${num(f.filled)}   ${pct(f.filled, f.total)} of rows`)
    lines.push(`  Normalised cleanly ... ${num(f.clean)}   ${pct(f.clean, f.filled)} of filled  ${bar(f.clean, f.filled)}`)
    lines.push(`  Fell back to null .... ${num(f.nulls)}   ${pct(f.nulls, f.filled)} of filled`)

    const reasons = REASON_ORDER.filter((r) => r !== "empty" && (f.reasons[r] ?? 0) > 0)
    if (reasons.length) {
      lines.push("")
      lines.push("  Why the nulls happened:")
      for (const r of reasons) {
        lines.push(`    ${REASON_LABELS[r].padEnd(34)} ${num(f.reasons[r]).padStart(7)}`)
      }
    }

    const buckets = FIELD_BUCKETS[f.field]
    const distribution = sortedEntries(f.distribution)
    if (distribution.length) {
      lines.push("")
      lines.push("  Where the clean values landed:")
      // Keep the declared bucket order, then anything unexpected.
      const ordered = buckets
        .filter((b) => (f.distribution[b] ?? 0) > 0)
        .map((b): [string, number] => [b, f.distribution[b]])
      for (const [key, count] of distribution) {
        if (buckets.indexOf(key) === -1) ordered.push([key, count])
      }
      for (const [key, count] of ordered) {
        lines.push(`    ${key.padEnd(20)} ${num(count).padStart(7)}   ${bar(count, f.clean, 18)}`)
      }
    }

    const explained = sortedEntries(f.explained)
    if (explained.length) {
      let explainedRecords = 0
      for (const [, count] of explained) explainedRecords += count
      lines.push("")
      lines.push(`  Understood, but belongs to another field (${num(explainedRecords)} records — already handled):`)
      for (const [value, count] of explained.slice(0, top)) {
        lines.push(`    ${num(count).padStart(6)} x  "${value}"`)
      }
    }

    const unrecognised = sortedEntries(f.unrecognised)
    let unrecognisedRecords = 0
    for (const [, count] of unrecognised) unrecognisedRecords += count

    lines.push("")
    if (unrecognised.length === 0) {
      lines.push("  ✅ Every filled value was either mapped or explained. Nothing to add.")
    } else {
      const shown = unrecognised.slice(0, top)
      const hiddenValues = unrecognised.length - shown.length
      let hiddenRecords = 0
      for (let i = shown.length; i < unrecognised.length; i++) hiddenRecords += unrecognised[i][1]

      lines.push(
        `  TOP ${shown.length} UNRECOGNISED VALUES  (${num(unrecognised.length)} distinct, ${num(unrecognisedRecords)} records) — ADD THESE TO THE TABLES:`
      )
      for (let i = 0; i < shown.length; i++) {
        const [value, count] = shown[i]
        lines.push(`    ${String(i + 1).padStart(3)}. ${num(count).padStart(6)} x  "${value}"`)
      }
      if (hiddenValues > 0) {
        lines.push(
          `         ... and ${num(hiddenValues)} more distinct values covering ${num(hiddenRecords)} records (--top ${unrecognised.length} to see them all)`
        )
      }
    }
    lines.push("")
  }

  lines.push("─".repeat(76))
  lines.push("LIFTED OUT OF THE WRONG FIELD")
  lines.push("")
  const shows = sortedEntries(report.boatShows)
  if (shows.length === 0) {
    lines.push("  No boat show names found in the state column.")
  } else {
    let totalShows = 0
    for (const [, count] of shows) totalShows += count
    lines.push(`  ${num(totalShows)} records had a BOAT SHOW in the state column, not a state.`)
    lines.push("  These now carry metAtShow and no state:")
    for (const [code, count] of shows) {
      const label = BOAT_SHOW_LABELS[code as BoatShow] ?? code
      lines.push(`    ${code.padEnd(8)} ${num(count).padStart(6)}   ${label}`)
    }
  }
  if (report.stateCountryOnly > 0) {
    lines.push(`  ${num(report.stateCountryOnly)} records named a country but no state (e.g. "australia").`)
  }
  lines.push("")

  lines.push("─".repeat(76))
  lines.push("BOAT OWNERSHIP")
  lines.push("")
  lines.push(`  Owns a boat .......... ${num(report.owns.yes)}   (${num(report.owns.named)} named the boat)`)
  lines.push(`  Owns nothing ......... ${num(report.owns.no)}`)
  lines.push(`  Unknown (junk/blank) . ${num(report.owns.unknown)}`)
  lines.push("")

  lines.push("─".repeat(76))
  lines.push("INTERNAL RECORDS")
  lines.push("")
  if (!report.emails.column) {
    lines.push("  No email column found, so staff mailboxes could not be counted.")
  } else {
    lines.push(`  Email column ......... ${report.emails.column}`)
    lines.push(`  Addresses ............ ${num(report.emails.filled)}`)
    lines.push(`  Staff mailboxes ...... ${num(report.emails.internal)}   (@flagshipinternational.com.au — not customers)`)
  }
  lines.push("")

  lines.push("─".repeat(76))
  lines.push("WHAT TO DO NEXT")
  lines.push("")
  const gap = (f: FieldReport) => {
    let total = 0
    for (const [, count] of sortedEntries(f.unrecognised)) total += count
    return total
  }
  const worst = report.fields.filter((f) => gap(f) > 0).sort((a, b) => gap(b) - gap(a))
  if (worst.length === 0) {
    lines.push("  Nothing — every filled value was mapped or explained.")
  } else {
    lines.push("  1. Look at the TOP UNRECOGNISED lists above.")
    lines.push("  2. For each value you recognise, add a line to the matching table in")
    lines.push("     lib/normalize.ts (BUDGET_ALIASES, TIMEFRAME_ALIASES, REGION_ALIASES,")
    lines.push("     OWNS_NEGATIONS/OWNS_AFFIRMATIONS or BOAT_TYPE_ALIASES).")
    lines.push("  3. Re-run this report. The list should get shorter every time.")
    lines.push("")
    lines.push(`  Biggest gap right now: ${worst[0].label} — ${num(gap(worst[0]))} records unmapped.`)
  }
  lines.push("")

  return lines.join("\n")
}

/* -------------------------------------------------------------------------- */
/* Main                                                                        */
/* -------------------------------------------------------------------------- */

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function main() {
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

  const parsed = parseCsv(readFileSync(args.file, "utf8"), args.delimiter)
  if (parsed.rows.length === 0) {
    console.error("✗ No data rows found. Is the first line of the file the column headers?")
    process.exitCode = 1
    return
  }

  // --- work out which column feeds which normaliser ------------------------
  const columnsByField: Record<string, string[]> = {}
  for (const header of parsed.headers) {
    const forced = args.overrides[header]
    const field = forced ?? detectNormalisableField(header)
    if (!field) continue
    if (args.fields.length > 0 && args.fields.indexOf(field) === -1) continue
    const bucket = columnsByField[field] ?? []
    bucket.push(header)
    columnsByField[field] = bucket
  }

  const emailColumn = parsed.headers.filter((h) => isEmailHeader(h))[0] ?? null

  const report: Report = {
    file: args.file,
    rows: parsed.rows.length,
    columns: parsed.headers.length,
    delimiter: parsed.delimiter,
    fields: [],
    boatShows: {},
    stateCountryOnly: 0,
    owns: { yes: 0, no: 0, unknown: 0, named: 0 },
    emails: { column: emailColumn, filled: 0, internal: 0 },
  }

  for (const field of NORMALISABLE_FIELDS) {
    const headers = columnsByField[field]
    if (!headers || headers.length === 0) continue

    const fieldReport = emptyReport(field, headers, parsed.rows.length)

    for (const row of parsed.rows) {
      // A field can be spread over more than one column; the first non-blank wins.
      let raw = ""
      for (const header of headers) {
        const cell = (row[header] ?? "").trim()
        if (cell !== "") {
          raw = row[header]
          break
        }
      }

      if (raw.trim() === "") {
        bump(fieldReport.reasons, "empty")
        continue
      }
      fieldReport.filled++

      const result = normaliseField(field, raw)

      if (result.value !== null) {
        fieldReport.clean++
        bump(fieldReport.distribution, result.value)
      } else {
        fieldReport.nulls++
        bump(fieldReport.reasons, result.reason ?? "unrecognised")
        // Values the owner has to make a decision about. Blank and obvious
        // junk are already accounted for in the reason breakdown above.
        if (result.reason === "unrecognised" || result.reason === "ambiguous") {
          bump(fieldReport.unrecognised, raw)
        }
        // Understood, but the value belongs to a different field. Listed
        // separately because the mapper is already handling these correctly.
        if (result.reason === "wrong_field") bump(fieldReport.explained, raw)
      }

      // --- the extras that only some fields produce ----------------------
      if (field === "state") {
        const state = normaliseState(raw)
        if (state.metAtShow) bump(report.boatShows, state.metAtShow)
        if (!state.value && state.country) report.stateCountryOnly++
      }
      if (field === "currentlyOwns") {
        const owns = normaliseCurrentlyOwns(raw)
        if (owns.ownsBoat === true) {
          report.owns.yes++
          if (owns.currentlyOwns) report.owns.named++
        } else if (owns.ownsBoat === false) {
          report.owns.no++
        } else {
          report.owns.unknown++
        }
      }
    }

    report.fields.push(fieldReport)
  }

  if (emailColumn) {
    for (const row of parsed.rows) {
      const email = (row[emailColumn] ?? "").trim()
      if (email === "") continue
      report.emails.filled++
      if (isInternalEmail(email)) report.emails.internal++
    }
  }

  if (args.out) {
    const lines = ["field,count,raw_value,reason"]
    for (const f of report.fields) {
      for (const [value, count] of sortedEntries(f.unrecognised)) {
        lines.push(`${f.field},${count},${csvCell(value)},needs_mapping`)
      }
      for (const [value, count] of sortedEntries(f.explained)) {
        lines.push(`${f.field},${count},${csvCell(value)},belongs_to_another_field`)
      }
    }
    try {
      writeFileSync(args.out, `${lines.join("\n")}\n`, "utf8")
      console.log(`\n💾 Unrecognised values written to ${args.out}`)
    } catch (err) {
      console.error(`✗ Could not write ${args.out}:`, err instanceof Error ? err.message : err)
    }
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2))
  } else {
    console.log(formatReport(report, args.top))
  }
}

try {
  main()
} catch (err) {
  console.error("✗ Report failed:", err)
  process.exitCode = 1
}
