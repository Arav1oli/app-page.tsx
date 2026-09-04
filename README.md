# Asado Works

Premium Argentine parrilla / Santa Maria crank grill. This branch is the published project site.

**Live:** https://arav1oli.github.io/app-page.tsx/

## What is here

| File | Serves | What it is |
|---|---|---|
| `index.html` | `/` | Project home. Status, cost summary, open decisions, next actions, known gaps. |
| `builder.html` | `/builder.html` | Interactive plan builder. Editable dimensions, live 2D redraw, 3D model, landed-cost calculator. |
| `spec.html` | `/spec.html` | The nine-sheet fabrication drawing pack. What a supplier quotes from. |
| `rfq.pdf` | `/rfq.pdf` | Same nine sheets as one PDF, for emailing to suppliers. |
| `DESIGN-LOG.md` | `/DESIGN-LOG.md` | Decision record. Every choice, why, and what was rejected. |

## Status

**Rev G — proposed. Not released for tooling.** Five prototype tests are still outstanding, and
GA-01 and EX-02 have not yet been redrawn to the Rev G monocoque.

## Costing

The cost model is rebased on a real supplier quote (Toshine TSPC01L, offer V41) rather than a
built-up estimate. Everything our specification adds over their catalogue baseline is still an
estimate. FX, duty, GST, the import processing charge and a contingency are all adjustable in
the builder. See section 11 of the design log for what is checked against a source and what is
still a guess.

## Notes

This lives on the `gh-pages` branch of a repository named for something else because repository
creation is not available to this integration. The site content is self-contained; nothing here
depends on the rest of the repository.
