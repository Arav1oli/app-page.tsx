"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Phone, Mail, Globe, Linkedin, MapPin, Building2,
  Pencil, Trash2, Ship, DollarSign, User, Calendar, AlertTriangle, X,
} from "lucide-react"
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, SOURCE_OPTIONS } from "@/lib/utils"
import { format } from "date-fns"
import ActivityTimeline from "./ActivityTimeline"
import EditLeadModal from "./EditLeadModal"
import {
  Activity, LeadDetail, UserRef, displayName, leadInitials, errorMessage,
} from "@/components/lead-types"

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400 leading-none mb-0.5">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4">{children}</div>
    </div>
  )
}

export default function LeadDetailClient({
  lead: initialLead,
  users,
  initialActivities,
  activityTotal,
  activityPageSize,
}: {
  lead: LeadDetail
  users: UserRef[]
  initialActivities: Activity[]
  activityTotal: number
  activityPageSize: number
}) {
  const router = useRouter()
  const [lead, setLead] = useState<LeadDetail>(initialLead)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // NOTE: activity state lives entirely in <ActivityTimeline/>. This component
  // used to keep a duplicate copy in its own useState, which drifted from the
  // timeline's copy and had to be updated twice on every submit.

  const status = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG]
  const priority = PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG]
  const source = SOURCE_OPTIONS.find((s) => s.value === lead.leadSource)
  const name = displayName(lead)

  async function handleDelete() {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await errorMessage(res, "Could not delete this lead"))
      router.push("/leads")
      router.refresh()
    } catch (e: any) {
      setDeleting(false)
      setError(e?.message || "Could not delete this lead.")
    }
  }

  async function handleStatusChange(newStatus: string) {
    const previous = lead.status
    setLead((prev) => ({ ...prev, status: newStatus })) // optimistic
    setError(null)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, "The update was rejected"))
      const updated = await res.json()
      setLead((prev) => ({ ...prev, status: updated?.status ?? newStatus }))
    } catch (e: any) {
      setLead((prev) => ({ ...prev, status: previous })) // roll back
      setError(`Status not saved — ${e?.message || "the change was rejected"}.`)
    }
  }

  /**
   * Merge a PUT response back into the card.
   *
   * The edit form submits `ownerId`, but the card renders `lead.owner?.name`.
   * If the response ever omits the embedded `owner` relation (or embeds a stale
   * one), the sidebar would keep showing the OLD owner after a reassignment —
   * so reconcile `owner` against `ownerId` using the known user list.
   */
  function handleLeadUpdated(updated: Partial<LeadDetail>) {
    setLead((prev) => {
      const next = { ...prev, ...updated } as LeadDetail
      if ("ownerId" in updated) {
        const ownerId = updated.ownerId ?? null
        if (!ownerId) {
          next.owner = null
        } else if (!next.owner || next.owner.id !== ownerId) {
          next.owner = users.find((u) => u.id === ownerId) ?? next.owner ?? null
        }
      } else if (updated.owner !== undefined) {
        next.ownerId = updated.owner?.id ?? null
      }
      return next
    })
    setShowEdit(false)
  }

  /** The activity POST also stamps lastContactedAt server-side. */
  function handleActivityLogged(activity: Activity) {
    setLead((prev) => ({ ...prev, lastContactedAt: activity.createdAt }))
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/leads" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{name}</h1>
            {lead.company && (
              <p className="text-sm text-gray-500">{lead.jobTitle ? `${lead.jobTitle} · ` : ""}{lead.company}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 border border-red-200 hover:border-red-400 disabled:opacity-60 text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="flex-1 text-sm text-red-800">{error}</p>
          <button
            onClick={() => setError(null)}
            className="p-1 rounded text-red-500 hover:bg-red-100"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: contact card */}
        <div className="w-[320px] flex-shrink-0 overflow-y-auto p-4 border-r border-gray-200 bg-gray-50">
          {/* Avatar + status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl font-bold">{leadInitials(lead)}</span>
            </div>
            <h2 className="font-semibold text-gray-900">{name}</h2>
            {lead.jobTitle && <p className="text-sm text-gray-500 mt-0.5">{lead.jobTitle}</p>}
            {lead.company && <p className="text-sm text-gray-500">{lead.company}</p>}

            {/* Status selector */}
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              <select
                value={lead.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={cn(
                  "text-xs font-medium px-3 py-1.5 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-brand-500",
                  status?.bg, status?.text
                )}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
              {priority && (
                <span className={cn("text-xs font-medium px-3 py-1.5 rounded-full", priority.color, priority.text)}>
                  {priority.label} Priority
                </span>
              )}
            </div>
          </div>

          <Section title="Contact Details">
            <InfoRow icon={Mail} label="Email" value={lead.email} />
            <InfoRow icon={Phone} label="Phone" value={lead.phone} />
            <InfoRow icon={Phone} label="Mobile" value={lead.mobile} />
            <InfoRow icon={Globe} label="Website" value={lead.website} />
            <InfoRow icon={Linkedin} label="LinkedIn" value={lead.linkedin} />
          </Section>

          <Section title="Address">
            <InfoRow icon={MapPin} label="Address" value={lead.address} />
            <InfoRow icon={MapPin} label="City" value={lead.city} />
            <InfoRow icon={MapPin} label="Country" value={lead.country} />
          </Section>

          <Section title="Lead Details">
            <InfoRow icon={User} label="Owner" value={lead.owner?.name ?? "Unassigned"} />
            <InfoRow icon={Building2} label="Source" value={source?.label} />
            <InfoRow icon={DollarSign} label="Budget" value={lead.budget} />
            <InfoRow icon={Ship} label="Vessel Interest" value={lead.vesselInterest} />
            <InfoRow
              icon={Calendar}
              label="Last Contacted"
              value={lead.lastContactedAt
                ? format(new Date(lead.lastContactedAt), "d MMM yyyy")
                : undefined}
            />
            <InfoRow
              icon={Calendar}
              label="Created"
              value={format(new Date(lead.createdAt), "d MMM yyyy")}
            />
          </Section>

          {lead.notes && (
            <Section title="Notes">
              <p className="text-sm text-gray-700 py-3 whitespace-pre-wrap">{lead.notes}</p>
            </Section>
          )}
        </div>

        {/* Right: activity timeline */}
        <div className="flex-1 overflow-y-auto p-6">
          <ActivityTimeline
            leadId={lead.id}
            initialActivities={initialActivities}
            initialTotal={activityTotal}
            pageSize={activityPageSize}
            onActivityLogged={handleActivityLogged}
          />
        </div>
      </div>

      {showEdit && (
        <EditLeadModal
          lead={lead}
          users={users}
          onUpdated={handleLeadUpdated}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  )
}
