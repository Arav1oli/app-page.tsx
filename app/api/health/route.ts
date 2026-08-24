import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"

// Health checks must never be cached or pre-rendered — they have to reflect
// the live state of the running instance on every single request.
export const dynamic = "force-dynamic"
export const revalidate = 0

/**
 * GET /api/health
 *
 * Lightweight liveness/readiness probe. Deliberately unauthenticated so that
 * uptime monitors (Vercel, UptimeRobot, BetterStack, a load balancer, etc.)
 * can reach it, and deliberately free of any detail that would help an
 * attacker: no version numbers, no hostnames, no error strings.
 *
 * 200 -> the app is up AND it can actually talk to the database.
 * 503 -> the app is up but the database is unreachable (do not send traffic).
 */
export async function GET() {
  const startedAt = Date.now()

  try {
    // Cheapest possible round-trip that proves a real connection was opened
    // and a query was served. Valid on both SQLite and PostgreSQL.
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json(
      {
        status: "ok",
        database: "connected",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    )
  } catch (error) {
    // Log the real error to the server logs only. Database connection errors
    // frequently embed the connection string, username or host, so the client
    // gets a generic failure and nothing else.
    console.error("[health] database check failed:", error)

    return NextResponse.json(
      {
        status: "error",
        database: "unreachable",
        latencyMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
}
