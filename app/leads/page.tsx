import { Suspense } from "react"
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

  // Only the (small) user list is loaded here. Leads are fetched one page at a
  // time from /api/leads by the client, driven by the URL search params — the
  // old unbounded findMany() would have shipped all 29k contacts to the browser.
  const users = await prisma.user.findMany({
    select: { id: true, name: true, initials: true },
    orderBy: { name: "asc" },
  })

  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="px-6 py-16 text-center text-sm text-gray-400">Loading leads…</div>
        }
      >
        <LeadListClient users={users} />
      </Suspense>
    </AppShell>
  )
}
