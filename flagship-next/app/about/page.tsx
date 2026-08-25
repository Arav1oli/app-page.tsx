import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import { href, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Flagship",
  description:
    "Flagship International is a Sydney yacht brokerage based at Rose Bay and Point Piper Marinas, with a Queensland office at Gold Coast City Marina.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About"
        title={
          <>
            A brokerage built on <em>trust &amp; integrity</em>
          </>
        }
        lede="Flagship International is a Sydney yacht brokerage assisting buyers and sellers across brokerage sales, new yacht sales, buyer representation and yacht management."
      />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl space-y-6 leading-relaxed text-ink/75">
          <Reveal>
            <p>
              Flagship International operates from Rose Bay Marina and Point
              Piper Marina on Sydney Harbour, with a Queensland office at Gold
              Coast City Marina. The brokerage handles new and pre-owned
              vessels across a wide range of sizes, from trailerable cruisers
              to explorer superyachts.
            </p>
          </Reveal>
          <Reveal delay={70}>
            <p>
              We are the official Australasian dealer for Nordhavn, Numarine,
              Schaefer, Silver Yachts, Marex and Toy Marine, and our brokerage
              listings are marketed across YachtHub, boatsales, boats.com and
              YachtWorld alongside our own buyer database and campaigns.
            </p>
          </Reveal>
          <Reveal delay={140}>
            <p>
              Whether you are buying your first boat, moving up a size, or
              planning a new build, a Flagship broker manages the process from
              enquiry through survey, sea trial, documentation and handover.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="flex flex-wrap gap-4 pt-6">
              <a className="btn-gold" href={href("/about/meet-the-team")}>
                Meet the Team
              </a>
              <a className="btn-navy" href={href("/contact")}>
                Contact Us
              </a>
            </div>
          </Reveal>
        </div>
      </section>
      <section className="dark-sec bg-navy px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-10 text-center sm:grid-cols-3">
          {[
            ["Rose Bay Marina", "Head Office, Sydney", SITE.phoneSydney],
            ["Point Piper Marina", "Sydney Harbour", SITE.phoneSydney],
            ["Gold Coast City Marina", "Coomera, Queensland", SITE.phoneQld],
          ].map(([name, loc, ph]) => (
            <div key={name}>
              <h2 className="font-serif text-2xl text-champagne">{name}</h2>
              <p className="mt-2 text-[0.68rem] uppercase tracking-wide2 text-mist">
                {loc}
              </p>
              <p className="mt-3 font-serif text-lg text-gold-bright">{ph}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
