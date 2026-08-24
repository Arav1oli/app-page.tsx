import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
  OWNER_SELECT,
  UNAUTHORIZED,
  badRequest,
  buildLeadWhere,
  paginationMeta,
  parseLeadCreate,
  parseLeadOrderBy,
  parsePagination,
  readJsonBody,
  toErrorResponse,
} from "@/lib/validation"

/**
 * GET /api/leads
 *   ?page=1&pageSize=50&status=&ownerId=&search=&sort=updatedAt&dir=desc
 *
 * 200 -> { data: Lead[], pagination: { page, pageSize, total, totalPages, hasMore } }
 *
 * The dataset is ~29k contacts, so this endpoint is ALWAYS paginated — there is
 * no "return everything" mode. pageSize is clamped to 200 server-side and the
 * sort column is allowlisted (see lib/validation.ts).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    const { searchParams } = new URL(req.url)
    const { page, pageSize, skip, take } = parsePagination(searchParams)
    const where = buildLeadWhere(searchParams)
    const orderBy = parseLeadOrderBy(searchParams)

    // Count and page are independent queries: run them concurrently. The count
    // is a COUNT(*) with the same WHERE — we never load rows just to count them.
    const [total, data] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        include: { owner: { select: OWNER_SELECT } },
        orderBy,
        skip,
        take,
      }),
    ])

    return NextResponse.json({ data, pagination: paginationMeta(page, pageSize, total) })
  } catch (error) {
    const { status, body } = toErrorResponse(error, "GET /api/leads")
    return NextResponse.json(body, { status })
  }
}

/**
 * POST /api/leads — create a lead.
 *
 * The body is run through an explicit field allowlist; unknown keys and
 * server-owned columns (id, createdAt, updatedAt) are discarded rather than
 * spread into Prisma.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    const json = await readJsonBody(req)
    if (!json.ok) return NextResponse.json(badRequest(json.error).body, { status: 400 })

    const parsed = parseLeadCreate(json.data)
    if (!parsed.ok) return NextResponse.json(badRequest(parsed.error).body, { status: 400 })

    const lead = await prisma.lead.create({
      data: parsed.data,
      include: { owner: { select: OWNER_SELECT } },
    })

    return NextResponse.json(lead, { status: 201 })
  } catch (error) {
    const { status, body } = toErrorResponse(error, "POST /api/leads")
    return NextResponse.json(body, { status })
  }
}
