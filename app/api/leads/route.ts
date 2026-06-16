import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { pickLeadFields } from "@/lib/leads"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const ownerId = searchParams.get("ownerId")
  const search = searchParams.get("search")

  const leads = await prisma.lead.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { company: { contains: search } },
            ],
          }
        : {}),
    },
    include: { owner: { select: { id: true, name: true, initials: true } } },
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json(leads)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const data = pickLeadFields(body, false)

  if (!data.firstName || !data.lastName) {
    return NextResponse.json({ error: "First and last name required" }, { status: 400 })
  }

  const lead = await prisma.lead.create({
    data: data as any,
    include: { owner: { select: { id: true, name: true, initials: true } } },
  })

  return NextResponse.json(lead, { status: 201 })
}
