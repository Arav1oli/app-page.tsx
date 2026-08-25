import { XMLParser } from "fast-xml-parser";
import snapshot from "@/data/fleet-snapshot.json";

/**
 * Vessel model used across the site. Field names mirror the YachtHub feed
 * snapshot the live homepage runs on:
 *   t: title, mk: make, y: year, l: length (m), p: price, c: currency,
 *   lo: location, cat: power|sail|other, nb: new build, s: sold,
 *   cb: cabins, img: primary image URL, u: listing slug, r: broker ref,
 *   ad: listed timestamp (s)
 */
export interface Vessel {
  t: string;
  mk: string;
  y: string;
  l: number;
  p: number;
  c: string;
  lo: string;
  cat: "power" | "sail" | "other";
  nb: boolean;
  s: boolean;
  cb: number;
  img: string;
  u: string;
  r: string;
  ad: number;
}

const CSYM: Record<string, string> = {
  AUD: "AU $",
  NZD: "NZ $",
  USD: "US $",
  EUR: "€",
  GBP: "£",
};

export function formatPrice(v: Vessel): string {
  if (v.s) return "Sold";
  if (!v.p) return "Price on Application";
  return `${CSYM[v.c] ?? ""}${v.p.toLocaleString("en-AU")}`;
}

export function formatLength(v: Vessel): string {
  return v.l ? `${v.l}m` : "";
}

/** Stable slug for internal detail pages. */
export function vesselSlug(v: Vessel): string {
  const base =
    v.u ||
    v.t
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return `${base}-${v.r.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
}

/** Link to the vessel's listing on the live site when it has one. */
export function liveListingUrl(v: Vessel): string | null {
  return v.u
    ? `https://flagshipinternational.com.au/boatlistings/view/${v.u}`
    : null;
}

/**
 * Fetches the live vessel XML feed named by YACHT_FEED_URL and normalises it.
 * Any failure (env unset, network refused, malformed XML) falls back to the
 * bundled snapshot so the site always builds with real listing data.
 *
 * The mapper is defensive about tag names: it accepts the common YachtHub
 * export shapes (<boats><boat>, <vessels><vessel>, <listings><listing>) and
 * both short and long field names. Validate against the real feed once the
 * feed URL is configured in the deploy environment.
 */
export async function getFleet(): Promise<{
  vessels: Vessel[];
  source: "live-xml" | "snapshot";
}> {
  const url = process.env.YACHT_FEED_URL;
  if (url) {
    try {
      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (!res.ok) throw new Error(`feed HTTP ${res.status}`);
      const xml = await res.text();
      const vessels = parseFeedXml(xml);
      if (vessels.length > 0) return { vessels, source: "live-xml" };
      throw new Error("feed parsed to 0 vessels");
    } catch (err) {
      console.warn(
        `[fleet] live feed unavailable (${(err as Error).message}); using snapshot`,
      );
    }
  }
  return { vessels: snapshot as Vessel[], source: "snapshot" };
}

export function parseFeedXml(xml: string): Vessel[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    trimValues: true,
  });
  const doc = parser.parse(xml);
  const items = findItemArray(doc);
  return items
    .map(mapFeedItem)
    .filter((v): v is Vessel => v !== null && !!v.t);
}

function findItemArray(doc: unknown): Record<string, unknown>[] {
  // Accept <boats><boat>..., <vessels><vessel>..., <listings><listing>...,
  // possibly nested one level under a root element.
  const candidates = ["boat", "vessel", "listing", "advert", "item"];
  const queue: unknown[] = [doc];
  while (queue.length) {
    const node = queue.shift();
    if (!node || typeof node !== "object") continue;
    const obj = node as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      if (candidates.includes(key.toLowerCase())) {
        const val = obj[key];
        return Array.isArray(val)
          ? (val as Record<string, unknown>[])
          : [val as Record<string, unknown>];
      }
      queue.push(obj[key]);
    }
  }
  return [];
}

function str(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v !== undefined && v !== null && typeof v !== "object")
      return String(v);
  }
  return "";
}

function num(o: Record<string, unknown>, ...keys: string[]): number {
  const s = str(o, ...keys).replace(/[^0-9.]/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function firstImage(o: Record<string, unknown>): string {
  const direct = str(o, "img", "image", "photo", "picture", "thumb");
  if (direct) return direct;
  const container = o["images"] ?? o["photos"] ?? o["pictures"];
  if (container && typeof container === "object") {
    const inner = Object.values(container as Record<string, unknown>)[0];
    if (Array.isArray(inner) && inner.length) return String(inner[0]);
    if (inner !== undefined && typeof inner !== "object") return String(inner);
  }
  return "";
}

function mapFeedItem(o: Record<string, unknown>): Vessel | null {
  if (!o || typeof o !== "object") return null;
  const title =
    str(o, "t", "title", "name", "boat_name") ||
    [str(o, "make", "manufacturer"), str(o, "model")].filter(Boolean).join(" ");
  const catRaw = str(o, "cat", "category", "boat_type", "type").toLowerCase();
  const cat: Vessel["cat"] = /sail/.test(catRaw)
    ? "sail"
    : /power|motor|cruiser|launch/.test(catRaw) || catRaw === ""
      ? "power"
      : "other";
  const status = str(o, "status", "sale_status", "availability").toLowerCase();
  const condition = str(o, "condition", "new_or_used", "nb").toLowerCase();
  return {
    t: title,
    mk: str(o, "mk", "make", "manufacturer", "brand"),
    y: str(o, "y", "year", "year_built", "build_year"),
    l: num(o, "l", "length", "length_m", "loa", "length_overall"),
    p: num(o, "p", "price", "asking_price", "price_aud"),
    c: (str(o, "c", "currency", "price_currency") || "AUD").toUpperCase(),
    lo: str(o, "lo", "location", "lying", "suburb", "region"),
    cat,
    nb: condition === "true" || /new/.test(condition),
    s: str(o, "s") === "true" || /sold/.test(status),
    cb: num(o, "cb", "cabins", "num_cabins", "berths"),
    img: firstImage(o),
    u: str(o, "u", "slug", "url_slug", "seo_url"),
    r: str(o, "r", "ref", "reference", "stock_number", "id") || title,
    ad: num(o, "ad", "added", "listed_at", "date_added"),
  };
}

/** Convenience selectors used by pages. */
export function brokerageVessels(vessels: Vessel[]): Vessel[] {
  return vessels.filter((v) => !v.nb && !v.s);
}
export function newBuildVessels(vessels: Vessel[]): Vessel[] {
  return vessels.filter((v) => v.nb && !v.s);
}
export function soldVessels(vessels: Vessel[]): Vessel[] {
  return vessels.filter((v) => v.s);
}
export function byBrand(vessels: Vessel[], brandName: string): Vessel[] {
  const needle = brandName.toLowerCase().replace(/ yachts?$/, "");
  return vessels.filter((v) =>
    v.mk.toLowerCase().replace(/ yachts?$/, "").includes(needle),
  );
}
export function featured(vessels: Vessel[], n = 6): Vessel[] {
  return brokerageVessels(vessels)
    .slice()
    .sort((a, b) => (b.p || 0) - (a.p || 0))
    .slice(0, n);
}
