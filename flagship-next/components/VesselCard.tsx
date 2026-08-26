import { formatPrice, vesselSlug, lyingAt, type Vessel } from "@/lib/fleet";
import { href } from "@/lib/site";

export default function VesselCard({ v }: { v: Vessel }) {
  const detail = href(`/yachts/${vesselSlug(v)}`);
  const lying = lyingAt(v);
  return (
    <article className="light-card group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-[0_24px_60px_rgba(11,37,69,0.14)]">
      <a
        href={detail}
        className="relative block aspect-[4/3] overflow-hidden bg-navy/5"
      >
        {v.img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={v.img}
            alt={v.t}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full items-center justify-center font-serif italic text-navy/40">
            Photography on request
          </span>
        )}
        <span className="absolute left-4 top-4 rounded-full bg-abyss/75 px-3 py-1 text-[0.55rem] uppercase tracking-wide2 text-champagne backdrop-blur">
          {v.s ? "Sold" : v.nb ? "New Build" : "Brokerage"}
        </span>
      </a>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-serif text-xl leading-snug text-navy transition-colors group-hover:text-gold">
          <a href={detail}>{v.t}</a>
        </h3>
        <p className="mt-1.5 font-serif text-lg italic text-gold">
          {formatPrice(v)}
        </p>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-t border-navy/10 pt-4 text-[0.58rem] uppercase tracking-wide2 text-ink/55">
          {v.y && (
            <span>
              Year
              <b className="mt-0.5 block text-sm font-normal normal-case tracking-normal text-navy">
                {v.y}
              </b>
            </span>
          )}
          {v.l > 0 && (
            <span>
              Length
              <b className="mt-0.5 block text-sm font-normal normal-case tracking-normal text-navy">
                {v.l} m
              </b>
            </span>
          )}
          {v.cb > 0 && (
            <span>
              Cabins
              <b className="mt-0.5 block text-sm font-normal normal-case tracking-normal text-navy">
                {v.cb}
              </b>
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between gap-4 pt-5">
          {lying ? (
            <span className="truncate text-[0.62rem] uppercase tracking-wide2 text-ink/45">
              {lying}
            </span>
          ) : (
            <span />
          )}
          <a
            href={detail}
            className="flex-none text-[0.62rem] uppercase tracking-wide2 text-navy underline-offset-4 hover:text-gold hover:underline"
          >
            View Vessel &rarr;
          </a>
        </div>
      </div>
    </article>
  );
}
