# Bangkok Street Food Ranking

Author: Claude Code (driving the pipeline directly, not via OpenClaw)
Date: 14 May 2026
Branch: claude/bangkok-street-food-ranking-XYzxi
Method: discovery agent (1) plus per-candidate research agents (8) in parallel, with cross-check and rubric application in the main thread.

## Pipeline run summary

- Discovery agent produced a 20-vendor longlist filtered for Thai-local patronage.
- 8 candidates shortlisted across Yaowarat, Bang Rak, Sam Yan, Ekkamai, Pratunam, Phrom Phong.
- Each per-candidate agent capped at 8 tool calls per the brief.
- Total agent count: 9. Aggregate token usage roughly 280k input plus output tokens across subagents (well inside the ~$5 budget cap at general-purpose subagent rates).

## Known data limitations

These constraints apply equally to every candidate and were not resolvable from the tools available:

1. Wongnai, Pantip, Ryoii Review and most Thai-language photo-hosting pages returned HTTP 403 to WebFetch. Thai-language review quotes below are sourced from page titles and rich-snippet text surfaced by WebSearch, not full-page fetches, except where explicitly noted otherwise.
2. Google Maps page bodies also returned 403 in most cases. Several Google rating and review-count values are taken from third-party aggregators (Trip.com, Tripadvisor, Restaurant Guru, Foursquare) and labelled as proxy where they are not the live Google figure.
3. Condiment counts from on-table photos could not be verified for most candidates because the photo-hosting pages blocked WebFetch. Where the count cannot be confirmed, the candidate is flagged [condiment-data-incomplete] and the rubric uses a conservative floor of 4 (equivalent of two condiments, the realistic minimum for any Thai noodle or rice stall).

## Scoring rubric (out of 10)

| Component | Weight | Method |
|-----------|--------|--------|
| Google rating | 25% | rating x 2 |
| Google review volume | 15% | log-scaled: 100=4, 1000=7, 5000+=10 |
| Verified Thai-local positive review ratio | 30% | strong=10, moderate=7, weak=4 |
| Condiment density score | 20% | 1=2, 2=4, 3=6, 4=8, 5+=10 (floor of 4 where data incomplete) |
| Signature dish consensus (cross-source) | 10% | strong=10, weak=4 |

## Ranked top 5 (revised after image-audit pass)

| Rank | Location | Score | Signature dish | Condiments | Google star (n) |
|------|----------|-------|----------------|------------|-----------------|
| 1 | Rung Rueang Pork Noodle (Sukhumvit Soi 26) | 9.7 | Tom yum pork noodles | 6 (textual, reaffirmed prose-only in audit) | 4.6 proxy (Trip.com, 6,410 visitors on Foursquare) |
| =2 | Jok Prince (Charoen Krung, Bang Rak) | 9.4 [prose-only upgrade] | Charcoal-wok jok (pork and century egg) | 5 (aggregated prose, low confidence) | ~4.0 proxy [count incomplete] |
| =2 | Prachak Pet Yang (Charoen Krung, Bang Rak) | 9.4 [prose-only upgrade] | Roast duck on rice or egg noodle | 5 (aggregated prose, low confidence) | [rating incomplete], multi-source |
| 4 | Wattana Panich (Ekkamai Soi 18) | 8.8 | Neua tune (50-year perpetual beef stew) | 3 (textual, reaffirmed prose-only in audit) | 4.2 (4,584) |
| 5 | Jek Pui Curry Rice (Yaowarat) | 8.1 | Khao gaeng (curries over rice) | [condiment-data-incomplete, floor 4 used; format quirk confirmed] | 4.4 (~1,546 proxy) |

Below the cut: Nai Ek Roll Noodle 7.9, Go Ang Pratunam 7.8, Jeh O Chula 7.4. These three were not put through the image-audit pass because they were already below the cut. Go Ang is penalised by the condiment rubric because khao man gai relies on a single iconic house sauce. Jeh O is penalised on Thai-local verification strength (moderate, not strong) because individual reviewer profiles could not be opened to confirm long-term Thai residency.

### Pre-audit ranking (kept for transparency)

| Rank | Location | Score |
|------|----------|-------|
| 1 | Rung Rueang Pork Noodle | 9.7 |
| 2 | Wattana Panich | 8.8 |
| 3 | Jok Prince | 8.6 |
| 4 | Prachak Pet Yang | 8.6 |
| 5 | Jek Pui Curry Rice | 8.1 |

The audit upgraded Jok Prince and Prachak Pet Yang from 3 to 5 confirmed condiment vessels each, lifting both from 8.6 to 9.4 and reordering positions 2 through 4. Wattana Panich and Rung Rueang scores are unchanged.

## Per-location detail

### 1. Rung Rueang Pork Noodle, 9.7 of 10

- Address: Sukhumvit Soi 26, Khlong Tan, Khlong Toei, Bangkok 10110 (near Phrom Phong BTS, multiple adjacent shops from family split)
- Google Maps: https://www.google.com/maps/search/?api=1&query=Rung+Rueang+Pork+Noodle+Sukhumvit+26
- Best video review: https://www.youtube.com/watch?v=Jqz2Ijutcj8 (English presenter; a Thai-presenter dedicated video was not located within the per-candidate cap, Facebook channel facebook.com/RungRueangtung26 is the closest Thai-language source)
- Thai-local review highlight (translated): "If you order the dry tom yum noodles (lime recipe), they add chilli powder roasted in-house every two weeks plus ground roasted peanuts." Source: https://www.wongnai.com/restaurants/rungrueangnoodle
- Condiments observed on table (from textual sources): house-roasted chilli powder, ground roasted peanuts, fresh lime, fish sauce, sugar, pickled chilli vinegar
- Cross-check notes: Bib Gourmand 7 years running (since 2018). Three Thai-language sources corroborate the condiment profile, which is unusually rich for the rubric. Live Google rating and review-count not retrievable within tool cap (Wongnai, Ryoii, Tripadvisor 403); Trip.com aggregate 4.6 and Foursquare 6,410 visitor count used as proxy. Score-sensitivity: if Google rating turned out to be 4.2 instead of 4.6, composite would drop to about 9.5, still rank 1.

### =2. Jok Prince, 9.4 of 10 [prose-only upgrade]

- Address: 1391 Thanon Charoen Krung, Khwaeng Silom, Bang Rak, Bangkok 10500 (opposite Robinson Bang Rak, next to Prince Theatre)
- Google Maps: https://www.google.com/maps/place/Jok+Prince/@13.7208546,100.5162286,15z/data=!4m2!3m1!1s0x0:0xa7904c168b6f6d83
- Best video review: https://www.youtube.com/watch?v=oRaFGHkRlsQ (English presenter; a dedicated Thai-presenter Thai-language video was not located within the per-candidate cap)
- Thai-local review highlight (translated): "Minced pork comes in large chunks, well-marinated, paired with the slightly burnt-pot aroma of the congee, very tasty, 65 baht flat, great value." Source: https://pantip.com/topic/41744948
- Condiments observed on table (post-audit, prose-only, low confidence): white pepper, soy sauce, chilli vinegar / vinegared chilli slices, chilli flakes, salt. Aggregated across search snippets from Johor Kaki, Daniel Food Diary, Ranting Panda and Streets of Food. Lists vary by source. Not photo-verified. Score upgraded from 8.6 to 9.4 on this basis with low-confidence flag.
- Cross-check notes: Michelin Bib Gourmand 5 to 6 consecutive years. Three Thai sources (Ryoii Review, Pantip, TrueID) corroborate the charcoal-wok burnt-aroma method as the signature. Live Google rating could not be scraped; search snippet only states "4-star".

### =2. Prachak Pet Yang, 9.4 of 10 [prose-only upgrade]

- Address: 1415 Thanon Charoen Krung, Khwaeng Silom, Bang Rak, Bangkok 10500 (opposite Robinson Bang Rak)
- Google Maps: https://www.google.com/maps/search/?api=1&query=Prachak+Pet+Yang+1415+Charoen+Krung+Bang+Rak+Bangkok
- Best video review: https://www.youtube.com/watch?v=87yCsT4bB_o (Thai presenter)
- Thai-local review highlight (translated): "Big clean roadside shop selling roast duck, red pork, dumplings, wontons, with both egg noodles and rice. A place dad would take us for special occasions." Source: https://pantip.com/topic/41754777
- Condiments observed on table (post-audit, prose-only, low confidence): chilli dipping sauce, soy vinegar, chilli flakes, green chillies, plum sauce. Plus pickled ginger and cucumber as garnish (not counted as condiment vessels). Aggregated across search snippets from Eating Thai Food, Johor Kaki, Chow Traveller and Coconuts Bangkok. Not photo-verified. Score upgraded from 8.6 to 9.4 on this basis with low-confidence flag.
- Cross-check notes: Founded 1909, fourth or fifth generation. "Over 110 years old" claim confirmed (about 117 years in 2026). Direct Google rating and review-count not scraped (Google Maps, Wongnai, Pantip, The Standard all returned 403). Three independent Thai-language sources confirm both the signature dish and the family-occasion local patronage frame.

### 4. Wattana Panich, 8.8 of 10

- Address: 336-338 Ekkamai Soi 18 (Sukhumvit 63), Khlong Tan Nuea, Watthana, Bangkok 10110
- Google Maps: https://www.google.com/maps/place/Wattana+Panich/
- Best video review: https://www.youtube.com/watch?v=ZhJwPorC56E (Thai presenter, Chef Nan review)
- Thai-local review highlight (translated): "The dark broth has been seriously simmered for a long time, with a clear aroma of Chinese herbs, and every piece of beef is tender and easy to chew." Source: https://www.wongnai.com/restaurants/wattanapanich
- Condiments observed on table (post-audit, prose-only): prik nam som (pickled green chilli in vinegar), nam pla with chilli (fish sauce), prik pon (dried chilli flakes). Audit reaffirmed the 3-vessel list via a Falstaff snippet quoting "Garnishes on the table side such as pickled green chilli, fish sauce and chilli flakes". Not photo-verified, so [condiment-data-incomplete] retained.
- Cross-check notes: this is the strongest candidate on verifiable Google data (4.2 rating across 4,584 reviews). Perpetual stew confirmed at roughly 50 years across MGR Online, Eating Thai Food and Daniel Food Diary. Three independent Thai-language sources corroborate Thai-local patronage. Michelin Bib Gourmand 2018 listing referenced.

### 5. Jek Pui Curry Rice, 8.1 of 10

- Address: 25 Mangkon Road, Pom Prap Sattru Phai, Bangkok 10100 (alley next to Wat Mangkon / Wat Leng Noei Yi, Yaowarat)
- Google Maps: https://www.google.com/maps/place/Jek+Pui+Curry+Rice/@13.7437524,100.5090193,15z/data=!4m2!3m1!1s0x0:0x851947ae4360e5a3
- Best video review: https://www.tiktok.com/@tid_review/video/7228559862194572545 (Thai presenter)
- Thai-local review highlight (translated): "Inviting you to Jek Pui curry rice (Je Chia), a Yaowarat favourite for more than 3 generations." Source: https://pantip.com/topic/42274338
- Condiments observed (post-audit, prose-only): The Smart Local snippet describes a roving condiment tray carrying chilli flake plus crispy Chinese sausage, and "chilli-laden soy sauce" in jars on spare red stools. Format is communal, not per-table. Vessel count likely 3 or more but not photo-verified, so [condiment-data-incomplete] retained and the rubric floor of 4 still applies.
- Cross-check notes: Google rating 4.4 across approximately 1,546 reviews (Restaurant Guru proxy of Google data). Three Thai-language sources (Wongnai twice, Pantip once) corroborate the "musical chairs curry" framing and the third-generation Thai-Chinese ownership. Strong Thai-local verification but the no-table format means the condiment rubric cannot fairly apply and the score is therefore conservative.

## Below the cut (ranks 6 to 8)

### 6. Nai Ek Roll Noodle, 7.9 of 10
Yaowarat Soi 9, kuay jab nam sai. Bib Gourmand. Thai-local verification strong via Wongnai and Pantip. Google rating roughly 4.0 from search snippets (not directly fetched). Condiment count [condiment-data-incomplete]. Google Maps: https://www.google.com/maps/place/Nai+Ek+Roll+Noodle/@13.7401105,100.5077482,17z

### 7. Go Ang Pratunam, 7.8 of 10
Pratunam, khao man gai Hainanese style. Bib Gourmand multiple years. Thai-local verification strong. Penalised by the condiment rubric because khao man gai relies on a single iconic house sauce (chilli, ginger, fermented soybean, dark soy, vinegar) rather than the usual quad of vessels. If the rubric were modified to weight signature sauce quality instead of vessel count, score would rise to roughly 8.5. Google Maps: https://www.google.com/maps/place/Go-Ang/@13.7495889,100.539911,17z

### 8. Jeh O Chula, 7.4 of 10
Sam Yan, tom yum mama. Bib Gourmand. Thai-local verification moderate, not strong, because individual reviewer profiles could not be opened to confirm long-term Thai residency despite the platforms themselves being Thai-only. Direct Google rating and review-count not retrievable (Google Maps 403); Tripadvisor proxy 4.2. Google Maps: https://www.google.com/maps/place/Jeh+O+Chula/@13.7424395,100.5202955,17z

## Image-audit attempt log

A second pass spawned 5 dedicated subagents, one per top-5 location, with the brief of finding photo-bearing pages (food blogs, Tripadvisor traveller photos, Michelin Guide, Reddit r/Bangkok) and extracting condiment vessel counts from photo captions, alt text, or descriptive prose adjacent to the photos.

Outcome: no photo-verified counts were obtained. The same 403 blanket that blocked Wongnai and Pantip on the first pass also blocked every photo-bearing English-language source the agents tried: Daniel Food Diary, Eating Thai Food, Coconuts Bangkok, Johor Kaki, Tripadvisor, The Smart Local, Mitzie Mee, Streetside Bangkok, Ranting Panda, Hazel Diary, Atlas Obscura, Frommer's, Time Out Bangkok and most Blogger / Blogspot hosts. WebFetch returns HTTP 403 across the board, which is a feature of the runtime environment, not the individual sites.

What the agents did salvage came from WebSearch result snippets (which extract some on-page text without rendering the full page). That gave prose-only mentions of condiments, not photo captions or alt text.

| Location | Pre-audit count | Post-audit count | Evidence quality |
|----------|-----------------|------------------|------------------|
| Rung Rueang | 6 textual | 6 (reaffirmed) | Low, prose only |
| Jok Prince | 3 textual | 5 prose-aggregated | Low, lists disagree by source |
| Prachak Pet Yang | 3 textual | 5 prose-aggregated | Low, multiple sources roughly agree |
| Wattana Panich | 3 textual | 3 (reaffirmed) | Low, single snippet match |
| Jek Pui Curry Rice | Incomplete | Format quirk confirmed (communal roving tray plus chilli soy sauce jars on spare stools), exact count still unverified | Low, prose only |

Per user direction, the Jok Prince and Prachak Pet Yang upgrades are applied with explicit [prose-only upgrade] flags. Rung Rueang and Wattana Panich scores are unchanged because the audit produced no new evidence beyond what was already in their pre-audit blocks. Jek Pui stays at the floor of 4 because the no-table format means the standard vessel-count rubric does not fit cleanly.

## Recommended follow-up

The highest-leverage fixes remain:

1. Direct Google Maps API access (or a browser-capable scraper) for live Google ratings and review counts on Jok Prince, Prachak Pet Yang, Jeh O Chula, Rung Rueang and Nai Ek Roll Noodle.
2. A real photo audit (image vision, not text extraction) of on-table condiment vessels for the top 5. Would either confirm or retract the prose-only upgrades currently flagged on Jok Prince and Prachak Pet Yang.
3. A rubric tweak for stalls that do not have communal table-side condiment vessels (Jek Pui, Go Ang) so they are not penalised by a rubric that does not fit their format.

None of those are available within the WebSearch / WebFetch toolset on this run.
