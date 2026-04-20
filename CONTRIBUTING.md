# Contributing to AI Holiday

The dictionary is the product. Most useful contributions are new replacement entries or better versions of existing ones. Code changes welcome too.

## Dictionary contributions

File: `extension/themes/analog-life.json`. Flat `{ "ai-term": "garden-term" }`, bilingual (English and French merged).

### Style rules

1. **Visually concrete, length-matched.** Replacement ≤ 1.5× the length of the original. Default to punchy; only stretch to lush when it's obviously funnier.
2. **Dreamy and poetic, not try-hard.** The absurdity comes from the juxtaposition of LinkedIn's thought-leader format with garden vocabulary. Replacement words should feel matter-of-fact, not winking.
3. **No leading articles on replacements.** The source sentence already has one. `LLM → greenhouse`, not `a greenhouse`. Strict rule — applies to French (`le`, `la`, `l'`, `un`, `une`, `des`) and English (`the`, `a`, `an`). Phrase entries that include an article in the source key (`l'IA`, `grâce à l'IA`) should still produce article-free output.
4. **Garden and nature vocabulary only.** Plants, garden structures, wildlife, weather, seasons, garden verbs. No crafts, libraries, urban analog life, rituals, or human-contact vocabulary. One coherent metaphorical world.
5. **Tone is gentle.** Not anti-tech, not Luddite, not sarcastic. A holiday, not a protest.

### How to propose an entry

Open a PR editing `extension/themes/analog-life.json`. One-line PR description is fine. If the entry might land differently than another reviewer expects, note it in the PR body — otherwise we'll trust the style rules.

For broader style discussions (new vocabulary categories, tone shifts, etc.), open an issue first so we don't debate in code review.

## Code contributions

- Node ≥ 18 if you want to run linters locally (none configured yet — PRs welcome to add).
- `extension/src/replacement-engine.js` is the hot path. Benchmark any changes against LinkedIn feed scrolling — the v1 target is < 50ms per scroll batch.
- `extension/src/content.js` handles DOM orchestration (MutationObserver, text-node walks, indicator injection, sweep animation). Keep mutations wrapped with `observer.disconnect()` / `observer.observe()` to avoid recursion.
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
