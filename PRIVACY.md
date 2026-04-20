# Privacy policy — Holiday from AI

*Last updated: 2026-04-21*

Short version: we don't collect anything. Everything happens inside your browser.

## What the extension does

Holiday from AI runs a content script on LinkedIn pages and substitutes AI-related vocabulary and (some) images with garden-themed alternatives. All of this happens locally in your browser. Nothing is sent anywhere.

## What we collect

**Nothing.** No personal information, no analytics, no usage data, no crash reports, no telemetry.

## What we store

Three boolean user preferences are stored in `chrome.storage.sync`:
- `enabled` — whether the extension is active on LinkedIn
- `showIndicator` — whether a 🌱 is appended to transformed posts
- `soundEnabled` — whether the ambient garden soundtrack plays

`chrome.storage.sync` is provided by Chrome itself and synchronizes your settings across browsers signed into the same Google account. We never see the contents.

## What we send over the network

**Nothing.** The extension loads only local resources bundled inside it (dictionary JSON, garden images, audio file, icons). It makes no requests to any external server, neither at load time nor during normal operation.

## Permissions

- `storage` — required to remember your three settings.
- `host_permissions: https://*.linkedin.com/*` — required because the extension's entire purpose is to read and transform the DOM of LinkedIn pages. We only access pages on linkedin.com.

## Third-party content

The extension bundles some CC-licensed assets for offline use:
- Garden photographs from Wikimedia Commons (CC-BY / CC-BY-SA / public domain). Attributions in `extension/images/ATTRIBUTIONS.md` within the extension package.
- An ambient bird-song recording from the Internet Archive (CC0 public domain). Attribution in `extension/audio/ATTRIBUTION.md`.

None of this content is fetched remotely — it's all embedded in the extension at publish time.

## Contact

Issues or questions: file a GitHub issue on the project repository, or email amelie.m.caudron@gmail.com.
