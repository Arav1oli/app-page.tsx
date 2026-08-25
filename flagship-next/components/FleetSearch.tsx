"use client";

import { useMemo, useState, useEffect } from "react";
import type { Vessel } from "@/lib/fleet";
import VesselCard from "@/components/VesselCard";

const PAGE = 12;

type Filters = {
  condition: string;
  year: string;
  make: string;
  length: string;
  cabins: string;
  price: string;
  sort: string;
};

const EMPTY: Filters = {
  condition: "",
  year: "",
  make: "",
  length: "",
  cabins: "",
  price: "",
  sort: "",
};

function inBracket(v: number, br: string): boolean {
  if (!br) return true;
  const n = br.replace(/[$,]/g, "");
  if (/POA/.test(br)) return v <= 100000;
  if (/\+/.test(br)) return v >= parseFloat(n);
  if (/Pre/.test(br)) return !!v && v < parseFloat(n.match(/\d+/)![0]);
  if (/Present/.test(br)) return v >= parseFloat(n.match(/\d+/)![0]);
  const m = n.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  return m ? v >= +m[1] && v <= +m[2] : true;
}

export default function FleetSearch({ vessels }: { vessels: Vessel[] }) {
  const [f, setF] = useState<Filters>(EMPTY);
  const [shown, setShown] = useState(PAGE);

  // Adopt ?condition= etc. from the URL (home-page quick search links here).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const next = { ...EMPTY };
    (Object.keys(next) as (keyof Filters)[]).forEach((k) => {
      const v = q.get(k);
      if (v) next[k] = v;
    });
    setF(next);
  }, []);

  const makes = useMemo(
    () => [...new Set(vessels.map((b) => b.mk).filter(Boolean))].sort(),
    [vessels],
  );

  const filtered = useMemo(() => {
    let out = vessels.filter((b) => {
      if (f.condition === "1" && b.nb) return false;
      if (f.condition === "2" && !b.nb) return false;
      if (f.make && b.mk !== f.make) return false;
      if (f.year && !inBracket(parseInt(b.y) || 0, f.year)) return false;
      if (f.length && !inBracket(b.l, f.length)) return false;
      if (f.cabins && b.cb !== parseInt(f.cabins)) return false;
      if (f.price && !inBracket(b.p, f.price)) return false;
      return true;
    });
    const so = f.sort;
    out = out.slice().sort((a, b) => {
      if (so === "Listing oldest") return a.ad - b.ad;
      if (so === "Length high-low") return b.l - a.l;
      if (so === "Length low-high") return a.l - b.l;
      if (so === "Price high-low") return (b.p || 0) - (a.p || 0);
      if (so === "Price low-high") return (a.p || 0) - (b.p || 0);
      if (so === "Make/Model A-Z") return a.t.localeCompare(b.t);
      if (so === "Make/Model Z-A") return b.t.localeCompare(a.t);
      return b.ad - a.ad;
    });
    return out;
  }, [vessels, f]);

  const set = (k: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    setF({ ...f, [k]: e.target.value });
    setShown(PAGE);
  };

  const sel =
    "field-input cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%229%22%20height=%226%22%3E%3Cpath%20d=%22M1%201l3.5%203.5L8%201%22%20stroke=%22%23C9A158%22%20stroke-width=%221.4%22%20fill=%22none%22%20stroke-linecap=%22round%22/%3E%3C/svg%3E')] bg-[right_4px_center] bg-no-repeat pr-6";

  return (
    <div>
      <div className="dark-sec rounded-2xl border border-white/10 bg-navy p-8 shadow-2xl md:p-10">
        <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
          <label className="block">
            <span className="field-label">New / Pre-Owned</span>
            <select className={sel} value={f.condition} onChange={set("condition")}>
              <option value="">All Vessels</option>
              <option value="1">Pre-Owned</option>
              <option value="2">New</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Year</span>
            <select className={sel} value={f.year} onChange={set("year")}>
              <option value="">Any Year</option>
              <option>Pre 2001</option>
              <option>2001 - 2010</option>
              <option>2011 - 2020</option>
              <option>2021 - Present</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Make</span>
            <select className={sel} value={f.make} onChange={set("make")}>
              <option value="">All Makes</option>
              {makes.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Length</span>
            <select className={sel} value={f.length} onChange={set("length")}>
              <option value="">Any Length</option>
              <option>0 - 10m</option>
              <option>10 - 15m</option>
              <option>15m +</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Cabins</span>
            <select className={sel} value={f.cabins} onChange={set("cabins")}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Price</span>
            <select className={sel} value={f.price} onChange={set("price")}>
              <option value="">Any Price</option>
              <option>$POA - $100,000</option>
              <option>$100,000 - $200,000</option>
              <option>$200,000 - $500,000</option>
              <option>$500,000 - $1,000,000</option>
              <option>$1,000,000 +</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Sort By</span>
            <select className={sel} value={f.sort} onChange={set("sort")}>
              <option value="">Listing latest</option>
              <option>Listing oldest</option>
              <option>Length high-low</option>
              <option>Length low-high</option>
              <option>Price high-low</option>
              <option>Price low-high</option>
              <option>Make/Model A-Z</option>
              <option>Make/Model Z-A</option>
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setF(EMPTY);
                setShown(PAGE);
              }}
              className="text-[0.62rem] uppercase tracking-wide2 text-mist underline-offset-4 hover:text-gold-bright hover:underline"
            >
              Reset filters
            </button>
          </div>
        </div>
      </div>

      <p className="mt-10 text-center text-[0.68rem] uppercase tracking-wide2 text-ink/60">
        {filtered.length} vessel{filtered.length === 1 ? "" : "s"}
      </p>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, shown).map((v) => (
          <VesselCard key={`${v.r}-${v.ad}`} v={v} />
        ))}
      </div>
      {shown < filtered.length && (
        <div className="mt-12 text-center">
          <button
            type="button"
            onClick={() => setShown(shown + PAGE)}
            className="btn-navy"
          >
            Show More
          </button>
        </div>
      )}
    </div>
  );
}
