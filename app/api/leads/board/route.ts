import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
  DEFAULT_PER_COLUMN,
  LEAD_STATUSES,
  MAX_PER_COLUMN,
  OWNER_SELECT,
  UNAUTHORIZED,
  buildLeadWhere,
  parsePagination,
  toErrorResponse,
} from "@/lib/validation"

/**
 * GET /api/leads/board?ownerId=&search=&perColumn=25
 *
 * 200 -> { columns: [ { status, total, leads: Lead[] } ] }   // one per status
 *
 * The kanban board must never load 29k rows. Each column returns its TOTAL
 * count (from a single groupBy) plus only the first `perColumn` cards; the UI
 * loads more within a column via GET /api/leads?status=X&page=N.
 *
 * `perColumn` defaults to 25 and is clamped to 100. A `status` query param is
 * ignored here on purpose — the board always renders every column.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    const { searchParams } = new URL(req.url)

    // Reuse the list filters (ownerId + search), then strip any status filter
    // so the board is always complete.
    const baseWhere = buildLeadWhere(searchParams)
    delete baseWhere.status

    const { pageSize: perColumn } = parsePagination(searchParams, {
      pageSizeParam: "perColumn",
      defaultPageSize: DEFAULT_PER_COLUMN,
      maxPageSize: MAX_PER_COLUMN,
    })

    // One grouped COUNT for all columns + one small page per column, all
    // concurrent. Total queries: 1 + number of statuses, none of them unbounded.
    const [grouped, ...columnLeads] = await Promise.all([
      prisma.lead.groupBy({
        by: ["status"],
        where: baseWhere,
        _count: { _all: true },
      }),
      ...LEAD_STATUSES.map((status) =>
        prisma.lead.findMany({
          where: { ...baseWhere, status },
          include: { owner: { select: OWNER_SELECT } },
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
          take: perColumn,
        })
      ),
    ])

    const totals = new Map<string, number>(grouped.map((g) => [g.status, g._count._all]))

    const columns = LEAD_STATUSES.map((status, i) => ({
      status,
      total: totals.get(status) ?? 0,
      leads: columnLeads[i],
    }))

    return NextResponse.json({ columns })
  } catch (error) {
    const { status, body } = toErrorResponse(error, "GET /api/leads/board")
    return NextResponse.json(body, { status })
  }
}
