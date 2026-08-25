import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import FleetSearch from "@/components/FleetSearch";
import { getFleet } from "@/lib/fleet";

export const metadata: Metadata = {
  title: "Yachts for Sale",
  description:
    "Search new and pre-owned yachts listed with Flagship International, from trailerable cruisers to explorer superyachts.",
};

export default async function BuyPage() {
  const { vessels, source } = await getFleet();
  return (
    <>
      <PageHero
        eyebrow="Buy"
        title={
          <>
            Yachts <em>for Sale</em>
          </>
        }
        lede="Search the full fleet currently listed with Flagship, from trailerable cruisers to explorer superyachts. Filter by condition, make, length, cabins and price."
      />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-7xl">
          <FleetSearch vessels={vessels.filter((v) => !v.s)} />
          {source === "snapshot" && (
            <p className="mt-12 text-center text-xs text-ink/40">
              Listing data refreshes from the live vessel feed on each deploy.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
