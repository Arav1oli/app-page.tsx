import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Flagship International Yacht Brokers at Rose Bay Marina, Point Piper Marina or Gold Coast City Marina.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Speak with <em>Flagship</em>
          </>
        }
        lede="Buying, selling, new builds or management: send an enquiry and the right broker will come back to you."
      />
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1fr_1.2fr]">
          <div className="space-y-9">
            {[
              {
                title: "Head Office — Rose Bay Marina",
                lines: [SITE.headOffice],
                phone: [SITE.phoneSydney, SITE.phoneSydneyHref] as const,
              },
              {
                title: "QLD Office — Gold Coast City Marina",
                lines: [SITE.qldOffice],
                phone: [SITE.phoneQld, SITE.phoneQldHref] as const,
              },
            ].map((o, i) => (
              <Reveal key={o.title} delay={i * 80}>
                <div className="border-l-2 border-gold pl-6">
                  <h2 className="font-serif text-xl text-navy">{o.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink/70">
                    {o.lines}
                  </p>
                  <p className="mt-2 text-sm">
                    <a href={o.phone[1]} className="text-navy underline">
                      {o.phone[0]}
                    </a>
                  </p>
                </div>
              </Reveal>
            ))}
            <Reveal delay={160}>
              <div className="border-l-2 border-gold pl-6">
                <h2 className="font-serif text-xl text-navy">Email</h2>
                <p className="mt-2 text-sm">
                  <a
                    href={`mailto:${SITE.email}`}
                    className="text-navy underline"
                  >
                    {SITE.email}
                  </a>
                </p>
                <h2 className="mt-6 font-serif text-xl text-navy">Hours</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/70">
                  Monday to Saturday, 9am to 5pm
                  <br />
                  Sunday &amp; public holidays by appointment
                </p>
                <p className="mt-6">
                  <a
                    href={SITE.mapsUrl}
                    target="_blank"
                    rel="noopener"
                    className="text-[0.65rem] uppercase tracking-wide2 text-navy underline-offset-4 hover:text-gold hover:underline"
                  >
                    Open in Google Maps &rarr;
                  </a>
                </p>
              </div>
            </Reveal>
          </div>
          <Reveal delay={100}>
            <div className="light-card p-9">
              <h2 className="font-serif text-2xl text-navy">
                Send an enquiry
              </h2>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
