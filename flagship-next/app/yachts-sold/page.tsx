import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import VesselCard from "@/components/VesselCard";
import { getFleet, soldVessels } from "@/lib/fleet";
import { href, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Recently Sold",
  description:
    "Yachts recently sold through Flagship International. Owners considering a sale can request a confidential appraisal.",
};

export default async function SoldPage() {
  const { vessels } = await getFleet();
  const sold = soldVessels(vessels);
  return (
    <>
      <PageHero
        eyebrow="Results"
        title={
          <>
            Recently <em>Sold</em>
          </>
        }
        lede="A selection of vessels recently sold through Flagship. Owners considering a sale can contact us for a confidential appraisal and current market advice."
      />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          {sold.length > 0 ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {sold.map((v) => (
                <VesselCard key={`${v.r}-${v.ad}`} v={v} />
              ))}
            </div>
          ) : (
            <p className="mx-auto max-w-2xl text-center leading-relaxed text-ink/70">
              Sold listings rotate off the live feed once settled. For recent
              comparable sales relevant to your vessel, request a confidential
              appraisal and we will take you through them directly. The full
              sold archive is on{" "}
              <a
                href={`${SITE.liveSite}/yachts-sold`}
                className="text-navy underline"
              >
                flagshipinternational.com.au
              </a>
              .
            </p>
          )}
          <div className="mt-14 text-center">
            <a className="btn-gold" href={href("/sell")}>
              Request a Confidential Appraisal
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
