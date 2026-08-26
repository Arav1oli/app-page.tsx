"use client";

import { useEffect, useState, useCallback } from "react";

/**
 * YachtHub serves a listing's photos as .../<index>_<size>.jpg, so the primary
 * image URL tells us where the rest of the set lives. We probe the candidate
 * indices and keep whichever actually load, which means a listing with twelve
 * photos shows twelve and a listing with one shows one.
 */
function candidatesFrom(primary: string, max = 14): string[] {
  const m = primary.match(/^(.*\/)(\d+)_(\d+)(\.[a-z]+)$/i);
  if (!m) return [primary];
  const [, dir, , size, ext] = m;
  return Array.from({ length: max }, (_, i) => `${dir}${i}_${size}${ext}`);
}

export default function VesselGallery({
  primary,
  alt,
}: {
  primary: string;
  alt: string;
}) {
  const [available, setAvailable] = useState<string[]>(primary ? [primary] : []);
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!primary) return;
    let cancelled = false;
    const candidates = candidatesFrom(primary);
    Promise.all(
      candidates.map(
        (src) =>
          new Promise<string | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => resolve(null);
            img.src = src;
          }),
      ),
    ).then((results) => {
      if (cancelled) return;
      const ok = results.filter((s): s is string => !!s);
      if (ok.length) setAvailable(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [primary]);

  const step = useCallback(
    (dir: number) =>
      setActive((i) => (i + dir + available.length) % available.length),
    [available.length],
  );

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, step]);

  if (!available.length) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-navy/5 font-serif italic text-navy/40">
        Photography available on request
      </div>
    );
  }

  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl bg-navy/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={available[active]}
          alt={`${alt} — photo ${active + 1} of ${available.length}`}
          className="aspect-[16/10] w-full cursor-zoom-in object-cover"
          onClick={() => setZoom(true)}
        />
        {available.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => step(-1)}
              className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-abyss/60 text-lg text-champagne opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-abyss/80"
            >
              &#8249;
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => step(1)}
              className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-abyss/60 text-lg text-champagne opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-abyss/80"
            >
              &#8250;
            </button>
            <span className="absolute bottom-4 right-4 rounded-full bg-abyss/70 px-3 py-1 text-[0.62rem] uppercase tracking-wide2 text-champagne backdrop-blur">
              {active + 1} / {available.length}
            </span>
          </>
        )}
      </div>

      {available.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-3 sm:grid-cols-7">
          {available.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              className={`overflow-hidden rounded-lg border-2 transition ${
                i === active
                  ? "border-gold"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-abyss/95 p-6"
          onClick={() => setZoom(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${alt} photo viewer`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={available[active]}
            alt={alt}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="Close viewer"
            onClick={() => setZoom(false)}
            className="absolute right-6 top-6 text-3xl text-champagne hover:text-gold"
          >
            &times;
          </button>
          {available.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-6 text-4xl text-champagne hover:text-gold"
              >
                &#8249;
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-6 text-4xl text-champagne hover:text-gold"
              >
                &#8250;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
