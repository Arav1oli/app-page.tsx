import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { UNAUTHORIZED, toErrorResponse } from "@/lib/validation"

/**
 * GET /api/users — the roster, for owner dropdowns and activity attribution.
 *
 * Returning every user to any authenticated user is intentional: this is a
 * single-tenant brokerage of 8–27 people who all need to assign leads to one
 * another.
 *
 * The `select` is an explicit allowlist and MUST stay one — `password` (a bcrypt
 * hash) is the field it exists to keep out. Never replace it with a bare
 * findMany(). `role` is included because the UI hides admin-only actions such
 * as delete; it is not a secret, and authorization is enforced server-side.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json(UNAUTHORIZED.body, { status: UNAUTHORIZED.status })

    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, initials: true, role: true },
      orderBy: { name: "asc" },
    })
    return NextResponse.json(users)
  } catch (error) {
    const { status, body } = toErrorResponse(error, "GET /api/users")
    return NextResponse.json(body, { status })
  }
}
