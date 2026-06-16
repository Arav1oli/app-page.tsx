"use client"
import { useState, useCallback } from "react"
import { Plus } from "lucide-react"
import LeadCard from "./LeadCard"
import NewLeadModal from "@/components/leads/NewLeadModal"
import { STATUS_CONFIG } from "@/lib/utils"
import { cn } from "@/lib/utils"

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
  owner?: { id: string; name: string; initials: string } | null
}

const COLUMNS = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({
  key,
  ...cfg,
}))

export default function KanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [showModal, setShowModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState("new")

  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    let previousStatus: string | undefined
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === id) {
          previousStatus = l.status
          return { ...l, status: newStatus }
        }
        return l
      })
    )
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error("Update failed")
    } catch {
      // Roll back the optimistic move so the board reflects reality.
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id && previousStatus ? { ...l, status: previousStatus } : l
        )
      )
    }
  }, [])

  const handleLeadCreated = useCallback((lead: Lead) => {
    setLeads((prev) => [lead, ...prev])
    setShowModal(false)
  }, [])

  const openModalForColumn = (status: string) => {
    setDefaultStatus(status)
    setShowModal(true)
  }

  return (
    <>
      {/* Board header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Lead Board</h1>
          <p className="text-sm text-gray-500">{leads.length} leads across all stages</p>
        </div>
        <button
          onClick={() => openModalForColumn("new")}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Lead
        </button>
      </div>

      {/* Kanban columns */}
      <div className="kanban-scroll flex gap-4 p-5 items-start h-[calc(100vh-89px)]">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.key)
          return (
            <div key={col.key} className="flex-shrink-0 w-[280px] flex flex-col">
              {/* Column header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", col.color)} />
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">
                    {colLeads.length}
                  </span>
                </div>
                <button
                  onClick={() => openModalForColumn(col.key)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title={`Add to ${col.label}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Cards */}
              <div className="column-scroll space-y-3">
                {colLeads.length === 0 ? (
                  <div
                    onClick={() => openModalForColumn(col.key)}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                  >
                    <p className="text-xs text-gray-400">No leads — click to add</p>
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onStatusChange={handleStatusChange}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <NewLeadModal
          defaultStatus={defaultStatus}
          onCreated={handleLeadCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
