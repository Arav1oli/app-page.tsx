import { href, SITE } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="dark-sec bg-abyss text-champagne/80">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <a href={href("/")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/assets/logo.png`}
              alt="Flagship International Yacht Brokers"
              className="h-16 w-auto"
            />
          </a>
          <p className="mt-5 text-sm leading-relaxed">
            Sydney&rsquo;s leading new &amp; pre-owned boat broker based at Rose
            Bay &amp; Point Piper Marinas.
          </p>
        </div>
        <div>
          <h3 className="eyebrow mb-5">Contact</h3>
          <ul className="space-y-4 text-sm leading-relaxed">
            <li>
              <span className="block text-[0.6rem] uppercase tracking-wide2 text-mist">
                Phone
              </span>
              <a href={SITE.phoneSydneyHref} className="hover:text-gold-bright">
                {SITE.phoneSydney}
              </a>
            </li>
            <li>
              <span className="block text-[0.6rem] uppercase tracking-wide2 text-mist">
                Email
              </span>
              <a
                href={`mailto:${SITE.email}`}
                className="hover:text-gold-bright"
              >
                {SITE.email}
              </a>
            </li>
            <li>
              <span className="block text-[0.6rem] uppercase tracking-wide2 text-mist">
                Head Office
              </span>
              {SITE.headOffice}
            </li>
            <li>
              <span className="block text-[0.6rem] uppercase tracking-wide2 text-mist">
                QLD Office
              </span>
              {SITE.qldOffice}
              <br />
              Ph:{" "}
              <a href={SITE.phoneQldHref} className="hover:text-gold-bright">
                {SITE.phoneQld}
              </a>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-5">Explore</h3>
          <ul className="space-y-2.5 text-sm">
            {[
              ["Yachts for Sale", "/buy"],
              ["Sell Your Yacht", "/sell"],
              ["New Yacht Builds", "/new"],
              ["Yacht Management", "/yacht-management"],
              ["Yacht Buyer's Agent", "/about/yacht-buyers-agent"],
              ["Recently Sold", "/yachts-sold"],
              ["News", "/news"],
              ["Contact", "/contact"],
            ].map(([label, path]) => (
              <li key={path}>
                <a href={href(path)} className="hover:text-gold-bright">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-5">Hours</h3>
          <ul className="space-y-4 text-sm">
            <li>
              <span className="block text-[0.6rem] uppercase tracking-wide2 text-mist">
                Monday &ndash; Saturday
              </span>
              9am to 5pm
            </li>
            <li>
              <span className="block text-[0.6rem] uppercase tracking-wide2 text-mist">
                Sunday &amp; Public Holiday
              </span>
              By Appointment
            </li>
          </ul>
          <div className="mt-7 flex gap-4">
            <a
              href={SITE.facebook}
              target="_blank"
              rel="noopener"
              className="text-sm uppercase tracking-wide2 hover:text-gold-bright"
            >
              Facebook
            </a>
            <a
              href={SITE.instagram}
              target="_blank"
              rel="noopener"
              className="text-sm uppercase tracking-wide2 hover:text-gold-bright"
            >
              Instagram
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-center text-xs text-mist">
        <p>
          &copy; {new Date().getFullYear()} Flagship International Yacht
          Brokers &middot;{" "}
          <a href={href("/terms")} className="hover:text-gold-bright">
            Website Terms &amp; Privacy
          </a>
        </p>
      </div>
    </footer>
  );
}
