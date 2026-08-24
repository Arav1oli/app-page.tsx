import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
  ACTIVITY_ORDER_BY,
  DEFAULT_ACTIVITY_PAGE_SIZE,
  FORBIDDEN_DELETE,
  MAX_ACTIVITY_PAGE_SIZE,
  OWNER_SELECT,
  UNAUTHORIZED,
  badRequest,
  buildActivityWhere,
  isAdmin,
  notFound,
  paginationMeta,
  parseLeadUpdate,
  parsePagination,
  readJsonBody,
  toErrorResponse,
} from "@/lib/validation"

/**
 * GET /api/leads/[id]?activityPage=1&activityPageSize=50
 *
 * 200 -> Lead & {
 *   owner: { id, name, initials } | null,
 *   activities: Activity[],                    // one page, newest first
 *   activityPagination: { page, pageSize, total, totalPages, hasMore }
 * }
 *
 * The timeline is paginated because a single imported contact can carry
 * thousands of activities (the worst offender has ~3,600) — returning them all
 * would blow up both the query and the payload.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    const { searchParams } = new URL(req.url)
    const { page, pageSize, skip, take } = parsePagination(searchParams, {
      pageParam: "activityPage",
      pageSizeParam: "activityPageSize",
      defaultPageSize: DEFAULT_ACTIVITY_PAGE_SIZE,
      maxPageSize: MAX_ACTIVITY_PAGE_SIZE,
    })

    // Timeline is ordered by occurredAt (when it happened), not createdAt (when
    // the importer wrote the row) — see buildActivityWhere in lib/validation.ts.
    const activityWhere = buildActivityWhere(params.id, searchParams)

    const [lead, activityTotal, activities] = await Promise.all([
      prisma.lead.findUnique({
        where: { id: params.id },
        include: { owner: { select: OWNER_SELECT } },
      }),
      prisma.activity.count({ where: activityWhere }),
      prisma.activity.findMany({
        where: activityWhere,
        include: { user: { select: OWNER_SELECT } },
        orderBy: ACTIVITY_ORDER_BY,
        skip,
        take,
      }),
    ])

    if (!lead) return NextResponse.json(notFound("Lead not found").body, { status: 404 })

    return NextResponse.json({
      ...lead,
      activities,
      activityPagination: paginationMeta(page, pageSize, activityTotal),
    })
  } catch (error) {
    const { status, body } = toErrorResponse(error, `GET /api/leads/${params.id}`)
    return NextResponse.json(body, { status })
  }
}

/**
 * PUT /api/leads/[id] — partial update.
 *
 * MASS ASSIGNMENT FIX: the body is never handed to Prisma directly. Only
 * allowlisted, coerced fields survive parseLeadUpdate, so `id`, `createdAt`,
 * `updatedAt` and unknown keys are dropped. Previously `data: body` let any
 * signed-in user rewrite a lead's primary key and silently break every link to
 * that record.
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    const json = await readJsonBody(req)
    if (!json.ok) return NextResponse.json(badRequest(json.error).body, { status: 400 })

    const parsed = parseLeadUpdate(json.data)
    if (!parsed.ok) return NextResponse.json(badRequest(parsed.error).body, { status: 400 })

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: parsed.data,
      include: { owner: { select: OWNER_SELECT } },
    })

    return NextResponse.json(lead)
  } catch (error) {
    // P2025 (record not found) is mapped to a clean 404 by toErrorResponse.
    const { status, body } = toErrorResponse(error, `PUT /api/leads/${params.id}`)
    return NextResponse.json(body, { status })
  }
}

/**
 * DELETE /api/leads/[id] — admin only.
 *
 * Deliberate policy (see lib/validation.ts): every authenticated user can read
 * and edit, but deletion is irreversible and cascades to the lead's activities,
 * so it is restricted to role "admin". Agents mark a lead "lost" instead.
 */
export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    if (!isAdmin(session.user as { role?: string } | undefined)) {
      return NextResponse.json(FORBIDDEN_DELETE.body, { status: FORBIDDEN_DELETE.status })
    }

    await prisma.lead.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    // Deleting an already-deleted id throws Prisma P2025 -> clean 404, not a
    // raw 500 with a stack trace and connection details in it.
    const { status, body } = toErrorResponse(error, `DELETE /api/leads/${params.id}`)
    return NextResponse.json(body, { status })
  }
}
