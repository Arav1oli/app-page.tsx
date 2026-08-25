import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { BRANDS, href } from "@/lib/site";
import { getFleet, newBuildVessels } from "@/lib/fleet";

export const metadata: Metadata = {
  title: "New Yacht Builds",
  description:
    "Flagship International is the official Australasian dealer for Nordhavn, Numarine, Schaefer, Silver Yachts, Marex and Toy Marine.",
};

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default async function NewPage() {
  const { vessels } = await getFleet();
  const stock = newBuildVessels(vessels);
  return (
    <>
      <PageHero
        eyebrow="Dealerships"
        title={
          <>
            New <em>Yacht Builds</em>
          </>
        }
        lede="Flagship is the official Australasian dealer for six international shipyards. Explore current stock, or begin a new build specified to your requirements with factory-backed warranty and local support."
      />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2">
            {BRANDS.map((b, i) => {
              const count = stock.filter((v) =>
                v.mk
                  .toLowerCase()
                  .includes(b.name.toLowerCase().replace(/ yachts?$/, "")),
              ).length;
              return (
                <Reveal key={b.slug} delay={(i % 2) * 90}>
                  <a
                    href={href(`/new/${b.slug}`)}
                    className="light-card group block overflow-hidden"
                  >
                    <div className="aspect-[16/9] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`${BASE}${b.img}`}
                        alt={b.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-7">
                      <div className="flex items-center justify-between">
                        <h2 className="font-serif text-2xl text-navy transition-colors group-hover:text-gold">
                          {b.name}
                        </h2>
                        {count > 0 && (
                          <span className="rounded-full border border-gold/50 px-3 py-1 text-[0.6rem] uppercase tracking-wide2 text-gold">
                            {count} model{count === 1 ? "" : "s"} available
                          </span>
                        )}
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-ink/70">
                        {b.blurb}
                      </p>
                    </div>
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
