"use client"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { STATUS_CONFIG, PRIORITY_CONFIG, SOURCE_OPTIONS } from "@/lib/utils"

type User = { id: string; name: string; initials: string }

export default function NewLeadModal({
  defaultStatus = "new",
  onCreated,
  onClose,
}: {
  defaultStatus?: string
  onCreated: (lead: any) => void
  onClose: () => void
}) {
  const [users, setUsers] = useState<User[]>([])
  const [form, setForm] = useState({
    firstName: "", lastName: "", email: "", phone: "", mobile: "",
    company: "", jobTitle: "", website: "",
    status: defaultStatus, priority: "medium",
    leadSource: "", ownerId: "", budget: "", vesselInterest: "",
    city: "", country: "", notes: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers)
  }, [])

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First and last name are required.")
      return
    }
    setSaving(true)
    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ownerId: form.ownerId || undefined,
        leadSource: form.leadSource || undefined,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      setError("Failed to create lead.")
      return
    }
    const lead = await res.json()
    onCreated(lead)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">New Lead</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Info</legend>
            <div className="grid grid-cols-2 gap-3">
              <Field label="First Name *" value={form.firstName} onChange={(v) => set("firstName", v)} />
              <Field label="Last Name *" value={form.lastName} onChange={(v) => set("lastName", v)} />
              <Field label="Email" value={form.email} onChange={(v) => set("email", v)} type="email" />
              <Field label="Phone" value={form.phone} onChange={(v) => set("phone", v)} />
              <Field label="Mobile" value={form.mobile} onChange={(v) => set("mobile", v)} />
              <Field label="Company" value={form.company} onChange={(v) => set("company", v)} />
              <Field label="Job Title" value={form.jobTitle} onChange={(v) => set("jobTitle", v)} />
              <Field label="Website" value={form.website} onChange={(v) => set("website", v)} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lead Details</legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={form.priority} onChange={(e) => set("priority", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                <select value={form.leadSource} onChange={(e) => set("leadSource", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">— Select —</option>
                  {SOURCE_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                <select value={form.ownerId} onChange={(e) => set("ownerId", e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">— Unassigned —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <Field label="Budget" value={form.budget} onChange={(v) => set("budget", v)} placeholder="e.g. €1M – €2M" />
              <Field label="Vessel Interest" value={form.vesselInterest} onChange={(v) => set("vesselInterest", v)} placeholder="e.g. Sunseeker 74" />
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
              <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
            </div>
          </fieldset>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Initial notes about this lead…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors">
              {saving ? "Creating…" : "Create Lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />
    </div>
  )
}
