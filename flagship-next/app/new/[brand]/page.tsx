import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import VesselCard from "@/components/VesselCard";
import ContactForm from "@/components/ContactForm";
import { BRANDS, href, SITE } from "@/lib/site";
import { getFleet, byBrand, newBuildVessels, brokerageVessels } from "@/lib/fleet";

export function generateStaticParams() {
  return BRANDS.map((b) => ({ brand: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ brand: string }>;
}): Promise<Metadata> {
  const { brand } = await params;
  const b = BRANDS.find((x) => x.slug === brand);
  return { title: b ? `New ${b.name}` : "New Builds" };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brand: string }>;
}) {
  const { brand } = await params;
  const b = BRANDS.find((x) => x.slug === brand);
  if (!b) notFound();

  const { vessels } = await getFleet();
  const brandVessels = byBrand(vessels, b.name);
  const newStock = newBuildVessels(brandVessels);
  const preOwned = brokerageVessels(brandVessels);

  return (
    <>
      <PageHero
        eyebrow="Official Australasian Dealer"
        title={<em>{b.name}</em>}
        lede={b.blurb}
      />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          {newStock.length > 0 ? (
            <>
              <h2 className="h-serif text-3xl">
                Current {b.name} range &amp; stock
              </h2>
              <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {newStock.map((v) => (
                  <VesselCard key={`${v.r}-${v.ad}`} v={v} />
                ))}
              </div>
            </>
          ) : (
            <p className="max-w-2xl leading-relaxed text-ink/70">
              Current {b.name} availability and build slots change regularly.
              Enquire below for the latest model line-up, pricing and delivery
              timing.
            </p>
          )}

          {preOwned.length > 0 && (
            <>
              <h2 className="h-serif mt-16 text-3xl">
                Pre-owned {b.name} listings
              </h2>
              <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {preOwned.map((v) => (
                  <VesselCard key={`${v.r}-${v.ad}`} v={v} />
                ))}
              </div>
            </>
          )}

          <div className="mt-20 grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="h-serif text-3xl">Begin a {b.name} enquiry</h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/70">
                As the official Australasian dealer, Flagship can arrange
                specifications, factory options, delivery timing and private
                inspections of available stock. New builds are supported
                locally from Rose Bay and the Gold Coast.
              </p>
              <p className="mt-4 text-sm text-ink/70">
                Call{" "}
                <a href={SITE.phoneSydneyHref} className="text-navy underline">
                  {SITE.phoneSydney}
                </a>{" "}
                or use the form.
              </p>
              <p className="mt-8">
                <a
                  href={href("/new")}
                  className="text-[0.65rem] uppercase tracking-wide2 text-navy underline-offset-4 hover:text-gold hover:underline"
                >
                  &larr; All new yacht brands
                </a>
              </p>
            </div>
            <div className="light-card p-9">
              <ContactForm subject={`New build enquiry: ${b.name}`} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
