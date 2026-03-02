"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Phone, Mail, Globe, Linkedin, MapPin, Building2,
  Pencil, Trash2, Ship, DollarSign, User, Calendar,
} from "lucide-react"
import { cn, STATUS_CONFIG, PRIORITY_CONFIG, SOURCE_OPTIONS, ACTIVITY_ICONS } from "@/lib/utils"
import { formatDistanceToNow, format } from "date-fns"
import ActivityTimeline from "./ActivityTimeline"
import EditLeadModal from "./EditLeadModal"

type Activity = {
  id: string
  type: string
  content: string
  createdAt: string
  user?: { id: string; name: string; initials: string } | null
}

type Lead = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  company?: string | null
  jobTitle?: string | null
  website?: string | null
  linkedin?: string | null
  address?: string | null
  city?: string | null
  country?: string | null
  status: string
  priority: string
  leadSource?: string | null
  notes?: string | null
  budget?: string | null
  vesselInterest?: string | null
  lastContactedAt?: string | null
  createdAt: string
  updatedAt: string
  owner?: { id: string; name: string; initials: string } | null
  activities: Activity[]
}

type User = { id: string; name: string; initials: string }

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
  currentUserId,
}: {
  lead: Lead
  users: User[]
  currentUserId: string
}) {
  const router = useRouter()
  const [lead, setLead] = useState<Lead>(initialLead)
  const [activities, setActivities] = useState<Activity[]>(initialLead.activities)
  const [showEdit, setShowEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const status = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG]
  const priority = PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG]
  const source = SOURCE_OPTIONS.find((s) => s.value === lead.leadSource)

  async function handleDelete() {
    if (!confirm(`Delete ${lead.firstName} ${lead.lastName}? This cannot be undone.`)) return
    setDeleting(true)
    await fetch(`/api/leads/${lead.id}`, { method: "DELETE" })
    router.push("/leads")
  }

  async function handleStatusChange(newStatus: string) {
    const updated = await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    }).then((r) => r.json())
    setLead((prev) => ({ ...prev, status: updated.status }))
  }

  function handleLeadUpdated(updated: Lead) {
    setLead((prev) => ({ ...prev, ...updated }))
    setShowEdit(false)
  }

  function handleActivityAdded(activity: Activity) {
    setActivities((prev) => [activity, ...prev])
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
            <h1 className="text-lg font-semibold text-gray-900">
              {lead.firstName} {lead.lastName}
            </h1>
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
            className="flex items-center gap-1.5 border border-red-200 hover:border-red-400 text-red-600 text-sm font-medium px-3 py-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar: contact card */}
        <div className="w-[320px] flex-shrink-0 overflow-y-auto p-4 border-r border-gray-200 bg-gray-50">
          {/* Avatar + status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4 text-center">
            <div className="w-16 h-16 rounded-full bg-brand-600 flex items-center justify-center mx-auto mb-3">
              <span className="text-white text-xl font-bold">
                {lead.firstName[0]}{lead.lastName[0]}
              </span>
            </div>
            <h2 className="font-semibold text-gray-900">{lead.firstName} {lead.lastName}</h2>
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
            <InfoRow icon={User} label="Owner" value={lead.owner?.name} />
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
            activities={activities}
            currentUserId={currentUserId}
            onActivityAdded={handleActivityAdded}
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
