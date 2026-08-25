import Reveal from "@/components/Reveal";
import VesselCard from "@/components/VesselCard";
import NewsletterForm from "@/components/NewsletterForm";
import { getFleet, featured, formatPrice, vesselSlug } from "@/lib/fleet";
import { BRANDS, href, SITE } from "@/lib/site";
import reviews from "@/data/reviews-seed.json";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export default async function Home() {
  const { vessels } = await getFleet();
  const marquee = featured(vessels, 1)[0];
  const grid = featured(vessels, 7).slice(1);

  return (
    <>
      {/* HERO */}
      <section className="dark-sec relative flex min-h-[92vh] items-end overflow-hidden bg-abyss">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={`${BASE}/assets/poster.jpg`}
          className="absolute inset-0 h-full w-full object-cover opacity-70"
        >
          <source src={`${BASE}/assets/hero.mp4`} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-t from-abyss via-abyss/30 to-abyss/60" />
        <div className="relative mx-auto w-full max-w-7xl px-6 pb-24 pt-44">
          <span className="eyebrow">
            Rose Bay &middot; Point Piper &middot; Gold Coast
          </span>
          <h1 className="h-serif mt-4 text-5xl md:text-7xl">
            Welcome to <em>Flagship</em>
          </h1>
          <div className="mt-7 h-px w-28 bg-gold" />
          <p className="mt-7 max-w-xl text-lg text-champagne/85">
            Promoting trust &amp; integrity for yacht buyers and sellers alike.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a className="btn-gold" href={href("/buy")}>
              Yachts for Sale
            </a>
            <a className="btn-hair" href={href("/sell")}>
              Sell with Us
            </a>
          </div>
          <form
            action={href("/buy")}
            method="get"
            aria-label="Quick yacht search"
            className="mt-9 flex max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-abyss/55 backdrop-blur-md sm:flex-row sm:items-stretch sm:rounded-full"
          >
            <select
              name="condition"
              aria-label="New or pre-owned"
              className="flex-1 cursor-pointer appearance-none bg-transparent px-6 py-4 text-sm text-champagne outline-none [&>option]:text-abyss"
            >
              <option value="">All Vessels</option>
              <option value="1">Pre-Owned</option>
              <option value="2">New</option>
            </select>
            <span className="mx-5 h-px bg-white/15 sm:mx-0 sm:my-3 sm:h-auto sm:w-px" />
            <select
              name="length"
              aria-label="Length"
              className="flex-1 cursor-pointer appearance-none bg-transparent px-6 py-4 text-sm text-champagne outline-none [&>option]:text-abyss"
            >
              <option value="">Any Length</option>
              <option>0 - 10m</option>
              <option>10 - 15m</option>
              <option>15m +</option>
            </select>
            <span className="mx-5 h-px bg-white/15 sm:mx-0 sm:my-3 sm:h-auto sm:w-px" />
            <select
              name="price"
              aria-label="Price"
              className="flex-1 cursor-pointer appearance-none bg-transparent px-6 py-4 text-sm text-champagne outline-none [&>option]:text-abyss"
            >
              <option value="">Any Price</option>
              <option>$POA - $100,000</option>
              <option>$100,000 - $200,000</option>
              <option>$200,000 - $500,000</option>
              <option>$500,000 - $1,000,000</option>
              <option>$1,000,000 +</option>
            </select>
            <button
              type="submit"
              className="bg-gradient-to-br from-gold-bright to-gold px-9 py-4 text-[0.68rem] uppercase tracking-wide2 text-abyss transition hover:brightness-105"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      {/* STATEMENT + STATS */}
      <section className="bg-paper px-6 py-24 md:py-32">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <p className="h-serif max-w-4xl text-3xl md:text-5xl">
              Sydney&rsquo;s leading new &amp; pre-owned boat broker, based at{" "}
              <em>Rose Bay</em> &amp; <em>Point Piper</em> Marinas.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-14 flex flex-wrap gap-x-16 gap-y-6 border-t border-navy/10 pt-9">
              {[
                ["Head Office", "Rose Bay Marina"],
                ["Sydney Harbour", "Point Piper Marina"],
                ["Queensland", "Gold Coast City Marina"],
              ].map(([k, v]) => (
                <div key={k}>
                  <span className="block text-[0.6rem] uppercase tracking-wide2 text-ink/50">
                    {k}
                  </span>
                  <span className="font-serif text-xl text-navy">{v}</span>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-12 grid grid-cols-2 gap-7 border-t border-navy/10 pt-10 md:grid-cols-4">
              {[
                [`${vessels.length}+`, "Vessels Listed"],
                ["6", "New-Build Dealerships"],
                ["3", "Marina Locations"],
                ["5.0★", "Google Rating"],
              ].map(([n, l]) => (
                <div key={l}>
                  <span className="block font-serif text-4xl text-navy md:text-5xl">
                    {n}
                  </span>
                  <span className="mt-2 block text-[0.6rem] uppercase tracking-wide2 text-ink/55">
                    {l}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FEATURED FLEET */}
      <section className="bg-white/40 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow">Brokerage</span>
                <h2 className="h-serif mt-3 text-4xl">Yachts For Sale</h2>
                <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-ink/70">
                  A selection from the fleet currently listed with Flagship.
                  Every listing is drawn live from our vessel feed.
                </p>
              </div>
              <a
                className="text-[0.65rem] uppercase tracking-wide2 text-navy underline-offset-4 hover:text-gold hover:underline"
                href={href("/buy")}
              >
                View All &rarr;
              </a>
            </div>
          </Reveal>
          {marquee && (
            <Reveal delay={80}>
              <article className="light-card mt-12 overflow-hidden lg:grid lg:grid-cols-[1.5fr_1fr]">
                <a
                  href={href(`/yachts/${vesselSlug(marquee)}`)}
                  className="block aspect-[16/9] lg:aspect-auto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={marquee.img}
                    alt={marquee.t}
                    className="h-full w-full object-cover"
                  />
                </a>
                <div className="flex flex-col justify-center gap-6 p-10">
                  <div>
                    <h3 className="font-serif text-3xl text-navy">
                      {marquee.t}
                    </h3>
                    <p className="mt-2 font-serif text-xl italic text-gold">
                      {formatPrice(marquee)}
                    </p>
                  </div>
                  <div className="flex gap-8 border-t border-navy/10 pt-6 text-[0.62rem] uppercase tracking-wide2 text-ink/60">
                    <span>
                      Year
                      <b className="block text-base normal-case text-navy">
                        {marquee.y}
                      </b>
                    </span>
                    <span>
                      Length
                      <b className="block text-base normal-case text-navy">
                        {marquee.l}m
                      </b>
                    </span>
                    {marquee.cb > 0 && (
                      <span>
                        Cabins
                        <b className="block text-base normal-case text-navy">
                          {marquee.cb}
                        </b>
                      </span>
                    )}
                  </div>
                  <a
                    className="btn-navy self-start"
                    href={href(`/yachts/${vesselSlug(marquee)}`)}
                  >
                    View Vessel
                  </a>
                </div>
              </article>
            </Reveal>
          )}
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((v, i) => (
              <Reveal key={`${v.r}-${v.ad}`} delay={(i % 3) * 90}>
                <VesselCard v={v} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* NEW BUILDS */}
      <section className="dark-sec bg-abyss px-6 py-24 md:py-28">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow">Dealerships</span>
                <h2 className="h-serif mt-3 text-4xl">New Yacht Builds</h2>
                <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-champagne/70">
                  Flagship is the official Australasian dealer for six
                  international shipyards. Explore current stock or begin a new
                  build tailored to your requirements.
                </p>
              </div>
              <a
                className="text-[0.65rem] uppercase tracking-wide2 text-champagne underline-offset-4 hover:text-gold-bright hover:underline"
                href={href("/new")}
              >
                All Brands &rarr;
              </a>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BRANDS.map((b, i) => (
              <Reveal key={b.slug} delay={(i % 3) * 90}>
                <a
                  href={href(`/new/${b.slug}`)}
                  className="group block overflow-hidden rounded-2xl border border-white/10"
                >
                  <div className="aspect-[16/10] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`${BASE}${b.img}`}
                      alt={b.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex items-center justify-between p-5">
                    <span className="font-serif text-xl text-champagne transition-colors group-hover:text-gold-bright">
                      {b.name}
                    </span>
                    <span className="text-gold-bright">&rarr;</span>
                  </div>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SELL */}
      <section className="dark-sec bg-navy px-6 py-24 md:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2">
          <Reveal>
            <span className="eyebrow">List Your Vessel</span>
            <h2 className="h-serif mt-3 text-4xl md:text-5xl">
              Discover the <em>Flagship</em> Difference
            </h2>
            <p className="mt-6 max-w-lg leading-relaxed text-champagne/75">
              We take great pride in consistently delivering top-notch results
              in all our endeavours. In the realm of yacht sales, this means
              executing precise marketing strategies and pinpointing qualified
              buyers.
            </p>
            <a className="btn-gold mt-9 inline-flex" href={href("/sell")}>
              Sell Your Yacht
            </a>
          </Reveal>
          <Reveal delay={140}>
            <div className="rounded-2xl border border-white/10 p-9">
              <span className="text-[0.62rem] uppercase tracking-wide2 text-gold">
                Why List With Flagship
              </span>
              <ul className="mt-6 space-y-4 text-[0.95rem] leading-relaxed text-champagne/80">
                <li>
                  Official Australasian dealer for Nordhavn, Numarine,
                  Schaefer, Silver Yachts, Marex and Toy Marine
                </li>
                <li>
                  Berths at Rose Bay and Point Piper Marinas, plus Gold Coast
                  City Marina
                </li>
                <li>
                  Marketed across YachtHub, boatsales, boats.com and YachtWorld
                </li>
                <li>A connected international network of qualified buyers</li>
              </ul>
              <a
                href={href("/about")}
                className="mt-7 inline-block text-[0.65rem] uppercase tracking-wide2 text-gold-bright underline-offset-4 hover:underline"
              >
                About the brokerage &rarr;
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* TEAM */}
      <section className="bg-paper px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.4fr_auto]">
          <Reveal>
            <span className="eyebrow">Your Brokers</span>
            <h2 className="h-serif mt-3 text-4xl">
              Guided by people who <em>know these waters</em>
            </h2>
            <p className="mt-5 max-w-xl leading-relaxed text-ink/70">
              From first inspection to survey, sea trial and final handover, a
              dedicated Flagship broker at Rose Bay, Point Piper or the Gold
              Coast walks every step with you.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="flex flex-col gap-4">
              <a className="btn-gold" href={href("/about/meet-the-team")}>
                Meet the Team
              </a>
              <a className="btn-navy" href={href("/about/yacht-buyers-agent")}>
                Yacht Buyer&rsquo;s Agent
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="dark-sec bg-abyss px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <span className="eyebrow">Client Reviews</span>
                <h2 className="h-serif mt-3 text-4xl">What Our Clients Say</h2>
              </div>
              <div className="text-right">
                <p className="font-serif text-4xl text-gold-bright">
                  5.0 <span className="text-2xl">★★★★★</span>
                </p>
                <a
                  href={SITE.mapsUrl}
                  target="_blank"
                  rel="noopener"
                  className="mt-1 inline-block text-[0.65rem] uppercase tracking-wide2 text-champagne/70 hover:text-gold-bright"
                >
                  Read our Google reviews &rarr;
                </a>
              </div>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {(reviews as { name: string; meta: string; text: string }[])
              .slice(0, 6)
              .map((r, i) => (
                <Reveal key={r.name} delay={(i % 3) * 90}>
                  <blockquote className="h-full rounded-2xl border border-white/10 p-7">
                    <p className="text-sm leading-relaxed text-champagne/80">
                      &ldquo;{r.text}&rdquo;
                    </p>
                    <footer className="mt-5 flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold-bright to-gold font-serif text-lg text-abyss">
                        {r.name.charAt(0)}
                      </span>
                      <span>
                        <b className="block text-sm font-normal text-champagne">
                          {r.name}
                        </b>
                        <span className="text-xs text-mist">{r.meta}</span>
                      </span>
                    </footer>
                  </blockquote>
                </Reveal>
              ))}
          </div>
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="bg-paper px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <span className="eyebrow">Newsletter</span>
            <h2 className="h-serif mt-3 text-4xl">Join Us</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-ink/70">
              Keep updated with the newest deals, charters, promotions &amp;
              boat shows across Australasia.
            </p>
            <div className="mt-8">
              <NewsletterForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="dark-sec bg-abyss px-6 py-28 text-center">
        <Reveal>
          <span className="eyebrow">Flagship International Yacht Brokers</span>
          <h2 className="h-serif mx-auto mt-4 max-w-3xl text-4xl md:text-5xl">
            Experience the <em>Flagship difference</em> and sell with us.
          </h2>
          <a className="btn-gold mt-10 inline-flex" href={href("/contact")}>
            Contact Us Today
          </a>
        </Reveal>
      </section>
    </>
  );
}
