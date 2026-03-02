import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { type, content } = await req.json()
  if (!type || !content) {
    return NextResponse.json({ error: "type and content required" }, { status: 400 })
  }

  const userId = (session.user as any).id

  const activity = await prisma.activity.create({
    data: { leadId: params.id, userId, type, content },
    include: { user: { select: { id: true, name: true, initials: true } } },
  })

  // Update lastContactedAt on the lead
  await prisma.lead.update({
    where: { id: params.id },
    data: { lastContactedAt: new Date() },
  })

  return NextResponse.json(activity, { status: 201 })
}
