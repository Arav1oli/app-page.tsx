# Flagship International — Next.js site

Headless rebuild of flagshipinternational.com.au in Next.js (App Router) +
Tailwind CSS. Every page is statically generated from the live vessel feed.

## Structure

- `app/` — routes: home, buy (search console), yachts/[slug] (130+ vessel
  detail pages), sell, new + new/[brand] (6 dealerships), yacht-management,
  about, about/meet-the-team, about/yacht-buyers-agent, yachts-sold, news,
  contact, terms
- `lib/fleet.ts` — vessel data layer: fetches and parses the live XML feed,
  falls back to `data/fleet-snapshot.json` (130 vessels) when unreachable
- `lib/site.ts` — contact details, brand roster, link helper
- `components/` — Nav, Footer, FleetSearch, VesselCard, SMS widget, forms
- Forms (contact, appraisal, vessel enquiry, newsletter, SMS chat) POST JSON
  to the same n8n webhook the live site uses, each tagged with a `type`.

## Vessel feed

Set `YACHT_FEED_URL` to the live XML export (YachtHub) in the build
environment. The parser accepts the common YachtHub export shapes; verify
field mapping against the real feed on first connected build. With the env
var unset or the feed down, the bundled snapshot keeps the site building.
Data refreshes on every build/deploy (ISR revalidate 3600 when served
dynamically).

## Builds

- `npm run build` — production build (no basePath; deploy anywhere)
- `npm run build:staging` — static export with `.html` links and the
  `/Arav1oli/app-page.tsx/claude/web-design-q1l9go/flagship-staging` base
  path, for serving via raw.githack from the repo. Copy `out/` to
  `../flagship-staging/` and push.

## Later phases (not built yet, architecture allows)

- Back-end GUI/admin (listings + content editing)
- Client login portal: reporting, LMS, marketing activity — add an `(auth)`
  route group backed by the existing prisma/next-auth stack at the repo root
