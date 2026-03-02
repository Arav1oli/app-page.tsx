"use client"
import { useState } from "react"
import { Send } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ACTIVITY_ICONS } from "@/lib/utils"

type Activity = {
  id: string
  type: string
  content: string
  createdAt: string
  user?: { id: string; name: string; initials: string } | null
}

const ACTIVITY_TYPES = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
]

export default function ActivityTimeline({
  leadId,
  activities: initialActivities,
  currentUserId,
  onActivityAdded,
}: {
  leadId: string
  activities: Activity[]
  currentUserId: string
  onActivityAdded: (activity: Activity) => void
}) {
  const [activities, setActivities] = useState(initialActivities)
  const [type, setType] = useState("note")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)

    const res = await fetch(`/api/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, content }),
    })

    const activity = await res.json()
    const newActivity = { ...activity, createdAt: activity.createdAt }
    setActivities((prev) => [newActivity, ...prev])
    onActivityAdded(newActivity)
    setContent("")
    setSubmitting(false)
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Activity Timeline</h2>

      {/* Log activity form */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Log Activity</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            {ACTIVITY_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  type === t.value
                    ? "bg-brand-100 text-brand-700 border border-brand-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent"
                }`}
              >
                <span>{ACTIVITY_ICONS[t.value]}</span>
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={`Log a ${type}…`}
              rows={2}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className="self-end flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Log
            </button>
          </div>
        </form>
      </div>

      {/* Timeline */}
      {activities.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No activity logged yet. Start by logging a note or call above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base">
                {ACTIVITY_ICONS[activity.type] ?? "📋"}
              </div>
              <div className="flex-1 bg-white rounded-xl border border-gray-200 p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700 capitalize">{activity.type}</span>
                    {activity.user && (
                      <>
                        <span className="text-gray-300">·</span>
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-brand-100 flex items-center justify-center">
                            <span className="text-brand-700 text-[8px] font-bold">{activity.user.initials}</span>
                          </div>
                          <span className="text-xs text-gray-500">{activity.user.name.split(" ")[0]}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
