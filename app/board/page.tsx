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

  // Only the (small) user list is loaded here. The board itself is fetched from
  // /api/leads/board, which returns true per-column totals plus the first page
  // of cards per column — never every lead.
  const users = await prisma.user.findMany({
    select: { id: true, name: true, initials: true },
    orderBy: { name: "asc" },
  })

  return (
    <AppShell>
      <KanbanBoard users={users} />
    </AppShell>
  )
}
