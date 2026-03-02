import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import AppShell from "@/components/layout/AppShell"
import KanbanBoard from "@/components/board/KanbanBoard"

export const dynamic = "force-dynamic"

export default async function BoardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const leads = await prisma.lead.findMany({
    include: { owner: { select: { id: true, name: true, initials: true } } },
    orderBy: { updatedAt: "desc" },
  })

  const serialized = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
  }))

  return (
    <AppShell>
      <KanbanBoard initialLeads={serialized} />
    </AppShell>
  )
}
