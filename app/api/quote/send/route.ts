import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const runtime = "nodejs"

type Body = {
  to: string
  cc?: string
  subject: string
  text: string
  html?: string
}

// RFC 2822 base64url-encoded message for the Gmail API.
function buildRawMessage({ from, to, cc, subject, text, html }: Body & { from: string }) {
  const boundary = `b_${Date.now().toString(36)}`
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].filter(Boolean).join("\r\n")

  const textPart = [
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
  ].join("\r\n")

  const htmlPart = html ? [
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
  ].join("\r\n") : ""

  const closing = `--${boundary}--`
  const body = [textPart, htmlPart, closing].filter(Boolean).join("\r\n")
  const rfc = `${headers}\r\n\r\n${body}`
  return Buffer.from(rfc).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 })
  }
  const accessToken = (session as any).accessToken
  const provider = (session.user as any)?.provider
  if (!accessToken || provider !== "google") {
    return NextResponse.json(
      { error: "Sign in with Google to send via Gmail. Visit /api/auth/signin/google." },
      { status: 401 },
    )
  }
  if ((session as any).error === "RefreshAccessTokenError") {
    return NextResponse.json({ error: "Gmail token refresh failed — please sign in again." }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
  if (!body.to || !body.subject || !body.text) {
    return NextResponse.json({ error: "Missing to / subject / text" }, { status: 400 })
  }

  const raw = buildRawMessage({ ...body, from: session.user!.email! })

  const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw }),
  })

  if (!gmailRes.ok) {
    const detail = await gmailRes.text()
    return NextResponse.json(
      { error: "Gmail API rejected the send", status: gmailRes.status, detail },
      { status: 502 },
    )
  }

  const result = await gmailRes.json()
  return NextResponse.json({ ok: true, id: result.id, threadId: result.threadId, sentBy: session.user?.email })
}
