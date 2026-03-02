"use client"
import Link from "next/link"
import { Phone, Mail, Building2 } from "lucide-react"
import { cn, PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

type Lead = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  company?: string | null
  status: string
  priority: string
  updatedAt: string
  owner?: { name: string; initials: string } | null
}

export default function LeadCard({ lead, onStatusChange }: {
  lead: Lead
  onStatusChange: (id: string, status: string) => void
}) {
  const priority = PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG]
  const statuses = Object.entries(STATUS_CONFIG)

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all group">
      {/* Priority bar */}
      <div className={cn("h-1 rounded-t-xl", priority?.color)} />

      <div className="p-3.5">
        {/* Name + priority */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <Link
            href={`/leads/${lead.id}`}
            className="font-semibold text-sm text-gray-900 hover:text-brand-600 leading-snug"
          >
            {lead.firstName} {lead.lastName}
          </Link>
          <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0", priority?.color, priority?.text)}>
            {priority?.label}
          </span>
        </div>

        {/* Company */}
        {lead.company && (
          <div className="flex items-center gap-1.5 mb-2">
            <Building2 className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">{lead.company}</span>
          </div>
        )}

        {/* Contact details */}
        <div className="space-y-1 mb-3">
          {lead.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500">{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
              <span className="text-xs text-gray-500 truncate">{lead.email}</span>
            </div>
          )}
        </div>

        {/* Footer: owner + status change + time */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
          {lead.owner ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center">
                <span className="text-brand-700 text-[9px] font-bold">{lead.owner.initials}</span>
              </div>
              <span className="text-xs text-gray-500">{lead.owner.name.split(" ")[0]}</span>
            </div>
          ) : (
            <span className="text-xs text-gray-400">Unassigned</span>
          )}

          <select
            value={lead.status}
            onChange={(e) => onStatusChange(lead.id, e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="text-xs border-0 bg-transparent text-gray-500 hover:text-gray-700 cursor-pointer focus:outline-none focus:ring-0 pr-1 -mr-1"
          >
            {statuses.map(([val, cfg]) => (
              <option key={val} value={val}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
