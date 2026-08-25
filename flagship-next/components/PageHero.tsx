/** Shared dark hero band for inner pages. */
export default function PageHero({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: React.ReactNode;
  lede?: string;
}) {
  return (
    <section className="dark-sec bg-gradient-to-b from-abyss to-navy px-6 pb-20 pt-36 text-center">
      <span className="eyebrow">{eyebrow}</span>
      <h1 className="h-serif mx-auto mt-4 max-w-3xl text-4xl md:text-5xl">
        {title}
      </h1>
      {lede && (
        <p className="mx-auto mt-6 max-w-2xl text-[0.98rem] leading-relaxed text-champagne/75">
          {lede}
        </p>
      )}
    </section>
  );
}
