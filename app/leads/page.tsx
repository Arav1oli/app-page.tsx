import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import AppShell from "@/components/layout/AppShell"
import LeadListClient from "@/components/leads/LeadListClient"

export const dynamic = "force-dynamic"

export default async function LeadsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [leads, users] = await Promise.all([
    prisma.lead.findMany({
      include: { owner: { select: { id: true, name: true, initials: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, initials: true },
      orderBy: { name: "asc" },
    }),
  ])

  const serialized = leads.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
    lastContactedAt: l.lastContactedAt?.toISOString() ?? null,
  }))

  return (
    <AppShell>
      <LeadListClient initialLeads={serialized} users={users} />
    </AppShell>
  )
}
