# Changelog

## 0.1.20 — 2026-04-20
- **Base soundtrack volume dropped** from 0.45 → 0.25 so empty-feed regions feel genuinely quiet. Peak remains 0.90 when AI posts are in view — swell is now more pronounced.
- **Added 12 major AI industry figures.** Sam Altman → tulip baron, Jensen Huang → pitchfork baron, Elon Musk → bramble king, Dario Amodei → careful pruner, Demis Hassabis → head botanist, Mark Zuckerberg → communal gardener, Sundar Pichai → head arborist, Yann LeCun → garden skeptic, Geoffrey Hinton → orchard elder, Aravind Srinivas → ivy planter, Andrew Ng → gardening professor, Mustafa Suleyman → wandering plantsman.
- **Reverted Franglish for French-keyed entries.** Earlier we pointed all 45 French AI terms at English garden vocab (user-directed absurdity). Now reverted: `IA → jardinage`, `modèle → sachet de graines`, `IA souveraine → jardinage souverain`, `grâce à l'IA → grâce à jardinage`, etc. Sentences that are clearly French stay in French (with strict A still in effect — no leading articles). English-keyed proper nouns (Claude, Anthropic, Sam Altman, etc.) keep their English garden replacements.

## 0.1.19 — 2026-04-20
- **Soundtrack swells when AI posts are in viewport.** Audio still plays always-on when the user enables it, but its volume now scales with how many transformed posts are currently visible. Base volume 0.45, peak 0.90 at 4+ visible posts, smoothed over 500ms so fast scrolls don't cause audible pops. Implementation: single shared `IntersectionObserver` at 30% visibility threshold; each post is observed when it gets `data-ai-holiday-transformed`. Conceptually: the garden is audible *because* of the transformed content — more garden on screen = more garden in your ears.

## 0.1.17 — 2026-04-20
- **Garden soundtrack.** Bundled `audio/garden.mp3` — a CC0 back-garden bird-ambience recording from Internet Archive, ~1.6 MB. Playback is off by default. Users can toggle via (a) the popup's "Play garden soundtrack 🔊" checkbox or (b) a small floating speaker button in the bottom-right of LinkedIn pages (44px moss-green circle). Button shows 🔇 muted / 🔊 playing. State persists via `chrome.storage.sync`. Volume fixed at 35% so it doesn't overpower the page. Audio is looped. Respects Chrome's autoplay policy — first play requires clicking the toggle, which counts as user interaction.

## 0.1.16 — 2026-04-20
- **Abandoned selector-based post detection.** Diagnostic logs revealed LinkedIn now hashes all class names (e.g. `._88a4b558`, `d489e4ee`) and strips `data-urn` from the ancestor chain within 20 levels. Every LinkedIn extension relying on `.feed-shared-update-v2` or `[data-urn]` is stale. Switched to a structural heuristic: walk up from the replaced text, accept the first ancestor whose bounding box falls in post-shape range (height 180–2000px, width ≤ 900px). Resilient to future class obfuscation.
- Removed `POST_SELECTORS`, `looksLikePost`, and ancestor-chain debug logging (served its purpose).

## 0.1.10 — 2026-04-19
- **Hotfix.** `injectStyles()` was referencing an undefined `INDICATOR_CLASS` constant (left over from pre-inline-sprout code I removed in 0.1.4). That threw a ReferenceError at init and killed the entire content script — no text replacement, no image swap, no storage listener = toggles did nothing. Dropped the dead CSS rule.

## 0.1.9 — 2026-04-19
- **Post images swap for garden photos when the post had AI vocab replaced.** Bundled 8 curated photos from Wikimedia Commons (mix of potagers + lush gardens) at `extension/images/garden-1..8.jpg`, ~130 KB each. In-content script marks a post as transformed when any of its text nodes had a replacement, then swaps every `<img>` inside that post (≥180px on either side — filters out avatars and UI icons) to one of the bundled photos. Deterministic: same post always gets the same image, via a hash of its `data-urn` / `data-id` / first 80 chars of text. Clears `srcset` and `sizes` so the browser doesn't re-fetch LinkedIn's original at different breakpoints.
- Unsplash was the plan, but their CDN blocks anonymous fetches from automated clients, so sources moved to Wikimedia Commons. All CC-BY/CC-BY-SA, attribution in `extension/images/ATTRIBUTIONS.md`. Re-run `extension/images/_fetch.py` to regenerate.

## 0.1.8 — 2026-04-19
- **Icon uses the actual 🌱 emoji silhouette.** Rewrote `icons/generate.py` to render Apple Color Emoji at 160px, extract the alpha silhouette, fill with off-white, and composite onto the moss-green rounded square. Exact emoji shape + current color scheme.

## 0.1.7 — 2026-04-19
- **Icon redrawn to approximate the 🌱 emoji silhouette.** Rewrote `icons/generate.py` to produce two parametric teardrop leaves (rounded top, pointed base, concave taper) tilted ±35° with a visible V-gap between them and a short stem below. White-on-moss-green rounded square preserved.

## 0.1.6 — 2026-04-18
- **Post-knowledge-cutoff vocab pass (web search confirmed).** Added 18 entries for April 2026 terms that didn't exist at knowledge cutoff:
  - Agentic AI → wild gardening
  - multi-agent / multi-agent system → bee swarm
  - Physical AI → outdoor garden
  - LRM / LRMs / Long Reasoning Model(s) → patient weeder(s) (the thinking-step-by-step models)
  - AI washing → green-washing (fake-AI pretense; real-world parallel to green-washing)
  - AI slop / LLM slop → garden scraps (low-quality AI-generated content)
  - vibe check → weather check
  - superintelligence / ASI → whole forest
  - custom instructions → planting notes
  - LangGraph → hedge map
  - LangChain → pea chain
  - SWE-bench → crop contest
- Confirmed Mythos = Anthropic's Project Glasswing flagship, ancient olive still fits.

## 0.1.5 — 2026-04-18
- **Trending-vocab sweep.** Added 25 missing entries covering current AI vernacular:
  - evals / evaluations → tastings
  - managed agents → tended bumblebees
  - orchestration → crop rotation
  - foundation model → rootstock
  - synthetic data → compost
  - training data → potting soil
  - prompt injection → weed seeds
  - jailbreak / jailbreaking → fence-jumping / jumping fences
  - red team / red-teaming → pest patrol / pest patrolling
  - frontier / frontier model → wild hedge
  - open source → seed-sharing
  - open weights → shared seeds
  - scaling → growing
  - compute → sun hours
  - tool use → using shears
  - function calling → calling the trowel
  - wrapper → netting
  - dataset / datasets → seed catalog / seed catalogs
  - artifacts → clippings

## 0.1.4 — 2026-04-18
- **Sprout moved from DOM injection to inline text.** Post-container detection was fragile on LinkedIn (classes change, virtualization hides containers). The engine now appends a single 🌱 to each text node that contains replacements, when the indicator is on. Guaranteed visible, works on feed/profile/DMs/modals uniformly. Idempotent — health-check re-runs strip-then-re-add so glyphs don't accumulate. Per-node bound: one sprout per modified text node, not per replacement.
- **Limitation:** toggling the indicator on or off only affects subsequent replacements and text nodes touched by the health-check/observer. Pre-existing sprouts survive; pre-existing non-sprouted text isn't retroactively sprouted. Reload the tab to normalize.

## 0.1.3 — 2026-04-18
- **Critical: don't SHOUT replacements.** Short all-caps acronyms (AI, IA, LLM, GPU, AGI, RAG, MCP, RLHF, etc.) no longer cause the engine to uppercase the replacement. "AI is the future" → "gardening is the future" (was: "GARDENING is the future"). Fix lives in replacement-engine's `preserveCase`.
- **Critical: don't replace `j'ai` / `je n'ai`.** Short acronyms now compile with case-sensitive regex (`g` flag, not `gi`). "AI" regex no longer matches "ai" inside French contractions. Side benefits: fixes `agi` (past tense of *agir*), `ia` inside "Nadia"/"biais", etc.
- **Infinite-scroll drift fix.** Mutations that fired while the observer was disconnected during processing were being lost. Added: try/finally wrap so observer always reattaches, and a 5-second safety-net re-scan of `document.body` that catches any drift.
- **Sprout indicator visibility.** Broadened `POST_SELECTORS` (added `[data-urn*="activity"]`, `[data-urn*="share"]`, `[data-id*="urn:li"]`, `.update-components-actor__container`, `.occludable-update`, etc.) and added a fallback to the nearest substantial block ancestor if no specific selector matches.
- Dictionary audit for French readers:
  - Mythos: old yew → ancient olive (Anthropic's upcoming flagship — ancient olive trees carry mythological weight, live for millennia, universally recognized, especially by French readers)
  - Llama: foxglove → wildflower
  - Perplexity: wisteria → ivy
  - large language model: well-tended allotment → well-tended garden
  - Replit: cold frame → garden box
  - Lovable: potting shed → garden shed
  - tokens: apple pips → apple seeds
- New entries: `Sonnet` → climbing rose, `Opus` → old oak, `Haiku` → shrub rose (bare model names, parallel to Claude Sonnet / Claude Opus).
- Popup tagline: "Gardening lore, not discourse." → "Help LinkedIn touch grass, quite literally."

## 0.1.2 — 2026-04-18
- **SPA navigation fix.** LinkedIn is a single-page app; prior build only processed the initial page load and dropped subsequent roots because the scheduled-process guard was non-accumulating. Rewrote to batch pending roots in a Set. Added URL-change detection as a backstop — if `location.href` changes, triggers a full `document.body` re-scan after 400ms.
- **Animation on first page load.** Opening LinkedIn for the first time now plays the sweep-bar animation (user sees original page → transformation → transformed page). Previously only explicit OFF→ON toggle triggered it. `prefers-reduced-motion` still respected.
- **Franglish dictionary.** All French AI-term entries now map to English garden vocabulary (was: French → French). Consequence: French LinkedIn sentences get English words dropped into them, leaning into the "holiday" absurdity. Extended to English-keyed proper nouns that had French replacements (Anthropic, Claude, ChatGPT, Cursor, Midjourney, Copilot).
- **New entry.** Mythos → old yew.
- Extension renamed: "AI Holiday" → "Holiday from AI". Description rewritten.

## 0.1.1 — 2026-04-18
- Sprout 🌱 replaces palm 🌴 as the per-post indicator. Fits garden vocabulary, doesn't hint at vacation.
- Sweep-bar transformation animation. Toggling **Enabled** OFF → ON injects a green sweep bar at viewport top and animates it downward over 1.4s. Text nodes transform synchronously with the bar's Y position, giving a top-to-bottom propagation effect. First-page-load remains silent — only explicit toggle triggers animation. Respects `prefers-reduced-motion`.
- Popup redesigned: primary "Enabled" control is now a switch-style toggle in a card. Indicator toggle remains as a secondary checkbox below.

## 0.1.0 — 2026-04-18
- Initial scaffold: manifest v3, content script with MutationObserver, replacement engine, settings popup.
- Bilingual dictionary (138 entries) covering English + French AI vocabulary, model names, companies, buzzwords, and elision-handling phrases.
- Placeholder icon files pending (see `icons/README.md`).
