import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import {
  ACTIVITY_ORDER_BY,
  DEFAULT_ACTIVITY_PAGE_SIZE,
  MAX_ACTIVITY_PAGE_SIZE,
  OWNER_SELECT,
  UNAUTHORIZED,
  badRequest,
  buildActivityWhere,
  notFound,
  paginationMeta,
  parseActivityCreate,
  parsePagination,
  readJsonBody,
  toErrorResponse,
} from "@/lib/validation"

/**
 * GET /api/leads/[id]/activities?page=1&pageSize=50
 *
 * 200 -> { data: Activity[], pagination: { page, pageSize, total, totalPages, hasMore } }
 *
 * Same envelope as GET /api/leads. This is what the timeline's "load more"
 * calls; the first page arrives with the lead itself from GET /api/leads/[id].
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    const { searchParams } = new URL(req.url)
    const { page, pageSize, skip, take } = parsePagination(searchParams, {
      defaultPageSize: DEFAULT_ACTIVITY_PAGE_SIZE,
      maxPageSize: MAX_ACTIVITY_PAGE_SIZE,
    })

    const where = buildActivityWhere(params.id, searchParams)

    const [total, data] = await Promise.all([
      prisma.activity.count({ where }),
      prisma.activity.findMany({
        where,
        include: { user: { select: OWNER_SELECT } },
        orderBy: ACTIVITY_ORDER_BY,
        skip,
        take,
      }),
    ])

    return NextResponse.json({ data, pagination: paginationMeta(page, pageSize, total) })
  } catch (error) {
    const { status, body } = toErrorResponse(error, `GET /api/leads/${params.id}/activities`)
    return NextResponse.json(body, { status })
  }
}

/**
 * POST /api/leads/[id]/activities — log a note/call/email/meeting/task.
 *
 * `type` is allowlisted and `userId` always comes from the session, never from
 * the body: a client cannot attribute an activity to another user.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    const json = await readJsonBody(req)
    if (!json.ok) return NextResponse.json(badRequest(json.error).body, { status: 400 })

    const parsed = parseActivityCreate(json.data)
    if (!parsed.ok) return NextResponse.json(badRequest(parsed.error).body, { status: 400 })

    // Check the lead first so a bad id is a clean 404 rather than a foreign-key
    // failure surfacing as a 500.
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      select: { id: true, lastContactedAt: true },
    })
    if (!lead) return NextResponse.json(notFound("Lead not found").body, { status: 404 })

    const userId = (session.user as { id?: string } | undefined)?.id ?? null

    // An activity can be backdated (`occurredAt`), so only move lastContactedAt
    // forward — logging a call from last month must not rewind the follow-up
    // queues that sort on it.
    const occurredAt = parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date()
    const bumpContactedAt = !lead.lastContactedAt || occurredAt > lead.lastContactedAt

    // Both writes succeed or neither does — a logged call must not leave
    // lastContactedAt stale, and a bumped timestamp must not exist without its
    // activity.
    const [activity] = await prisma.$transaction([
      prisma.activity.create({
        data: { ...parsed.data, occurredAt, leadId: params.id, userId },
        include: { user: { select: OWNER_SELECT } },
      }),
      prisma.lead.update({
        where: { id: params.id },
        data: bumpContactedAt ? { lastContactedAt: occurredAt } : {},
      }),
    ])

    return NextResponse.json(activity, { status: 201 })
  } catch (error) {
    const { status, body } = toErrorResponse(error, `POST /api/leads/${params.id}/activities`)
    return NextResponse.json(body, { status })
  }
}
