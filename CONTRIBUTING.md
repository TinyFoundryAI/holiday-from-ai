# Contributing to Holiday from AI

Two things are the product: the **haikus** (what readers see) and the **detection dictionary** (what decides a post is about AI). Most useful contributions are new or better haikus, or detection terms that an AI post slipped past. Code changes welcome too.

## Haiku contributions

File: `extension/haikus.json`. 100 haikus, loose 5-7-5 English form, all garden and nature subjects. A detected post gets one deterministically (same post → same haiku).

### Style rules

1. **Visually concrete.** Real plants, weather, wildlife, garden structures — something you can picture.
2. **Dreamy and poetic, not try-hard.** The absurdity comes from the juxtaposition of LinkedIn's thought-leader format with a quiet garden scene. The haiku itself should be sincere, not winking.
3. **Garden and nature vocabulary only.** Plants, garden structures, wildlife, weather, seasons, garden verbs. No crafts, libraries, urban analog life, rituals, or human-contact vocabulary. One coherent world.
4. **Tone is gentle.** Not anti-tech, not Luddite, not sarcastic. A holiday, not a protest.

## Detection contributions

File: `extension/themes/analog-life.json`. A bilingual (English + French) list of AI-related terms used as a trip-wire — if a post's text contains one, the post is swapped for a haiku. If an obviously-AI post sailed through untouched, the missing term is the bug. Add it.

### How to propose a change

Open a PR editing `extension/haikus.json` or `extension/themes/analog-life.json`. One-line PR description is fine. For broader style discussions (new vocabulary categories, tone shifts, etc.), open an issue first so we don't debate in code review.

## Code contributions

- Node ≥ 18 if you want to run linters locally (none configured yet — PRs welcome to add).
- `extension/src/replacement-engine.js` is the hot path. Benchmark any changes against LinkedIn feed scrolling — the v1 target is < 50ms per scroll batch.
- `extension/src/content.js` handles DOM orchestration (MutationObserver, URN-based post matching, text-node walks, haiku/image swap, sound swell). Keep mutations wrapped with `observer.disconnect()` / `observer.observe()` to avoid recursion.
- `extension/src/popup/` is UI only. No business logic.

### Bug reports

Helpful fields:
- Chrome version + OS.
- LinkedIn page type (feed, profile, post detail, DM).
- Screenshot of before/after if visual.
- Console errors if any.

### Out of scope for v1

See `AI_HOLIDAY_BUILD_SPEC.md` §7. Short version: no Claude API, no multi-theme UI, no Twitter/X, no telemetry, no hover-reveal.

## License

By contributing you agree your contributions are MIT-licensed.
