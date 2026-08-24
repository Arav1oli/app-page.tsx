"use client"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  Search, Plus, ChevronLeft, ChevronRight, Loader2, AlertTriangle, RotateCw, X,
} from "lucide-react"
import { cn, STATUS_CONFIG, PRIORITY_CONFIG } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import NewLeadModal from "./NewLeadModal"
import {
  Lead, UserRef, Pagination, SORT_FIELDS, SortField,
  displayName, errorMessage,
} from "@/components/lead-types"

const PAGE_SIZES = [25, 50, 100]
const DEFAULT_PAGE_SIZE = 50
const SEARCH_DEBOUNCE_MS = 300

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "updatedAt:desc", label: "Recently Updated" },
  { value: "createdAt:desc", label: "Newest First" },
  { value: "lastContactedAt:desc", label: "Last Contacted" },
  { value: "lastName:asc", label: "Surname A–Z" },
  { value: "firstName:asc", label: "First Name A–Z" },
  { value: "company:asc", label: "Company A–Z" },
]

type Params = {
  page: number
  pageSize: number
  status: string
  ownerId: string
  search: string
  sort: SortField
  dir: "asc" | "desc"
}

function readParams(sp: URLSearchParams): Params {
  const rawSort = sp.get("sort") ?? ""
  const sort = (SORT_FIELDS as readonly string[]).includes(rawSort)
    ? (rawSort as SortField)
    : "updatedAt"
  const rawSize = Number(sp.get("pageSize"))
  const rawPage = Number(sp.get("page"))
  return {
    page: Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1,
    pageSize: PAGE_SIZES.includes(rawSize) ? rawSize : DEFAULT_PAGE_SIZE,
    status: sp.get("status") ?? "",
    ownerId: sp.get("ownerId") ?? "",
    search: sp.get("search") ?? "",
    sort,
    dir: sp.get("dir") === "asc" ? "asc" : "desc",
  }
}

function buildQuery(p: Params): string {
  const q = new URLSearchParams()
  if (p.page > 1) q.set("page", String(p.page))
  if (p.pageSize !== DEFAULT_PAGE_SIZE) q.set("pageSize", String(p.pageSize))
  if (p.status) q.set("status", p.status)
  if (p.ownerId) q.set("ownerId", p.ownerId)
  if (p.search) q.set("search", p.search)
  if (p.sort !== "updatedAt") q.set("sort", p.sort)
  if (p.dir !== "desc") q.set("dir", p.dir)
  return q.toString()
}

export default function LeadListClient({ users }: { users: UserRef[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = readParams(new URLSearchParams(searchParams.toString()))
  const queryKey = buildQuery(params)

  const [leads, setLeads] = useState<Lead[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [searchInput, setSearchInput] = useState(params.search)
  const [reloadToken, setReloadToken] = useState(0)

  // Keep the box in sync when the URL changes from elsewhere (back button, reset).
  const lastUrlSearch = useRef(params.search)
  useEffect(() => {
    if (params.search !== lastUrlSearch.current) {
      lastUrlSearch.current = params.search
      setSearchInput(params.search)
    }
  }, [params.search])

  const pushParams = useCallback(
    (next: Partial<Params>) => {
      const merged: Params = { ...params, ...next }
      // Any filter/sort change resets to page 1 unless the page itself moved.
      if (next.page === undefined) merged.page = 1
      const qs = buildQuery(merged)
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router]
  )

  // `pushParams` is rebuilt every render (it closes over `params`), so hold it in
  // a ref — otherwise an unrelated re-render would restart the debounce timer and
  // a fast typist could keep it from ever firing.
  const pushParamsRef = useRef(pushParams)
  useEffect(() => {
    pushParamsRef.current = pushParams
  })

  // Debounced search -> URL (one request per pause, not per keystroke)
  useEffect(() => {
    if (searchInput === params.search) return
    const t = setTimeout(() => {
      lastUrlSearch.current = searchInput
      pushParamsRef.current({ search: searchInput })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [searchInput, params.search])

  // Fetch the current page whenever the query changes.
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams({
          page: String(params.page),
          pageSize: String(params.pageSize),
          sort: params.sort,
          dir: params.dir,
        })
        if (params.status) qs.set("status", params.status)
        if (params.ownerId) qs.set("ownerId", params.ownerId)
        if (params.search) qs.set("search", params.search)

        const res = await fetch(`/api/leads?${qs.toString()}`, {
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(await errorMessage(res, "Could not load leads"))
        const json = await res.json()
        if (cancelled) return

        if (Array.isArray(json)) {
          // Legacy/unpaginated response: page it here so we never render 29k rows.
          const start = (params.page - 1) * params.pageSize
          const slice = json.slice(start, start + params.pageSize)
          setLeads(slice)
          setPagination({
            page: params.page,
            pageSize: params.pageSize,
            total: json.length,
            totalPages: Math.max(1, Math.ceil(json.length / params.pageSize)),
            hasMore: start + slice.length < json.length,
          })
        } else {
          const rows: Lead[] = Array.isArray(json?.data) ? json.data : []
          const p = json?.pagination
          setLeads(rows)
          setPagination({
            page: Number(p?.page) || params.page,
            pageSize: Number(p?.pageSize) || params.pageSize,
            total: Number(p?.total ?? rows.length),
            totalPages: Number(p?.totalPages) || 1,
            hasMore: Boolean(p?.hasMore),
          })
        }
      } catch (e: any) {
        if (cancelled || e?.name === "AbortError") return
        setLeads([])
        setPagination(null)
        setError(e?.message || "Could not load leads.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      controller.abort()
    }
    // queryKey collapses all seven params into one stable dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, reloadToken])

  function handleLeadCreated() {
    setShowModal(false)
    // Refetch rather than splicing a row into a server-ordered page.
    setReloadToken((t) => t + 1)
  }

  const total = pagination?.total ?? 0
  const totalPages = pagination?.totalPages ?? 1
  const from = total === 0 ? 0 : (params.page - 1) * params.pageSize + 1
  const to = total === 0 ? 0 : Math.min(from + leads.length - 1, total)
  const filtersActive = Boolean(params.status || params.ownerId || params.search)

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">All Leads</h1>
          <p className="text-sm text-gray-500">
            {loading && !pagination
              ? "Loading…"
              : error
              ? "—"
              : `${total.toLocaleString()} lead${total === 1 ? "" : "s"}${
                  filtersActive ? " matching filters" : ""
                }`}
          </p>
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
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
          value={params.status}
          onChange={(e) => pushParams({ status: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={params.ownerId}
          onChange={(e) => pushParams({ ownerId: e.target.value })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All Owners</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          value={`${params.sort}:${params.dir}`}
          onChange={(e) => {
            const [sort, dir] = e.target.value.split(":")
            pushParams({ sort: sort as SortField, dir: dir === "asc" ? "asc" : "desc" })
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select
          value={String(params.pageSize)}
          onChange={(e) => pushParams({ pageSize: Number(e.target.value) })}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {PAGE_SIZES.map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>

        {filtersActive && (
          <button
            onClick={() => {
              setSearchInput("")
              lastUrlSearch.current = ""
              pushParams({ status: "", ownerId: "", search: "" })
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}

        {loading && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Loading…
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-800">Couldn’t load leads</p>
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

      {/* Table */}
      <div className="overflow-x-auto relative">
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
            {loading && leads.length === 0
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skeleton-${i}`}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className={j === 0 ? "px-6 py-3.5" : "px-4 py-3.5"}>
                        <div className="h-3 rounded bg-gray-100 animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              : leads.map((lead) => {
                  const status = STATUS_CONFIG[lead.status as keyof typeof STATUS_CONFIG]
                  const priority = PRIORITY_CONFIG[lead.priority as keyof typeof PRIORITY_CONFIG]
                  return (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-medium text-sm text-gray-900 hover:text-brand-600"
                        >
                          {displayName(lead)}
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
                        {!lead.email && !lead.phone && <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true })}
                      </td>
                    </tr>
                  )
                })}
          </tbody>
        </table>

        {!loading && !error && leads.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <p className="text-sm">
              {filtersActive
                ? "No leads match your filters."
                : "No leads yet — create one to get started."}
            </p>
            {filtersActive && (
              <button
                onClick={() => {
                  setSearchInput("")
                  lastUrlSearch.current = ""
                  pushParams({ status: "", ownerId: "", search: "" })
                }}
                className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!error && (leads.length > 0 || params.page > 1) && (
        <div className="flex items-center justify-between gap-3 px-6 py-3 bg-white border-t border-gray-200 flex-wrap">
          <p className="text-sm text-gray-500">
            {total > 0
              ? `Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}`
              : "Showing 0 of 0"}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => pushParams({ page: params.page - 1 })}
              disabled={params.page <= 1 || loading}
              className="flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </button>
            <span className="text-sm text-gray-500 px-1">
              Page {params.page.toLocaleString()} of {Math.max(totalPages, 1).toLocaleString()}
            </span>
            <button
              onClick={() => pushParams({ page: params.page + 1 })}
              disabled={loading || !(pagination?.hasMore ?? params.page < totalPages)}
              className="flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

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
