"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

/** Chat-with-a-broker widget; posts to the same n8n webhook as the live site. */
export default function SmsWidget() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"" | "sending" | "ok" | "err">("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const mobile = String(data.get("mobile") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !mobile || !message) {
      setStatus("err");
      return;
    }
    let raw = mobile.replace(/\s+/g, "");
    if (raw.startsWith("0")) raw = raw.slice(1);
    setStatus("sending");
    try {
      const res = await fetch(SITE.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          mobile: `+61${raw}`,
          message,
          pageUrl: window.location.href,
          yachtName: "",
          brokerName: "",
          userAgent: navigator.userAgent || "",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("ok");
      form.reset();
      setTimeout(() => setOpen(false), 3000);
    } catch {
      setStatus("err");
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open && (
        <div className="mb-4 w-80 rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="font-serif text-lg text-navy">Chat with a Broker</p>
              <p className="mt-1 text-xs text-ink/60">
                Send us a message and we&rsquo;ll reply by SMS.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="text-xl leading-none text-ink/40 hover:text-navy"
            >
              &times;
            </button>
          </div>
          <form onSubmit={submit} noValidate>
            <label className="mb-1 block text-[0.6rem] font-bold uppercase tracking-wide2 text-navy">
              Name
            </label>
            <input
              name="name"
              className="mb-3 w-full rounded-md border border-navy/20 p-2.5 text-sm outline-none focus:border-gold"
            />
            <label className="mb-1 block text-[0.6rem] font-bold uppercase tracking-wide2 text-navy">
              Mobile
            </label>
            <input
              name="mobile"
              inputMode="tel"
              placeholder="04xx xxx xxx"
              className="mb-3 w-full rounded-md border border-navy/20 p-2.5 text-sm outline-none focus:border-gold"
            />
            <label className="mb-1 block text-[0.6rem] font-bold uppercase tracking-wide2 text-navy">
              Message
            </label>
            <textarea
              name="message"
              rows={3}
              className="mb-4 w-full resize-y rounded-md border border-navy/20 p-2.5 text-sm outline-none focus:border-gold"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="w-full rounded-full bg-gradient-to-br from-gold-bright to-gold py-3 text-[0.68rem] uppercase tracking-wide2 text-abyss disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Send Message"}
            </button>
            {status === "ok" && (
              <p className="mt-3 text-xs text-green-700">
                Message sent. We&rsquo;ll be in touch shortly.
              </p>
            )}
            {status === "err" && (
              <p className="mt-3 text-xs text-red-700">
                Please complete all fields and try again.
              </p>
            )}
          </form>
        </div>
      )}
      <button
        type="button"
        aria-label="Chat with Flagship"
        onClick={() => setOpen(!open)}
        className="ml-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-gold bg-navy shadow-2xl transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 100 70" className="h-8 w-8 fill-gold" aria-hidden>
          <path d="M10 45 L90 45 L80 60 L20 60 Z" />
          <path d="M30 40 L70 40 L65 25 L45 25 L45 15 L40 15 L40 25 L35 25 Z" />
          <rect x="47" y="5" width="3" height="12" />
        </svg>
      </button>
    </div>
  );
}
