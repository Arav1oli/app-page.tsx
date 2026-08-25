"use client";

import { useState } from "react";
import { SITE } from "@/lib/site";

export default function ContactForm({ subject = "" }: { subject?: string }) {
  const [status, setStatus] = useState<"" | "sending" | "ok" | "err">("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      type: "contact-enquiry",
      subject: subject || String(data.get("subject") ?? ""),
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      phone: String(data.get("phone") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
      pageUrl: window.location.href,
      userAgent: navigator.userAgent || "",
    };
    if (!payload.name || !payload.email || !payload.message) {
      setStatus("err");
      return;
    }
    setStatus("sending");
    try {
      const res = await fetch(SITE.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("err");
    }
  }

  const input =
    "w-full rounded-md border border-navy/20 bg-white p-3 text-sm outline-none focus:border-gold";

  if (status === "ok") {
    return (
      <div className="light-card p-10 text-center">
        <p className="font-serif text-2xl text-navy">Thank you.</p>
        <p className="mt-3 text-sm text-ink/70">
          Your enquiry has been received. A member of the Flagship team will be
          in touch shortly.
        </p>
      </div>
    );
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input name="name" placeholder="Name" aria-label="Name" className={input} />
        <input
          name="email"
          type="email"
          placeholder="Email"
          aria-label="Email"
          className={input}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          name="phone"
          inputMode="tel"
          placeholder="Phone (optional)"
          aria-label="Phone"
          className={input}
        />
        {!subject && (
          <select name="subject" aria-label="Enquiry type" className={input}>
            <option value="General enquiry">General enquiry</option>
            <option value="Buying">Buying a yacht</option>
            <option value="Selling">Selling my yacht</option>
            <option value="New build">New yacht build</option>
            <option value="Yacht management">Yacht management</option>
            <option value="Appraisal">Request an appraisal</option>
          </select>
        )}
      </div>
      <textarea
        name="message"
        rows={5}
        placeholder="Your message"
        aria-label="Message"
        className={`${input} resize-y`}
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-gold disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send Enquiry"}
      </button>
      {status === "err" && (
        <p className="text-sm text-red-800">
          Please complete name, email and message, then try again. You can also
          email {SITE.email} directly.
        </p>
      )}
    </form>
  );
}
