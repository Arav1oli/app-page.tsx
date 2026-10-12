# Flagship International — Website Design Handoff

**Site reviewed:** https://flagship-rbgmpisos-adrians-projects-4b9b1683.vercel.app
**Reviewed:** 11 October 2026, rendered headless at 1440×900 desktop and 390×844 mobile.
**Audience for this document:** the assistant continuing development of this site.

---

## 1. The design direction (read this first)

> **Understated luxury. Down to earth, but the finer things in life.**

Every decision below resolves against that line. In practice it means:

| Do | Do not |
| --- | --- |
| Let the photography carry the emotion | Add decorative UI that competes with it |
| Use gold sparingly, so it still means something | Fill every button with gold |
| Hairline rules, generous whitespace, quiet type | Heavy fills, drop shadows, rounded "app" chrome |
| Plain, confident language | Superlatives and sales pressure |
| One clear action per view | Three equal-weight buttons in a row |

The test for any element: **would it look at home in a Sotheby's or Christie's catalogue, or does it look like a SaaS dashboard?** Right now the site passes that test on its content pages and fails it on its buttons.

---

## 2. What is genuinely good — keep all of this

1. **The foundations are right.** Cormorant Garamond for headings over DM Sans for body is an excellent pairing for this brief. The navy / gold / warm-paper palette is correct for a Sydney brokerage. Do not change the typefaces or the core palette.

2. **The photography.** Full-bleed video hero, real vessels, strong imagery throughout. This is the single biggest asset the site has and it is being used well.

3. **The listing detail pages are the strongest part of the site.** Checked `/buy/nordhavn-68-3-cms-648`: 58 photographs, roughly 2,000 words, and a proper section structure — Overview, Photographs, Description, Specifications, Videos and virtual tours, Brochure and documents, named broker (Blayne Astley), Similar Vessels. A named broker with a contact form on the listing is exactly right. This is a real brokerage listing page, not a placeholder.

4. **The Overview spec block on the listing page** (Make / Year / Length overall / Cabins / Location / Status, set in a clean grid with hairline rules) is the best-designed component on the site. It is understated, it is scannable, and it is the template the rest of the site should follow. Note that it carries real detail such as "3 + a watch bunk in the Pilot House" rather than a rounded-off number.

5. **Information architecture.** Buy / Sell / New / Manage / About / Sold / News / Contact is the correct structure, the brand pages exist for all six marques, and there are location pages for Sydney, Gold Coast and Phuket.

6. **Technical health is sound.** No JavaScript errors, no layout-breaking overflow on mobile, `lang="en-AU"` set correctly, a real meta description, lazy loading on listing imagery, and genuine content depth.

---

## 3. What is wrong — prioritised

### P1. Gold is used as the default, so it has stopped meaning anything

This is the main thing holding the site back from "understated luxury".

**Measured:** 30 elements on the homepage alone have a solid gold `#CAB479` background. On the Nordhavn 68 listing page there are 9 solid gold blocks above the fold: 3 hero buttons plus a 6-pill jump-navigation row.

Every single one of these is a solid gold slab:
- both hero buttons
- the "View" button at the bottom of all 12 vessel and brand cards
- "View more brokerage yachts", "Explore all new yachts", "All brokerage yachts"
- "More filters", "Find yachts" **and** "Clear filters" (three gold buttons clustered together)
- the review carousel's back, forward **and Pause** controls
- the entire listing-page jump nav
- the newsletter "Submit"

The result is that a $4.75M vessel and a "Pause" button are given identical visual weight. Gold should be the mark of the single most important action on a page.

**Fix — introduce a three-tier button hierarchy:**

| Tier | Use | Style |
| --- | --- | --- |
| **Primary** (gold fill) | One per view. "Enquire about this yacht", "Request an appraisal" | Gold fill, navy text |
| **Secondary** | "View photographs", "Brochure" | 1px gold hairline border, transparent fill, gold text |
| **Tertiary** | Card "View", "Clear filters", carousel arrows, jump nav | Plain text link in navy or gold with underline on hover. No fill, no border |

**Specifically:**
- Card "View" buttons: delete the gold slab. Make the whole card a clickable surface, and leave a quiet navy text link with an arrow at the bottom. The photograph is the call to action.
- "Clear filters" and "Pause" must never look like primary actions. Plain text links.
- The listing-page jump nav should be quiet tabs: text in navy with a 2px gold underline on the active item only.

### P2. Section alignment is inconsistent: three different left margins on one page

**Measured H2 left edges on the homepage:**

```
128px   Brokerage yachts
128px   Find your next yacht
128px   New yachts
 28px   Client reviews          <-- out by 100px
 28px   From Flagship           <-- out by 100px
268px   Yacht news              <-- out by 140px
```

(The footer's "Flagship contact and office information" H2 is a visually-hidden screen-reader heading. That is correct practice and should stay.)

A consistent vertical edge is most of what makes a layout read as expensive. Three different visible margins reads as careless, and it is the sort of thing a client notices without being able to name it.

**Fix:** one shared container component with a single max-width and a single horizontal padding token, applied to every section without exception. Nothing opts out.

### P3. The brand logo wall is untidy

The six marque logos (Marex, Nordhavn, Numarine, Schaefer, Silver Yachts, Toy Marine) are each supplied at a different size, weight and treatment. Marex and Nordhavn carry their own backgrounds and metallic effects, Silver Yachts is a dim grey that nearly disappears against the navy, and the rendered heights vary from 52px to 74px.

**Fix:** use a single mono (all-white) version of each logo, optically balanced rather than mathematically equal in height, each in an identical padded container with the same clear space. If a mono version does not exist for a marque, request one from the shipyard. Also place the logo over the photograph rather than in a separate band above it, which currently creates a visible seam in each card.

### P4. Both hero buttons are identical, so there is no hierarchy

"Brokerage yachts" and "New yachts" sit side by side in identical gold. The eye has nowhere to go. On mobile they become two near-full-width gold slabs stacked against flat navy.

**Fix:** primary gold for the more commercially valuable path, hairline secondary for the other.

### P5. The H1 is a category label, not a statement

The homepage headline is "New & brokerage yachts". It is accurate and it is good for search, but it says nothing about Flagship, and emotionally it is inert. For "down to earth but the finer things in life" there is room for something with a point of view, with the SEO carried by the H2s and metadata below it.

**Fix:** write a headline about the client's experience, not the inventory category. Keep it plain and confident. Avoid any superlative. (See the Flagship copywriting standards: no "redefines", no "more than just a", no "ultimate", no long dash character, Australian English throughout.)

### P6. Mobile hero loses the cinema

On desktop the headline overlays the video, which looks expensive. On mobile the media is cropped to a short band and the headline drops onto flat navy underneath it, which looks like a template. The crop also cuts through the family in the shot.

**Fix:** keep the overlay treatment on mobile with a taller media area, roughly 70vh, and a gradient scrim for legibility. Use art direction so the mobile crop is a deliberate portrait framing rather than a centre-crop of the desktop asset.

### P7. Footer is badly balanced

The Contact column carries three full office addresses stacked vertically while Hours has two lines and Stay Connected has four icons, leaving a large empty area across the right half of the footer.

**Fix:** give the three offices their own row of three equal columns beneath a single "Offices" heading. Sydney, Gold Coast and Phuket are a genuine credibility asset and deserve equal, parallel presentation rather than being buried in one long column.

### P8. Smaller items

- **Missing alt text** on the hero poster image and on all six marque logos. Quick accessibility fix.
- **Listing gallery photos have no alt text at all.** The Nordhavn 68 page has 50 gallery images with empty alt. Generate it from the vessel data, e.g. `Nordhavn 68, photograph 3 of 50`. This matters for accessibility and for image search, which is a real traffic source for yacht listings.
- **26 of 92 tap targets on mobile are under 40px.** Bring interactive elements to a 44px minimum touch area.
- **Border radius of 10px** on buttons and cards is the most "default web app" value available. For this brief, either go sharp (0 to 2px) or go full pill (999px) and apply it consistently. 10px reads as generic.
- **Footer body text** is `#94A4B8` on navy at 14px, a contrast ratio of 4.77:1. It passes AA but only just. Lift it slightly.
- **The "BROKERAGE" badge appears on every card** inside a section already headed "Brokerage yachts". Repetition carrying no information. Drop it in that context and keep it only on mixed listings.
- **Price appears twice** on the listing page, in the hero and again at Overview. Keep the Overview one.
- **The floating chat bubble** overlaps card content on mobile. Give it a safe-area offset.

---

## 4. Design tokens as currently built

Recorded so they can be formalised rather than re-derived:

```
Navy (primary)     #19394D    rgb(25, 57, 77)
Gold (accent)      #CAB479    rgb(202, 180, 121)
Paper              #F7F5F0    rgb(247, 245, 240)
Mist               #E8E9E6    rgb(232, 233, 230)
Body text          #5B4930    rgb(91, 73, 48)   warm brown
Footer muted       #94A4B8

Headings   Cormorant Garamond 400/500, negative tracking (-0.02em)
Body       DM Sans 400/500, 16px, 1.4 line height
H1         74.88px desktop / 40.8px mobile
H2         38.88px
H3         20px

Button radius  10px
```

Two notes. First, body copy is a warm brown `#5B4930` while headings are navy. It reads warm and is legible at 8.6:1 on white, but confirm it is deliberate rather than inherited. Second, the brand's stated dark blue in the Flagship copywriting standards is `#06394F`, which is close to but not identical to the `#19394D` in use. Worth reconciling so print and digital match.

---

## 5. Suggested order of work

1. Button hierarchy across the whole site (P1). Biggest visual gain for the effort.
2. Single container component, fix the three visible margins (P2).
3. Card redesign: remove gold slabs, make the card clickable (P1).
4. Logo wall normalisation (P3).
5. Hero: button hierarchy, mobile overlay, new headline (P4, P5, P6).
6. Footer rebalance (P7).
7. Accessibility and polish pass (P8).

Nothing here requires re-architecting. It is a restraint pass, not a rebuild. The content layer is already strong, and that is the hard part.

---

## 6. Open questions for Adrian

1. **Is the Vercel build replacing flagshipinternational.com.au, or running alongside it?** That determines whether URL structure and redirects need to be preserved from the existing site.
2. **Is there a brand guideline document with the official gold and navy values?** The site uses `#19394D` and the copywriting standards specify `#06394F`. One should win.
3. **Do mono (all-white) logo files exist for the six marques,** or should they be requested from the shipyards?
4. **Should "New yachts" or "Brokerage" be the primary hero action?** This is a commercial decision, not a design one, and it sets the button hierarchy.
5. **Is the warm brown body text (`#5B4930`) intentional,** or should body copy be navy?
6. **Are broker headshots available?** The Nordhavn 68 listing names Blayne Astley. A photograph alongside the broker on every listing would materially strengthen the "down to earth" half of the brief.
7. **What is the vessel data source on this build,** and does it carry fields the design is not yet using (engine hours, survey status, tax status)? Those would enrich the Specifications block.
8. **Is Phuket a full third office** with the same service offering, or a representative presence? It affects how prominently it is presented.
