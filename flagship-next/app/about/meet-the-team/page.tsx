import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Meet the Team",
  description:
    "The brokers behind Flagship International, working from Rose Bay, Point Piper and Gold Coast City Marinas.",
};

/**
 * Team roster — extend this array as team profiles (name, role, photo,
 * direct line) are confirmed for publication.
 */
const TEAM: { name: string; role: string; note: string }[] = [
  {
    name: "Marley Cutbush",
    role: "Managing Director",
    note: "Leads the brokerage across Sydney and Queensland, with oversight of every listing, dealership and new-build project.",
  },
];

export default function TeamPage() {
  return (
    <>
      <PageHero
        eyebrow="Meet the Team"
        title={
          <>
            The people behind <em>Flagship</em>
          </>
        }
        lede="Our brokers work from Rose Bay, Point Piper and Gold Coast City Marinas, and manage every sale personally from first enquiry to handover."
      />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={i * 80}>
                <div className="light-card p-8">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-bright to-gold font-serif text-2xl text-abyss">
                    {m.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")}
                  </span>
                  <h2 className="mt-5 font-serif text-2xl text-navy">
                    {m.name}
                  </h2>
                  <p className="mt-1 text-[0.65rem] uppercase tracking-wide2 text-gold">
                    {m.role}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-ink/70">
                    {m.note}
                  </p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={120}>
              <div className="flex h-full flex-col justify-center rounded-2xl border border-navy/15 p-8">
                <h2 className="font-serif text-2xl text-navy">
                  Speak with a broker
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/70">
                  Sydney{" "}
                  <a
                    href={SITE.phoneSydneyHref}
                    className="text-navy underline"
                  >
                    {SITE.phoneSydney}
                  </a>
                  <br />
                  Gold Coast{" "}
                  <a href={SITE.phoneQldHref} className="text-navy underline">
                    {SITE.phoneQld}
                  </a>
                  <br />
                  <a
                    href={`mailto:${SITE.email}`}
                    className="text-navy underline"
                  >
                    {SITE.email}
                  </a>
                </p>
              </div>
            </Reveal>
          </div>
          <div className="mx-auto mt-20 max-w-2xl">
            <h2 className="h-serif text-center text-3xl">Get in touch</h2>
            <div className="mt-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
