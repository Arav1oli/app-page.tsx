import { formatPrice, vesselSlug, type Vessel } from "@/lib/fleet";
import { href } from "@/lib/site";

export default function VesselCard({ v }: { v: Vessel }) {
  const detail = href(`/yachts/${vesselSlug(v)}`);
  return (
    <article className="light-card group overflow-hidden">
      <a href={detail} className="block aspect-[4/3] overflow-hidden bg-navy/5">
        {v.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.img}
            alt={v.t}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-serif italic text-navy/40">
            Photography on request
          </div>
        )}
      </a>
      <div className="p-6">
        <h3 className="font-serif text-xl text-navy">{v.t}</h3>
        <p className="mt-1 font-serif italic text-gold">{formatPrice(v)}</p>
        <div className="mt-4 flex gap-6 border-t border-navy/10 pt-4 text-[0.62rem] uppercase tracking-wide2 text-ink/60">
          {v.y && (
            <span>
              Year <b className="ml-1 block text-sm normal-case text-navy">{v.y}</b>
            </span>
          )}
          {v.l > 0 && (
            <span>
              Length <b className="ml-1 block text-sm normal-case text-navy">{v.l}m</b>
            </span>
          )}
          {v.cb > 0 && (
            <span>
              Cabins <b className="ml-1 block text-sm normal-case text-navy">{v.cb}</b>
            </span>
          )}
        </div>
        <a
          href={detail}
          className="mt-5 inline-block text-[0.65rem] uppercase tracking-wide2 text-navy underline-offset-4 hover:text-gold hover:underline"
        >
          View Vessel &rarr;
        </a>
      </div>
    </article>
  );
}
