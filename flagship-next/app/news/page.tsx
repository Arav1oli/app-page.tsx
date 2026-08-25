import type { Metadata } from "next";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import NewsletterForm from "@/components/NewsletterForm";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "News",
  description:
    "News and articles from Flagship International: new listings, model arrivals, boat shows and market updates.",
};

export default function NewsPage() {
  return (
    <>
      <PageHero
        eyebrow="News"
        title={
          <>
            Latest from <em>Flagship</em>
          </>
        }
        lede="New listings, model arrivals, boat shows and market updates from the Flagship team."
      />
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <p className="leading-relaxed text-ink/75">
              Articles are published on the Flagship blog and syndicated to
              this site. Read the latest at{" "}
              <a
                href={`${SITE.liveSite}/blog`}
                className="text-navy underline underline-offset-4 hover:text-gold"
              >
                flagshipinternational.com.au/blog
              </a>
              , or join the newsletter below and we&rsquo;ll bring the news to
              you.
            </p>
          </Reveal>
          <Reveal delay={100}>
            <div className="mx-auto mt-12 max-w-xl text-left">
              <h2 className="h-serif text-2xl">Join the newsletter</h2>
              <div className="mt-5">
                <NewsletterForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
