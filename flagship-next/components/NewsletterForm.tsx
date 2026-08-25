"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

export default function NewsletterForm() {
  const [status, setStatus] = useState<"" | "sending" | "ok" | "err">("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
    setStatus("sending");
    try {
      const res = await fetch(SITE.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "newsletter-signup",
          email,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent || "",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("err");
    }
  }

  if (status === "ok") {
    return (
      <p className="font-serif text-xl italic text-gold">
        Thank you. You&rsquo;re on the list.
      </p>
    );
  }
  return (
    <div>
      <form onSubmit={submit} noValidate className="flex gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="Your email address"
          aria-label="Email address"
          className="w-full max-w-sm border-b border-navy/25 bg-transparent py-3 text-[0.95rem] outline-none focus:border-gold"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="btn-gold disabled:opacity-60"
        >
          {status === "sending" ? "Sending…" : "Submit"}
        </button>
      </form>
      {status === "err" && (
        <p className="mt-3 text-sm text-red-800">
          Something went wrong. Please try again, or email {SITE.email}.
        </p>
      )}
      <p className="mt-4 text-xs text-ink/55">
        By submitting you agree to our{" "}
        <a
          href={`${SITE.liveSite}/terms-and-privacy`}
          className="underline hover:text-gold"
        >
          Website Terms
        </a>
        . You may unsubscribe at any time.
      </p>
    </div>
  );
}
