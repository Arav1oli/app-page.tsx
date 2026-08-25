import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Yacht Management",
  description:
    "Yacht management through Flagship International: maintenance coordination, presentation and vessel care for owners at Rose Bay, Point Piper and the Gold Coast.",
};

const SERVICES: [string, string][] = [
  [
    "Maintenance coordination",
    "Scheduled servicing and preventative maintenance arranged with trusted trades, with works documented so your service history supports a future sale.",
  ],
  [
    "Presentation & detailing",
    "Regular wash-downs, detailing and interior care so the vessel is always ready to board.",
  ],
  [
    "Vessel checks",
    "Routine onboard checks covering systems, lines, fenders and shore power, with any issues reported to you promptly.",
  ],
  [
    "Berthing & logistics",
    "Assistance with berthing arrangements, relocations, fuel and provisioning ahead of your time on the water.",
  ],
  [
    "Preparation for sale",
    "When the time comes to sell, a managed vessel with documented care commands stronger buyer confidence. Your manager and broker work as one team.",
  ],
];

export default function YachtManagementPage() {
  return (
    <>
      <PageHero
        eyebrow="Yacht Management"
        title={
          <>
            Your yacht, <em>kept ready</em>
          </>
        }
        lede="Management programmes for owners at Rose Bay, Point Piper and Gold Coast City Marinas, tailored to how you actually use your boat."
      />
      <section className="px-6 py-20">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2">
          <div>
            <Reveal>
              <h2 className="h-serif text-3xl">What management can include</h2>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/70">
                Every programme is scoped to the vessel and the owner. Speak
                with our team about the level of care that suits yours.
              </p>
            </Reveal>
            <div className="mt-9 space-y-7">
              {SERVICES.map(([title, body], i) => (
                <Reveal key={title} delay={i * 70}>
                  <div className="border-l-2 border-gold pl-6">
                    <h3 className="font-serif text-xl text-navy">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink/70">
                      {body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
          <Reveal delay={120}>
            <div className="light-card p-9">
              <h2 className="font-serif text-2xl text-navy">
                Discuss a management programme
              </h2>
              <p className="mt-2 text-sm text-ink/65">
                Tell us about your vessel, where it is berthed and how you use
                it. We&rsquo;ll come back with a proposed scope.
              </p>
              <div className="mt-6">
                <ContactForm subject="Yacht management enquiry" />
              </div>
              <p className="mt-6 border-t border-navy/10 pt-5 text-sm text-ink/65">
                Or call{" "}
                <a href={SITE.phoneSydneyHref} className="text-navy underline">
                  {SITE.phoneSydney}
                </a>{" "}
                (Sydney) or{" "}
                <a href={SITE.phoneQldHref} className="text-navy underline">
                  {SITE.phoneQld}
                </a>{" "}
                (Gold Coast).
              </p>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
