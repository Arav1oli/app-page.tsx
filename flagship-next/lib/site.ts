/** Site-wide constants and the link helper used by every internal link. */

export const SITE = {
  name: "Flagship International Yacht Brokers",
  phoneSydney: "(02) 9188 5250",
  phoneSydneyHref: "tel:0291885250",
  phoneQld: "07 5618 8887",
  phoneQldHref: "tel:0756188887",
  email: "marley@flagshipinternational.com.au",
  headOffice:
    "Rose Bay Marina, Suite 1/594 New South Head Road, Rose Bay NSW 2029",
  qldOffice:
    "Gold Coast City Marina, H65/76-84 Waterway Dr, Coomera QLD 4209",
  liveSite: "https://flagshipinternational.com.au",
  facebook: "https://www.facebook.com/Flagship.Int",
  instagram: "https://www.instagram.com/flagship.international/",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Flagship+International+Yacht+Brokers+Rose+Bay+Marina",
  /** n8n webhook shared with the live site's SMS widget. */
  webhook:
    "https://adrianravasio2.app.n8n.cloud/webhook/8021e55c-73d1-495d-bf64-b5168597c741",
};

export const BRANDS = [
  {
    slug: "nordhavn",
    name: "Nordhavn",
    blurb:
      "Ocean-crossing trawler yachts built for long-range passagemaking, from the 41 through to the 120.",
    img: "/assets/br-nordhavn.jpg",
  },
  {
    slug: "numarine",
    name: "Numarine",
    blurb:
      "Turkish-built explorer yachts from 22 to 47 metres, engineered for extended cruising with substantial volume.",
    img: "/assets/br-numarine.jpg",
  },
  {
    slug: "schaefer",
    name: "Schaefer Yachts",
    blurb:
      "Brazilian sport yachts and cruisers from 30 to 77 feet, combining open entertaining decks with practical layouts.",
    img: "/assets/br-schaefer.jpg",
  },
  {
    slug: "silver-yachts",
    name: "Silver Yachts",
    blurb:
      "Aluminium superyachts and the SpaceCat catamaran series, including the 85-metre BOLD.",
    img: "/assets/br-silver.jpg",
  },
  {
    slug: "marex",
    name: "Marex",
    blurb:
      "Norwegian-built cruisers renowned for smart cockpit design and all-weather usability, 31 to 44 feet.",
    img: "/assets/br-marex.jpg",
  },
  {
    slug: "toy-marine",
    name: "Toy Marine",
    blurb:
      "Italian-built modern classics from 36 to 72 feet with distinctive Ligurian styling.",
    img: "/assets/br-toymarine.jpg",
  },
] as const;

export type BrandSlug = (typeof BRANDS)[number]["slug"];

/**
 * Internal link helper. Staging exports are served from a plain file host
 * that cannot rewrite /buy to /buy.html, so when NEXT_PUBLIC_HTML_LINKS=1
 * every internal href gets an explicit .html suffix.
 */
export function href(path: string): string {
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (process.env.NEXT_PUBLIC_HTML_LINKS !== "1") return `${base}${path}`;
  if (path === "/") return `${base}/index.html`;
  const [p, hashOrQuery] = splitTail(path);
  return `${base}${p}.html${hashOrQuery}`;
}

function splitTail(path: string): [string, string] {
  const m = path.match(/^([^?#]+)([?#].*)?$/);
  return [m ? m[1] : path, m && m[2] ? m[2] : ""];
}
