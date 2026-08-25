import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Yacht Buyer's Agent",
  description:
    "Buyer representation through Flagship International: sourcing, appraisal, negotiation and survey management for yacht purchases in Australia and internationally.",
};

const POINTS: [string, string][] = [
  [
    "Sourcing",
    "We search the whole market on your behalf, including vessels not yet publicly listed, in Australia and internationally.",
  ],
  [
    "Appraisal & due diligence",
    "Comparable-sales analysis, condition review and coordination of survey and sea trial before you commit.",
  ],
  [
    "Negotiation",
    "Your agent negotiates with the selling broker so your interests, not the seller's, set the terms.",
  ],
  [
    "Delivery & after",
    "Import, transport, berthing and management can all be arranged through the same team after settlement.",
  ],
];

export default function BuyersAgentPage() {
  return (
    <>
      <PageHero
        eyebrow="Buyer Representation"
        title={
          <>
            Yacht <em>Buyer&rsquo;s Agent</em>
          </>
        }
        lede="Most brokers act for the seller. As your buyer's agent, Flagship acts for you: sourcing the right vessel, testing the price and managing the purchase through to handover."
      />
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2">
          <div className="space-y-8">
            {POINTS.map(([title, body], i) => (
              <Reveal key={title} delay={i * 70}>
                <div className="border-l-2 border-gold pl-6">
                  <h2 className="font-serif text-xl text-navy">{title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                    {body}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div className="light-card p-9">
              <h2 className="font-serif text-2xl text-navy">
                Discuss a brief
              </h2>
              <p className="mt-2 text-sm text-ink/65">
                Tell us what you are looking for: size, budget, cruising plans
                and timing. Conversations are confidential.
              </p>
              <div className="mt-6">
                <ContactForm subject="Buyer's agent enquiry" />
              </div>
              <p className="mt-6 border-t border-navy/10 pt-5 text-sm text-ink/65">
                Or call{" "}
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
