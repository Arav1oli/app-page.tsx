import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import AppShell from "@/components/layout/AppShell"
import LeadDetailClient from "@/components/leads/LeadDetailClient"

export const dynamic = "force-dynamic"

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [lead, users] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, initials: true } },
        activities: {
          include: { user: { select: { id: true, name: true, initials: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, initials: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!lead) notFound()

  const serialized = {
    ...lead,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
    activities: lead.activities.map((a) => ({
      ...a,
      createdAt: a.createdAt.toISOString(),
    })),
  }

  const currentUserId = (session.user as any).id

  return (
    <AppShell>
      <LeadDetailClient lead={serialized} users={users} currentUserId={currentUserId} />
    </AppShell>
  )
}
