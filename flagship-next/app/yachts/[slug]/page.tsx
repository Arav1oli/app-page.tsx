import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFleet,
  formatPrice,
  vesselSlug,
  specGroups,
  lyingAt,
  listedOn,
  vesselType,
  type Vessel,
} from "@/lib/fleet";
import { href, SITE } from "@/lib/site";
import VesselCard from "@/components/VesselCard";
import VesselGallery from "@/components/VesselGallery";
import ContactForm from "@/components/ContactForm";

export async function generateStaticParams() {
  const { vessels } = await getFleet();
  return vessels.map((v) => ({ slug: vesselSlug(v) }));
}

async function findVessel(slug: string): Promise<Vessel | undefined> {
  const { vessels } = await getFleet();
  return vessels.find((v) => vesselSlug(v) === slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const v = await findVessel(slug);
  if (!v) return { title: "Vessel" };
  const bits = [v.y, v.t, v.l ? `${v.l}m` : "", lyingAt(v)].filter(Boolean);
  return {
    title: `${v.t}${v.y ? ` (${v.y})` : ""}`,
    description: `${bits.join(" · ")}. ${formatPrice(v)}. Offered for sale through Flagship International Yacht Brokers.`,
  };
}

export default async function VesselPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const v = await findVessel(slug);
  if (!v) notFound();

  const { vessels } = await getFleet();
  const lying = lyingAt(v);
  const groups = specGroups(v);

  const sameMake = vessels.filter(
    (o) => o.mk && o.mk === v.mk && vesselSlug(o) !== slug && !o.s,
  );
  const similarSize = vessels.filter(
    (o) =>
      vesselSlug(o) !== slug &&
      !o.s &&
      o.mk !== v.mk &&
      v.l > 0 &&
      Math.abs(o.l - v.l) / v.l < 0.25,
  );
  const related = [...sameMake, ...similarSize].slice(0, 3);

  const facts: [string, string][] = [
    ["Year", v.y],
    ["Length", v.l ? `${v.l} m` : ""],
    ["Cabins", v.cb ? String(v.cb) : ""],
    ["Lying", lying],
  ].filter(([, val]) => !!val) as [string, string][];

  return (
    <>
      {/* HEADER */}
      <section className="dark-sec bg-abyss px-6 pb-12 pt-32">
        <div className="mx-auto max-w-7xl">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-2 text-[0.62rem] uppercase tracking-wide2 text-champagne/50"
          >
            <a href={href("/")} className="hover:text-gold-bright">
              Home
            </a>
            <span aria-hidden>/</span>
            <a href={href("/buy")} className="hover:text-gold-bright">
              Yachts for Sale
            </a>
            {v.mk && (
              <>
                <span aria-hidden>/</span>
                <span>{v.mk}</span>
              </>
            )}
          </nav>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-gold/50 px-3 py-1 text-[0.58rem] uppercase tracking-wide2 text-gold">
                  {v.nb ? "New Build" : "Brokerage"}
                </span>
                <span className="rounded-full border border-white/20 px-3 py-1 text-[0.58rem] uppercase tracking-wide2 text-champagne/70">
                  {vesselType(v)}
                </span>
                {v.s && (
                  <span className="rounded-full bg-gold px-3 py-1 text-[0.58rem] uppercase tracking-wide2 text-abyss">
                    Sold
                  </span>
                )}
              </div>
              <h1 className="h-serif mt-4 text-4xl md:text-5xl">{v.t}</h1>
            </div>
            <p className="font-serif text-3xl italic text-gold-bright">
              {formatPrice(v)}
            </p>
          </div>
        </div>
      </section>

      {/* BODY */}
      <section className="px-6 py-12">
        <div className="mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[1.65fr_1fr]">
          <div>
            <VesselGallery primary={v.img} alt={v.t} />

            {/* Key facts strip */}
            {facts.length > 0 && (
              <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-navy/10 sm:grid-cols-4">
                {facts.map(([k, val]) => (
                  <div key={k} className="bg-paper px-5 py-6 text-center">
                    <span className="block text-[0.58rem] uppercase tracking-wide2 text-ink/50">
                      {k}
                    </span>
                    <span className="mt-1.5 block font-serif text-xl text-navy">
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Overview */}
            <div className="mt-12">
              <h2 className="h-serif text-2xl">Overview</h2>
              <div className="mt-5 space-y-4 leading-relaxed text-ink/75">
                <p>
                  {v.t}
                  {v.y ? `, a ${v.y} model` : ""}
                  {v.l ? ` measuring ${v.l} metres` : ""}, is{" "}
                  {v.nb
                    ? "available new through Flagship International as the official Australasian dealer"
                    : "offered for sale through Flagship International"}
                  {lying ? `, currently lying ${lying}` : ""}.
                </p>
                {v.cb > 0 && (
                  <p>
                    Accommodation is arranged over {v.cb} cabin
                    {v.cb === 1 ? "" : "s"}. A full inventory, deck and
                    accommodation plans and additional photography can be
                    supplied on request.
                  </p>
                )}
                <p>
                  {v.nb
                    ? "Specification, factory options, delivery timing and warranty terms are confirmed at the time of order. Our team can walk you through the current build slots and what is included at each level."
                    : "Private inspections are available by appointment. Your broker can also arrange survey and sea trial, and advise on comparable vessels currently on the market."}
                </p>
              </div>
            </div>

            {/* Specifications */}
            <div className="mt-12">
              <h2 className="h-serif text-2xl">Specifications</h2>
              <div className="mt-5 space-y-8">
                {groups.map((g) => (
                  <div key={g.group}>
                    <h3 className="border-b border-navy/15 pb-2 text-[0.62rem] uppercase tracking-wide2 text-gold">
                      {g.group}
                    </h3>
                    <dl className="mt-1">
                      {g.rows.map(([k, val]) => (
                        <div
                          key={k}
                          className="flex justify-between gap-6 border-b border-navy/8 py-3 text-sm"
                        >
                          <dt className="text-ink/60">{k}</dt>
                          <dd className="text-right font-medium text-navy">
                            {val}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-ink/50">
                Particulars are supplied by the vendor and offered in good
                faith. They do not form part of any contract and should be
                verified by inspection and survey.
              </p>
            </div>

            {/* Process */}
            <div className="mt-12 rounded-2xl border border-navy/12 p-8">
              <h2 className="h-serif text-2xl">What happens next</h2>
              <ol className="mt-6 space-y-5">
                {(
                  [
                    [
                      "Enquiry",
                      "Send the form and your broker will come back with the full specification and inventory.",
                    ],
                    [
                      "Inspection",
                      lying
                        ? `Private inspections are arranged by appointment${/rose bay|point piper|sydney|nsw/i.test(lying) ? " on Sydney Harbour" : ""}.`
                        : "Private inspections are arranged by appointment.",
                    ],
                    [
                      "Survey & sea trial",
                      "We coordinate an independent surveyor and sea trial so you buy on evidence, not impressions.",
                    ],
                    [
                      "Settlement & handover",
                      "Documentation, transport, berthing and ongoing management can all be arranged through Flagship.",
                    ],
                  ] as [string, string][]
                ).map(([title, body], i) => (
                  <li key={title} className="flex gap-4">
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full border border-gold font-serif text-sm text-gold">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-serif text-lg text-navy">{title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink/70">
                        {body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Sticky enquiry rail */}
          <aside className="lg:sticky lg:top-8">
            <div className="light-card p-8">
              <span className="eyebrow">Listing {v.r}</span>
              <h2 className="mt-3 font-serif text-2xl text-navy">
                Enquire about this vessel
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ink/65">
                Request the full specifications and inventory, or arrange a
                private inspection.
              </p>

              <div className="mt-6 flex flex-col gap-3 border-y border-navy/10 py-6">
                <a href={SITE.phoneSydneyHref} className="btn-gold">
                  Call {SITE.phoneSydney}
                </a>
                <a
                  href={`mailto:${SITE.email}?subject=${encodeURIComponent(
                    `Enquiry: ${v.t} (ref ${v.r})`,
                  )}`}
                  className="btn-navy"
                >
                  Email the Broker
                </a>
              </div>

              <div className="mt-6">
                <ContactForm subject={`Enquiry: ${v.t} (ref ${v.r})`} />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-navy/12 p-7">
              <h3 className="font-serif text-lg text-navy">
                Selling a similar vessel?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                We hold active buyers for {v.mk || "vessels"} in this size
                range. Request a confidential appraisal.
              </p>
              <a
                href={href("/sell")}
                className="mt-4 inline-block text-[0.65rem] uppercase tracking-wide2 text-navy underline-offset-4 hover:text-gold hover:underline"
              >
                Request an appraisal &rarr;
              </a>
            </div>

            {listedOn(v) && (
              <p className="mt-5 text-center text-xs text-ink/45">
                Listed {listedOn(v)}
              </p>
            )}
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-white/40 px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="h-serif text-3xl">
                {sameMake.length > 0
                  ? `More from ${v.mk}`
                  : "Comparable vessels"}
              </h2>
              <a
                href={href("/buy")}
                className="text-[0.65rem] uppercase tracking-wide2 text-navy underline-offset-4 hover:text-gold hover:underline"
              >
                View all listings &rarr;
              </a>
            </div>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((o) => (
                <VesselCard key={`${o.r}-${o.ad}`} v={o} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
