# Cleaning up the HubSpot data

This guide is written for a broker, not a developer.

## Why this exists

The free version of HubSpot would not let us create dropdown lists. Every
important question on a contact record — budget, timeframe, state, what boat
they already own — was therefore a **free-text box**, and 29,339 people (and
staff) typed whatever they liked into it.

The result is that the same answer exists in dozens of spellings:

| What it should say | What is actually in the export |
| --- | --- |
| `$1m – $2m` | `$1m- $2m`, `$1m - $2 m`, `$1,000,000 - $2m` |
| Early–mid 2024 | `early - mid 2024`, `early- mid 2024`, `early-_mid_2024` |
| New South Wales | `nsw`, `NSW`, `new south wales`, `Sydney, NSW`, `USA NSW` |
| "I don't own a boat" | `none`, `no`, `nil`, `na`, `n/a`, `nothing`, `no boat` |

If we imported that as-is you could never filter, count, or report on anything.
`lib/normalize.ts` is the **cleaning layer** that turns all of it into a small
set of tidy values.

## The three promises

Everything the cleaner does obeys three rules:

1. **It never crashes.** Whatever is in the cell — blank, emoji, a phone number,
   nothing at all — it returns an answer rather than stopping the import.
2. **It never destroys anything.** Every result carries the original text
   alongside the cleaned value. If we later decide `th` means Thailand, the
   original `th` is still there to re-run.
3. **It never guesses.** If it cannot work out what a value means, it says so
   and reports it, instead of quietly filing the person in the wrong bucket.
   That's what the coverage report (below) is for.

---

## 1. Budget

**Turns free text into one of six buckets:**

`under_500k` · `500k_1m` · `1m_2m` · `2m_3m` · `3m_5m` · `5m_plus`

### How it decides

| The cell says | Becomes | Why |
| --- | --- | --- |
| `under $500k` (2,664 records) | `under_500k` | exact match |
| `$500k-$1m` (1,774) | `500k_1m` | exact match |
| `$1m- $2m` (910) | `1m_2m` | exact match |
| `$3m - $5m` (762) | `3m_5m` | exact match |
| `$2m - $3m` (396) | `2m_3m` | exact match |
| `$5m +` (331) | `5m_plus` | exact match |
| `under $500,000` (92) | `under_500k` | long-hand of the same thing |
| `$500,000 - $1m` (56) | `500k_1m` | long-hand of the same thing |
| `$1m - $2 m` (12) | `1m_2m` | stray space inside the number |
| `69950` | `under_500k` | bare number, bucketed by value |
| `420000` | `under_500k` | bare number, bucketed by value |
| `299000` | `under_500k` | bare number, bucketed by value |
| `early- mid 2024` | **nothing** | that's a date, not a budget — reported |

Spacing, `$`, commas, dashes and underscores are ignored when matching, so
`$1m-$2m`, `$1m - $2 m` and `$1M – $2M` are all the same answer and cost nothing
extra to support.

**Ranges are bucketed by their bottom end.** `$3m - $5m` goes in `3m_5m`, not
half in one bucket and half in another. `under $X` is bucketed just below X, and
`$X +` is bucketed at X.

### What it deliberately refuses

| The cell says | Result | Why |
| --- | --- | --- |
| `early- mid 2024`, `late 2024`, `June 2024` | null, reason *belongs to another field* | someone answered the timeframe question in the budget box |
| `2024` on its own | null, reason *belongs to another field* | a bare year is a date, not $2,024 |
| `2`, `500` (no `k`/`m`, under 1,000) | null, reason *too vague* | `2` could mean $2, $2,000 or $2m. Guessing would be inventing data |
| `n/a`, `tbc`, `poa`, `none`, `open` | null, reason *junk* | no information given |

### The bucket boundaries

| Bucket | From | Up to (not including) |
| --- | --- | --- |
| `under_500k` | $0 | $500,000 |
| `500k_1m` | $500,000 | $1,000,000 |
| `1m_2m` | $1,000,000 | $2,000,000 |
| `2m_3m` | $2,000,000 | $3,000,000 |
| `3m_5m` | $3,000,000 | $5,000,000 |
| `5m_plus` | $5,000,000 | — |

---

## 2. Timeframe

**Turns free text into one of five categories:**

`just_browsing` · `gathering_info` · `evaluating` · `ready_to_buy` ·
`period_specific`

When the answer names a time, it *also* returns the structured year and half of
the year, so you can sort and filter by it.

| The cell says | Becomes | Extra detail returned |
| --- | --- | --- |
| `just browsing for now` (887) | `just_browsing` | — |
| `late 2024` (350) | `period_specific` | year 2024, **H2** (Jul–Dec) |
| `early - mid 2024` (308) | `period_specific` | year 2024, **H1** (Jan–Jun) |
| `early- mid 2024` | `period_specific` | identical to the above |
| `early-_mid_2024` | `period_specific` | identical to the above |
| `2026 or after` (197) | `period_specific` | year 2026, "or after" |
| `starting to gather information` (168) | `gathering_info` | — |
| `2025 or after` (130) | `period_specific` | year 2025, "or after" |
| `evaluating and comparing models` (130) | `evaluating` | — |
| `6-12 months` | `period_specific` | 6–12 months away |
| `ready to buy`, `ASAP`, `immediately` | `ready_to_buy` | — |
| `buying stage?` (139) | **nothing** | see below |

**The three spellings problem is solved by design.** `early - mid 2024`,
`early- mid 2024` and `early-_mid_2024` are reduced to the same lookup key
before matching, so they produce byte-identical results. Any future spacing or
underscore variant is handled automatically.

**"early" and "mid" are both first-half**, so `early - mid 2024` is H1 2024.
"late", "end of", Q3 and Q4 are second-half.

### What it deliberately refuses

| The cell says | Result | Why |
| --- | --- | --- |
| `buying stage?` (139 records) | null, reason *belongs to another field* | this is the **name of the HubSpot question**, not somebody's answer. It got copied into the answer box. Turning it into a category would create 139 fake data points |
| `timeframe`, `time frame` | null, same reason | same problem |

---

## 3. State / Region

**Turns free text into:** `NSW` · `QLD` · `VIC` · `WA` · `SA` · `TAS` · `ACT` ·
`NT` · `NZ` · `INTL`

### ⚠ The important bit: boat shows are not states

**625 records have a boat show name in the state field.** Somebody was typing
"where did this lead come from", not "where do they live".

| The cell says | State | `metAtShow` |
| --- | --- | --- |
| `scib` (542 records) | **nothing** | `SCIBS` — Sanctuary Cove International Boat Show |
| `scibs` | **nothing** | `SCIBS` |
| `sibs` (83 records) | **nothing** | `SIBS` — Sydney International Boat Show |
| `sib` | **nothing** | `SIBS` |
| `sanctuary cove` | **nothing** | `SCIBS` |
| `sydney international boat show` | **nothing** | `SIBS` |

These come back with **no state at all** and the show name lifted into a
separate `metAtShow` field. SCIBS is held in Queensland and SIBS in Sydney, but
people fly in from everywhere — mapping the show to its host state would put
hundreds of people in a state they've never lived in.

### The state lookup table

| Becomes | Recognised spellings |
| --- | --- |
| `NSW` | nsw, n.s.w., new south wales, sydney, newcastle, wollongong, central coast, port macquarie, pittwater |
| `QLD` | qld, queensland, brisbane, gold coast, sunshine coast, cairns, townsville, mackay, hervey bay, whitsundays, airlie beach |
| `VIC` | vic, victoria, melbourne, geelong, mornington peninsula |
| `WA` | wa, western australia, perth, fremantle, mandurah, broome |
| `SA` | sa, south australia, adelaide |
| `TAS` | tas, tasmania, tassie, hobart, launceston |
| `ACT` | act, australian capital territory, canberra |
| `NT` | nt, northern territory, darwin |
| `NZ` | nz, new zealand, auckland, auckland region, wellington, christchurch, tauranga, bay of plenty, north island, south island, whangarei |
| `INTL` | usa, us, united states, america, florida, california, uk, united kingdom, england, scotland, ireland, singapore, hong kong, china, japan, korea, malaysia, indonesia, bali, philippines, vietnam, thailand, phuket, india, dubai, uae, canada, france, italy, spain, greece, turkey, germany, netherlands, monaco, south africa, fiji, papua new guinea, png, new caledonia, vanuatu, tahiti, international, overseas |

Capital letters, full stops and extra spaces don't matter.

### Values with two places in them

`Sydney, NSW` and `USA NSW` both contain more than one place. The cleaner scans
the whole cell and, because this is the *state* column, an Australian state wins
over a country. `USA NSW` becomes `NSW` **with a warning attached** saying that
the cell also mentioned the USA, so you can review those by hand.

### What it deliberately refuses

| The cell says | Result | Why |
| --- | --- | --- |
| `australia` (162 records) | no state, but country = AU | true, but it doesn't tell us which state |
| `th` (95 records) | null, reason *too vague* | this is either **Thailand** or a two-letter typo/truncation. Guessing Thailand would move 95 contacts to the wrong continent. **Someone at Flagship needs to decide what `th` meant, then add one line to the table.** |
| `ni` | null, reason *too vague* | Northern Ireland, or a mistyped NT/NZ |

> **`sa` is read as South Australia, not South Africa**, and **`wa` as Western
> Australia, not Washington** — this is an Australian brokerage. South Africa
> and Washington are spelt out in full to be picked up as `INTL`.

---

## 4. Currently owns

This column is 9,308 values and most of them are junk. It returns **two**
things: a simple yes/no/unknown, and the boat's name if one was given.

| The cell says | Owns a boat? | Boat recorded |
| --- | --- | --- |
| `,  ` (1,650 records — a literal comma) | **unknown** | — |
| `none` (1,182) | **no** | — |
| `no` (305) | **no** | — |
| `nil` (259) | **no** | — |
| `na` (162) | **no** | — |
| `yes` (144) | **yes** | — (they said yes but not what) |
| `riviera` (98) | **yes** | `riviera` |
| `n/a` (78) | **no** | — |
| `nothing` (73) | **no** | — |
| `no boat` (56) | **no** | — |
| `tinny` (40) | **yes** | `tinny` |
| `yes - Riviera 43` | **yes** | `Riviera 43` |
| `M/Y SEA WOLF` | **yes** | `M/Y SEA WOLF` |
| blank, `?`, `unknown` | **unknown** | — |

### The full "no" list

`no`, `none`, `nil`, `na`, `n/a`, `nothing`, `no boat`, `no boats`, `no vessel`,
`no yacht`, `not yet`, `none yet`, `none at present`, `none currently`,
`no current boat`, `no current vessel`, `don't own`, `do not own`, `dont own`,
`never owned`, `first boat`, `first time buyer`, `first time`, `nope`,
`negative`, `not currently`, `not an owner`

### The full "yes, unspecified" list

`yes`, `y`, `yes i do`, `i do`, `currently own`, `own a boat`, `own one`,
`have a boat`, `own`, `owner`, `boat owner`

**Anything else is treated as a real boat** and kept exactly as typed —
including its capital letters. `M/Y SEA WOLF` stays `M/Y SEA WOLF`; it is not
"tidied" into `M/y Sea Wolf`.

**Important distinction:** `,  ` and `n/a`-style junk mean *"we don't know"*
(unknown), while `none` and `no` mean *"we asked and they said no"* (a real
answer). Those are different facts and the CRM keeps them apart.

---

## 5. Boat type

This is the one field HubSpot got right — the six values are already consistent,
so this mapping just fixes capitals and spacing.

| The cell says | Becomes |
| --- | --- |
| Sports Cruiser | `sports_cruiser` |
| Flybridge Cruiser | `flybridge_cruiser` |
| Sailing Yacht | `sailing_yacht` |
| Full Displacement | `full_displacement` |
| Semi Displacement | `semi_displacement` |
| Superyacht | `superyacht` |

Shorthands that are also accepted: `sport cruiser`, `flybridge`, `fly bridge`,
`sail`, `sailing`, `sailboat`, `yacht`, `semi-displacement`, `super yacht`.

If a cell holds two types (`Sports Cruiser;Flybridge Cruiser`), both are kept.

`displacement` on its own is **refused** — it could be full or semi, and there
is no way to tell.

---

## 6. Staff records

Any email address ending in **`@flagshipinternational.com.au`** is a Flagship
mailbox, not a customer. These should not appear in lead counts, conversion
rates or marketing lists.

The check is case-insensitive and copes with extra spaces, a name in front
(`Angela <angela@flagshipinternational.com.au>`) and subdomains
(`sales@mail.flagshipinternational.com.au`).

Look-alike domains are **not** treated as internal:
`someone@notflagshipinternational.com.au` and
`someone@flagshipinternational.com` (no `.au`) are both external.

---

## How to run the coverage report

This is the tool that tells you **what the cleaner still can't read**, so you
can fix it. It only reads your file — it writes nothing to the CRM.

Put your HubSpot export somewhere you can find it, then in a Terminal window, in
the project folder:

```
npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/normalize-report.ts ./hubspot-contacts.csv
```

You don't have to rename your columns. The report finds the budget, timeframe,
state, currently-owns and boat-type columns by their headings.

### Options

| Flag | What it does |
| --- | --- |
| `--top 50` | Show 50 unrecognised values per field instead of 20 |
| `--field state` | Only report on one field (repeat the flag for several) |
| `--map "Q3 Budget"=budget` | Use this when a column heading is so unusual the report misses it |
| `--delimiter ";"` | Force the column separator if your file uses semicolons |
| `--out unmapped.csv` | Also save every unrecognised value + count to a spreadsheet |
| `--json` | Print the raw data instead of the readable report (for developers) |

### What the report tells you

For each field you get:

```
BUDGET   (column: Budget)

  Rows ................. 29,339
  Filled in ............ 7,759    26.4% of rows
  Normalised cleanly ... 7,612    98.1% of filled  ███████████████████████·
  Fell back to null .... 147      1.9% of filled

  Why the nulls happened:
    NOT IN THE LOOKUP TABLES                 88
    too vague to bucket                      14
    value belongs to another field           31
    junk / placeholder                       14

  Where the clean values landed:
    under_500k             2,759   ███████···········
    500k_1m                1,830   █████·············
    ...

  TOP 20 UNRECOGNISED VALUES  (34 distinct, 102 records) — ADD THESE TO THE TABLES:
      1.     31 x  "around a million"
      2.     18 x  "depends on the boat"
      ...
```

Read it like this:

- **Normalised cleanly** — these people can now be filtered and counted.
- **Fell back to null** — nothing was invented for these. They're waiting on you.
- **Why the nulls happened** — the only line that needs your attention is
  **NOT IN THE LOOKUP TABLES**. The others are already understood:
  - *junk / placeholder* — the cell said `n/a`. Nothing to fix.
  - *value belongs to another field* — a date in the budget box, a boat show in
    the state box. Already handled correctly.
  - *too vague to bucket* — genuinely can't be resolved without a human decision.
- **TOP UNRECOGNISED VALUES** — this is your to-do list.

You also get three summary sections at the end:

- **Lifted out of the wrong field** — how many boat shows were pulled out of the
  state column, and how many people gave a country but no state.
- **Boat ownership** — how many own / don't own / unknown.
- **Internal records** — how many `@flagshipinternational.com.au` staff
  mailboxes are sitting in your contact list.

---

## How to act on the report

The unrecognised list is a to-do list, and it gets shorter every time you work
through it.

1. **Run the report.** Look at the TOP UNRECOGNISED VALUES for each field.
2. **Read down the list.** Most entries will be obvious to a broker even if they
   mean nothing to a computer — you'll know that `around a million` is the
   `1m_2m` bucket.
3. **Send the list to whoever maintains the CRM**, with what each value should
   become. Each one is a single line added to a table in `lib/normalize.ts`:

   | Field | Table to add to |
   | --- | --- |
   | Budget | `BUDGET_ALIASES` |
   | Timeframe | `TIMEFRAME_ALIASES` |
   | State / Region | `REGION_ALIASES` (or `BOAT_SHOW_ALIASES` for a show) |
   | Currently owns | `OWNS_NEGATIONS` / `OWNS_AFFIRMATIONS` |
   | Boat type | `BOAT_TYPE_ALIASES` |

4. **Re-run the report.** The values you fixed disappear from the list, and the
   "Normalised cleanly" percentage goes up.
5. **Repeat until what's left is genuinely unreadable.** You will never reach
   100% — some cells really do just say `asdfgh` — and that's fine. The point is
   that you can *see* exactly what's left, rather than having it silently filed
   somewhere wrong.

### Decisions only a person can make

A few values are being held back on purpose, waiting on a human:

| Value | Records | The question |
| --- | --- | --- |
| `th` (state) | 95 | Is this Thailand, or a truncated entry? |
| `australia` (state) | 162 | We know the country but not the state — is that good enough, or should these be chased up? |
| `buying stage?` (timeframe) | 139 | The question text was saved as the answer. These people have effectively no timeframe on record |
| `early- mid 2024` (budget) | 1+ | Timeframe answers in the budget box — should they be moved to the timeframe field? |
| Bare numbers under 1,000 (budget) | — | Does `2` mean $2, $2,000 or $2m? |

Once a decision is made, each of these is a one-line change and a re-run.
