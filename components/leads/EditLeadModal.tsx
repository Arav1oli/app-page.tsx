"use client"
import { useState } from "react"
import { X } from "lucide-react"
import { STATUS_CONFIG, PRIORITY_CONFIG, SOURCE_OPTIONS } from "@/lib/utils"

type User = { id: string; name: string; initials: string }
type Lead = {
  id: string; firstName: string; lastName: string; email?: string | null
  phone?: string | null; mobile?: string | null; company?: string | null
  jobTitle?: string | null; website?: string | null; linkedin?: string | null
  address?: string | null; city?: string | null; country?: string | null
  status: string; priority: string; leadSource?: string | null
  notes?: string | null; budget?: string | null; vesselInterest?: string | null
  owner?: { id: string; name: string; initials: string } | null
}

export default function EditLeadModal({
  lead,
  users,
  onUpdated,
  onClose,
}: {
  lead: Lead
  users: User[]
  onUpdated: (lead: any) => void
  onClose: () => void
}) {
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    firstName: lead.firstName, lastName: lead.lastName,
    email: lead.email ?? "", phone: lead.phone ?? "", mobile: lead.mobile ?? "",
    company: lead.company ?? "", jobTitle: lead.jobTitle ?? "",
    website: lead.website ?? "", linkedin: lead.linkedin ?? "",
    address: lead.address ?? "", city: lead.city ?? "", country: lead.country ?? "",
    status: lead.status, priority: lead.priority,
    leadSource: lead.leadSource ?? "", ownerId: lead.owner?.id ?? "",
    budget: lead.budget ?? "", vesselInterest: lead.vesselInterest ?? "",
    notes: lead.notes ?? "",
  })
  const [saving, setSaving] = useState(false)

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
    const res = await fetch(`/api/leads/${lead.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        ownerId: form.ownerId || undefined,
        leadSource: form.leadSource || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        mobile: form.mobile || undefined,
      }),
    })
    setSaving(false)
    if (!res.ok) {
      setError("Failed to save changes.")
      return
    }
    const updated = await res.json()
    onUpdated(updated)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-semibold text-gray-900">Edit Lead</h2>
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
              <Field label="LinkedIn" value={form.linkedin} onChange={(v) => set("linkedin", v)} />
              <Field label="Address" value={form.address} onChange={(v) => set("address", v)} />
              <Field label="City" value={form.city} onChange={(v) => set("city", v)} />
              <Field label="Country" value={form.country} onChange={(v) => set("country", v)} />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lead Details</legend>
            <div className="grid grid-cols-2 gap-3">
              <SelectField label="Status" value={form.status} onChange={(v) => set("status", v)}
                options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
              <SelectField label="Priority" value={form.priority} onChange={(v) => set("priority", v)}
                options={Object.entries(PRIORITY_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
              <SelectField label="Lead Source" value={form.leadSource} onChange={(v) => set("leadSource", v)}
                options={[{ value: "", label: "— Select —" }, ...SOURCE_OPTIONS]} />
              <SelectField label="Owner" value={form.ownerId} onChange={(v) => set("ownerId", v)}
                options={[{ value: "", label: "— Unassigned —" }, ...users.map((u) => ({ value: u.id, label: u.name }))]} />
              <Field label="Budget" value={form.budget} onChange={(v) => set("budget", v)} />
              <Field label="Vessel Interest" value={form.vesselInterest} onChange={(v) => set("vesselInterest", v)} />
            </div>
          </fieldset>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium transition-colors">
              {saving ? "Saving…" : "Save Changes"}
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
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
}
