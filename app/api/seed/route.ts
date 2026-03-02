import { NextResponse } from "next/server"

// Safety: only available in development
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 })
  }
  return NextResponse.json({ message: "Run: npm run db:seed" })
}
