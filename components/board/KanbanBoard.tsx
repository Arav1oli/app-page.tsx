"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import { Plus, Loader2, AlertTriangle, RotateCw, Search, X } from "lucide-react"
import LeadCard from "./LeadCard"
import NewLeadModal from "@/components/leads/NewLeadModal"
import { STATUS_CONFIG, cn } from "@/lib/utils"
import { Lead, UserRef, displayName, errorMessage } from "@/components/lead-types"

const PER_COLUMN = 25
const SEARCH_DEBOUNCE_MS = 300

const COLUMNS = Object.entries(STATUS_CONFIG).map(([key, cfg]) => ({ key, ...cfg }))

type ColumnState = {
  total: number
  leads: Lead[]
  page: number
  loadingMore: boolean
  error: string | null
}

type BoardState = Record<string, ColumnState>

const emptyColumn = (): ColumnState => ({
  total: 0,
  leads: [],
  page: 1,
  loadingMore: false,
  error: null,
})

function emptyBoard(): BoardState {
  const b: BoardState = {}
  for (const col of COLUMNS) b[col.key] = emptyColumn()
  return b
}

function dedupe(leads: Lead[]): Lead[] {
  const seen = new Set<string>()
  return leads.filter((l) => (seen.has(l.id) ? false : (seen.add(l.id), true)))
}

/** Extract rows + total from either the paginated contract or a legacy array. */
function readPage(json: any, page: number, pageSize: number): { rows: Lead[]; total: number | null } {
  if (Array.isArray(json)) {
    const start = (page - 1) * pageSize
    return { rows: json.slice(start, start + pageSize), total: json.length }
  }
  const rows: Lead[] = Array.isArray(json?.data) ? json.data : []
  const total = json?.pagination?.total
  return { rows, total: typeof total === "number" ? total : null }
}

export default function KanbanBoard({ users }: { users: UserRef[] }) {
  const [board, setBoard] = useState<BoardState>(emptyBoard)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [ownerId, setOwnerId] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [defaultStatus, setDefaultStatus] = useState("new")

  // Debounce the search box so typing doesn't fire a board query per keystroke.
  useEffect(() => {
    if (searchInput === search) return
    const t = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput, search])

  const filterQuery = useCallback(() => {
    const qs = new URLSearchParams()
    if (ownerId) qs.set("ownerId", ownerId)
    if (search) qs.set("search", search)
    return qs
  }, [ownerId, search])

  const filterQueryRef = useRef(filterQuery)
  useEffect(() => {
    filterQueryRef.current = filterQuery
  })

  // Event handlers need to *read* current board state synchronously (state
  // updaters run later, during render), so mirror it into a ref.
  const boardRef = useRef(board)
  useEffect(() => {
    boardRef.current = board
  }, [board])

  // ---- Initial / filtered board load -------------------------------------
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function loadFromBoardEndpoint(): Promise<BoardState> {
      const qs = filterQuery()
      qs.set("perColumn", String(PER_COLUMN))
      const res = await fetch(`/api/leads/board?${qs.toString()}`, { signal: controller.signal })
      if (!res.ok) throw new Error(await errorMessage(res, "Could not load the board"))
      const json = await res.json()
      if (!Array.isArray(json?.columns)) throw new Error("Unexpected board response")

      const next = emptyBoard()
      for (const col of json.columns) {
        if (!col || typeof col.status !== "string" || !next[col.status]) continue
        const leads: Lead[] = Array.isArray(col.leads) ? dedupe(col.leads) : []
        next[col.status] = {
          ...emptyColumn(),
          leads,
          total: typeof col.total === "number" ? col.total : leads.length,
        }
      }
      return next
    }

    /**
     * Fallback for while /api/leads/board is still being built: ask /api/leads
     * for page 1 of each status. Six small paged requests — still never "fetch
     * every lead" the way the old server component did.
     */
    async function loadPerColumn(): Promise<BoardState> {
      const next = emptyBoard()
      await Promise.all(
        COLUMNS.map(async (col) => {
          const qs = filterQuery()
          qs.set("status", col.key)
          qs.set("page", "1")
          qs.set("pageSize", String(PER_COLUMN))
          qs.set("sort", "updatedAt")
          qs.set("dir", "desc")
          const res = await fetch(`/api/leads?${qs.toString()}`, { signal: controller.signal })
          if (!res.ok) throw new Error(await errorMessage(res, "Could not load the board"))
          const { rows, total } = readPage(await res.json(), 1, PER_COLUMN)
          next[col.key] = { ...emptyColumn(), leads: dedupe(rows), total: total ?? rows.length }
        })
      )
      return next
    }

    async function load() {
      setLoading(true)
      setError(null)
      try {
        let next: BoardState
        try {
          next = await loadFromBoardEndpoint()
        } catch (boardErr: any) {
          if (boardErr?.name === "AbortError") throw boardErr
          next = await loadPerColumn()
        }
        if (!cancelled) setBoard(next)
      } catch (e: any) {
        if (cancelled || e?.name === "AbortError") return
        setBoard(emptyBoard())
        setError(e?.message || "Could not load the board.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [filterQuery, reloadToken])

  // ---- Load more within one column ---------------------------------------
  const inFlight = useRef<Set<string>>(new Set())

  const loadMore = useCallback(async (status: string) => {
    const col = boardRef.current[status]
    if (!col || inFlight.current.has(status)) return
    const nextPage = col.page + 1
    inFlight.current.add(status)
    setBoard((prev) =>
      prev[status] ? { ...prev, [status]: { ...prev[status], loadingMore: true, error: null } } : prev
    )

    try {
      const qs = filterQueryRef.current()
      qs.set("status", status)
      qs.set("page", String(nextPage))
      qs.set("pageSize", String(PER_COLUMN))
      qs.set("sort", "updatedAt")
      qs.set("dir", "desc")
      const res = await fetch(`/api/leads?${qs.toString()}`)
      if (!res.ok) throw new Error(await errorMessage(res, "Could not load more leads"))
      const { rows, total } = readPage(await res.json(), nextPage, PER_COLUMN)

      setBoard((prev) => {
        const current = prev[status]
        if (!current) return prev
        const merged = dedupe([...current.leads, ...rows])
        // If the server had nothing new for us, clamp the total so the button
        // disappears instead of offering an endless "Load more".
        const gotNothingNew = merged.length === current.leads.length
        return {
          ...prev,
          [status]: {
            ...current,
            leads: merged,
            page: nextPage,
            total: gotNothingNew ? merged.length : total ?? Math.max(current.total, merged.length),
            loadingMore: false,
            error: null,
          },
        }
      })
    } catch (e: any) {
      setBoard((prev) => {
        const current = prev[status]
        if (!current) return prev
        return {
          ...prev,
          [status]: { ...current, loadingMore: false, error: e?.message || "Could not load more." },
        }
      })
    } finally {
      inFlight.current.delete(status)
    }
  }, [])

  // ---- Optimistic status change, with rollback ---------------------------
  const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
    setActionError(null)

    const snapshot = boardRef.current
    let origin = ""
    let originalIndex = 0
    let moved: Lead | undefined

    for (const status of Object.keys(snapshot)) {
      const idx = snapshot[status].leads.findIndex((l) => l.id === id)
      if (idx !== -1) {
        origin = status
        originalIndex = idx
        moved = snapshot[status].leads[idx]
        break
      }
    }
    if (!moved || !origin || origin === newStatus || !snapshot[newStatus]) return
    const card = moved

    // Optimistic move: out of the old column, on top of the new one, with both
    // true totals adjusted.
    setBoard((prev) => {
      const source = prev[origin]
      const target = prev[newStatus]
      if (!source || !target) return prev
      return {
        ...prev,
        [origin]: {
          ...source,
          leads: source.leads.filter((l) => l.id !== id),
          total: Math.max(0, source.total - 1),
        },
        [newStatus]: {
          ...target,
          leads: [{ ...card, status: newStatus }, ...target.leads],
          total: target.total + 1,
        },
      }
    })

    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error(await errorMessage(res, "The update was rejected"))
      const updated = await res.json()
      // Reconcile with the server's copy (updatedAt, any server-side defaults).
      setBoard((prev) => {
        const target = prev[newStatus]
        if (!target) return prev
        return {
          ...prev,
          [newStatus]: {
            ...target,
            leads: target.leads.map((l) =>
              l.id === id ? { ...l, ...updated, status: newStatus } : l
            ),
          },
        }
      })
    } catch (e: any) {
      // Roll the card back to where it came from so the board never shows a
      // change that did not persist.
      setBoard((prev) => {
        const target = prev[newStatus]
        const source = prev[origin]
        if (!target || !source) return prev
        const restored = [...source.leads]
        if (!restored.some((l) => l.id === id)) {
          restored.splice(Math.min(originalIndex, restored.length), 0, { ...card, status: origin })
        }
        return {
          ...prev,
          [newStatus]: {
            ...target,
            leads: target.leads.filter((l) => l.id !== id),
            total: Math.max(0, target.total - 1),
          },
          [origin]: { ...source, leads: restored, total: source.total + 1 },
        }
      })
      setActionError(
        `Couldn’t move ${displayName(card)} to ${
          STATUS_CONFIG[newStatus as keyof typeof STATUS_CONFIG]?.label ?? newStatus
        } — ${e?.message || "the change was not saved"}. The card has been put back.`
      )
    }
  }, [])

  const handleLeadCreated = useCallback(() => {
    setShowModal(false)
    setReloadToken((t) => t + 1)
  }, [])

  const openModalForColumn = (status: string) => {
    setDefaultStatus(status)
    setShowModal(true)
  }

  const boardTotal = COLUMNS.reduce((sum, col) => sum + (board[col.key]?.total ?? 0), 0)
  const filtersActive = Boolean(ownerId || search)

  return (
    <>
      {/* Board header */}
      <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-gray-200 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Lead Board</h1>
          <p className="text-sm text-gray-500">
            {loading
              ? "Loading board…"
              : error
              ? "—"
              : `${boardTotal.toLocaleString()} lead${boardTotal === 1 ? "" : "s"} across all stages${
                  filtersActive ? " (filtered)" : ""
                }`}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search board…"
              className="w-[200px] pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400 hover:text-gray-600"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
          >
            <option value="">All Owners</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>

          <button
            onClick={() => openModalForColumn("new")}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Lead
          </button>
        </div>
      </div>

      {/* Failed status change */}
      {actionError && (
        <div className="mx-5 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="flex-1 text-sm text-red-800">{actionError}</p>
          <button
            onClick={() => setActionError(null)}
            className="p-1 rounded text-red-500 hover:bg-red-100"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Board load failure */}
      {error && (
        <div className="mx-5 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">Couldn’t load the board</p>
            <p className="text-xs text-red-600 break-words">{error}</p>
          </div>
          <button
            onClick={() => setReloadToken((t) => t + 1)}
            className="flex items-center gap-1.5 text-xs font-medium text-red-700 border border-red-300 rounded-lg px-2.5 py-1.5 hover:bg-red-100 transition-colors"
          >
            <RotateCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Kanban columns */}
      <div className="kanban-scroll flex gap-4 p-5 items-start h-[calc(100vh-89px)]">
        {COLUMNS.map((col) => {
          const state = board[col.key] ?? emptyColumn()
          const hasMore = state.leads.length < state.total
          return (
            <div key={col.key} className="flex-shrink-0 w-[280px] flex flex-col">
              {/* Column header — count is the TRUE total, not the rendered count */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", col.color)} />
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5 font-medium">
                    {loading ? "…" : state.total.toLocaleString()}
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
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={`skeleton-${i}`}
                      className="h-[120px] rounded-xl border border-gray-200 bg-white animate-pulse"
                    />
                  ))
                ) : state.leads.length === 0 ? (
                  <div
                    onClick={() => openModalForColumn(col.key)}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors"
                  >
                    <p className="text-xs text-gray-400">
                      {filtersActive ? "No matching leads" : "No leads — click to add"}
                    </p>
                  </div>
                ) : (
                  <>
                    {state.leads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} onStatusChange={handleStatusChange} />
                    ))}

                    {state.error && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2">
                        {state.error}
                      </p>
                    )}

                    {hasMore && (
                      <button
                        onClick={() => loadMore(col.key)}
                        disabled={state.loadingMore}
                        className="w-full flex items-center justify-center gap-1.5 border border-dashed border-gray-300 rounded-xl py-2.5 text-xs font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/30 disabled:opacity-60 transition-colors"
                      >
                        {state.loadingMore ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading…
                          </>
                        ) : (
                          <>
                            Load more
                            <span className="text-gray-400">
                              ({(state.total - state.leads.length).toLocaleString()} left)
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </>
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
