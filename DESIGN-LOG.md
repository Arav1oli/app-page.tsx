# Asado Works — Parrilla Design Log

Working record of the design, materials and costing decisions for the Asado Works
parrilla. Rev F, 3 September 2026.

**Live deliverables**

| What | Where |
|---|---|
| Plan builder (live drawings, 3D, cost calculator) | https://arav1oli.github.io/app-page.tsx/ |
| RFQ drawing pack (8 sheets) | https://arav1oli.github.io/app-page.tsx/spec.html |
| Publishing method (how to redeploy) | `asado/PUBLISHING.md` |

---

## 1. Reference product

Benchmarked against the **Tagwood BBQ03SI** Argentine Santa Maria grill, used as the
golden sample on the RFQ.

| Property | BBQ03SI |
|---|---|
| Envelope | 1684 × 508 × 1613 mm |
| Net weight | 124.7 kg |
| Main grilling area | 851 × 419 mm |
| Secondary area | 229 × 432 mm |
| Body | **Cold-rolled steel, 3.2 mm (1/8"), heat-resistant paint** |
| Food contact | 304 stainless (grates, griddle, hooks, shovel, poker) |
| Hearth | Firebrick bottom + side walls |
| Casters | 4 × 6" swivel, 2 locking |
| Retail | ~AUD 4,500–5,500 |

Model-code logic: **SI = painted steel body, SS = 304 stainless body**, identical
geometry. (The letter expansion is inferred — Tagwood don't publish it. The materials
are confirmed.)

Sources: [Tagwood AU](https://tagwoodbbq.com.au/products/tagwood-bbq-argentine-santa-maria-wood-fire-charcoal-grill-bbq03si),
[Family Hardware](https://www.familyhardware.com/tagwood/bbq03ss),
[Elite Patio Direct](https://elitepatiodirect.com/products/tagwood-bbq-argentine-santa-maria-wood-fire-charcoal-grill-bbq03si).

---

## 2. Locked geometry (Rev F)

Envelope **1450 W × 508 D × 1613 H** — narrower than Tagwood, deliberately: the whole
unit ducks under 1500 mm so it drops into an outdoor kitchen bench with the side bench
still fitted.

### Vertical datum chain (mm above floor)

| Datum | Height |
|---|---|
| Ground | 0 |
| Cart base / caster tops | 200 |
| Slat shelf | 290 |
| Hearth pan | 820 |
| Firebox floor | 870 |
| Grate travel | 950–1200 (250 travel) |
| Firebox rim | 1200 |
| Hanging rail | 1490 |
| Overall | **1613** |

Stack closes exactly: `200 + 620 + 50 + 330 + 413 = 1613`.

### Plan

- **Gantry posts at 275 and 1160** — clear span **850**, which *is* the deck width.
  The gantry frames the grate; it does not span the body.
- **RH shoulder 255** carries the lift gear and the side bench. This is the piece that
  was missing from early revisions and the reason the wheel and bench had nowhere to mount.
- **Brasero tower 250 × 420 × 500** at the LH end, **outboard of the gantry**, top at
  1370, with an ember throat feeding into the firebox at floor level.
- **Legs inboard at 150 / 1300**, body overhangs them.
- **Slat shelf bolted leg-to-leg** (not floating).
- Modular deck: **2 × 419 × 419 bays** either side of a 13 mm centre rail
  (2 × 419 + 13 = 851, landing exactly on the standard parrilla insert width).

---

## 3. Design decisions and why

### 3.1 Modular two-bay deck — the differentiator

The 851 × 419 deck splits into two 419 × 419 drop-in bays. Any module in any bay:
**two grates, or one grate + one plancha.** Hot-swappable by hand.

- Plancha priced **both ways**: 304 SS 5.0 mm and carbon steel 6.0 mm (¼" is the
  industry-standard plancha stock)
- Optional **second lift gear** for independent bay heights — quoted separately.
  With one crank both bays rise together.
- **This is 22% of build cost ($440 of $2,008 FOB) and the only real differentiator
  against Tagwood. Do not value-engineer it out.**

### 3.2 Hang rail — resolved at 1490

Was entered at 1000, which sits *below* the firebox rim (1200) and below the grate's
top travel: hooks would hang into the fire with nothing above the rim to hang from.
Set to **1490** — 290 above the rim, 123 below the crossbar. Chorizo on an S-hook hangs
into the fire zone; the rail itself does not.

### 3.3 Secondary grate widened 229 → 260

Caught during validation: at 229 the grate was **narrower than the 250 brasero cage
below it** and would have dropped into the bay. Now laps 5 mm each side. Griddle matched,
since it swaps into the same bay.

### 3.4 Bottom shelf — slatted, per the render

Corrected twice. It is the black **slatted** platform from the concept render (not a flat
shelf), and it is **bolted between all four legs** — an earlier revision had it floating,
connected to nothing.

### 3.5 Brasero — lift-out

Specced as a removable cage so it quotes as a separate part, becomes a sellable spare,
and can be lifted clear for cleaning. Shown popping out in the 3D view.

---

## 4. Finishes — four routes priced

### The temperature reality

**The firebrick liner is a thermal break.** Coals run 400–700 °C at the hearth; the
coloured outer panels sit behind brick and an air gap and run **80–150 °C**. The panels
being coloured never see the temperatures enamel is sold on.

> **Correction worth recording:** Weber's "1500 °F" is the **kiln the enamel is fired
> in**, not the service temperature. A Weber kettle runs 150–370 °C.

### Coated areas (exact, from GA-01)

| Element | Area |
|---|---|
| Outer casing, one face | 1.608 m² |
| Outer casing, both faces (enamel norm) | 3.216 m² |
| Cart frame | 1.425 m² |
| Firebox liner if 304 SS | 2.202 m² (26–35 kg) |

Enamel prices at **double the area** — a panel cannot be enamelled one side; it warps and
the back rusts.

### The four routes

| | Route | Who ships it | Temp | Batch 10 | Batch 50 | Life |
|---|---|---|---|---|---|---|
| **A** | **High-temp powder over galv** | Weber cart frames, Gozney stands | 250–550 °C | **$228** | **$209** | 20 yr+ |
| B | Ceramic bonded | Gozney Dome outer casing | to ~980 °C | $323 | $266 | ~5 yr |
| C | Porcelain enamel | Weber kettle bowls & lids | 500–600 °C | $582 | $444 | Indefinite if unchipped |
| D | Coastal 316 + powder | Tagwood BBQ03SS variant | 250–550 °C | $408 | $389 | Best in salt air |

**Reference: Tagwood BBQ03SI uses plain heat-resistant paint — below all four.**

### Why not enamel

1. **Geometry, not chemistry.** A Weber kettle is a deep-drawn single pressing: no welds,
   no corners, even wall. This is a folded box with welded corners — where enamel coverage
   thins and chips start.
2. **A chip has no defence.** Powder over galv self-protects at a scratch. An enamel chip
   is bare steel. This is a wheeled cart loaded with firewood.
3. **Different steel** — enamelling grade is decarburised low-carbon, not the specified
   3.2 CRS.
4. **Colour will not match powder** — different chemistry, gloss and metamerism.

### Why not follow Gozney

Gozney is a **sealed oven**: 304 stainless inner shell, ceramic fibre + calcium silicate
insulation, ceramic-bonded outer casing. That coating is sold on being **water-resistant
and UV stable**, not on temperature. Copying it means paying for heat performance this
product doesn't need, at ~5 yr life vs powder's 20 yr+, with a narrow colour range and an
extra supply-chain step.

**But steal the two things they got right:** a genuine insulating layer, and **UV
stability specified explicitly**. Powder coats chalk and fade under Australian UV long
before they fail thermally.

### 304 vs 316 marine

- 316's molybdenum buys **chloride/pitting resistance at moderate temperature**. At
  425–870 °C it is **not meaningfully better than 304** for oxidation.
- **Both** grades sensitise in the 425–850 °C band. A firebox sits in that window either way.
- 316 costs ~1.4–1.6× 304. On hot parts that is a premium for a property never used.
- **316 earns it on salty-but-cool parts:** cart, legs, bench, gantry, external fasteners
  → the **Coastal Edition** SKU.
- If a stainless firebox is ever required, the correct grades are **309/310**, not 316.
  With firebrick, neither is needed.

Sources: [Kloeckner](https://www.kloecknermetals.com/blog/304-stainless-steel-vs-316/),
[Marlin Steel](https://www.marlinwire.com/blog/what-is-the-temperature-range-for-304-stainless-steel-vs-316-vs-330),
[Weber enamel](https://consumer-care.weber.com/s/article/Handcrafted-Porcelain-Enamel-on-Lids-and-Bowls-1706747201754?language=en_US),
[Gozney Dome construction](https://help.gozney.com/hc/en-us/articles/4833034452241-What-is-the-Dome-made-of).

### Durability spend, ranked

1. **Thickness on the hearth pan** — 5 mm carbon, not thin stainless
2. **Firebrick / liner** — keeps fire off steel entirely
3. **Hot-dip galv under the powder** on the cart
4. **Weld quality + post-weld passivation**
5. Grade selection (304 hot / 316 salty-cool)

> Cheap builds fail at welds and prep, not at alloy grade.

---

## 5. Thermal strategy — the open-fire insight

**A parrilla is an open fire: the heat that matters leaves upward to the grate.** The side
walls only need to (a) not warp, (b) not cook the outer skin, (c) hold the coals in.
**There is no requirement to store thermal energy.**

Firebrick on the *walls* is a thermal-mass answer to what is actually an insulation
question. It's 35 kg, it forces square geometry, and it reads cheap.

### Fire-face materials — water exposure is the governing test

**This is an open-top firebox that lives outdoors and will be rained into.** Any porous or
hygroscopic material on the fire face absorbs water, then spalls when the trapped moisture
flashes to steam on the next fire. That rules out most stove-liner practice, which assumes
a dry indoor appliance.

**And the placement rule: insulation belongs sealed in the wall cavity, not on the fire
face.** Ooni and Gozney both encapsulate ceramic fibre between two skins so neither flame
nor rain ever reaches it.

| Material on fire face | Rating | Weight | Wet risk | Verdict |
|---|---|---|---|---|
| **304 SS wall skin, ribbed, air gap behind** *(recommended — walls)* | oxidation OK to 870 °C intermittent | ~8 kg | **none** | Non-porous, thin so geometry is free, heat-tints to patina. **Ooni Karu/Koda, Gozney inner shell** |
| **5 mm carbon plate** *(recommended — floor)* | unlimited w/ mass | ~20 kg | **none** | Coals sit and get raked here — needs mass and abrasion, not insulation. Oil-seasons, sheds water |
| Dense fireclay firebrick *(traditional)* | ~1300 °C | ~35 kg | low–med | Proven outdoors by thousands of pizza ovens and by Tagwood. Heavy, forces square geometry. Valid floor option |
| Cordierite stone | excellent thermal shock | ~14 kg | med | Gozney's floor choice (30 mm). Best thermal shock of the refractories, but still porous — soaked then fired hard can crack |
| Dense castable refractory | ~1400 °C | heavy | low–med | Moulds to any geometry; low-porosity grades handle weather. Heavy, slow to cure |
| ~~Vermiculite board~~ | ~1100 °C | ~10 kg | **FAILS** | **REJECTED.** Hygroscopic — absorbs water like a sponge, cracks when heated wet. Only viable sealed inside a dry indoor stove |

### Recommended stack — nothing porous exposed

- **Floor** — 5 mm carbon plate (or dense firebrick). Mass + abrasion where coals sit
- **Walls** — 304 SS skin, ribbed for stiffness, non-porous
- **Cavity** — ceramic fibre **sealed between inner and outer skin**, never exposed to fire
  or weather. The Ooni/Gozney arrangement
- **Drainage** — BOM item 10 water drain is **structural, not optional**. An open firebox
  must shed rain

**Result: ~85 kg vs 110 kg, geometry freed from square brick, zero water-absorbent
material anywhere on the fire face.**

Sources: [Ooni Karu](https://eu.ooni.com/products/ooni-karu),
[Gozney Dome construction](https://help.gozney.com/hc/en-us/articles/4833034452241-What-is-the-Dome-made-of).

### The moulded look without press tooling

Compound curves like the Gozney Dome need deep-draw tooling — dead at ten units. But
what reads as "moulded" is **large-radius corners, not compound curves.** A wide-radius
pressbrake tool or a roll-formed wrap gets it at near-zero tooling.

**Not viable:** polymer or sand-filled composites. Any plastic is gone by 200 °C.
Cast aluminium is the only truly mouldable route and only pays in the hundreds of units.

### One-piece folded wrap

Front + both ends off a single blank: **four corner welds become one seam.** Less welding,
less grinding, less distortion, no ash leaks at corners, and large-radius bends give the
moulded look. Back panel stays separate and **bolted** for service access to the lift gear
and ash system.

**Trade:** more nesting waste on one big blank, and it needs a pressbrake with the bed and
tonnage for 3.2 mm at 1450 — a supplier qualification question, not a cost one.

---

## 6. Cost model

**All figures are ballpark estimates, not quotes.** Areas and dimensions are exact per
GA-01; part prices are judgement. Replace with real quotes before any commitment.

### FOB build, batch 10 → $2,008 · Landed AU ex-GST → $2,383

| Line | AUD |
|---|---|
| Body carcass, folded + welded, 3.2 CRS | 230 |
| Firebrick liner set | 60 |
| Grill module ×2, 304 V-channel 419×419 | 190 |
| Secondary grate 304, 260×432 | 45 |
| Griddle 304 3.0 plate | 55 |
| Brasero cage 304, lift-out | 130 |
| Lift gear: wheel, spindle, chain, guides | 150 |
| Hanging rail + 4 S-hooks, 304 | 45 |
| Front door, CRS 3.2 | 50 |
| Water drain + ash management | 35 |
| Side bench 304 1.5 | 60 |
| Cart frame + slatted shelf | 150 |
| Casters ×4 Ø150, 2 locking | 60 |
| Tool set: shovel + poker | 40 |
| Plancha module 304 5.0 | 110 |
| Module carriage, 2-bay, 304 | 140 |
| Fasteners / hardware | 40 |
| Coating: HT powder sage + black over galv | 228 |
| Export crate | 70 |
| Assembly / QC / passivation | 120 |
| **FOB subtotal** | **2,008** |

Landed adds: sea freight LCL $260, duty $0 (ChAFTA China origin — **confirm tariff
classification with a customs broker**), insurance $25, port/customs/cartage $90.

### Volume sensitivity

| Qty | FOB | Landed | Note |
|---|---|---|---|
| 1 | $4,317 | $4,692 | Prototype — tooling + setup absorbed |
| 10 | $2,008 | $2,383 | Baseline |
| 50 | $1,727 | $2,102 | Tooling amortised |
| 200 | $1,566 | $1,941 | Tooling + material breaks |

### RRP positioning from landed $2,383

| Multiple | RRP inc GST | GM | Position |
|---|---|---|---|
| 2.0× | $5,240 | 50% | Thin / wholesale-led |
| 2.5× | $6,550 | 60% | Typical DTC premium hardware |
| 3.0× | $7,860 | 67% | Strong brand margin |

### Two findings

**Finding 1 — the maths does not close at batch 10.** Tagwood retails ~$4,500–5,500. At
batch 10, landed $2,383 supports only a **2.0× RRP of $5,240** — top of Tagwood's range,
on 50% GM, with no room for wholesale, discounting or returns. **Batch 50 is the realistic
first production run, not 10.** Take quotes at 1 / 10 / 50 / 200 — the shape of the curve
decides the business, not the unit price.

**Finding 2 — the modular deck is 22% of build cost** and the only real differentiator. If
cost must come out, take it from the carcass and cart first — or ship the base unit with
two grates and sell the plancha as a paid accessory.

### Excluded from the model

Tooling amortisation as a separate line, warranty/failure reserve, local warehousing,
**last-mile delivery** (significant at 110 kg — model it before setting RRP or offering
free freight), marketing, payment fees.

---

## 7. RFQ conditions (on BOM-03)

- Quote **1 prototype + batch 10 + batch 50**, EXW and FOB, Standard and XL (W +500)
- **Golden sample / quality benchmark: Tagwood BBQ03SI** — match or exceed build quality,
  welds and finish
- Modular deck: 2 × 419×419 bays, any module any bay. Configs: 2× grate / grate + plancha
- Plancha: price **both** 304 SS 5.0 and carbon steel 6.0 as a separate line item
- Option: second lift gear for independent bay height — quote separately
- **304 SS with mill certs. No 201/430 substitution. SS passivated after weld**
- **Body 3.2 CRS. No gauge reduction without written approval**
- Powder: high-temp rated, **UV-stable exterior grade**, colour per FN-04, coated sample
  plate before batch
- Salt-spray to **ASTM B117 — 500 h minimum**, good suppliers quote 1000 h
- Pre-ship: photos of every item + material thickness measurements at callout points
- Dims mm, tol ±2 U.N.O., drawings GA-01 / EX-02 govern
- Architecture per GA-01: gantry posts 275/1160 (clear span 850), brasero tower outboard
  LH, legs inboard 150/1300, slat shelf bolted leg-to-leg
- Also price: **(a)** powder over Zn-rich primer, **(b)** same over hot-dip galv,
  **(c)** porcelain enamel on the 4 body panels + door, **(d)** 316 Coastal delta
- For enamel: kiln envelope, fixture/tooling cost, MOQ, reject rate, lead time (8–12 weeks)
- For one-piece wrap: quote **4-panel welded vs single folded wrap**

---

## 8. Open items

| # | Item | Status |
|---|---|---|
| 1 | Grate / rod sections (items 3, 4) | For the fabricator to propose |
| 2 | Griddle plate thickness | TBC |
| 3 | Side bench final size | TBC (450 × 350 assumed) |
| 4 | Module carriage section | TBC |
| 5 | RAL match for Sage | Pick from real powder swatches, not screen colour |
| 6 | Welded vs part flat-pack | Changes freight class materially |
| 7 | SS wall skin + sealed cavity vs firebrick | **Measure outer skin temp AND run a rain-then-fire test on the prototype** |
| 8 | Brand guidelines PDF | Not yet supplied — apply once received |
| 9 | EX-02 exploded sheet | Still shows pre-Rev-F architecture; GA-01 governs |

---

## 9. Drawing pack contents

| Sheet | Content |
|---|---|
| GA-01 | General arrangement — front + side elevations, plan, datum chain |
| EX-02 | Exploded parts, balloons keyed to BOM |
| BOM-03 | 17-item bill of materials + RFQ conditions |
| FN-04 | Finish spec, colour + finish map by item |
| FN-06 | Finish strategy — 4 routes, cost, temperature, 304/316 |
| CS-07 | Indicative cost model |
| TH-08 | Thermal strategy & build method |
| REF-05 | Hero reference render (not for dimensions) |

---

## 10. Colour palette

| Name | Hex | Use |
|---|---|---|
| Sage | `#7C8468` | Body panels, door — high-temp powder |
| Bone | `#E4DFD2` | Alternate body colourway |
| Charcoal | `#26261F` | Cart, legs, slat shelf |
| Firebrick | `#C9A27A` | Hearth liner |
| 316 brushed | `#C4C8C9` | Coastal Edition exposed parts |

---

*Estimates in this document are for sizing and negotiation. Every price must be replaced
with a real quote before commitment.*
