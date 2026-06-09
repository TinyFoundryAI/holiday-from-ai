# Holiday from AI

A Chrome extension that replaces every AI post on your LinkedIn feed with a short haiku about gardens and nature. It works in English and French. It does not take itself seriously. It does work.

## What it does

Do you need a holiday from AI-FOMO-LinkedIn? Tired of feeling like your peers all spun up fully autonomous agentic side businesses over the weekend?

Holiday from AI detects AI-related posts and replaces the whole post body with a garden haiku.

Before:

> "I've been deeply thinking about how agentic AI will transform enterprise workflow automation. Here are my 7 takeaways from a recent conversation with an LLM expert..."

After:

> Tomato vines heavy,
> a bumblebee naps in shade
> below the south wall

The extension bundles **100 haikus** (loose 5-7-5 form, all garden and nature).

## Bonus features

- **Image swap** — post images get replaced with real garden photos (potagers and lush gardens, bundled locally).
- **Birdsong** — an optional chirping-birds soundtrack swells gently when AI-heavy posts are in view, so you can close your eyes and forget about AGI.
- **One toggle** — flip the extension off from the popup and the page fully reverts; the birds stop too.

Everything runs locally in your browser. No data collected, no servers contacted, no telemetry. Open source.

## How detection works

Detection is powered by a 200+ entry AI-vocabulary dictionary: every model (GPT, Claude, Gemini, Mistral), company, industry figure, buzzword, and French AI term. If a post mentions AI in any language, it gets a haiku.

The content script uses a `MutationObserver` to catch LinkedIn's infinite-scroll updates, matches posts by URN across the three LinkedIn post surfaces (main feed, company pages, articles), and only acts on posts that trip the dictionary. No network calls. No telemetry. Runs only on `*.linkedin.com`.

## Install

**Chrome Web Store:** submitted, pending review (v0.4.0).

**Developer mode (now):**

1. Clone this repo.
2. Visit `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the **`extension/`** subfolder (not the repo root).
5. Open LinkedIn. Scroll.

## Settings

Click the extension icon. One toggle: **Enabled** — turn the whole thing on or off. "Off" fully reverts the page and stops the birds. The setting persists across devices via `chrome.storage.sync`.

## Repo layout

```
.
├── extension/                    # the loadable Chrome extension (this is what Chrome sees)
│   ├── manifest.json
│   ├── haikus.json               # the 100 haikus
│   ├── src/                      # replacement engine, content script, background, popup
│   ├── themes/analog-life.json   # the AI-detection dictionary
│   ├── images/                   # bundled garden photos for image swaps
│   ├── audio/                    # birdsong soundtrack
│   └── icons/
├── DICTIONARY.md                 # human-readable dictionary review doc
├── STORE_LISTING.md              # Chrome Web Store copy
├── CONTRIBUTING.md
├── CHANGELOG.md
└── test/                         # offline test harness, not shipped
```

## Contributing

The haikus and the detection dictionary are the product.

- **Haikus** live in `extension/haikus.json`. Loose 5-7-5, garden and nature only, no try-hard.
- **Detection terms** live in `extension/themes/analog-life.json`. If an AI term slips past, add it (English or French).

Open a PR. Style rules for haikus: visually concrete, dreamy not try-hard, garden and nature vocabulary only — no crafts, no urban analog life, no human-contact vocabulary.

## License

MIT. See `LICENSE`.

---

Built by [TinyFoundry AI](https://tinyfoundry.ai). Vibe-coded.
