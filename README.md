# AI Holiday

AI Holiday is a Chrome extension that replaces AI mentions on LinkedIn with references to gardens, bumblebees, and the south-facing window. It works in English and French. It does not take itself seriously. It does work.

## What it does

LinkedIn's thought-leader format stays intact. Only the subject matter becomes gardening.

> "I've been deeply thinking about how AI agents will transform productivity."

becomes

> "I've been deeply thinking about how bumblebees will transform productivity."

A small 🌱 marks every post AI Holiday has touched. You can turn that off.

## Install (developer mode)

1. Clone this repo.
2. Visit `chrome://extensions` in Chrome.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the **`extension/`** subfolder (not the repo root).
5. Open LinkedIn. Scroll.

Chrome Web Store listing: not yet.

## Repo layout

```
.
├── extension/          # the loadable Chrome extension (this is what Chrome sees)
│   ├── manifest.json
│   ├── src/
│   ├── themes/analog-life.json
│   └── icons/
├── DICTIONARY.md       # human-readable dictionary review doc
├── AI_HOLIDAY_BUILD_SPEC.md
├── CONTRIBUTING.md
├── CHANGELOG.md
├── COMMANDS.md
└── test/               # offline test harness, not shipped
```

## Settings

Click the extension icon. Two toggles:
- **Enabled** — turn the whole thing on or off.
- **Show 🌱** — hide the indicator if you want the joke to be quieter.

Settings persist across devices via `chrome.storage.sync`.

## How it works

The dictionary lives at `extension/themes/analog-life.json` — a flat `{ "ai-term": "garden-term" }` mapping, bilingual (English + French in the same file). The content script uses a `MutationObserver` to catch LinkedIn's infinite-scroll updates, then does a word-boundary regex replace on text nodes only. Longer phrases match first. Capitalization is preserved.

No network calls. No telemetry. Runs only on `*.linkedin.com`.

## Contributing

The dictionary is the product. If you have a replacement that lands better — open a PR against `themes/analog-life.json`. Style rules:

1. Visually concrete, length-matched to the original.
2. Dreamy and poetic, not try-hard.
3. No leading articles on replacements.
4. Garden and nature vocabulary only. No crafts, no urban analog life, no human contact vocabulary.

## License

MIT. See `LICENSE`.

---

Built by [TinyFoundry](https://tinyfoundry.ai). Vibe-coded.
