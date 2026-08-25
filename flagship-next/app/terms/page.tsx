import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Website Terms & Privacy",
};

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title={
          <>
            Website Terms <em>&amp; Privacy</em>
          </>
        }
      />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl space-y-6 leading-relaxed text-ink/75">
          <p>
            The authoritative Website Terms and Privacy Policy for Flagship
            International are published at{" "}
            <a
              href={`${SITE.liveSite}/terms-and-privacy`}
              className="text-navy underline underline-offset-4 hover:text-gold"
            >
              flagshipinternational.com.au/terms-and-privacy
            </a>
            .
          </p>
          <p>
            Listing information on this site is supplied by vendors and
            third-party feeds and is offered in good faith; it does not form
            part of any contract. Specifications should be verified by survey
            and inspection.
          </p>
          <p>
            For privacy enquiries, contact{" "}
            <a href={`mailto:${SITE.email}`} className="text-navy underline">
              {SITE.email}
            </a>
            .
          </p>
        </div>
      </section>
    </>
  );
}
