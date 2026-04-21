# Chrome Web Store listing — copy-paste text

Ready-to-paste content for each field in the developer dashboard.

---

## Name
```
Holiday from AI
```

## Summary (short description, ≤ 132 chars)
```
Replaces all AI-related content on LinkedIn with garden-themed haikus.
```
*(74 chars)*

## Description (detailed, for the listing body)
```
Do you need a holiday from AI-LinkedIn-induced existential dread?

Tired of getting tachycardia every Monday, after yet another weekend where you chose to enjoy spring with your loved ones (you fool — meanwhile your peers were setting up fully autonomous agentic side businesses)?

Time to install Holiday from AI: a very green and touch-grassy Chrome extension that replaces every LinkedIn post about AI with a short haiku about gardens and nature.

Example. Before:
  "I've been deeply thinking about how agentic AI will transform enterprise workflow automation. Here are my 7 takeaways from a recent conversation with an LLM expert..."

After:
  "Tomato vines heavy,
  a bumblebee naps in shade
  below the south wall"

The extension bundles 100 haikus (loose 5-7-5 form, all garden and nature) and picks one deterministically per post — scrolling back up shows the same haiku, so your feed stays quiet. If the post is long and you click "See more," you get a second haiku.

Detection powered by a 200+ entry AI-vocabulary dictionary: every model (GPT, Claude, Gemini, Mistral), company, industry figure, buzzword, and French AI term. If the post mentions AI in any language, haiku.

Bonus features:
• Post images also get swapped for real garden photos (potagers and lush gardens, bundled locally).
• Optional chirping-birds soundtrack that swells gently when AI-heavy posts are in view, so you can close your eyes, forget about AGI, and keep enjoying spring.
• Demo mode: blurs names and avatars while keeping haikus and garden images crisp, for sharing screenshots.
• Toggle the whole thing on or off via the popup — "off" fully reverts the page and stops the birds.

Everything runs locally in your browser. No data collected, no servers contacted, no telemetry. Open source.

Built with an heirloom tomato. Vibe-coded by TinyFoundry.
```

## Single-purpose statement
```
Replace AI-related vocabulary and imagery on LinkedIn pages with garden-themed alternatives.
```

## Category
```
Social & Communication
```
*(alternative: Productivity)*

---

## Permission justifications

### storage
```
Persists three user preferences (extension on/off, indicator visibility, sound on/off) via chrome.storage.sync so the user's settings follow their Google account across devices.
```

### host permission: https://*.linkedin.com/*
```
The extension's entire purpose is to read and modify the DOM of LinkedIn pages — specifically, replacing AI vocabulary with garden vocabulary in text nodes and swapping post images. This requires read/write access to pages served from linkedin.com. No other host is accessed.
```

---

## Privacy practices questionnaire

- **What user data does this extension collect?** None.
- **Do you collect personally identifiable info?** No.
- **Do you collect health info, financial info, authentication info, personal communications, location, web history, user activity, website content?** No to all.
- **Do you use / transfer user data for purposes unrelated to single purpose?** No.
- **Do you use / transfer user data to determine creditworthiness or for lending purposes?** No.
- **Do you sell user data?** No.

Link to privacy policy: **[URL once you host PRIVACY.md — see PUBLISH.md]**

---

## Screenshots needed

Chrome requires at least 1 (up to 5) at **1280×800** or **640×400**.

Capture these on a real LinkedIn tab with the extension loaded:
1. **Feed scrolled** — showing multiple transformed posts with 🌱 markers and swapped images
2. **A single transformed post** close-up — text clearly readable, shows AI→garden swap
3. **The popup** — showing the three toggles
4. **The speaker button** — mid-swell, ring visible
5. **Before/after comparison** — split-screen or two panels

---

## Promo tile

440×280 PNG required. Generated at `extension/icons/promo-440x280.png` by the promo-tile script.

---

## Homepage URL (optional)
```
https://tinyfoundry.ai
```

## Support URL
```
https://github.com/TinyFoundryAI/holiday-from-ai/issues
```

