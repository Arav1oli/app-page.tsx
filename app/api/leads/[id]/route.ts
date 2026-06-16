import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { pickLeadFields } from "@/lib/leads"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const lead = await prisma.lead.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, initials: true } },
      activities: {
        include: { user: { select: { id: true, name: true, initials: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(lead)
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const data = pickLeadFields(body, true)

  const existing = await prisma.lead.findUnique({ where: { id: params.id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const lead = await prisma.lead.update({
    where: { id: params.id },
    data,
    include: { owner: { select: { id: true, name: true, initials: true } } },
  })

  return NextResponse.json(lead)
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await prisma.lead.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
