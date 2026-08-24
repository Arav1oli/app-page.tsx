import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import AppShell from "@/components/layout/AppShell"
import LeadDetailClient from "@/components/leads/LeadDetailClient"

export const dynamic = "force-dynamic"

/** A single contact can have 3,600+ activities — only the newest page loads. */
const ACTIVITY_PAGE_SIZE = 50

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const [lead, users, activityTotal] = await Promise.all([
    prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        owner: { select: { id: true, name: true, initials: true } },
        activities: {
          include: { user: { select: { id: true, name: true, initials: true } } },
          orderBy: { createdAt: "desc" },
          take: ACTIVITY_PAGE_SIZE,
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, initials: true },
      orderBy: { name: "asc" },
    }),
    prisma.activity.count({ where: { leadId: params.id } }),
  ])

  if (!lead) notFound()

  const { activities, ...rest } = lead

  const serialized = {
    ...rest,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    lastContactedAt: lead.lastContactedAt?.toISOString() ?? null,
  }

  const serializedActivities = activities.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }))

  return (
    <AppShell>
      <LeadDetailClient
        lead={serialized}
        users={users}
        initialActivities={serializedActivities}
        activityTotal={activityTotal}
        activityPageSize={ACTIVITY_PAGE_SIZE}
      />
    </AppShell>
  )
}
