import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getFleet,
  formatPrice,
  vesselSlug,
  liveListingUrl,
  type Vessel,
} from "@/lib/fleet";
import { href, SITE } from "@/lib/site";
import VesselCard from "@/components/VesselCard";
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
  return { title: v ? v.t : "Vessel" };
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
  const related = vessels
    .filter(
      (o) => o.mk && o.mk === v.mk && vesselSlug(o) !== slug && !o.s,
    )
    .slice(0, 3);
  const live = liveListingUrl(v);
  // Some feed rows carry a note ("Inspections available upon request.")
  // in the location field; only treat short, sentence-free values as a place.
  const lying =
    v.lo && v.lo.length <= 40 && !/[.!]/.test(v.lo) ? v.lo : "";

  return (
    <>
      <section className="dark-sec bg-abyss px-6 pb-14 pt-36">
        <div className="mx-auto max-w-7xl">
          <a
            href={href("/buy")}
            className="text-[0.65rem] uppercase tracking-wide2 text-champagne/60 hover:text-gold-bright"
          >
            &larr; All yachts for sale
          </a>
          <h1 className="h-serif mt-5 text-4xl md:text-5xl">{v.t}</h1>
          <p className="mt-3 font-serif text-2xl italic text-gold-bright">
            {formatPrice(v)}
          </p>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            {v.img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.img}
                alt={v.t}
                className="w-full rounded-2xl object-cover shadow-xl"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center rounded-2xl bg-navy/5 font-serif italic text-navy/40">
                Photography available on request
              </div>
            )}
            <div className="light-card mt-8 grid grid-cols-2 gap-6 p-8 sm:grid-cols-4">
              {(
                [
                  ["Year", v.y || "—"],
                  ["Length", v.l ? `${v.l}m` : "—"],
                  ["Cabins", v.cb || "—"],
                  ["Type", v.cat === "sail" ? "Sail" : v.cat === "power" ? "Power" : "Other"],
                  ["Condition", v.nb ? "New Build" : "Pre-Owned"],
                  ["Lying", lying || "Enquire"],
                  ["Currency", v.c],
                  ["Ref", v.r],
                ] as [string, string | number][]
              ).map(([k, val]) => (
                <div key={k}>
                  <span className="block text-[0.6rem] uppercase tracking-wide2 text-ink/50">
                    {k}
                  </span>
                  <span className="mt-1 block font-serif text-lg text-navy">
                    {val}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-8 space-y-4 leading-relaxed text-ink/75">
              <p>
                {v.t}
                {v.y ? `, ${v.y}` : ""} is{" "}
                {v.nb
                  ? "available new through Flagship International"
                  : "offered for sale through Flagship International"}
                {lying ? `, currently lying ${lying}` : ""}.
              </p>
              <p>
                Full specifications, inventory and additional photography can
                be supplied on request. Private inspections are available by
                appointment.
              </p>
              {live && (
                <p>
                  <a
                    href={live}
                    className="text-navy underline underline-offset-4 hover:text-gold"
                  >
                    View the complete listing on flagshipinternational.com.au
                    &rarr;
                  </a>
                </p>
              )}
            </div>
          </div>
          <aside>
            <div className="light-card p-8">
              <h2 className="font-serif text-2xl text-navy">
                Enquire about this vessel
              </h2>
              <p className="mt-2 text-sm text-ink/65">
                Request the full specifications or arrange a private
                inspection.
              </p>
              <div className="mt-6">
                <ContactForm subject={`Enquiry: ${v.t} (ref ${v.r})`} />
              </div>
              <p className="mt-6 border-t border-navy/10 pt-5 text-sm text-ink/65">
                Or call{" "}
                <a href={SITE.phoneSydneyHref} className="text-navy underline">
                  {SITE.phoneSydney}
                </a>
              </p>
            </div>
          </aside>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-white/40 px-6 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="h-serif text-3xl">More from {v.mk}</h2>
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
