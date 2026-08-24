"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { Send, Loader2, AlertTriangle, ChevronDown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ACTIVITY_ICONS } from "@/lib/utils"
import { Activity, errorMessage } from "@/components/lead-types"

const ACTIVITY_TYPES = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "task", label: "Task" },
]

/**
 * Pull an activity page out of the detail endpoint's response, tolerating the
 * shapes it may take (`{ activities: [...] }`, `{ activities: { data } }`,
 * `{ data }`, or a bare array).
 */
function readActivityPage(json: any): { items: Activity[]; total: number | null } {
  const num = (v: any) => (typeof v === "number" ? v : null)
  if (Array.isArray(json)) return { items: json, total: null }
  if (Array.isArray(json?.activities)) {
    return {
      items: json.activities,
      total: num(json.activityTotal) ?? num(json.activityPagination?.total),
    }
  }
  if (Array.isArray(json?.activities?.data)) {
    return { items: json.activities.data, total: num(json.activities.pagination?.total) }
  }
  if (Array.isArray(json?.data)) return { items: json.data, total: num(json.pagination?.total) }
  return { items: [], total: null }
}

export default function ActivityTimeline({
  leadId,
  initialActivities,
  initialTotal,
  pageSize,
  onActivityLogged,
}: {
  leadId: string
  initialActivities: Activity[]
  /** True count of activities on this lead — a single contact can have 3,600+. */
  initialTotal: number
  pageSize: number
  onActivityLogged?: (activity: Activity) => void
}) {
  // This component is the SINGLE owner of the activity list. The parent used to
  // keep a duplicate copy and pass it down while this one also held its own
  // useState seeded from props — so the two drifted apart (the prop-seeded state
  // ignored every later parent update, and a submit had to be written into both).
  const [activities, setActivities] = useState<Activity[]>(initialActivities)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)

  const [type, setType] = useState("note")
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadingRef = useRef(false)

  // Read the current list synchronously inside async handlers.
  const activitiesRef = useRef(activities)
  useEffect(() => {
    activitiesRef.current = activities
  }, [activities])

  const hasMore = activities.length < total

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, content }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, "Could not log the activity"))
      const activity: Activity = await res.json()

      setActivities((prev) => [activity, ...prev])
      setTotal((t) => t + 1)
      setContent("")
      // Tell the parent only about the side effect it owns (lastContactedAt);
      // it does not keep its own copy of the list any more.
      onActivityLogged?.(activity)
    } catch (err: any) {
      setSubmitError(err?.message || "Could not log the activity.")
    } finally {
      setSubmitting(false)
    }
  }

  const loadOlder = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoadingMore(true)
    setLoadError(null)
    const nextPage = page + 1

    try {
      const qs = new URLSearchParams({
        activityPage: String(nextPage),
        activityPageSize: String(pageSize),
      })
      const res = await fetch(`/api/leads/${leadId}?${qs.toString()}`)
      if (!res.ok) throw new Error(await errorMessage(res, "Could not load older activity"))
      const { items, total: serverTotal } = readActivityPage(await res.json())

      const current = activitiesRef.current
      const seen = new Set(current.map((a) => a.id))
      const fresh = items.filter((a) => a && a.id && !seen.has(a.id))

      if (fresh.length === 0) {
        // The endpoint gave us nothing new (e.g. it ignores activityPage);
        // clamp the total so we stop offering a button that does nothing.
        setTotal(current.length)
      } else {
        setActivities([...current, ...fresh])
        if (typeof serverTotal === "number") setTotal(serverTotal)
        setPage(nextPage)
      }
    } catch (err: any) {
      setLoadError(err?.message || "Could not load older activity.")
    } finally {
      loadingRef.current = false
      setLoadingMore(false)
    }
  }, [leadId, page, pageSize])

  return (
    <div className="max-w-2xl">
      <div className="flex items-baseline justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Activity Timeline</h2>
        {total > 0 && (
          <span className="text-xs text-gray-400">
            Showing {activities.length.toLocaleString()} of {total.toLocaleString()}
          </span>
        )}
      </div>

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
              {submitting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              Log
            </button>
          </div>
          {submitError && (
            <p className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
              {submitError}
            </p>
          )}
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

          {loadError && (
            <p className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 mt-px flex-shrink-0" />
              {loadError}
            </p>
          )}

          {hasMore && (
            <button
              onClick={loadOlder}
              disabled={loadingMore}
              className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-xl py-2.5 text-xs font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/30 disabled:opacity-60 transition-colors"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  Load older activity
                  <span className="text-gray-400">
                    ({(total - activities.length).toLocaleString()} older)
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
