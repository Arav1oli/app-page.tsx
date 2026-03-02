"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { Search, Plus, Filter, ArrowUpDown } from "lucide-react"
import { cn, STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import NewLeadModal from "./NewLeadModal"

type Lead = {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  company?: string | null
  jobTitle?: string | null
  status: string
  priority: string
  leadSource?: string | null
  updatedAt: string
  lastContactedAt?: string | null
  owner?: { id: string; name: string; initials: string } | null
}

type User = { id: string; name: string; initials: string }

export default function LeadListClient({
  initialLeads,
  users,
}: {
  initialLeads: Lead[]
  users: User[]
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState("")
  const [filterOwner, setFilterOwner] = useState("")
  const [sortBy, setSortBy] = useState<"updatedAt" | "lastName" | "company">("updatedAt")
  const [showModal, setShowModal] = useState(false)

  const filtered = useMemo(() => {
    return leads
      .filter((l) => {
        if (filterStatus && l.status !== filterStatus) return false
        if (filterOwner && l.owner?.id !== filterOwner) return false
        if (search) {
          const q = search.toLowerCase()
          return (
            l.firstName.toLowerCase().includes(q) ||
            l.lastName.toLowerCase().includes(q) ||
            l.email?.toLowerCase().includes(q) ||
            l.company?.toLowerCase().includes(q)
          )
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === "lastName") return a.lastName.localeCompare(b.lastName)
        if (sortBy === "company") return (a.company ?? "").localeCompare(b.company ?? "")
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      })
  }, [leads, search, filterStatus, filterOwner, sortBy])

  function handleLeadCreated(lead: Lead) {
    setLeads((prev) => [lead, ...prev])
    setShowModal(false)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">All Leads</h1>
          <p className="text-sm text-gray-500">{filtered.length} leads</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-gray-200 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filterOwner}
          onChange={(e) => setFilterOwner(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All Owners</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="updatedAt">Recently Updated</option>
          <option value="lastName">Name A–Z</option>
          <option value="company">Company A–Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Name</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Company</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Priority</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Owner</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Contact</th>
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filtered.map((lead) => {
              const status = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG]
              const priority = PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG]
              return (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-sm text-gray-900 hover:text-brand-600"
                    >
                      {lead.firstName} {lead.lastName}
                    </Link>
                    {lead.jobTitle && (
                      <p className="text-xs text-gray-400">{lead.jobTitle}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{lead.company ?? "—"}</td>
                  <td className="px-4 py-3">
                    {status && (
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", status.bg, status.text)}>
                        {status.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {priority && (
                      <span className={cn("text-xs px-2 py-0.5 rounded font-medium", priority.color, priority.text)}>
                        {priority.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {lead.owner ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center">
                          <span className="text-brand-700 text-[9px] font-bold">{lead.owner.initials}</span>
                        </div>
                        <span className="text-xs text-gray-600">{lead.owner.name.split(" ")[0]}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {lead.email && <div>{lead.email}</div>}
                    {lead.phone && <div>{lead.phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">No leads match your filters.</p>
          </div>
        )}
      </div>

      {showModal && (
        <NewLeadModal
          defaultStatus="new"
          onCreated={handleLeadCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
