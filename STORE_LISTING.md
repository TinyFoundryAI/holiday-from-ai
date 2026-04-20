# Chrome Web Store listing — copy-paste text

Ready-to-paste content for each field in the developer dashboard.

---

## Name
```
Holiday from AI
```

## Summary (short description, ≤ 132 chars)
```
A holiday from AI-LinkedIn-induced existential dread. Swaps every mention of AI with gardening folklore.
```
*(102 chars — well under limit)*

## Description (detailed, for the listing body)
```
Do you need a holiday from AI-LinkedIn-induced existential dread?

Tired of getting tachycardia every Monday, after yet another weekend where you chose to enjoy spring with your loved ones (you fool — meanwhile your peers were setting up fully autonomous agentic side businesses)?

Time to install Holiday from AI: a very green and touch-grassy Chrome extension that swaps every mention of AI on LinkedIn with gardening vocabulary.

• ChatGPT becomes a rhubarb patch
• LLMs become compost heaps
• Claude Code becomes an heirloom tomato
• Sam Altman becomes the tulip chaser
• Those "free 5-min Claude Cowork guide" infographics turn into pictures of vegetable gardens (the extension bundles real garden photos and swaps post images too)

Over 200 translations total, covering AI companies, products, industry figures (Zuckerberg → Mark Zucchini, Musk → Melon Musk), reasoning models, French AI terminology, and whichever buzzword LinkedIn has discovered this week.

Bonus: an optional chirping-birds soundtrack that swells gently when there's a high concentration of AI posts in view, so you can close your eyes, forget about AGI, and keep enjoying spring.

A small 🌱 marks every post the extension has touched. Toggle the whole thing on or off via the popup — "off" fully reverts the page and stops the birds.

Everything runs locally in your browser. No data collected, no servers contacted, no telemetry. Open source.

Built with heirloom tomato. Vibe-coded by TinyFoundry.
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
https://github.com/<your-username>/holiday-from-ai/issues
```
*(fill in after GitHub push)*
