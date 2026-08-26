"use client";

import { useMemo, useState, useEffect } from "react";
import { lyingAt, type Vessel } from "@/lib/fleet";
import VesselCard from "@/components/VesselCard";

const PAGE = 12;

type Filters = {
  q: string;
  condition: string;
  year: string;
  make: string;
  length: string;
  cabins: string;
  price: string;
  location: string;
  sort: string;
};

const EMPTY: Filters = {
  q: "",
  condition: "",
  year: "",
  make: "",
  length: "",
  cabins: "",
  price: "",
  location: "",
  sort: "",
};

const LABELS: Record<keyof Filters, string> = {
  q: "Search",
  condition: "Condition",
  year: "Year",
  make: "Make",
  length: "Length",
  cabins: "Cabins",
  price: "Price",
  location: "Location",
  sort: "Sort",
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

  // Adopt ?condition=&length=&price= from the home-page quick search.
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
  const locations = useMemo(
    () => [...new Set(vessels.map(lyingAt).filter(Boolean))].sort(),
    [vessels],
  );

  const filtered = useMemo(() => {
    const needle = f.q.trim().toLowerCase();
    const out = vessels.filter((b) => {
      if (needle) {
        const hay = `${b.t} ${b.mk} ${b.y} ${b.lo} ${b.r}`.toLowerCase();
        if (!needle.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      if (f.condition === "1" && b.nb) return false;
      if (f.condition === "2" && !b.nb) return false;
      if (f.make && b.mk !== f.make) return false;
      if (f.location && lyingAt(b) !== f.location) return false;
      if (f.year && !inBracket(parseInt(b.y) || 0, f.year)) return false;
      if (f.length && !inBracket(b.l, f.length)) return false;
      if (f.cabins && b.cb !== parseInt(f.cabins)) return false;
      if (f.price && !inBracket(b.p, f.price)) return false;
      return true;
    });
    const so = f.sort;
    return out.slice().sort((a, b) => {
      if (so === "Listing oldest") return a.ad - b.ad;
      if (so === "Length high-low") return b.l - a.l;
      if (so === "Length low-high") return a.l - b.l;
      if (so === "Price high-low") return (b.p || 0) - (a.p || 0);
      if (so === "Price low-high") return (a.p || 0) - (b.p || 0);
      if (so === "Make/Model A-Z") return a.t.localeCompare(b.t);
      if (so === "Make/Model Z-A") return b.t.localeCompare(a.t);
      return b.ad - a.ad;
    });
  }, [vessels, f]);

  const setKey = (k: keyof Filters, value: string) => {
    setF((prev) => ({ ...prev, [k]: value }));
    setShown(PAGE);
  };
  const onSelect =
    (k: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement>) =>
      setKey(k, e.target.value);

  const active = (Object.keys(f) as (keyof Filters)[]).filter(
    (k) => k !== "sort" && f[k],
  );

  const sel =
    "field-input cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%229%22%20height=%226%22%3E%3Cpath%20d=%22M1%201l3.5%203.5L8%201%22%20stroke=%22%23C9A158%22%20stroke-width=%221.4%22%20fill=%22none%22%20stroke-linecap=%22round%22/%3E%3C/svg%3E')] bg-[right_4px_center] bg-no-repeat pr-6";

  return (
    <div>
      <div className="dark-sec rounded-2xl border border-white/10 bg-navy p-8 shadow-2xl md:p-10">
        {/* Keyword */}
        <label className="block">
          <span className="field-label">Search the fleet</span>
          <input
            type="search"
            value={f.q}
            onChange={(e) => setKey("q", e.target.value)}
            placeholder="Try “Nordhavn”, “explorer”, “Rose Bay” or a listing reference"
            className="field-input placeholder:text-champagne/35"
          />
        </label>

        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
          <label className="block">
            <span className="field-label">New / Pre-Owned</span>
            <select className={sel} value={f.condition} onChange={onSelect("condition")}>
              <option value="">All Vessels</option>
              <option value="1">Pre-Owned</option>
              <option value="2">New</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Make</span>
            <select className={sel} value={f.make} onChange={onSelect("make")}>
              <option value="">All Makes</option>
              {makes.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Length</span>
            <select className={sel} value={f.length} onChange={onSelect("length")}>
              <option value="">Any Length</option>
              <option>0 - 10m</option>
              <option>10 - 15m</option>
              <option>15m +</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Price</span>
            <select className={sel} value={f.price} onChange={onSelect("price")}>
              <option value="">Any Price</option>
              <option>$POA - $100,000</option>
              <option>$100,000 - $200,000</option>
              <option>$200,000 - $500,000</option>
              <option>$500,000 - $1,000,000</option>
              <option>$1,000,000 +</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Year</span>
            <select className={sel} value={f.year} onChange={onSelect("year")}>
              <option value="">Any Year</option>
              <option>Pre 2001</option>
              <option>2001 - 2010</option>
              <option>2011 - 2020</option>
              <option>2021 - Present</option>
            </select>
          </label>
          <label className="block">
            <span className="field-label">Cabins</span>
            <select className={sel} value={f.cabins} onChange={onSelect("cabins")}>
              <option value="">Any</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Lying</span>
            <select className={sel} value={f.location} onChange={onSelect("location")}>
              <option value="">Anywhere</option>
              {locations.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Sort By</span>
            <select className={sel} value={f.sort} onChange={onSelect("sort")}>
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
        </div>
      </div>

      {/* Results header + active filter chips */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[0.68rem] uppercase tracking-wide2 text-ink/60">
          {filtered.length} vessel{filtered.length === 1 ? "" : "s"}
          {active.length > 0 ? " matching" : " listed"}
        </p>
        {active.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {active.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKey(k, "")}
                className="flex items-center gap-2 rounded-full border border-navy/20 px-3 py-1 text-[0.6rem] uppercase tracking-wide2 text-navy transition hover:border-gold hover:text-gold"
              >
                {LABELS[k]}:{" "}
                {k === "condition"
                  ? f[k] === "1"
                    ? "Pre-Owned"
                    : "New"
                  : f[k]}
                <span aria-hidden>&times;</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setF({ ...EMPTY, sort: f.sort });
                setShown(PAGE);
              }}
              className="text-[0.6rem] uppercase tracking-wide2 text-ink/50 underline-offset-4 hover:text-gold hover:underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-navy/12 p-14 text-center">
          <p className="font-serif text-2xl text-navy">
            No vessels match those filters.
          </p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/65">
            Try widening the length or price range. We also source vessels not
            yet listed publicly, so tell us what you are looking for.
          </p>
          <button
            type="button"
            onClick={() => {
              setF(EMPTY);
              setShown(PAGE);
            }}
            className="btn-navy mt-7"
          >
            Reset Search
          </button>
        </div>
      ) : (
        <>
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
                Show More ({filtered.length - shown} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
