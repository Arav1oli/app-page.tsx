import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const STATUS_CONFIG = {
  new: { label: "New Lead", color: "bg-slate-400", text: "text-slate-700", bg: "bg-slate-100" },
  contacted: { label: "Contacted", color: "bg-blue-400", text: "text-blue-700", bg: "bg-blue-100" },
  qualified: { label: "Qualified", color: "bg-violet-500", text: "text-violet-700", bg: "bg-violet-100" },
  proposal: { label: "Proposal Sent", color: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-100" },
  won: { label: "Won", color: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-100" },
  lost: { label: "Lost", color: "bg-red-400", text: "text-red-700", bg: "bg-red-100" },
} as const

export const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-slate-200", text: "text-slate-600" },
  medium: { label: "Medium", color: "bg-amber-100", text: "text-amber-700" },
  high: { label: "High", color: "bg-red-100", text: "text-red-700" },
} as const

export const SOURCE_OPTIONS = [
  { value: "referral", label: "Referral" },
  { value: "website", label: "Website" },
  { value: "cold_call", label: "Cold Call" },
  { value: "social", label: "Social Media" },
  { value: "event", label: "Event / Show" },
  { value: "other", label: "Other" },
]

export const ACTIVITY_ICONS: Record<string, string> = {
  note: "📝",
  call: "📞",
  email: "✉️",
  meeting: "🤝",
  task: "✅",
}
