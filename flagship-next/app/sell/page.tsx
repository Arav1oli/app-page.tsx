import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sell Your Yacht",
  description:
    "List your yacht with Flagship International. Confidential appraisals, professional presentation and marketing to a qualified international buyer network.",
};

const STEPS: [string, string][] = [
  [
    "Appraisal",
    "A confidential appraisal based on current listings, recent sales and active buyer demand, so your yacht enters the market at a defensible price.",
  ],
  [
    "Presentation",
    "Professional photography and video, with preparation advice so the vessel presents at its best for inspections.",
  ],
  [
    "Marketing",
    "Your listing is marketed across YachtHub, boatsales, boats.com and YachtWorld, alongside Flagship's own database and campaigns.",
  ],
  [
    "Qualified buyers",
    "Enquiries are qualified before inspections are arranged, so your time is spent with genuine buyers.",
  ],
  [
    "Negotiation & settlement",
    "Your broker manages offers, survey and sea trial logistics, documentation and settlement through to handover.",
  ],
];

export default function SellPage() {
  return (
    <>
      <PageHero
        eyebrow="Sell"
        title={
          <>
            Sell your yacht <em>with Flagship</em>
          </>
        }
        lede="Precise marketing, qualified buyers and experienced brokers at Rose Bay, Point Piper and Gold Coast City Marinas."
      />
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2">
          <div>
            <Reveal>
              <h2 className="h-serif text-3xl">How a Flagship sale works</h2>
            </Reveal>
            <ol className="mt-8 space-y-7">
              {STEPS.map(([title, body], i) => (
                <Reveal key={title} delay={i * 70}>
                  <li className="flex gap-5">
                    <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full border border-gold font-serif text-lg text-gold">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-serif text-xl text-navy">{title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                        {body}
                      </p>
                    </div>
                  </li>
                </Reveal>
              ))}
            </ol>
            <Reveal delay={200}>
              <p className="mt-10 border-t border-navy/10 pt-7 text-sm leading-relaxed text-ink/70">
                Flagship is also the official Australasian dealer for Nordhavn,
                Numarine, Schaefer, Silver Yachts, Marex and Toy Marine, which
                brings trade-in and changeover buyers directly to our brokerage
                listings.
              </p>
            </Reveal>
          </div>
          <Reveal delay={120}>
            <div className="light-card p-9">
              <h2 className="font-serif text-2xl text-navy">
                Request a confidential appraisal
              </h2>
              <p className="mt-2 text-sm text-ink/65">
                Tell us about your yacht and a broker will come back to you
                with current market advice.
              </p>
              <div className="mt-6">
                <ContactForm subject="Appraisal request" />
              </div>
              <p className="mt-6 border-t border-navy/10 pt-5 text-sm text-ink/65">
                Prefer to talk?{" "}
                <a href={SITE.phoneSydneyHref} className="text-navy underline">
                  {SITE.phoneSydney}
                </a>
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
