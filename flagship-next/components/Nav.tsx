"use client";

import { useState } from "react";
import { href, SITE, BRANDS } from "@/lib/site";

const NAV = [
  { label: "Buy", path: "/buy" },
  { label: "Sell", path: "/sell" },
  {
    label: "New",
    path: "/new",
    children: BRANDS.map((b) => ({ label: b.name, path: `/new/${b.slug}` })),
  },
  { label: "Yacht Management", path: "/yacht-management" },
  {
    label: "About",
    path: "/about",
    children: [
      { label: "About Flagship", path: "/about" },
      { label: "Meet the Team", path: "/about/meet-the-team" },
      { label: "Yacht Buyer's Agent", path: "/about/yacht-buyers-agent" },
    ],
  },
  { label: "Sold", path: "/yachts-sold" },
  { label: "News", path: "/news" },
  { label: "Contact", path: "/contact" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4">
        <a href={href("/")} className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/logo.png`}
            alt="Flagship International Yacht Brokers"
            className="h-12 w-auto"
          />
        </a>
        <nav className="hidden items-center gap-7 lg:flex">
          {NAV.map((item) => (
            <div key={item.path} className="group relative">
              <a
                href={href(item.path)}
                className="font-sans text-[0.68rem] uppercase tracking-wide2 text-champagne transition-colors hover:text-gold-bright"
              >
                {item.label}
              </a>
              {item.children && (
                <div className="invisible absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-4 opacity-0 transition-all duration-300 group-hover:visible group-hover:opacity-100">
                  <div className="rounded-xl border border-white/10 bg-abyss/95 py-3 shadow-2xl backdrop-blur">
                    {item.children.map((c) => (
                      <a
                        key={c.path}
                        href={href(c.path)}
                        className="block px-5 py-2 font-sans text-[0.68rem] uppercase tracking-wide2 text-champagne/85 transition-all hover:pl-7 hover:text-gold-bright"
                      >
                        {c.label}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          <a
            href={SITE.phoneSydneyHref}
            className="ml-3 border-l border-white/20 pl-6 font-serif text-lg text-champagne hover:text-gold-bright"
          >
            {SITE.phoneSydney}
          </a>
        </nav>
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="flex flex-col gap-1.5 p-2 lg:hidden"
        >
          <span className="h-px w-7 bg-gold" />
          <span className="h-px w-7 bg-gold" />
          <span className="h-px w-7 bg-gold" />
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 bg-abyss/97 px-6 py-6 backdrop-blur lg:hidden">
          {NAV.flatMap((item) => [
            item,
            ...(item.children?.filter((c) => c.path !== item.path) ?? []),
          ]).map((item) => (
            <a
              key={item.path}
              href={href(item.path)}
              className="block py-2.5 font-sans text-[0.72rem] uppercase tracking-wide2 text-champagne hover:text-gold-bright"
            >
              {item.label}
            </a>
          ))}
          <a
            href={SITE.phoneSydneyHref}
            className="mt-4 block font-serif text-xl text-gold-bright"
          >
            {SITE.phoneSydney}
          </a>
        </div>
      )}
    </header>
  );
}
